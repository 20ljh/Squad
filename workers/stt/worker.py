"""STT 워커: 웹에서 받아쓸 회의를 가져가 받아쓰기(faster-whisper) + 화자 나누기(pyannote)를 하고 결과를 올림.
화자 확인이 끝난 회의의 요약(Claude API 호출)도 이 워커가 함 (배포 VM이 있는 홍콩은 Anthropic API 미지원 지역).

실행 (squad 폴더에서, 웹이 켜져 있는 상태):
    workers/stt/.venv/Scripts/python workers/stt/worker.py
    workers/stt/.venv/Scripts/python workers/stt/worker.py --web http://192.168.0.10:3000   # 다른 PC의 웹
    workers/stt/.venv/Scripts/python workers/stt/worker.py --once                          # 하나만 처리하고 끝

필요한 것: apps/web/.env 의 WORKER_TOKEN(웹과 같은 값), HF_TOKEN, ANTHROPIC_API_KEY, ffmpeg, NVIDIA GPU(없으면 --device cpu, 아주 느림)

흐름 (웹 API, CLAUDE.md 4절):
    1) POST /api/worker/claim                 받아쓸 회의 하나 가져가기 (없으면 몇 초 뒤 다시)
    2) GET  /api/worker/jobs/:id/audio        녹음 내려받기
    3) POST /api/worker/jobs/:id/segments     받아쓴 문장을 나오는 대로 올림 → 회의 페이지에 실시간으로 한 줄씩
    4) (화자 나누기 전에 빈 segments로 "아직 유효한지" 확인)
    5) POST /api/worker/jobs/:id/result       화자가 붙은 최종 원문 → 회의는 "화자 확인" 단계로
       실패하면 POST /api/worker/jobs/:id/fail 로 이유를 알림
사용자가 취소하면 웹이 409 { cancelled: true } 를 돌려주고, 워커는 그 자리에서 멈춤.

요약 (받아쓸 회의가 없을 때 확인):
    1) POST /api/worker/summary/claim         요약할 회의 + Anthropic에 보낼 요청 본문 (프롬프트는 웹이 만듦)
    2) POST https://api.anthropic.com/v1/messages   본문을 그대로 보냄
    3) POST /api/worker/summary/:id/result    받은 글(JSON) → 웹이 검사·저장, 형식이 깨졌으면 422 → 1번만 다시 부름
       실패하면 POST /api/worker/summary/:id/fail

받아쓰기 설정은 poc.py에서 확정한 것과 같음 (large-v3, 한국어, VAD, 온도 0 고정 → 같은 녹음이면 결과가 같음).
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from poc import SAMPLE_RATE, DIARIZATION_MODEL, Word, assign_speakers, decode_audio, load_env  # noqa: E402

# 받아쓴 문장을 모아서 올리는 간격(초). 너무 자주 올리면 웹이 바쁘고, 너무 드물면 화면이 늦게 바뀜
SEND_EVERY_SEC = 2.0


ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"


def call_claude(body: dict) -> tuple[int, dict | None]:
    """Anthropic Messages API 호출. (HTTP 상태, 응답 JSON). 키 값은 출력하지 않음."""
    req = urllib.request.Request(
        ANTHROPIC_URL,
        data=json.dumps(body).encode(),
        headers={"x-api-key": os.environ.get("ANTHROPIC_API_KEY", ""), "anthropic-version": "2023-06-01", "content-type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=300) as res:
            return res.status, json.loads(res.read())
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read() or b"null")
        except json.JSONDecodeError:
            return e.code, None


def summarize(api: "Api", job: dict) -> None:
    """요약 하나: 웹이 준 요청을 Claude에 보내고 결과를 올림. 형식이 깨지면 1번만 다시."""
    mid = job["meetingId"]
    print(f"▶ 요약 {mid}", flush=True)
    t0 = time.time()
    for attempt in range(2):
        try:
            code, res = call_claude(job["request"])
        except (urllib.error.URLError, TimeoutError, ConnectionError) as e:
            print(f"✖ 요약 서비스에 연결하지 못했어요 ({e})", flush=True)
            api.call("POST", f"/api/worker/summary/{mid}/fail", {"kind": "network"})
            return
        if code != 200 or not res:
            msg = ((res or {}).get("error") or {}).get("message", "")
            print(f"✖ 요약 실패: Anthropic {code} {msg}", flush=True)
            api.call("POST", f"/api/worker/summary/{mid}/fail", {"httpStatus": code})
            return
        text = "".join(b.get("text", "") for b in res.get("content", []) if b.get("type") == "text")
        status, data = api.call("POST", f"/api/worker/summary/{mid}/result", {"text": text, "usage": res.get("usage")})
        if status == 200:
            u = res.get("usage") or {}
            print(f"✔ 요약 저장 ({time.time() - t0:.0f}초, 입력 {u.get('input_tokens')} · 출력 {u.get('output_tokens')}토큰)", flush=True)
            return
        if status == 409:
            print("■ 그 사이 상태가 바뀐 회의예요. 이 요약은 버려요.", flush=True)
            return
        if status == 422 and attempt == 0:
            print("  요약 형식이 맞지 않아 한 번 더 시도해요.", flush=True)
            continue
        print(f"✖ 요약 저장 실패 ({status}: {(data or {}).get('error')})", flush=True)
        api.call("POST", f"/api/worker/summary/{mid}/fail", {"kind": "bad_json"})
        return


class Cancelled(Exception):
    """사용자가 취소했거나 다른 녹음으로 바뀐 작업."""


class Api:
    def __init__(self, base: str, token: str):
        self.base = base.rstrip("/")
        self.headers = {"authorization": f"Bearer {token}"}

    def call(self, method: str, path: str, body: dict | None = None, timeout: float = 60) -> tuple[int, dict | None]:
        data = json.dumps(body).encode() if body is not None else None
        headers = {**self.headers, **({"content-type": "application/json"} if data else {})}
        req = urllib.request.Request(self.base + path, data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=timeout) as res:
                raw = res.read()
                return res.status, (json.loads(raw) if raw else None)
        except urllib.error.HTTPError as e:
            try:
                return e.code, json.loads(e.read() or b"null")
            except json.JSONDecodeError:
                return e.code, None

    def job_call(self, method: str, path: str, body: dict) -> dict | None:
        """작업 관련 호출. 409(취소됨)면 Cancelled, 그 밖의 오류는 RuntimeError."""
        status, data = self.call(method, path, body)
        if status == 409 or (data or {}).get("cancelled"):
            raise Cancelled()
        if status >= 400:
            raise RuntimeError(f"웹 API 오류 {status}: {(data or {}).get('error')}")
        return data

    def download(self, meeting_id: str, audio_path: str, dest: Path) -> None:
        q = urllib.parse.urlencode({"audioPath": audio_path})
        req = urllib.request.Request(f"{self.base}/api/worker/jobs/{meeting_id}/audio?{q}", headers=self.headers)
        try:
            with urllib.request.urlopen(req, timeout=300) as res, open(dest, "wb") as f:
                while chunk := res.read(1 << 20):
                    f.write(chunk)
        except urllib.error.HTTPError as e:
            if e.code == 409:
                raise Cancelled() from e
            raise RuntimeError(f"녹음을 내려받지 못했어요 ({e.code})") from e


class Models:
    """모델은 처음 한 번만 올리고 작업마다 다시 씀 (large-v3 올리는 데 수십 초 걸림)."""

    def __init__(self, model_name: str, device: str):
        import torch  # noqa: F401  CUDA DLL(cuBLAS·cuDNN)을 먼저 올려 두기 위해 import
        from faster_whisper import WhisperModel
        from pyannote.audio import Pipeline

        self.device = device
        print(f"모델 올리는 중… (받아쓰기 {model_name}, 화자 나누기 {DIARIZATION_MODEL}, {device})", flush=True)
        t = time.time()
        self.whisper = WhisperModel(model_name, device=device, compute_type="float16" if device == "cuda" else "int8")
        self.diarizer = Pipeline.from_pretrained(DIARIZATION_MODEL, token=os.environ["HF_TOKEN"])
        self.diarizer.to(torch.device(device))
        print(f"모델 준비 완료 ({time.time() - t:.0f}초)", flush=True)

    def diarize(self, audio: np.ndarray, num_speakers: int):
        import torch

        waveform = torch.from_numpy(audio).unsqueeze(0)
        output = self.diarizer({"waveform": waveform, "sample_rate": SAMPLE_RATE}, num_speakers=num_speakers)
        annotation = getattr(output, "exclusive_speaker_diarization", None) or getattr(output, "speaker_diarization", output)
        return [(turn.start, turn.end, spk) for turn, _, spk in annotation.itertracks(yield_label=True)]


def process(api: Api, models: Models, job: dict) -> None:
    mid, audio_path, speakers = job["meetingId"], job["audioPath"], max(1, int(job.get("speakerCount") or 1))
    seg_path = f"/api/worker/jobs/{mid}/segments"
    print(f"\n▶ 회의 {mid} · {job.get('audioName') or audio_path} · 화자 {speakers}명", flush=True)
    started = time.time()

    with tempfile.TemporaryDirectory(prefix="squad-stt-") as tmp:
        src = Path(tmp) / Path(audio_path).name
        api.download(mid, audio_path, src)
        try:
            audio = decode_audio(src)
        except SystemExit as e:  # decode_audio는 시험 스크립트용이라 실패하면 종료를 요청함 → 실패로 바꿔 알림
            raise RuntimeError("음성 파일을 읽지 못했어요. 다른 형식(m4a, mp3, wav)으로 다시 올려 주세요.") from e
    duration = len(audio) / SAMPLE_RATE
    if duration < 1:
        raise RuntimeError("녹음이 너무 짧거나 소리가 없어요.")
    print(f"  녹음 길이 {duration / 60:.1f}분", flush=True)

    # 1) 받아쓰기: 문장이 나오는 대로 모아서 올림 (화면에 실시간으로 한 줄씩)
    segments, _info = models.whisper.transcribe(
        audio,
        language="ko",
        vad_filter=True,
        word_timestamps=True,
        beam_size=5,
        condition_on_previous_text=False,
        temperature=0.0,  # 같은 녹음이면 결과가 같게 (미리 처리한 결과로 시연을 대신해도 같음)
    )
    words: list[Word] = []
    pending: list[dict] = []
    last_send = time.time()
    api.job_call("POST", seg_path, {"audioPath": audio_path, "durationSec": duration, "segments": []})
    for seg in segments:  # 제너레이터: 여기서 실제 계산이 일어남
        for w in seg.words or []:
            words.append(Word(w.start, w.end, w.word))
        if seg.text.strip():
            pending.append({"start": round(seg.start, 2), "end": round(seg.end, 2), "text": seg.text.strip()})
        if pending and time.time() - last_send >= SEND_EVERY_SEC:
            api.job_call("POST", seg_path, {"audioPath": audio_path, "segments": pending})
            print(f"  받아쓰는 중 {seg.end / 60:.1f} / {duration / 60:.1f}분", flush=True)
            pending, last_send = [], time.time()
    if pending:
        api.job_call("POST", seg_path, {"audioPath": audio_path, "segments": pending})
    print(f"  받아쓰기 끝 ({time.time() - started:.0f}초, 단어 {len(words)}개)", flush=True)
    if not words:
        raise RuntimeError("녹음에서 말소리를 찾지 못했어요. 녹음을 확인해 주세요.")

    # 2) 화자 나누기 전에 아직 유효한지 확인 (그 사이 취소됐으면 여기서 멈춤)
    api.job_call("POST", seg_path, {"audioPath": audio_path, "segments": []})
    turns = models.diarize(audio, speakers)
    utterances = assign_speakers(words, turns)
    print(f"  화자 나누기 끝 ({time.time() - started:.0f}초, 발화 {len(utterances)}개)", flush=True)

    # 3) 최종 결과 → 회의는 "화자 확인" 단계로
    result = api.job_call(
        "POST",
        f"/api/worker/jobs/{mid}/result",
        {
            "audioPath": audio_path,
            "durationSec": duration,
            "utterances": [{"speaker": u.speaker, "start": round(u.start, 2), "end": round(u.end, 2), "text": u.text} for u in utterances],
        },
    )
    took = time.time() - started
    print(f"✔ 완료: 화자 {result.get('speakers')}명 · 발화 {result.get('utterances')}개 · {took:.0f}초 (녹음 길이의 {took / duration:.0%})", flush=True)


def main() -> None:
    p = argparse.ArgumentParser(description="STT 워커")
    p.add_argument("--web", default=os.environ.get("WORKER_WEB_URL", "http://localhost:3000"), help="웹 주소")
    p.add_argument("--model", default="large-v3")
    p.add_argument("--device", default="cuda", choices=["cuda", "cpu"])
    p.add_argument("--interval", type=float, default=5.0, help="할 일이 없을 때 다시 묻는 간격(초)")
    p.add_argument("--once", action="store_true", help="하나만 처리하고 끝")
    args = p.parse_args()

    load_env()
    token = os.environ.get("WORKER_TOKEN", "")
    if len(token) < 32:
        sys.exit("WORKER_TOKEN이 없거나 너무 짧아요. apps/web/.env 에 웹과 같은 값을 넣어 주세요.")
    api = Api(args.web, token)
    models = Models(args.model, args.device)
    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("※ ANTHROPIC_API_KEY가 없어서 요약은 하지 않아요 (받아쓰기만). apps/web/.env 를 확인해 주세요.", flush=True)
    print(f"웹 {args.web} 에서 받아쓰기·요약할 회의를 기다려요 (멈추려면 Ctrl+C)", flush=True)

    waiting_note = False
    while True:
        try:
            status, job = api.call("POST", "/api/worker/claim", {})
        except (urllib.error.URLError, TimeoutError, ConnectionError) as e:
            print(f"웹에 연결하지 못했어요 ({e}). {args.interval:.0f}초 뒤 다시 시도해요.", flush=True)
            time.sleep(args.interval)
            continue
        if status == 401:
            sys.exit("웹이 워커 키를 거절했어요. apps/web/.env 의 WORKER_TOKEN이 웹과 같은지 확인해 주세요.")
        if status != 200 or not job:
            # 받아쓸 회의가 없으면 요약할 회의 확인
            if os.environ.get("ANTHROPIC_API_KEY"):
                try:
                    s_status, s_job = api.call("POST", "/api/worker/summary/claim", {})
                except (urllib.error.URLError, TimeoutError, ConnectionError):
                    s_status, s_job = 0, None
                if s_status == 200 and s_job:
                    waiting_note = False
                    try:
                        summarize(api, s_job)
                    except Exception as e:  # noqa: BLE001
                        print(f"✖ 요약 중 오류: {e!r}", flush=True)
                        try:
                            api.call("POST", f"/api/worker/summary/{s_job['meetingId']}/fail", {"kind": "network"})
                        except Exception:  # noqa: BLE001
                            pass
                    if args.once:
                        return
                    continue
            if not waiting_note:
                print("할 일 없음 · 기다리는 중…", flush=True)
                waiting_note = True
            if args.once:
                return
            time.sleep(args.interval)
            continue
        waiting_note = False

        try:
            process(api, models, job)
        except Cancelled:
            print("■ 사용자가 취소했어요. 이 작업은 멈춰요.", flush=True)
        except Exception as e:  # noqa: BLE001  어떤 오류든 회의를 "실패"로 알리고 다음 작업으로
            reason = str(e) if isinstance(e, RuntimeError) else "녹음을 처리하는 중 오류가 났어요."
            print(f"✖ 실패: {e!r}", flush=True)
            try:
                api.job_call("POST", f"/api/worker/jobs/{job['meetingId']}/fail", {"audioPath": job["audioPath"], "reason": reason})
            except Exception as e2:  # noqa: BLE001
                print(f"  실패를 웹에 알리지 못했어요: {e2!r}", flush=True)
        if args.once:
            return


if __name__ == "__main__":
    main()

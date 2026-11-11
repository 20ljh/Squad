"""음성 처리 시험(PoC): 받아쓰기(faster-whisper) + 화자 분리(pyannote) → 화자가 붙은 원문.

사용법 (squad 폴더에서):
    workers/stt/.venv/Scripts/python workers/stt/poc.py claude/samples/회의.m4a --speakers 4

결과는 claude/samples/out/<파일이름>.json, .txt 로 저장됩니다(커밋 안 됨).
HF_TOKEN은 apps/web/.env 에서 읽습니다.

확정한 방식 (2026-11-12): large-v3 + 화자 수 입력. 시험해 보고 뺀 것
- 받아쓰기 전 잡음 줄이기(전처리): 엉뚱한 말은 줄지만 실제 말까지 잘라 내고 일부 단어를 더 잘못 들음
- 용어 힌트(hotwords): 말하지 않은 용어를 지어냄
- 화자 수 범위(min/max): 회의 생성 때 정확한 수를 받으므로 불필요
- hallucination_silence_threshold, no_repeat_ngram_size: 받아쓰기가 5~10배 느려짐
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
from dataclasses import asdict, dataclass
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]  # squad/
SAMPLE_RATE = 16000
DIARIZATION_MODEL = "pyannote/speaker-diarization-community-1"


@dataclass
class Word:
    start: float
    end: float
    text: str


@dataclass
class Utterance:
    speaker: str  # "화자1"
    start: float
    end: float
    text: str


def load_env() -> None:
    """apps/web/.env 의 값을 환경 변수로 읽음 (값은 출력하지 않음)."""
    from dotenv import load_dotenv

    load_dotenv(ROOT / "apps" / "web" / ".env")
    if not os.environ.get("HF_TOKEN"):
        sys.exit("HF_TOKEN이 없어요. apps/web/.env 에 HF_TOKEN=hf_... 를 넣어 주세요.")


# 한 발화가 너무 길면 원문을 읽기 어려워서 끊음: 문장이 끝난 곳에서 이 길이(초)를 넘으면 새 발화로
SPLIT_AFTER_SEC = 30.0
# 문장 끝을 못 찾아도 이 길이(초)를 넘으면 무조건 끊음
SPLIT_HARD_SEC = 60.0


def decode_audio(path: Path) -> np.ndarray:
    """ffmpeg로 어떤 형식이든 16kHz 모노 float32로 변환해 메모리로 읽음."""
    cmd = [
        "ffmpeg", "-nostdin", "-v", "error", "-i", str(path),
        "-ac", "1", "-ar", str(SAMPLE_RATE), "-f", "f32le", "-",
    ]
    try:
        raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    except FileNotFoundError:
        sys.exit("ffmpeg를 찾지 못했어요. 터미널을 새로 열거나 ffmpeg 설치를 확인해 주세요.")
    except subprocess.CalledProcessError as e:
        sys.exit(f"음성 파일을 읽지 못했어요: {e.stderr.decode(errors='ignore').strip()}")
    return np.frombuffer(raw, dtype=np.float32).copy()


def transcribe(
    audio: np.ndarray, model_name: str, device: str, fixed_temperature: bool = False
) -> tuple[list[Word], str]:
    """받아쓰기. 단어마다 시작·끝 시각을 받아 화자와 맞춤."""
    import torch  # noqa: F401  CUDA DLL(cuBLAS·cuDNN)을 먼저 올려 두기 위해 import
    from faster_whisper import WhisperModel

    compute_type = "float16" if device == "cuda" else "int8"
    model = WhisperModel(model_name, device=device, compute_type=compute_type)
    segments, info = model.transcribe(
        audio,
        language="ko",
        vad_filter=True,  # 말 없는 구간을 건너뛰어 환각(없는 말 지어내기)을 줄임
        word_timestamps=True,
        beam_size=5,
        # 앞 문장을 이어 받지 않게 해서 "2차. 2차. 2차…" 같은 반복 환각이 번지는 것을 막음
        condition_on_previous_text=False,
        # 기본값은 자신 없는 구간을 온도를 올려 무작위로 다시 해석함 → 실행마다 결과가 달라짐
        **({"temperature": 0.0} if fixed_temperature else {}),
    )
    words: list[Word] = []
    for seg in segments:  # 제너레이터: 여기서 실제 계산이 일어남
        for w in seg.words or []:
            words.append(Word(w.start, w.end, w.word))
    return words, f"언어 {info.language} (확률 {info.language_probability:.2f})"


def diarize(audio: np.ndarray, device: str, num_speakers: int):
    """화자 분리. 파일 디코딩은 이미 했으므로 파형을 그대로 넘김(torchcodec 디코딩 안 씀)."""
    import torch
    from pyannote.audio import Pipeline

    pipeline = Pipeline.from_pretrained(DIARIZATION_MODEL, token=os.environ["HF_TOKEN"])
    pipeline.to(torch.device(device))
    waveform = torch.from_numpy(audio).unsqueeze(0)  # (채널 1, 샘플 수)
    # 사람 수를 주지 않으면 1명으로 몰리는 경우가 있어서, 회의 생성 때 받은 수를 그대로 씀
    output = pipeline({"waveform": waveform, "sample_rate": SAMPLE_RATE}, num_speakers=num_speakers)
    # 4.x: 겹쳐 말한 구간을 한 명에게만 배정한 결과(exclusive)가 받아쓰기와 맞추기 좋음
    annotation = getattr(output, "exclusive_speaker_diarization", None) or getattr(
        output, "speaker_diarization", output
    )
    return [(turn.start, turn.end, spk) for turn, _, spk in annotation.itertracks(yield_label=True)]


def assign_speakers(words: list[Word], turns: list[tuple[float, float, str]]) -> list[Utterance]:
    """단어마다 가장 많이 겹치는 화자를 붙이고, 같은 화자가 이어 말한 단어를 한 발화로 묶음.
    한 사람이 길게 말하면 문장 끝에서 끊어 한 발화가 너무 길어지지 않게 함."""
    # pyannote 라벨(SPEAKER_00…)을 처음 말한 순서대로 "화자1, 화자2…"로 바꿈
    names: dict[str, str] = {}
    for _, _, spk in sorted(turns):
        names.setdefault(spk, f"화자{len(names) + 1}")

    def speaker_of(w: Word) -> str:
        best, best_overlap = None, 0.0
        for s, e, spk in turns:
            overlap = min(e, w.end) - max(s, w.start)
            if overlap > best_overlap:
                best, best_overlap = spk, overlap
        if best is None:  # 겹치는 구간이 없으면 가장 가까운 화자
            mid = (w.start + w.end) / 2
            best = min(turns, key=lambda t: min(abs(t[0] - mid), abs(t[1] - mid)))[2]
        return names[best]

    utterances: list[Utterance] = []
    for w in words:
        spk = speaker_of(w) if turns else "화자1"
        last = utterances[-1] if utterances else None
        # 같은 화자이고 쉰 시간이 1.5초 이내면 한 발화로 이어 붙임 (단, 너무 길어졌으면 끊음)
        too_long = last is not None and (
            (w.start - last.start >= SPLIT_AFTER_SEC and last.text.rstrip().endswith((".", "?", "!")))
            or w.start - last.start >= SPLIT_HARD_SEC
        )
        if last and last.speaker == spk and w.start - last.end <= 1.5 and not too_long:
            last.text += w.text
            last.end = w.end
        else:
            utterances.append(Utterance(spk, w.start, w.end, w.text))
    for u in utterances:
        u.text = u.text.strip()
    return merge_fragments(utterances)


# 화자가 바뀌는 순간 단어 시각이 조금 어긋나면 "제가", "괜찮지" 같은 1~2단어가 다른 화자로 떨어져 나옴
FRAGMENT_MAX_WORDS = 2
FRAGMENT_MAX_GAP = 0.5  # 이 간격(초) 안에 붙어 있을 때만 이어진 말로 봄


def merge_fragments(utterances: list[Utterance]) -> list[Utterance]:
    """짧은 조각을 바로 이어지는 말에 붙임.
    - 조각 다음 발화가 0.5초 안에 바로 이어지면 → 다음 발화 앞에 붙임 (문장이 거기서 시작된 것)
    - 아니고 앞 발화가 0.5초 안에 바로 앞에 있으면 → 앞 발화 끝에 붙임 (문장 끝이 떨어진 것)
    - "네", "감사합니다"처럼 따로 떨어진 짧은 대답은 그대로 둠"""
    out: list[Utterance] = []
    i = 0
    while i < len(utterances):
        u = utterances[i]
        nxt = utterances[i + 1] if i + 1 < len(utterances) else None
        prev = out[-1] if out else None
        short = len(u.text.split()) <= FRAGMENT_MAX_WORDS
        ends_sentence = u.text.endswith((".", "?", "!"))
        if short and not ends_sentence and nxt and nxt.speaker != u.speaker and nxt.start - u.end <= FRAGMENT_MAX_GAP:
            nxt.text = f"{u.text} {nxt.text}"
            nxt.start = u.start
        elif short and prev and prev.speaker != u.speaker and u.start - prev.end <= FRAGMENT_MAX_GAP \
                and not prev.text.endswith((".", "?", "!")):
            prev.text = f"{prev.text} {u.text}"
            prev.end = u.end
        else:
            out.append(u)
        i += 1
    # 붙이고 나서 같은 화자 발화가 나란히 붙었으면 하나로 합침
    merged: list[Utterance] = []
    for u in out:
        if merged and merged[-1].speaker == u.speaker and u.start - merged[-1].end <= 1.5:
            merged[-1].text = f"{merged[-1].text} {u.text}"
            merged[-1].end = u.end
        else:
            merged.append(u)
    return merged


def fmt_time(sec: float) -> str:
    m, s = divmod(int(sec), 60)
    return f"{m:02d}:{s:02d}"


def main() -> None:
    parser = argparse.ArgumentParser(description="받아쓰기 + 화자 분리 시험")
    parser.add_argument("audio", type=Path, help="녹음 파일 (m4a, mp3, wav 등)")
    parser.add_argument("--speakers", type=int, required=True, help="말한 사람 수")
    parser.add_argument("--fixed-temperature", action="store_true", help="다시 해석하지 않음(실행마다 같은 결과)")
    parser.add_argument("--tag", default="", help="결과 파일 이름 뒤에 붙일 표시 (비교용)")
    parser.add_argument("--model", default="large-v3", help="whisper 모델 (large-v3, medium, small …)")
    parser.add_argument("--device", default="cuda", choices=["cuda", "cpu"])
    parser.add_argument("--out", type=Path, default=ROOT / "claude" / "samples" / "out")
    args = parser.parse_args()

    if not args.audio.exists():
        sys.exit(f"파일이 없어요: {args.audio}")
    load_env()

    t0 = time.perf_counter()
    audio = decode_audio(args.audio)
    duration = len(audio) / SAMPLE_RATE
    t1 = time.perf_counter()
    print(f"[1/3] 음성 읽기: {fmt_time(duration)} 길이 ({t1 - t0:.1f}초)")

    words, lang = transcribe(audio, args.model, args.device, args.fixed_temperature)
    t2 = time.perf_counter()
    print(f"[2/3] 받아쓰기({args.model}): 단어 {len(words)}개, {lang} ({t2 - t1:.1f}초)")

    turns = diarize(audio, args.device, args.speakers)
    t3 = time.perf_counter()
    found = len({spk for _, _, spk in turns})
    print(f"[3/3] 화자 분리: 구간 {len(turns)}개, 화자 {found}명 ({t3 - t2:.1f}초)")

    utterances = assign_speakers(words, turns)
    total = t3 - t0

    args.out.mkdir(parents=True, exist_ok=True)
    stem = args.audio.stem + (f"-{args.tag}" if args.tag else "")
    result = {
        "audio": args.audio.name,
        "durationSec": round(duration, 1),
        "speakerCountInput": args.speakers,
        "speakerCountFound": found,
        "model": {"stt": args.model, "diarization": DIARIZATION_MODEL, "device": args.device},
        "timingSec": {
            "decode": round(t1 - t0, 1),
            "transcribe": round(t2 - t1, 1),
            "diarize": round(t3 - t2, 1),
            "total": round(total, 1),
        },
        "utterances": [asdict(u) for u in utterances],
    }
    (args.out / f"{stem}.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    lines = [f"[{fmt_time(u.start)}] {u.speaker}: {u.text}" for u in utterances]
    (args.out / f"{stem}.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")

    print()
    print("\n".join(lines[:15]))
    if len(lines) > 15:
        print(f"… (총 {len(lines)}개 발화)")
    print()
    print(f"전체 {total:.1f}초 · 실제 길이 대비 {total / max(duration, 1e-6):.2f}배 · 결과: {args.out / stem}.json / .txt")


if __name__ == "__main__":
    main()

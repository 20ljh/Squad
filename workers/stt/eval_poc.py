"""시험 결과 채점: poc.py 결과(.json)를 정답 대본(.json, 회의 음성 데이터 라벨)과 비교.

사용법 (squad 폴더에서):
    workers/stt/.venv/Scripts/python workers/stt/eval_poc.py claude/meet_test/SRBED21000016.json claude/samples/out/SRBED21000016.json

- 받아쓰기: CER(글자 오류율). 띄어쓰기·문장부호를 빼고 글자 단위로 비교. 낮을수록 좋음
- 화자: 말한 시간 기준 화자 일치율. 화자1·2…를 정답 화자와 가장 잘 맞게 짝지은 뒤 계산
"""

from __future__ import annotations

import itertools
import json
import re
import sys
from pathlib import Path

from rapidfuzz.distance import Levenshtein

TAGS = {"idiom", "noise", "laughing", "applause", "music"}
FRAME = 0.1  # 화자 비교 단위(초)


def clean_reference(text: str) -> str:
    """정답 표기 규칙을 받아쓰기 결과와 비교할 수 있게 바꿈.
    (발음)/(표기) → 표기, (문장)/(idiom) → 문장, /(noise) 같은 표시와 ~ @ 는 지움."""
    pattern = re.compile(r"\(([^()]*)\)/\(([^()]*)\)")
    prev = None
    while prev != text:  # 괄호가 겹친 경우가 있어 바뀌지 않을 때까지 반복
        prev = text
        text = pattern.sub(lambda m: m.group(1) if m.group(2).strip() in TAGS else m.group(2), text)
    text = re.sub(r"/\([a-zA-Z]+\)", " ", text)
    return text.replace("~", "").replace("@", "").replace("(", "").replace(")", "")


def letters(text: str) -> str:
    """한글·영문·숫자만 남기고 소문자로 (띄어쓰기·문장부호 차이는 오류로 세지 않음)."""
    return "".join(re.findall(r"[0-9a-z가-힣]", text.lower()))


def frames(spans: list[tuple[float, float, str]], total: float) -> list[str | None]:
    out: list[str | None] = [None] * (int(total / FRAME) + 1)
    for s, e, spk in spans:
        for i in range(int(s / FRAME), min(int(e / FRAME) + 1, len(out))):
            out[i] = spk
    return out


def speaker_accuracy(ref_spans, hyp_spans) -> tuple[float, float, dict[str, str]]:
    total = max([e for _, e, _ in ref_spans] + [e for _, e, _ in hyp_spans])
    ref, hyp = frames(ref_spans, total), frames(hyp_spans, total)
    ref_ids = sorted({s for _, _, s in ref_spans})
    hyp_ids = sorted({s for _, _, s in hyp_spans})
    speech = [i for i, r in enumerate(ref) if r is not None]
    covered = [i for i in speech if hyp[i] is not None]
    # 가능한 짝짓기를 모두 시도해 가장 많이 맞는 것을 고름 (화자 5명 이하라 충분히 빠름)
    best, best_map = -1, {}
    pad = ref_ids + [None] * max(0, len(hyp_ids) - len(ref_ids))
    for perm in itertools.permutations(pad, len(hyp_ids)):
        mapping = dict(zip(hyp_ids, perm))
        hit = sum(1 for i in covered if mapping.get(hyp[i]) == ref[i])
        if hit > best:
            best, best_map = hit, mapping
    return best / len(speech), len(covered) / len(speech), {k: v for k, v in best_map.items() if v}


def main() -> None:
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    ref = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    hyp = json.loads(Path(sys.argv[2]).read_text(encoding="utf-8"))

    ref_text = letters(" ".join(clean_reference(u["form"]) for u in ref["utterance"]))
    hyp_text = letters(" ".join(u["text"] for u in hyp["utterances"]))
    ops = Levenshtein.editops(ref_text, hyp_text)
    sub = sum(1 for o in ops if o.tag == "replace")
    dele = sum(1 for o in ops if o.tag == "delete")
    ins = sum(1 for o in ops if o.tag == "insert")
    cer = len(ops) / len(ref_text)

    ref_spans = [(float(u["start"]), float(u["end"]), u["speaker_id"]) for u in ref["utterance"]]
    hyp_spans = [(u["start"], u["end"], u["speaker"]) for u in hyp["utterances"]]
    acc, coverage, mapping = speaker_accuracy(ref_spans, hyp_spans)
    roles = {s["id"]: s.get("role", "") for s in ref.get("speaker", [])}

    print(f"정답 화자 {len(roles)}명 · 찾은 화자 {len({s for _, _, s in hyp_spans})}명")
    print(f"받아쓰기 CER {cer:.1%}  (정답 {len(ref_text)}자 · 바뀜 {sub} · 빠짐 {dele} · 더해짐 {ins})")
    print(f"화자 일치율 {acc:.1%}  (정답 말소리 중 받아쓴 구간 {coverage:.1%})")
    print("짝지은 결과: " + ", ".join(f"{h}={r}({roles.get(r, '')})" for h, r in sorted(mapping.items())))


if __name__ == "__main__":
    main()

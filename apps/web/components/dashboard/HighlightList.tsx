import type { Highlight } from "@/lib/types";

// 하이라이트 인용구는 회의 내용에서 자동으로 뽑히므로 발화자는 표시하지 않고, 어느 회의·안건에서 나왔는지만 보여줌
export function HighlightList({ items }: { items: Highlight[] }) {
  if (items.length === 0) {
    return (
      <p className="m-0 rounded-lg border border-line bg-white px-5 py-6 text-center text-[15px] text-ink-soft">
        아직 하이라이트가 없어요. 회의 결과의 의견에서 ☆를 누르면 여기에 모여요.
      </p>
    );
  }
  return (
    <ul className="m-0 flex list-none flex-col gap-3 p-0">
      {items.map((h, i) => (
        <li key={i} className="flex flex-col gap-2 rounded-lg border border-line bg-white px-5 py-4">
          <p className="m-0 text-[15px] leading-[1.6]">“{h.text}”</p>
          <p className="m-0 text-[13px] text-ink-soft">{h.meetingTag}</p>
        </li>
      ))}
    </ul>
  );
}

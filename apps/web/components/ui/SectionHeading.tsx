type Props = {
  title: string;
  description?: string;
  id?: string;
};

// 섹션 제목. 위에 붙던 영어 대문자 꼬리표(eyebrow)는 쓰지 않음 (ui-ux-pro-max 점검: 템플릿 느낌 줄이기)
export function SectionHeading({ title, description, id }: Props) {
  return (
    <div className="flex flex-col gap-1">
      <h2 id={id} className="m-0 font-display text-xl font-semibold">
        {title}
      </h2>
      {description ? <p className="m-0 text-[15px] text-ink-soft">{description}</p> : null}
    </div>
  );
}

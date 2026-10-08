import type { ElementType, ReactNode } from "react";

/** White type; RGB appears only on the letter outline (not fill or UI). */
export function TitleEdge({
  as: Tag = "h1",
  className = "",
  children,
}: {
  as?: ElementType;
  className?: string;
  children: ReactNode;
}) {
  const text = typeof children === "string" ? children : undefined;
  return (
    <Tag className={`title-edge ${className}`} data-text={text}>
      <span className="title-edge-fill">{children}</span>
      {text ? (
        <>
          <span className="title-edge-r" aria-hidden>
            {text}
          </span>
          <span className="title-edge-b" aria-hidden>
            {text}
          </span>
          <span className="title-edge-g" aria-hidden>
            {text}
          </span>
        </>
      ) : null}
    </Tag>
  );
}

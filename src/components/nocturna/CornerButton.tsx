import { Link } from "@tanstack/react-router";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

type CornerButtonProps = {
  children: ReactNode;
  className?: string;
  variant?: "primary" | "ghost";
};

function CornerFrame({
  children,
  className,
  variant = "ghost",
  ...props
}: CornerButtonProps & ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "nc-corner-btn group relative inline-flex items-center justify-center px-5 py-2.5 font-mono text-xs uppercase tracking-[0.12em]",
        variant === "primary" && "nc-corner-btn-primary",
        className,
      )}
      {...props}
    >
      <span className="nc-corner-bracket nc-corner-tl" aria-hidden />
      <span className="nc-corner-bracket nc-corner-tr" aria-hidden />
      <span className="nc-corner-bracket nc-corner-bl" aria-hidden />
      <span className="nc-corner-bracket nc-corner-br" aria-hidden />
      <span className="relative z-[1]">{children}</span>
    </button>
  );
}

export function CornerButton({
  to,
  href,
  children,
  className,
  variant = "ghost",
  onClick,
}: {
  to?: string;
  href?: string;
  children: ReactNode;
  className?: string;
  variant?: "primary" | "ghost";
  onClick?: () => void;
}) {
  const inner = (
    <>
      <span className="nc-corner-bracket nc-corner-tl" aria-hidden />
      <span className="nc-corner-bracket nc-corner-tr" aria-hidden />
      <span className="nc-corner-bracket nc-corner-bl" aria-hidden />
      <span className="nc-corner-bracket nc-corner-br" aria-hidden />
      <span className="relative z-[1]">{children}</span>
    </>
  );
  const cls = cn(
    "nc-corner-btn group relative inline-flex items-center justify-center px-5 py-2.5 font-mono text-xs uppercase tracking-[0.12em] transition-colors",
    variant === "primary" && "nc-corner-btn-primary",
    className,
  );
  if (href) {
    return (
      <a href={href} className={cls} target="_blank" rel="noreferrer noopener">
        {inner}
      </a>
    );
  }
  if (to) {
    return (
      <Link to={to} className={cls} onClick={onClick}>
        {inner}
      </Link>
    );
  }
  return (
    <CornerFrame className={className} variant={variant} onClick={onClick}>
      {children}
    </CornerFrame>
  );
}

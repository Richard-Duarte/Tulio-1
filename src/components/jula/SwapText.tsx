export function SwapText({ children, className = "" }: { children: string; className?: string }) {
  return (
    <span key={children} className={`swap-text ${className}`} data-text={children}>
      <span className="swap-text-inner">{children}</span>
    </span>
  );
}

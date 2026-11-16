import { useSiteBrand } from "@/lib/use-site-brand";
import { DEFAULT_SITE_WORDMARK } from "@/lib/presskit-logo-variants";

/** Logo = escrita Tulio (CMS). Menu, pre-loader, footer, auth, etc. */
export function TulioWordmark({ className = "" }: { className?: string }) {
  const { wordmarkUrl } = useSiteBrand();
  const src = wordmarkUrl || DEFAULT_SITE_WORDMARK;
  return (
    <img
      src={src}
      alt="Tulio"
      className={`inline-block h-[1em] w-auto max-w-none ${className}`}
    />
  );
}
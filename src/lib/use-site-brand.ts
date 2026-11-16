import { useQuery } from "@tanstack/react-query";
import { getSiteSettings } from "@/lib/public.functions";
import { siteIconUrl, siteWordmarkUrl } from "@/lib/presskit-logo-variants";

/** Shared CMS brand URLs (logo escrita + ícone) for header, pre-loader, home, etc. */
export function useSiteBrand() {
  const { data, isPending } = useQuery({
    queryKey: ["site-settings"],
    queryFn: () => getSiteSettings(),
  });
  const presskitLogoUrls = data?.presskit_logo_urls;
  const logoUrl = data?.logo_url;
  return {
    isPending,
    wordmarkUrl: siteWordmarkUrl(presskitLogoUrls, logoUrl),
    iconUrl: siteIconUrl(presskitLogoUrls, logoUrl),
  };
}
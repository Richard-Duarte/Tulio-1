import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SwapText } from "@/components/jula/SwapText";
import { languageNames, locales, type Locale, useI18n } from "@/lib/i18n";

export function LanguageSelector({ mobile = false }: { mobile?: boolean }) {
  const { locale, setLocale, t } = useI18n();
  return <DropdownMenu>
    <DropdownMenuTrigger
      aria-label={t("language")}
      className={mobile
        ? "text-left font-mono text-xs uppercase tracking-[.2em] text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:text-foreground"
        : "font-mono text-[11px] uppercase tracking-[0.18em] text-white/80 outline-none hover:text-white focus-visible:text-white"}
    >
      <SwapText>{mobile ? languageNames[locale] : locale.toUpperCase()}</SwapText>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="z-[80] min-w-44">
      <DropdownMenuRadioGroup value={locale} onValueChange={(value) => setLocale(value as Locale)}>
        {locales.map((item) => <DropdownMenuRadioItem key={item} value={item} className="font-mono text-xs">{languageNames[item]}</DropdownMenuRadioItem>)}
      </DropdownMenuRadioGroup>
    </DropdownMenuContent>
  </DropdownMenu>;
}

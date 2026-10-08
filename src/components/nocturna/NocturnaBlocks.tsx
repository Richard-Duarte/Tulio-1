import { Plus } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState, type ReactNode } from "react";
import { SpacedHeading } from "@/components/nocturna/SpacedHeading";
import { HoverCell, Reveal, Stagger, StaggerItem } from "@/components/nocturna/NocturnaMotion";
import { NocturnaContainer, NocturnaEyebrow, NocturnaSection } from "@/components/nocturna/NocturnaShell";

export function NocturnaSectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="px-5 py-12 md:px-10 md:py-16 lg:px-14">
      <NocturnaEyebrow>{eyebrow}</NocturnaEyebrow>
      <SpacedHeading as="h2" className="mt-5 max-w-3xl text-[clamp(1.85rem,4vw,2.85rem)]">
        {title}
      </SpacedHeading>
      {description ? <p className="nc-lead mt-5 max-w-2xl">{description}</p> : null}
    </div>
  );
}

export function NocturnaFeatureRow({
  index,
  label,
  title,
  body,
  foot,
  flip,
  visual,
}: {
  index: string;
  label: string;
  title: string;
  body: string;
  foot?: ReactNode;
  flip?: boolean;
  visual?: ReactNode;
}) {
  const text = (
    <HoverCell className="flex flex-col justify-center px-5 py-10 md:px-10 md:py-14 lg:px-14">
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-[var(--nc-accent-mint)]">
        {index} — {label}
      </p>
      <SpacedHeading as="h3" className="mt-5 text-2xl md:text-3xl">
        {title}
      </SpacedHeading>
      <p className="nc-lead mt-4 max-w-lg text-sm md:text-base">{body}</p>
      {foot ? (
        <div className="nc-code-chip mt-8 font-mono text-[11px] text-[var(--nc-accent-mint)]">{foot}</div>
      ) : null}
    </HoverCell>
  );
  const media = (
    <HoverCell className="relative min-h-[240px] md:min-h-[320px]">{visual}</HoverCell>
  );
  return (
    <div className={cnGridRow(flip)}>
      {flip ? (
        <>
          {media}
          {text}
        </>
      ) : (
        <>
          {text}
          {media}
        </>
      )}
    </div>
  );
}

function cnGridRow(flip?: boolean) {
  return `nc-grid-2 nc-grid-border-b ${flip ? "nc-grid-flip" : ""}`;
}

export function NocturnaStepsGrid({
  steps,
}: {
  steps: { n: string; title: string; body: string }[];
}) {
  return (
    <Stagger className="nc-grid-3 nc-grid-border-t">
      {steps.map((step) => (
        <StaggerItem key={step.n}>
          <HoverCell className="relative h-full px-5 py-8 md:px-8 md:py-10 nc-grid-border-r last:border-r-0">
            <span className="absolute right-5 top-6 font-mono text-lg text-[var(--nc-muted)] md:right-8">
              ⋯
            </span>
            <p className="font-mono text-sm text-[var(--nc-accent-mint)]">{step.n}</p>
            <SpacedHeading as="h3" className="mt-6 text-lg md:text-xl">
              {step.title}
            </SpacedHeading>
            <p className="nc-muted mt-3 text-sm leading-relaxed">{step.body}</p>
          </HoverCell>
        </StaggerItem>
      ))}
    </Stagger>
  );
}

export function NocturnaQuotesGrid({
  quotes,
}: {
  quotes: { quote: string; name: string; role: string }[];
}) {
  return (
    <div className="nc-grid-2">
      {quotes.map((q) => (
        <Reveal key={q.name}>
          <HoverCell className="h-full px-5 py-10 md:px-10 md:py-12 nc-grid-border-r">
            <p className="text-base leading-relaxed text-white md:text-lg">{q.quote}</p>
            <footer className="mt-8 border-t border-[var(--nc-border)] pt-5">
              <p className="font-mono text-sm text-white">{q.name}</p>
              <p className="nc-muted mt-1 font-mono text-xs">{q.role}</p>
            </footer>
          </HoverCell>
        </Reveal>
      ))}
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();
  return (
    <div className="nc-grid-border-b">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left md:px-10"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="font-mono text-sm text-white md:text-base">{q}</span>
        <motion.span
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: reduced ? 0 : 0.25 }}
          className="text-[var(--nc-accent-mint)]"
        >
          <Plus className="size-4" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={reduced ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <p className="nc-muted px-5 pb-6 font-mono text-sm leading-relaxed md:px-10">{a}</p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function NocturnaFaqSection({
  eyebrow,
  title,
  description,
  items,
}: {
  eyebrow: string;
  title: string;
  description: string;
  items: { q: string; a: string }[];
}) {
  return (
    <NocturnaSection>
      <div className="nc-grid-2 nc-grid-border-b">
        <div className="px-5 py-12 md:px-10 md:py-16 lg:px-14 nc-grid-border-r">
          <NocturnaEyebrow>{eyebrow}</NocturnaEyebrow>
          <SpacedHeading as="h2" className="mt-5 max-w-md text-[clamp(1.75rem,3.5vw,2.5rem)]">
            {title}
          </SpacedHeading>
          <p className="nc-lead mt-5 max-w-sm text-sm">{description}</p>
        </div>
        <div>
          {items.map((item) => (
            <FaqItem key={item.q} q={item.q} a={item.a} />
          ))}
        </div>
      </div>
    </NocturnaSection>
  );
}

export function NocturnaCtaBand({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions: ReactNode;
}) {
  return (
    <NocturnaSection>
      <div className="px-5 py-16 text-center md:px-10 md:py-20">
        <SpacedHeading as="h2" className="text-[clamp(1.65rem,3.5vw,2.65rem)]">
          {title}
        </SpacedHeading>
        <p className="nc-lead mx-auto mt-4 max-w-lg">{description}</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">{actions}</div>
      </div>
    </NocturnaSection>
  );
}

export function NocturnaLogoStrip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="nc-grid-border-b py-8">
      <NocturnaContainer>
        <p className="nc-muted mb-6 text-center font-mono text-[10px] uppercase tracking-[0.22em]">
          {label}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4">{children}</div>
      </NocturnaContainer>
    </div>
  );
}

export function NocturnaListItem({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-2 font-mono text-sm text-[var(--nc-muted)]">
      <Plus className="mt-0.5 size-3 shrink-0 text-[var(--nc-accent-mint)]" />
      <span>{children}</span>
    </li>
  );
}

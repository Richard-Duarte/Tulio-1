import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const ease = [0.22, 1, 0.36, 1] as const;

/** Standalone divider between hero / strips and next block. */
export function SectionWipe() {
  const reduced = useReducedMotion();
  if (reduced) return <div className="nc-section-wipe nc-grid-border-b" aria-hidden />;
  return (
    <motion.div
      className="nc-section-wipe nc-grid-border-b"
      initial={{ scaleX: 0, opacity: 0 }}
      whileInView={{ scaleX: 1, opacity: 1 }}
      viewport={{ once: true, amount: 0.6 }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      aria-hidden
    />
  );
}

/** Section enter: gradient wipe line + content fade/slide (Nocturna scroll feel). */
export function SectionTransition({
  id,
  className,
  children,
  alt,
}: {
  id?: string;
  className?: string;
  children: ReactNode;
  alt?: boolean;
}) {
  const reduced = useReducedMotion();
  if (reduced) {
    return (
      <section id={id} className={cn("nc-section nc-grid-border-b", alt && "nc-section-alt", className)}>
        {children}
      </section>
    );
  }

  return (
    <motion.section
      id={id}
      className={cn("nc-section nc-grid-border-b", alt && "nc-section-alt", className)}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.12, margin: "0px 0px -8% 0px" }}
      variants={{
        hidden: { opacity: 0.35 },
        visible: {
          opacity: 1,
          transition: { duration: 0.85, ease, staggerChildren: 0.06, delayChildren: 0.04 },
        },
      }}
    >
      <motion.div
        className="nc-section-wipe"
        variants={{
          hidden: { scaleX: 0, opacity: 0 },
          visible: {
            scaleX: 1,
            opacity: 1,
            transition: { duration: 0.95, ease },
          },
        }}
        aria-hidden
      />
      <motion.div
        variants={{
          hidden: { opacity: 0, y: 36 },
          visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.75, ease },
          },
        }}
      >
        {children}
      </motion.div>
    </motion.section>
  );
}

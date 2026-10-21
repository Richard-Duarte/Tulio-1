import { Component, type ReactNode } from "react";

/** Isolates one page section: if it throws while rendering, log it and hide only that section. */
export class SectionBoundary extends Component<{ name: string; children: ReactNode; fallback?: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override componentDidCatch(error: unknown, info: { componentStack?: string | null }) {
    console.error(`[section:${this.props.name}] render failed`, error, info?.componentStack);
  }
  override render() {
    return this.state.failed ? (this.props.fallback ?? null) : this.props.children;
  }
}

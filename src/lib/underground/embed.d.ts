// Types for Keta's vendored embed API (embed.js). See README.md in this folder.
export type SceneQuality = "high" | "low";

export interface SceneApi {
  dispose(): void;
  readonly disposed: boolean;
  quality: SceneQuality;
  credits: string[];
  /** CPU time of the last frame (ms) */
  frameMs?: number;
  djMode?: string;
  /** OrbitControls instance (null when controls are off) */
  readonly controls?: unknown;
  /** "auto" | "user" | "blend" in embed mode */
  readonly cameraMode?: string;
  crowdCount?: number;
}

export interface EmbedOptions {
  /** slow automatic camera drift (off automatically with prefers-reduced-motion) */
  orbit?: boolean;
  /** mouse/touch camera control (default true); drag rotates, right-drag pans, ctrl/pinch zooms */
  controls?: boolean;
  /** idle seconds before the auto-orbit resumes after user interaction (default 8) */
  resumeAfter?: number;
  quality?: SceneQuality | "auto";
  /** where the GLBs live, e.g. "/3d/models/" */
  modelsBaseUrl?: string;
  creditsLink?: boolean;
  strobe?: boolean;
  onReady?: (api: SceneApi) => void;
}

export interface EmbedHandle {
  /** resolves once models are loaded and the loop runs */
  ready: Promise<SceneApi>;
  /** frees renderer, GPU resources, listeners, observers and the animation loop */
  dispose(): void;
}

export function mount(target: HTMLElement | HTMLCanvasElement, options?: EmbedOptions): EmbedHandle;
export function detectQuality(): SceneQuality;
export const CREDITS: string[];
export const QUALITY: Record<SceneQuality, Record<string, unknown>>;
export default mount;

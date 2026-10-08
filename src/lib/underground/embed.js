// Programmatic API for using the scene as a page background (e.g. inside a React app).
//
//   import { mount } from './embed.js';
//   const handle = mount(containerOrCanvas, { orbit: true, controls: true, quality: 'auto', modelsBaseUrl: '/underground/models/' });
//   ...
//   handle.dispose();   // frees renderer, GPU resources, listeners, observers and the animation loop
//
// mount() returns synchronously; `handle.ready` resolves with the scene API once models are loaded.
import { createScene, CREDITS, QUALITY, detectQuality } from './app.js';
export { CREDITS, QUALITY, detectQuality };

export function mount(target, options = {}) {
  const { orbit = true, controls = true, resumeAfter = 8, quality = 'auto', modelsBaseUrl, creditsLink = false, strobe = true, onReady } = options;
  if (!target) throw new Error('mount(): container element or canvas required');
  const ac = new AbortController();
  let link = null;
  if (creditsLink && !(target instanceof HTMLCanvasElement)) {
    if (getComputedStyle(target).position === 'static') target.style.position = 'relative';
    link = document.createElement('a');
    link.textContent = 'credits'; link.href = '#';
    link.title = CREDITS.join('\n');
    link.style.cssText = 'position:absolute;right:8px;bottom:6px;font:10px/1 ui-monospace,monospace;color:#fff;opacity:.3;text-decoration:none;z-index:1;';
    link.addEventListener('click', (e) => { e.preventDefault(); alert(CREDITS.join('\n')); });
  }
  const ready = createScene(target, { mode: 'embed', orbit, controls, resumeAfter, quality, modelsBaseUrl, strobe, onReady, signal: ac.signal })
    .then((api) => { if (link && !api.disposed) target.appendChild(link); return api; });
  return {
    ready,
    dispose() { ac.abort(); link?.remove(); },
  };
}
export default mount;

// Load a GLB only if it exists. Static servers return 404, but Vite's dev server
// answers missing files with index.html (200), so verify the 'glTF' magic bytes.
import { modelUrl } from './assets.js';
export async function loadOptionalGLB(loader, url) {
  url = modelUrl(url);
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength < 12 || new TextDecoder().decode(new Uint8Array(buf, 0, 4)) !== 'glTF') return null;
    return await loader.parseAsync(buf, url.slice(0, url.lastIndexOf('/') + 1));
  } catch (e) { console.warn('optional model not loaded:', url, e); return null; }
}

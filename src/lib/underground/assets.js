// Where the GLB files live. Layout URLs are written as 'models/<file>.glb'; mount({ modelsBaseUrl })
// rewrites the 'models/' prefix (e.g. '/underground/models/' or 'https://cdn.example.com/scene/models/').
let modelsBase = 'models/';
export function setModelsBase(base) { modelsBase = base ? (base.endsWith('/') ? base : base + '/') : 'models/'; }
export const modelUrl = (u) => u.replace(/^models\//, modelsBase);

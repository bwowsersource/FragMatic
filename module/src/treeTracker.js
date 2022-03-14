const includeTree = {};
const rootMap = new WeakMap();
function createCtx() {
  return {};
}
export const dupeCheck = (key) => !includeTree[key];

export function bindKey(elmnt, key) {
  // const [,...path]=filePath.replace(/^(.*)\/$/, '$1').split('/');
  const src = elmnt.getAttribute("src");
  const shadowRoot = elmnt.shadowRoot;
  elmnt.setAttribute("included", key);
  includeTree[key] = { src, key, elmnt, ctx: createCtx(), shadowRoot }; // not useful now
  rootMap.set(shadowRoot, key);
}

export function promaxLookup(key) {
  const promaxBinding = includeTree[key];
  if (!promaxBinding) throw new Error("Promax binding not found");
  return { ...promaxBinding };
}

export function promaxLookupByRoot(shadowRoot) {
  const key = rootMap.get(shadowRoot);
  return promaxLookup(key);
}

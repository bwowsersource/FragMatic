const includeTree = {};

function createCtx() {
  return {};
}
export const dupeCheck = (key) => !includeTree[key];

export function bindKey(elmnt, key, src) {
  // const [,...path]=filePath.replace(/^(.*)\/$/, '$1').split('/');
  elmnt.setAttribute("included", key);
  includeTree[key] = { src, key, elmnt, ctx: createCtx() }; // not useful now
}

export function promaxLookup(key) {
  const promaxBinding = includeTree[key];
  if (!promaxBinding) throw new Error("Promax binding not found");
  return { ...promaxBinding };
}

export function depthBreak(depth) {
  if (depth > 99) {
    throw new Error("Maximum include depth reached!!");
  }
}

export function makeKey(dupeCheck, depth = 0) {
  depthBreak(depth);
  const key = btoa(Math.random().toString()).substring(2, 10);
  if (dupeCheck(key)) return key;
  return makeKey(dupeCheck, depth + 1);
}

export function memoRenderer() {
  let lastArgsMap = new Map();
  return function (name, args, renderer) {
    const lastArgs = lastArgsMap.get(name);
    if (
      lastArgs &&
      lastArgs.every((lastArg, i) => args[i] === lastArg)
      // skip render if value is undefined
    ) {
      return; //dont render
    }
    lastArgsMap.set(name, args);
    renderer();
  };
}

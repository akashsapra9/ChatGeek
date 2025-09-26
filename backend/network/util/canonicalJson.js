// Deterministic JSON stringify: recursively sort object keys.
function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    const out = {};
    for (const k of Object.keys(value).sort()) out[k] = sortKeys(value[k]);
    return out;
  }
  return value;
}

function canonicalize(obj) {
  return JSON.stringify(sortKeys(obj));
}

module.exports = { canonicalize };

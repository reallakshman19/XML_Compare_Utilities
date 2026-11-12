import { readCii14 } from '../vendor/kit/cii14.mjs';
import { require, sha256Hex } from '../vendor/kit/core.mjs';

export function rigidInventory(bytes) {
  const cii = readCii14(bytes);
  // The inventory promises millimetres and kg. Do not silently reinterpret other units.
  const units = cii.sections.get('UNITS') || [];
  require(units[6]?.text.trim().toLowerCase().replace(/\.$/,'') === 'mm' && units[8]?.text.trim().toLowerCase().replace(/\.$/,'') === 'kg',
    'WEIGHTS_UNITS_UNSUPPORTED', 'UNITS', 'Expected mm and kg in the CII file.');
  return cii.rigids.map(r => {
    const e = cii.elements[r.element], f = e.fields;
    return { elementIndex: e.index, fromNode: String(e.from), toNode: String(e.to),
      lengthMm: Math.hypot(f.DX.value, f.DY.value, f.DZ.value), boreMm: f.DIAMETER.value,
      rigidPointer: r.pointer, weightToken: r.weight.token, weight: r.weight.value, typeToken: r.type.token };
  }).sort((a,b) => a.elementIndex-b.elementIndex);
}
export async function baseFor(bytes, fileName) {
  return {kind:'cii', fileName, sha256:await sha256Hex(bytes)};
}

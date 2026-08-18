/**
 * elements.js — Parse #$ ELEMENTS section of CAESAR II neutral file.
 *
 * Neutral file element block structure (CAESAR II v11):
 *   Row 1 (geom)  : FROM  TO  DX  DY  DZ  OD                     (6 values)
 *   Row 2 (matl)  : WALL  INSUL  CORR  T1  T2  FLUID_DENS         (6 values)
 *   Row 3         : zeros                                          (6 values)
 *   Row 4 (press) : P1  zeros                                      (6 values)
 *   Rows 5–9      : material props (thermal exp, moduli, density)  (various)
 *   Row 10        : 0 (single)
 *   Row 11        : 0 or "N unassigned" (text → filtered)
 *   Separator     : -1  -1  (length < 5 → filtered)
 *   Flag rows     : 3 rows of integer flags                        (filtered by isNodeLike)
 *
 * CAESAR II neutral records are fixed-field/Fortran-style records. A negative
 * field may start immediately after a positive field without whitespace, so
 * whitespace splitting is not a valid primary decoder for canonical rows.
 *
 * Absolute node positions are computed by walking cumulative DX/DY/DZ from node 1.
 */

import { pipeLength } from '../../utils/formatter.js';
import { decodeCiiNumericRow } from '../fixed-field.js';

/** Default material properties (Carbon Steel ASTM A106 Gr. B) */
const CS_DEFAULTS = {
  E_cold:  203390.7, // MPa
  E_hot:   178960.6, // MPa at ~350°C
  density: 7.833e-3, // kg/cm³ → display as 7833 kg/m³
  poisson: 0.292,
  material: 'CS',
};

export function parseElements(lines, log) {
  const elements = [];
  const nodes = {};

  // Decode canonical 80-column rows by field position. The decoder retains a
  // whitespace fallback only for shorter/non-canonical legacy numeric rows.
  const dataLines = lines
    .filter(l => l.trim() && !l.trim().startsWith('*'))
    .map(l => decodeCiiNumericRow(l))
    .filter(parts =>
      Array.isArray(parts) &&
      parts.length >= 5 &&           // need at least 5 values
      Number.isFinite(parts[0]) &&
      Number.isFinite(parts[1])
    );

  if (!dataLines.length) {
    log.push({ level: 'WARN', msg: 'ELEMENTS: no parseable data rows found' });
    return { elements, nodes };
  }

  /**
   * Node-like: positive integer (node IDs in CAESAR II neutral are like 1.00000, 5.00000)
   * BUT we must NOT misidentify temperature values (350.000) or pressure (30.000) as node starts.
   * Key heuristic: element row has OD > 10mm as 6th value.
   * The pair (from, to) must both be positive integers and the decoded row must
   * contain the six canonical element-header values.
   */
  const isElemRow = (p) => {
    const from = p[0], to = p[1];
    // Both must be positive integers (node IDs)
    if (!Number.isInteger(from) || from <= 0 || from > 99999) return false;
    if (!Number.isInteger(to)   || to   <= 0 || to   > 99999) return false;
    if (from === to) return false; // self-loop not valid
    if (p.length < 6 || !Number.isFinite(p[5])) return false;
    // The 6th value (index 5) is OD — must be > 10mm to be a valid pipe element row.
    // This also filters out common integer flag rows in the element block.
    if (p[5] <= 10) return false;
    return true;
  };

  // Pass 1: split into element blocks using isElemRow as block start
  const elemRows  = [];
  const propRows  = [];
  let curIdx = -1;

  for (const p of dataLines) {
    if (isElemRow(p)) {
      curIdx++;
      elemRows[curIdx] = p;
      propRows[curIdx] = [];
    } else if (curIdx >= 0) {
      propRows[curIdx].push(p);
    }
  }

  if (!elemRows.length) {
    log.push({ level: 'WARN', msg: 'ELEMENTS: no element start rows detected — check file format' });
    return { elements, nodes };
  }

  // Pass 2: build absolute node positions starting from node 1 = (0,0,0)
  const firstFrom = Math.round(elemRows[0][0]);
  nodes[firstFrom] = { x: 0, y: 0, z: 0 };

  for (let idx = 0; idx < elemRows.length; idx++) {
    const p     = elemRows[idx];
    const props = propRows[idx] ?? [];

    const from = Math.round(p[0]);
    const to   = Math.round(p[1]);
    const dx   = p[2] ?? 0;
    const dy   = p[3] ?? 0;
    const dz   = p[4] ?? 0;
    const od   = p[5] ?? 0;

    // A decoded element row must never degrade an invalid numeric field to a
    // geometric zero. Guard explicitly even though decodeCiiNumericRow already
    // rejects invalid occupied fixed fields.
    if (![dx, dy, dz, od].every(Number.isFinite)) {
      log.push({ level: 'ERROR', msg: `ELEMENTS: invalid fixed-field geometry for ${from}→${to}` });
      continue;
    }

    // Ensure from-node has a position
    if (!nodes[from]) {
      log.push({ level: 'WARN', msg: `Node ${from}: no known position — using previous node or origin` });
      nodes[from] = { x: 0, y: 0, z: 0 };
    }

    const origin = nodes[from];
    const toPos  = { x: origin.x + dx, y: origin.y + dy, z: origin.z + dz };
    if (!nodes[to]) {
      nodes[to] = toPos;
    }

    // ── Extract properties from rows 2–6 ─────────────────────────────
    // props[0] = Row 2: [wall, insul, corr, T1, T2, fluid_dens]
    // props[1] = Row 3: zeros
    // props[2] = Row 4: [P1, zeros...]
    // props[4] = Row 6: [thermal_exp, zeros...]
    const r2 = props[0] ?? [];
    const r4 = props[2] ?? [];

    const wall  = r2[0] ?? 0;
    const insul = r2[1] ?? 0;
    const corrosion = r2[2] ?? 0;
    const T1    = r2[3] ?? 0;   // Operating temp 1
    const T2    = r2[4] ?? 0;   // Operating temp 2

    // P1: first non-zero, non-9999 value in Row 4
    let P1 = r4[0] ?? 0;
    if (P1 === 9999.99 || P1 < 0) P1 = 0;

    // Material defaults (not directly stored in neutral element rows)
    const { E_cold, E_hot, density, poisson, material } = CS_DEFAULTS;

    const len = pipeLength(dx, dy, dz);

    elements.push({
      index: idx,
      from,
      to,
      dx, dy, dz,
      od,
      wall,
      insul,
      corrosion,
      T1,
      T2,
      P1,
      E_cold,
      E_hot,
      density,
      poisson,
      material,
      length: len,
      fromPos: { ...origin },
      toPos:   { ...toPos },
      hasBend: false, // set later by bends.js attach
    });
  }

  log.push({
    level: 'INFO',
    msg: `ELEMENTS: ${elements.length} element(s) parsed → ${Object.keys(nodes).length} unique node(s)`
  });

  if (elements.length > 0) {
    // Log property summary (only when we have elements to summarise)
    const uniqueODs = [...new Set(elements.map(e => e.od.toFixed(1)))];
    const T1s = elements.map(e => e.T1);
    const P1s = elements.map(e => e.P1);
    log.push({
      level: 'INFO',
      msg: `ELEMENTS: OD sizes detected → ${uniqueODs.join(', ')} mm`
    });
    log.push({
      level: 'INFO',
      msg: `ELEMENTS: T1 range ${Math.min(...T1s)}–${Math.max(...T1s)}°C | P1 range ${Math.min(...P1s)}–${Math.max(...P1s)} bar | Material: ${CS_DEFAULTS.material} (default)`
    });
  }

  return { elements, nodes };
}

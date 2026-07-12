/**
 * nodeset-builder.js — parsed table + NodeSetMapping.v1 → NodeSet model + XML.
 *
 * Schema nodeset/v1:
 *   <NodeSet schema="nodeset/v1" name="..." unit="mm">
 *     <Node id="PS-01" e="0" n="100000" u="3000" bore="250" tag="/PS06617">
 *       <Prop name="LINE" value="..."/>
 *       <Support kind="REST" detail="REST-300"/>
 *     </Node>
 *   </NodeSet>
 */

import { encodeXmlAttribute } from '../core/simple-xml.js';
import { extractNumber, splitList, supportKindOf, combinedRules, UNIT_SCALES, boreToNb } from './text-to-number.js';
import { extractPoints, resolveGroups, mergeGroupedRows } from './grouping-resolver.js';
import { detectLoadCaseGroups, buildLoadProps } from './load-cases.js';
import { buildMeasureProps } from './measures.js';
import { classifyRemarks } from '../compare/remarks-classifier.js';

export const NODESET_SCHEMA = 'nodeset/v1';

function columnValue(row, col) {
  return String(row.rawByColumnId?.[col.columnId] ?? '').trim();
}

/** Distinct revision values in table order (when a revision column is mapped). */
export function discoverRevisions(source, mapping) {
  const revCol = (mapping?.columns ?? []).find((c) => c.role === 'revision');
  if (!revCol) return [];
  const seen = [];
  for (const row of source?.rows ?? []) {
    const value = String(row.rawByColumnId?.[revCol.columnId] ?? '').trim();
    if (value && !seen.includes(value)) seen.push(value);
  }
  return seen;
}

/**
 * Build the NodeSet model from a parsed source + mapping.
 * Applies grouping (when enabled) before field extraction.
 * @param {object} options { revisionFilter?: string } — keep only rows of one revision
 * @returns { schema, name, unit, nodes, diagnostics }
 */
export function buildNodeSetModel(source, mapping, customRules = [], name = '', options = {}) {
  const rules = combinedRules(customRules);
  const diagnostics = [];
  const byRole = (role) => mapping.columns.filter((c) => c.role === role);
  const idCol = byRole('node-id')[0] ?? null;
  const tagCols = byRole('tag');
  const boreCol = byRole('bore')[0] ?? null;
  const supportCols = byRole('support-types');
  const propCols = byRole('prop');
  const childCol = byRole('child-list')[0] ?? null;
  const childRefCol = byRole('child-ref')[0] ?? null;
  const revCol = byRole('revision')[0] ?? null;
  const remarksCol = byRole('remarks')[0] ?? null;
  const loadCases = detectLoadCaseGroups(byRole('load'));
  const measureCols = byRole('measure');
  const hasCoord = byRole('coord-combined').length + byRole('coord-e').length + byRole('coord-n').length + byRole('coord-u').length > 0;
  const exploded = mapping.grain === 'exploded' && childCol;

  // 0. revision filter (multi-revision registers: keep one revision per model)
  let baseRows = source.rows;
  if (options.revisionFilter !== undefined && options.revisionFilter !== null && revCol) {
    const wanted = String(options.revisionFilter).trim();
    baseRows = source.rows.filter((row) => columnValue(row, revCol) === wanted);
    diagnostics.push({ severity: 'INFO', message: `Revision filter "${wanted}": ${baseRows.length} of ${source.rows.length} row(s).` });
    if (!baseRows.length) diagnostics.push({ severity: 'ERROR', message: `No rows carry revision "${wanted}".` });
  }
  const baseSource = { rows: baseRows };

  // 1. group duplicate-coordinate rows when enabled (explosion replaces grouping)
  let workingRows = baseRows;
  if (mapping.grouping?.enabled && !exploded) {
    const groups = resolveGroups(baseSource, mapping, customRules);
    const rowById = new Map(baseRows.map((r) => [r.rowId, r]));
    workingRows = groups.clusters.map((cluster) => {
      const rows = cluster.rowIds.map((id) => rowById.get(id)).filter(Boolean);
      return rows.length > 1 ? mergeGroupedRows(rows, mapping) : rows[0];
    });
    diagnostics.push({ severity: 'INFO', message: `Grouping: ${baseRows.length} row(s) → ${workingRows.length} node(s) (${groups.duplicateClusters} duplicate cluster(s)).` });
    for (const diag of groups.diagnostics) diagnostics.push({ severity: 'WARNING', message: `${diag.rowId}: ${diag.message}` });
  }

  // 2. extract coordinates per (possibly merged) row. Coordinate-less tables
  //    (MTO/sales KPI grids) get a synthetic grid so the graph is valid and
  //    key/measure matching still works.
  const workingSource = { rows: workingRows };
  let points;
  if (hasCoord) {
    points = extractPoints(workingSource, mapping, customRules);
  } else {
    const cols = Math.max(1, Math.ceil(Math.sqrt(workingRows.length)));
    points = workingRows.map((row, i) => ({ rowId: row.rowId, row, point: { e: (i % cols) * 1000, n: Math.floor(i / cols) * 1000, u: 0 }, issues: [] }));
    diagnostics.push({ severity: 'INFO', message: `No coordinate columns — ${workingRows.length} node(s) laid out on a synthetic grid (matched by key/measure).` });
  }

  const nodes = [];
  const seenIds = new Set();
  const uniqueIdFor = (id) => {
    let uniqueId = id;
    let suffix = 2;
    while (seenIds.has(uniqueId)) uniqueId = `${id}#${suffix++}`;
    seenIds.add(uniqueId);
    return uniqueId;
  };
  const pushNode = (row, point, { id, supports, extraProps = [] }) => {
    let bore = null;
    if (boreCol) {
      const raw = columnValue(row, boreCol).split(mapping.grouping?.separator ?? '|')[0];
      const result = extractNumber(raw, rules);
      if (result.ok) {
        const scaled = result.unit ? result.value : result.value * (UNIT_SCALES[boreCol.unit] ?? 1);
        bore = result.unit === 'in' ? boreToNb(scaled, 'in') : scaled;
      }
    }
    const props = [...extraProps];
    for (const col of tagCols.slice(1)) {
      const value = columnValue(row, col);
      if (value) props.push({ name: col.propName || col.header, value });
    }
    for (const col of propCols) {
      const value = columnValue(row, col);
      if (value) props.push({ name: col.propName || col.header, value });
    }
    nodes.push({
      id: uniqueIdFor(id),
      e: Number(point.e.toFixed(3)),
      n: Number(point.n.toFixed(3)),
      u: Number(point.u.toFixed(3)),
      bore,
      tag: tagCols[0] ? columnValue(row, tagCols[0]) : '',
      props,
      supports,
    });
  };

  points.forEach((entry, index) => {
    if (!entry.point) {
      diagnostics.push({ severity: 'WARNING', message: `${entry.rowId}: skipped — ${entry.issues.join('; ') || 'no coordinate'}` });
      return;
    }
    const row = entry.row ?? workingRows[index];
    const rowId = idCol ? columnValue(row, idCol) : '';

    // Row-level props shared by both grains: remarks + classified flags + loads.
    const rowProps = [];
    if (remarksCol) {
      const remarks = columnValue(row, remarksCol);
      if (remarks) {
        rowProps.push({ name: 'REMARKS', value: remarks });
        const flags = classifyRemarks(remarks);
        if (flags.length) rowProps.push({ name: 'FLAGS', value: flags.join('|') });
      }
    }
    if (revCol) {
      const rev = columnValue(row, revCol);
      if (rev) rowProps.push({ name: 'REVISION', value: rev });
    }
    for (const [key, value] of Object.entries(buildLoadProps(row, loadCases, rules))) {
      rowProps.push({ name: key, value: String(value) });
    }
    for (const [key, value] of Object.entries(buildMeasureProps(row, measureCols, rules))) {
      rowProps.push({ name: key, value: String(value) });
    }

    if (exploded) {
      // One node per child support-list entry (exploded support-point grain).
      const children = splitList(columnValue(row, childCol), /[,;|]\s*/);
      const types = supportCols[0] ? splitList(columnValue(row, supportCols[0]), /[,;|]\s*/) : [];
      const refs = childRefCol ? splitList(columnValue(row, childRefCol), /[,;|]\s*/) : [];
      if (!children.length) {
        diagnostics.push({ severity: 'WARNING', message: `${entry.rowId}: skipped — empty child support list` });
        return;
      }
      if (types.length && types.length !== children.length) {
        diagnostics.push({ severity: 'WARNING', message: `${entry.rowId}: child list has ${children.length} id(s) but ${types.length} type(s) — zipped by index` });
      }
      children.forEach((child, childIndex) => {
        const type = types[childIndex] ?? '';
        const extraProps = [...rowProps];
        if (rowId) extraProps.push({ name: 'PARENT', value: rowId });
        if (refs[childIndex]) extraProps.push({ name: 'REF', value: refs[childIndex] });
        pushNode(row, entry.point, {
          id: child.replace(/^\//, ''),
          supports: type ? [{ kind: supportKindOf(type), detail: type }] : [],
          extraProps,
        });
      });
      return;
    }

    const supports = [];
    for (const col of supportCols) {
      for (const item of splitList(columnValue(row, col), /[,;|]\s*/)) {
        supports.push({ kind: supportKindOf(item), detail: item });
      }
    }
    pushNode(row, entry.point, { id: rowId || `N${index + 1}`, supports, extraProps: rowProps });
  });
  if (exploded) diagnostics.push({ severity: 'INFO', message: `Exploded grain: ${points.filter((p) => p.point).length} row(s) → ${nodes.length} support point node(s).` });
  if (!nodes.length) diagnostics.push({ severity: 'ERROR', message: 'No nodes produced — check coordinate column mapping.' });
  return { schema: NODESET_SCHEMA, name: name || source.sourceName || 'table', unit: 'mm', nodes, diagnostics };
}

export function serializeNodeSetXml(model) {
  const lines = ['<?xml version="1.0" encoding="UTF-8"?>'];
  lines.push(`<NodeSet schema="${NODESET_SCHEMA}" name="${encodeXmlAttribute(model.name)}" unit="${encodeXmlAttribute(model.unit || 'mm')}">`);
  for (const node of model.nodes) {
    const attrs = [`id="${encodeXmlAttribute(node.id)}"`, `e="${node.e}"`, `n="${node.n}"`, `u="${node.u}"`];
    if (node.bore !== null && node.bore !== undefined && Number.isFinite(node.bore)) attrs.push(`bore="${node.bore}"`);
    if (node.tag) attrs.push(`tag="${encodeXmlAttribute(node.tag)}"`);
    const children = [
      ...node.props.map((p) => `    <Prop name="${encodeXmlAttribute(p.name)}" value="${encodeXmlAttribute(p.value)}"/>`),
      ...node.supports.map((s) => `    <Support kind="${encodeXmlAttribute(s.kind)}" detail="${encodeXmlAttribute(s.detail)}"/>`),
    ];
    if (children.length) {
      lines.push(`  <Node ${attrs.join(' ')}>`);
      lines.push(...children);
      lines.push('  </Node>');
    } else {
      lines.push(`  <Node ${attrs.join(' ')}/>`);
    }
  }
  lines.push('</NodeSet>');
  return lines.join('\n');
}

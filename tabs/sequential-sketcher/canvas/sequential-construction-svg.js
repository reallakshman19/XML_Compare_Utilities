import { escapeHtml } from '../sequential-sketcher-contract.js';
import { createViewportTransform, projectPlantPoint } from '../sequential-sketcher-projection.js';

function project(value, mode) { return value ? projectPlantPoint(value, mode) : null; }
function line(parts, a, b, className, attrs = '') {
  if (!a || !b) return;
  parts.push(`<line ${attrs} x1="${a.x.toFixed(2)}" y1="${a.y.toFixed(2)}" x2="${b.x.toFixed(2)}" y2="${b.y.toFixed(2)}" class="${className}"/>`);
}
function polylinePoints(points) { return points.filter(Boolean).map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(' '); }
function transformedPoint(transform, point, mode) { const projected = project(point, mode); return projected ? transform(projected) : null; }
function commandPoints(command) {
  return [command.entryPosition, command.exitPosition, command.centre, command.branchPosition, command.hostPosition, command.fromPosition, command.toPosition].filter(Boolean);
}
function allPlantPoints(session) {
  const confirmed = session.strokeLedger.flatMap(commandPoints);
  const candidates = session.currentDecisionRequest?.candidates?.flatMap((candidate) => [candidate.fromPosition, candidate.toPosition]) || [];
  return [...confirmed, ...candidates];
}

function reducerPolygon(a, b, inletWidth, outletWidth) {
  if (!a || !b) return [];
  const dx = b.x - a.x; const dy = b.y - a.y; const length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length; const ny = dx / length;
  return [
    { x: a.x + nx * inletWidth, y: a.y + ny * inletWidth },
    { x: b.x + nx * outletWidth, y: b.y + ny * outletWidth },
    { x: b.x - nx * outletWidth, y: b.y - ny * outletWidth },
    { x: a.x - nx * inletWidth, y: a.y - ny * inletWidth },
  ];
}

function renderConfirmedCommand(parts, command, transform, mode) {
  const a = transformedPoint(transform, command.entryPosition || command.fromPosition, mode);
  const b = transformedPoint(transform, command.exitPosition || command.toPosition, mode);
  const centre = transformedPoint(transform, command.centre, mode);
  if (command.op === 'DRAW_PIPE') line(parts, a, b, 'ssk-confirmed ssk-pipe', `data-ssk-component-id="${escapeHtml(command.componentId)}"`);
  else if (command.op === 'DRAW_VIRTUAL_REPAIR') line(parts, a, b, 'ssk-confirmed-repair', `data-ssk-repair-id="${escapeHtml(command.connectionId)}"`);
  else if (command.op === 'DRAW_ELBOW') {
    if (a && b && centre) parts.push(`<path data-ssk-component-id="${escapeHtml(command.componentId)}" d="M${a.x.toFixed(2)} ${a.y.toFixed(2)} Q${centre.x.toFixed(2)} ${centre.y.toFixed(2)} ${b.x.toFixed(2)} ${b.y.toFixed(2)}" class="ssk-confirmed ssk-elbow"/>`);
    else line(parts, a, b, 'ssk-confirmed ssk-elbow', `data-ssk-component-id="${escapeHtml(command.componentId)}"`);
  } else if (command.op === 'DRAW_REDUCER') {
    const inlet = Math.max(5, Math.min(16, Number(command.inletBoreMm || 80) / 18));
    const outlet = Math.max(3, Math.min(14, Number(command.outletBoreMm || 50) / 18));
    const points = reducerPolygon(a, b, inlet, outlet);
    if (points.length) parts.push(`<polygon data-ssk-component-id="${escapeHtml(command.componentId)}" points="${polylinePoints(points)}" class="ssk-confirmed-fitting ssk-reducer"/>`);
  } else if (command.op === 'DRAW_TEE_RUN') {
    line(parts, a, b, 'ssk-confirmed ssk-tee-run', `data-ssk-component-id="${escapeHtml(command.componentId)}"`);
    const branch = transformedPoint(transform, command.branchPosition, mode);
    const anchor = centre || (a && b ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : null);
    line(parts, anchor, branch, 'ssk-confirmed ssk-tee-branch');
  } else if (command.op === 'DRAW_OLET') {
    const host = transformedPoint(transform, command.hostPosition, mode);
    const branch = transformedPoint(transform, command.branchPosition, mode);
    if (host) parts.push(`<circle cx="${host.x.toFixed(2)}" cy="${host.y.toFixed(2)}" r="5" class="ssk-confirmed-fitting ssk-olet"/>`);
    line(parts, host, branch, 'ssk-confirmed ssk-olet-branch');
  } else if (command.op === 'DRAW_VALVE') {
    if (a && b) {
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      line(parts, a, b, 'ssk-confirmed ssk-valve-line');
      parts.push(`<path d="M${mid.x - 10} ${mid.y - 8} L${mid.x} ${mid.y} L${mid.x - 10} ${mid.y + 8} Z M${mid.x + 10} ${mid.y - 8} L${mid.x} ${mid.y} L${mid.x + 10} ${mid.y + 8} Z" class="ssk-confirmed-fitting ssk-valve"/>`);
    }
  } else if (command.op === 'DRAW_FLANGE' || command.op === 'DRAW_GASKET') {
    line(parts, a, b, 'ssk-confirmed ssk-inline-fitting');
    if (a && b) {
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const dx = b.x - a.x; const dy = b.y - a.y; const length = Math.hypot(dx, dy) || 1;
      const nx = -dy / length; const ny = dx / length; const half = command.op === 'DRAW_FLANGE' ? 10 : 7;
      line(parts, { x: mid.x - nx * half, y: mid.y - ny * half }, { x: mid.x + nx * half, y: mid.y + ny * half }, 'ssk-confirmed-fitting ssk-flange');
    }
  } else if (command.op === 'DRAW_CAP') {
    const at = transformedPoint(transform, command.entryPosition, mode);
    if (at) parts.push(`<rect x="${(at.x - 5).toFixed(2)}" y="${(at.y - 5).toFixed(2)}" width="10" height="10" class="ssk-confirmed-fitting ssk-cap"/>`);
  }
}

export function renderSequentialConstructionCanvas(host, session, options = {}) {
  const width = Math.max(640, Number(options.width) || 1000);
  const height = Math.max(420, Number(options.height) || 660);
  const mode = options.mode || 'ISO';
  const projected = allPlantPoints(session).map((point) => project(point, mode)).filter(Boolean);
  if (!projected.length) {
    host.innerHTML = '<div class="ssk-empty"><strong>No confirmed construction</strong><span>Start the selected branch to place the first proven component.</span></div>';
    return;
  }
  const transform = createViewportTransform(projected, width, height);
  const parts = [`<svg class="ssk-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Gated sequential piping construction">`, '<defs><pattern id="ssk-grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="rgba(148,163,184,.11)" stroke-width="1"/></pattern></defs>', `<rect width="${width}" height="${height}" fill="url(#ssk-grid)"/>`, '<g data-ssk-layer="confirmed-geometry">'];
  for (const command of session.strokeLedger) renderConfirmedCommand(parts, command, transform, mode);
  parts.push('</g><g data-ssk-layer="candidate-connections">');
  for (const candidate of session.currentDecisionRequest?.candidates || []) {
    const from = transformedPoint(transform, candidate.fromPosition, mode);
    const to = transformedPoint(transform, candidate.toPosition, mode);
    if (!from || !to) continue;
    line(parts, from, to, `ssk-candidate${candidate.candidateId === options.selectedCandidateId ? ' is-selected' : ''}`, `data-ssk-candidate-id="${escapeHtml(candidate.candidateId)}" tabindex="0" role="button"`);
    parts.push(`<text x="${((from.x + to.x) / 2 + 6).toFixed(2)}" y="${((from.y + to.y) / 2 - 6).toFixed(2)}" class="ssk-candidate-label">${escapeHtml(candidate.gapMm.toFixed(1))} mm</text>`);
  }
  parts.push('</g>');
  const activePort = session.currentDecisionRequest?.candidates?.[0]?.fromPosition;
  const active = transformedPoint(transform, activePort, mode);
  if (active) parts.push(`<g data-ssk-layer="active-port"><circle cx="${active.x.toFixed(2)}" cy="${active.y.toFixed(2)}" r="10" class="ssk-active-port"/></g>`);
  parts.push('</svg>');
  host.innerHTML = parts.join('');
}

export function renderConstructionMetrics(host, session) {
  const metrics = [
    ['State', session.state],
    ['Components', session.confirmedComponentIds.length],
    ['Connections', session.committedConnections.length],
    ['Repairs', session.repairLedger.length],
    ['Pending branches', session.pendingBranchJunctions.length],
    ['Decisions', session.decisionLedger.length],
  ];
  host.innerHTML = metrics.map(([label, value]) => `<div><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div>`).join('');
}

export function renderConstructionSequence(host, session) {
  host.innerHTML = session.strokeLedger.map((command, index) => `<button type="button" disabled><span>${String(index + 1).padStart(2, '0')}</span><b>${escapeHtml(command.op)}</b><small>${escapeHtml(command.sourceComponentId || command.connectionId || command.branchId || '')}</small></button>`).join('');
}

export function renderConstructionInspector(host, session, evidenceIndexes, selectedCandidateId = '') {
  const activePort = evidenceIndexes?.ports?.get(session.activeExitPortId);
  const request = session.currentDecisionRequest;
  const candidates = request?.candidates || [];
  const candidateHtml = candidates.length ? candidates.map((candidate, index) => `<article class="ssk-candidate-card${candidate.candidateId === selectedCandidateId ? ' is-selected' : ''}" data-ssk-candidate-card="${escapeHtml(candidate.candidateId)}"><header><b>Candidate ${index + 1}</b><span>${escapeHtml(candidate.gapMm.toFixed(2))} mm</span></header><p>${escapeHtml(candidate.targetSourceComponentId)}<br>${escapeHtml(candidate.targetBranchId)}</p><dl><dt>Direction</dt><dd>${candidate.directionAngleDeg === null ? 'unknown' : `${candidate.directionAngleDeg.toFixed(1)}°`}</dd><dt>Bore</dt><dd>${escapeHtml(candidate.boreCompatibility)}</dd><dt>Evidence</dt><dd>${escapeHtml([candidate.referenceMatch ? 'reference' : '', candidate.sourceAdjacent ? 'source sequence' : ''].filter(Boolean).join(', ') || 'proximity only')}</dd></dl><div><button type="button" data-ssk-select-candidate="${escapeHtml(candidate.candidateId)}">Preview</button><button type="button" data-ssk-connect-candidate="${escapeHtml(candidate.candidateId)}">Connect</button><button type="button" data-ssk-reject-candidate="${escapeHtml(candidate.candidateId)}">Reject</button></div></article>`).join('') : '<p>No eligible continuation candidate.</p>';
  host.innerHTML = `<section><h3>Construction session</h3><dl><dt>State</dt><dd>${escapeHtml(session.state)}</dd><dt>Branch</dt><dd>${escapeHtml(session.activeBranchId || '—')}</dd><dt>Component</dt><dd>${escapeHtml(evidenceIndexes?.components?.get(session.activeComponentId)?.sourceComponentId || '—')}</dd><dt>Active port</dt><dd>${escapeHtml(activePort?.role || '—')}</dd></dl></section>${request ? `<section class="ssk-decision-panel"><h3>Construction stopped</h3><p><b>${escapeHtml(request.reason)}</b></p><div class="ssk-candidate-list">${candidateHtml}</div><div class="ssk-decision-actions"><button type="button" data-ssk-decision-action="MARK_TERMINAL">Mark intentional terminal</button><button type="button" data-ssk-decision-action="MARK_EXTERNAL_BOUNDARY">Mark external boundary</button></div></section>` : '<section><h3>Continuity gate</h3><p>Construction is clear to advance. Only proven components are shown.</p></section>'}`;
}

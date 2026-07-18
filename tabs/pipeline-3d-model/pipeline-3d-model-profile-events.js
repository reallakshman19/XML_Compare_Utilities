import { interpolateXY } from './pipeline-3d-model-geometry.js';
import {
  activeDepthRule,
  formatProfileValue,
  interpolateGrade,
  roundProfileValue,
  table3RouteDistance,
  validateRouteDistance,
} from './pipeline-3d-model-profile-coordinate-map.js';
import { addPipelineWarning } from './pipeline-3d-model-warning-log.js';

const EPSILON = 1e-6;
const ROUTE_TOLERANCE = 0.5;
const GRADE_RULE = Object.freeze({ zOffset: 0, mode: 'grade', zText: 'GRADE' });

function event(type, distance, label, order = 50, depthRule = null, metadata = {}) {
  return { type, distance, label, order, depthRule, metadata };
}

export function buildVertexEvents(points, segments) {
  let cumulative = 0;
  return points.map((point, index) => {
    if (index > 0) cumulative = segments[index - 1].end;
    return event('vertex', cumulative, point.label, 10, null, { point });
  });
}

export function buildTable2Events(rows) {
  return rows.map((row) => event('table2', row.distance, row.label, 20, null, row));
}

export function buildTable3AnchorEvents(profile, context) {
  return profile.coordinateMap.anchors.map((anchor, index) => event(
    'table3-anchor',
    validateRouteDistance(
      context.table3OriginRoute + anchor.cumulative,
      context.total,
      `Table 3 cumulative ${anchor.cumulative}`,
      context.warnings,
    ),
    `HL ${Number(anchor.cumulative).toFixed(1)}`,
    30,
    null,
    { absoluteH: anchor.absoluteH, cumulative: anchor.cumulative, index },
  ));
}

function hasBoundaryPeer(rules, rule, key, peerKey) {
  return rules.some((candidate) => candidate !== rule
    && !candidate.pointOnly
    && Math.abs(candidate[peerKey] - rule[key]) <= EPSILON);
}

export function buildDepthEvents(rules) {
  const events = [];
  for (const rule of rules) {
    if (rule.pointOnly) {
      events.push(event('depth', rule.start, rule.zText, 45, rule));
      continue;
    }
    if (!hasBoundaryPeer(rules, rule, 'start', 'end')) {
      events.push(event('grade-end', rule.start, 'GRADE END', 5, GRADE_RULE));
    }
    events.push(event('depth-start', rule.start, `${rule.zText} START`, 60, rule));
    events.push(event('depth-end', rule.end, `${rule.zText} END`, 40, rule));
    if (!hasBoundaryPeer(rules, rule, 'end', 'start')) {
      events.push(event('grade-start', rule.end, 'GRADE START', 65, GRADE_RULE));
    }
  }
  return events;
}

export function buildMarkerEvents(profile, context) {
  return profile.table3MarkerRows
    .filter((row) => Number.isFinite(row.absoluteH) && row.markerText && row.markerText !== '—')
    .map((row) => event(
      'marker',
      table3RouteDistance(row.absoluteH, profile, context),
      row.markerText,
      50,
      null,
      { absoluteH: row.absoluteH, sourceId: row.id },
    ));
}

function mergeLabel(current, next) {
  if (!current) return next || '';
  if (!next || current === next || current.includes(next)) return current;
  return `${current} / ${next}`;
}

export function materializeProfileEvents(events, context, gradeRows, rules) {
  const points = [];
  const sorted = [...events].sort((a, b) => a.distance - b.distance || a.order - b.order || a.type.localeCompare(b.type));
  for (const item of sorted) {
    const xy = interpolateXY(context.segments, item.distance);
    const grade = interpolateGrade(gradeRows, item.distance);
    const rule = item.depthRule || activeDepthRule(rules, item.distance);
    const z = grade + (rule?.zOffset ?? 0);
    const previous = points.at(-1);
    if (previous && Math.abs(previous.horizontal - item.distance) <= EPSILON && Math.abs(previous.z - z) <= EPSILON) {
      previous.label = mergeLabel(previous.label, item.label);
      previous.sources.push(item.type);
      continue;
    }
    points.push({
      horizontal: roundProfileValue(item.distance, 6),
      x: roundProfileValue(xy.x),
      y: roundProfileValue(xy.y),
      z: roundProfileValue(z),
      grade: roundProfileValue(grade),
      label: item.label || '',
      source: item.type,
      sources: [item.type],
      depthMode: rule?.mode ?? null,
      depthText: rule?.zText ?? null,
    });
  }
  return points;
}

export function assertPlausibleProfileSegments(points, routeTotal, warnings = []) {
  let maxSegment = 0;
  for (let index = 1; index < points.length; index += 1) {
    const a = points[index - 1];
    const b = points[index];
    const distance = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
    maxSegment = Math.max(maxSegment, distance);
    if (distance > routeTotal + ROUTE_TOLERANCE) {
      addPipelineWarning(
        warnings,
        'implausible_segment_length',
        `Generated segment ${index} is ${formatProfileValue(distance)} m, exceeding the ${formatProfileValue(routeTotal)} m source route. Export remains available for review.`,
        { segmentIndex: index, segmentLength: distance, routeLength: routeTotal },
      );
    }
  }
  return maxSegment;
}

import {
  buildSupportMemberAnalyticalGeometry,
  supportMemberGeometryDistance,
} from './support-member-analytical-geometry.js';
import { cleanText } from './support-steel-source-utils.js';

export const SUPPORT_CARRIER_ANALYTICAL_GEOMETRY_SCHEMA = 'SupportCarrierAnalyticalGeometry.v1';

export function buildSupportCarrierAnalyticalGeometry(carrier = {}) {
  const attributes = normalizeCarrierGeometryAttributes(carrier.attributes || {});
  const geometry = buildSupportMemberAnalyticalGeometry({
    memberId: carrier.carrierObjectId,
    semanticRole: 'PIPE_CARRIER',
    positionGlobal: carrier.positionGlobal || null,
    worldMatrix: carrier.worldMatrix || null,
    transformBasis: carrier.transformBasis || 'IDENTITY',
    attributes,
  });
  return {
    ...geometry,
    schema: SUPPORT_CARRIER_ANALYTICAL_GEOMETRY_SCHEMA,
    carrierObjectId: carrier.carrierObjectId || null,
    carrierObjectClass: carrier.carrierObjectClass || 'PHYSICAL_PIPE_CARRIER',
    outsideRadiusMm: readOutsideRadius(attributes),
    physicalCarrierGeometryAvailable: Boolean(geometry.physicalGeometryAvailable),
  };
}

export function supportToCarrierGeometryDistance(member, carrier) {
  const carrierGeometry = carrier?.analyticalGeometry || carrier;
  return supportMemberGeometryDistance(member, carrierGeometry);
}

export function normalizeCarrierGeometryAttributes(attrs = {}) {
  const radius = readOutsideRadius(attrs);
  if (!Number.isFinite(radius) || radius <= 0 || finite(attrs.RADIUS) !== null) {
    return { ...attrs };
  }
  return { ...attrs, RADIUS: radius };
}

function readOutsideRadius(attrs) {
  const explicit = firstFinite(
    attrs.OUTSIDE_RADIUS,
    attrs.OUTER_RADIUS,
    attrs.PIPE_RADIUS,
    attrs.RADIUS,
  );
  if (explicit !== null) return Math.max(0, explicit);
  const diameter = firstFinite(
    attrs.OUTSIDE_DIAMETER,
    attrs.OUTER_DIAMETER,
    attrs.PIPE_OD,
    attrs.OD,
    attrs.DIAMETER,
    attrs.NOMINAL_DIAMETER,
    attrs.BORE,
  );
  return diameter === null ? 0 : Math.max(0, diameter / 2);
}

function firstFinite(...values) {
  for (const value of values) {
    const number = finite(value);
    if (number !== null) return number;
  }
  return null;
}

function finite(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(cleanText(value).replace(/mm|,/giu, ''));
  return Number.isFinite(number) ? number : null;
}

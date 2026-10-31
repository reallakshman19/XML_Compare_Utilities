import {sha256RawBytes} from '../../tabs/cii-workspace/cii-workspace-method-c-original-geometry.js';
import {extractXmlProfile} from './xml-profiles.js';
import {buildXmlGraph} from './xml-graph.js';

/**
 * TOPO-B B1 read-only, fail-closed XML format admission.
 * Inputs: XML text plus optional {name, epoch, expectedSha256, parser, cryptoRef}. The parser
 * defaults to the browser DOMParser; tests inject a standards DOM parser.
 * Output: a deep-frozen result whose status is ADMITTED, UNSUPPORTED_INPUT or INVALID.
 * Only F05 RichInputXML-P1.v1.1 and R4 RichInputXMLv2.1 are admitted, always through the
 * existing strict extractXmlProfile/buildXmlGraph rules. PSI116, conventional InputXML, GLRD
 * RichInput P1 v1, other versions and unknown roots are recognized at most, never admitted.
 * Nothing is written or normalized; a graph edge is a SOURCE_ELEMENT, not an approved connection.
 */

export const FORMAT_ADMISSION_SCHEMA = 'topo-b-format-admission/v1';
export const FORMAT_ADMISSION_CLASSIFIER = 'topo-b-root-classifier/v1';
export const ADMISSION_STATUS = Object.freeze({
  ADMITTED: 'ADMITTED', UNSUPPORTED_INPUT: 'UNSUPPORTED_INPUT', INVALID: 'INVALID'});
const ROW_TAG = Object.freeze({F05: 'Numeric', R4: 'Row'});
const PROFILE_LABEL = Object.freeze({F05: 'F05 RichInputXML-P1.v1.1', R4: 'R4 RichInputXMLv2.1'});
const PSI116_NAMESPACES = Object.freeze(['http://aveva.com/pipeStress116.xsd', 'http://aveva.com/pipestress116.xsd']);
const MAX_BYTES = 32 * 1024 * 1024;

const refuse = (status, code, recognizedFormat = null) => ({status, code, recognizedFormat});

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

/** Root/namespace/profile/version resolution. Returns {kind} for admissible candidates or a refusal. */
export function classifyRoot(root) {
  const local = root.localName || root.tagName, ns = root.namespaceURI || null;
  const attr = name => root.getAttribute(name);
  if (local === 'PipeStressExport') return refuse(ADMISSION_STATUS.UNSUPPORTED_INPUT,
    PSI116_NAMESPACES.includes(ns) ? 'PSI116_RECOGNIZED_NOT_ADMITTED' : 'PSI116_SHAPED_UNVERIFIED_NAMESPACE_NOT_ADMITTED',
    'AVEVA PSI116 PipeStressExport');
  if (local === 'CAESARII') {
    if (ns) return refuse(ADMISSION_STATUS.INVALID, 'XML_UNSUPPORTED_NAMESPACE:' + ns);
    if (attr('XML_TYPE') !== 'RichInput') return refuse(ADMISSION_STATUS.UNSUPPORTED_INPUT,
      'CONVENTIONAL_INPUTXML_RECOGNIZED_NOT_ADMITTED', 'CAESAR II conventional InputXML');
    if (attr('SCHEMA') === 'RichInputXML-P1.v1.1') return {kind: 'F05'};
    if (attr('SCHEMA') === 'RichInputXML-P1.v1') return refuse(ADMISSION_STATUS.UNSUPPORTED_INPUT,
      'GLRD_RICHINPUT_P1_V1_DISCOVER_FIRST_NOT_ADMITTED', 'CAESAR II RichInput P1 v1 (GLRD-shaped)');
    return refuse(ADMISSION_STATUS.UNSUPPORTED_INPUT,
      'RICHINPUT_P1_VERSION_NOT_ADMITTED:' + attr('SCHEMA'), 'CAESAR II RichInput P1 (unqualified version)');
  }
  if (local === 'RichInputXMLv2') {
    if (ns) return refuse(ADMISSION_STATUS.INVALID, 'XML_UNSUPPORTED_NAMESPACE:' + ns);
    if (attr('schema') === 'RichInputXMLv2.1') return {kind: 'R4'};
    return refuse(ADMISSION_STATUS.UNSUPPORTED_INPUT,
      'RICHINPUT_V2_VERSION_NOT_ADMITTED:' + attr('schema'), 'CAESAR II RichInputXMLv2 (unqualified version)');
  }
  return refuse(ADMISSION_STATUS.UNSUPPORTED_INPUT, 'UNKNOWN_ROOT_NOT_ADMITTED:' + (ns ? '{' + ns + '}' : '') + local);
}

function parseSafely(text, parser) {
  if (/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(text)) return refuse(ADMISSION_STATUS.INVALID, 'XML_DTD_OR_ENTITY_FORBIDDEN');
  if (/<\?xml[^>]*encoding\s*=\s*["'](?!utf-8["'])/i.test(text)) return refuse(ADMISSION_STATUS.INVALID, 'XML_ONLY_UTF8_SUPPORTED');
  if (!parser?.parseFromString) throw new Error('NATIVE_XML_PARSER_UNAVAILABLE');
  let document;
  try { document = parser.parseFromString(text, 'application/xml'); } catch (error) {
    return refuse(ADMISSION_STATUS.INVALID, 'XML_PARSE_ERROR:' + String(error?.message || error).slice(0, 160));
  }
  if (!document?.documentElement || document.getElementsByTagName('parsererror').length)
    return refuse(ADMISSION_STATUS.INVALID, 'XML_PARSE_ERROR');
  return {document};
}

/** Exact source address for one field witness kept by extractXmlProfile. */
function fieldAddress(witness, field, rowTag) {
  return {section: witness.section, recordId: witness.recordId, recordIndex: witness.recordIndex,
    field: field.name, value: field.value, row: field.row, fieldOrdinal: field.field, sourceLine: field.sourceLine,
    address: witness.section + '/' + witness.recordId + '/' + rowTag + '[' + field.row + ']/Field[' +
      field.field + ']@' + field.name};
}

function edgeEvidence(element, kind) {
  const fields = element.xmlWitness.fields.map(field => fieldAddress(element.xmlWitness, field, ROW_TAG[kind]));
  return {kind: 'SOURCE_ELEMENT', index: element.index, recordId: element.xmlWitness.recordId,
    from: element.from, to: element.to, delta: [...element.delta], od: element.od, wall: element.wall,
    sourceFields: {from: fields[0], to: fields[1], deltaX: fields[2], deltaY: fields[3], deltaZ: fields[4],
      od: fields[5], wall: fields[6]},
    engineeringApproved: false};
}

function coordinateStatus(frame) {
  return frame.coordinateFrame === 'XML_EXPLICIT_COORDS_SEED' ? 'ABSOLUTE_EXPLICIT_SEED' : 'RELATIVE_NO_SEED';
}

function admittedEvidence(kind, profile, graph) {
  const status = new Map(graph.coordinateFrames.map(frame => [frame.component, coordinateStatus(frame)]));
  return {admittedProfile: PROFILE_LABEL[kind], parserProfile: profile.profile, units: profile.units,
    claimedCii: profile.claimedCii, elementCount: profile.elements.length, nodeCount: graph.nodes.length,
    edges: profile.elements.map(element => edgeEvidence(element, kind)),
    nodes: graph.nodes.map(node => ({id: node.id, component: node.component, degree: node.degree,
      coordinateStatus: status.get(node.component), xyz: [...node.xyz]})),
    components: graph.coordinateFrames.map(frame => ({component: frame.component, nodeCount: frame.nodeCount,
      coordinateStatus: coordinateStatus(frame), seedWitnesses: frame.witnesses.map(seed => seed.witness)}))};
}

function extractAdmitted(kind, document, sha256, byteLength) {
  try {
    const profile = extractXmlProfile(document);
    const graph = buildXmlGraph(profile, {member: 'TOPO-B-ADMISSION', sha256, byteLength});
    if (!profile.elements.length || !graph.nodes.length) return refuse(ADMISSION_STATUS.INVALID, 'XML_ZERO_ELEMENT_MODEL');
    return {evidence: admittedEvidence(kind, profile, graph)};
  } catch (error) {
    if (/^XML_/.test(error?.message || '')) return refuse(ADMISSION_STATUS.INVALID, error.message);
    throw error;
  }
}

function emptyEvidence() {
  return {admittedProfile: null, parserProfile: null, units: null, claimedCii: null,
    elementCount: null, nodeCount: null, edges: [], nodes: [], components: []};
}

function rootSummary(root) {
  if (!root) return null;
  const names = ['SCHEMA', 'XML_TYPE', 'DIALECT', 'schema', 'profile'];
  return {localName: root.localName || root.tagName, namespaceURI: root.namespaceURI || null,
    declared: Object.fromEntries(names.filter(name => root.hasAttribute(name)).map(name => [name, root.getAttribute(name)]))};
}

function result(base, outcome, evidence, root) {
  const admitted = outcome.status === ADMISSION_STATUS.ADMITTED;
  return deepFreeze({schemaVersion: FORMAT_ADMISSION_SCHEMA, classifierVersion: FORMAT_ADMISSION_CLASSIFIER,
    ...base, status: outcome.status, recognizedFormat: outcome.recognizedFormat || null,
    reason: admitted ? null : outcome.code, root: rootSummary(root), ...evidence,
    diagnostics: admitted ? evidence.components.filter(c => c.coordinateStatus === 'RELATIVE_NO_SEED')
      .map(c => ({code: 'COMPONENT_RELATIVE_NO_SEED', severity: 'WARNING', component: c.component}))
      : [{code: outcome.code, severity: 'ERROR'}],
    authority: 'READ_ONLY_FORMAT_ADMISSION', writerEligible: false, physicalIdentityQualified: false});
}

function measuredBase(name, epoch, sha256, byteLength) {
  return {name: String(name ?? ''), epoch, generationId: sha256 ? 'TOPO-B-ADM:' + sha256 + ':' + epoch : null,
    digest: {algorithm: 'SHA-256', sha256, byteLength, authority: sha256 ? 'XML_TEXT_UTF8_BYTES_MEASURED' : 'NOT_MEASURED'}};
}

/** Read-only admission of one XML text. Never throws for bad input; throws only for missing runtime/bugs. */
export async function admitXmlFormat(text, {name = '', epoch = 0, expectedSha256 = null, cryptoRef = globalThis.crypto,
  parser = globalThis.DOMParser && new globalThis.DOMParser()} = {}) {
  if (!Number.isSafeInteger(epoch) || epoch < 0) throw new TypeError('ADMISSION_EPOCH_INVALID');
  const fail = (base, outcome, root = null) => result(base, outcome, emptyEvidence(), root);
  if (typeof text !== 'string') return fail(measuredBase(name, epoch, null, null), refuse(ADMISSION_STATUS.INVALID, 'XML_TEXT_REQUIRED'));
  const bytes = new TextEncoder().encode(text);
  if (!bytes.length || !text.trim()) return fail(measuredBase(name, epoch, null, bytes.length), refuse(ADMISSION_STATUS.INVALID, 'XML_EMPTY_INPUT'));
  const base = measuredBase(name, epoch, await sha256RawBytes(bytes, cryptoRef), bytes.length);
  if (bytes.length > MAX_BYTES) return fail(base, refuse(ADMISSION_STATUS.INVALID, 'XML_BYTE_SIZE_LIMIT'));
  if (expectedSha256 && base.digest.sha256 !== String(expectedSha256).toLowerCase())
    return fail(base, refuse(ADMISSION_STATUS.INVALID, 'XML_SHA256_MISMATCH'));
  const parsed = parseSafely(text, parser);
  if (!parsed.document) return fail(base, parsed);
  const root = parsed.document.documentElement, route = classifyRoot(root);
  if (!route.kind) return fail(base, route, root);
  const extracted = extractAdmitted(route.kind, parsed.document, base.digest.sha256, base.digest.byteLength);
  if (!extracted.evidence) return fail(base, {...extracted, recognizedFormat: PROFILE_LABEL[route.kind]}, root);
  return result(base, {status: ADMISSION_STATUS.ADMITTED, recognizedFormat: PROFILE_LABEL[route.kind]}, extracted.evidence, root);
}

/** True when a held admission no longer belongs to the current source bytes or epoch. */
export function isStaleAdmission(admission, {sha256, epoch}) {
  return !admission?.generationId || admission.digest.sha256 !== String(sha256 || '').toLowerCase() ||
    admission.epoch !== epoch;
}

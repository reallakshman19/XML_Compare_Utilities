import {sha256RawBytes} from '../../tabs/cii-workspace/cii-workspace-method-c-original-geometry.js';
import {extractXmlProfile} from './xml-profiles.js';
import {buildXmlGraph} from './xml-graph.js';

/**
 * TOPO-B B1 read-only, fail-closed XML format admission.
 * Inputs: raw file bytes (admitXmlBytes, preferred) or decoded text (admitXmlFormat), plus optional
 * {name, epoch, expectedSha256, parser, cryptoRef}. The parser
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
    // Same identity triple extractXmlProfile requires (xml-profiles.js f05): SCHEMA + XML_TYPE + DIALECT.
    if (attr('SCHEMA') === 'RichInputXML-P1.v1.1') return attr('DIALECT') === 'CII-V14' ? {kind: 'F05'} :
      refuse(ADMISSION_STATUS.UNSUPPORTED_INPUT, 'RICHINPUT_P1_V1_1_DIALECT_NOT_ADMITTED:' + attr('DIALECT'),
        'CAESAR II RichInput P1 v1.1 (unqualified dialect)');
    if (attr('SCHEMA') === 'RichInputXML-P1.v1') return refuse(ADMISSION_STATUS.UNSUPPORTED_INPUT,
      'GLRD_RICHINPUT_P1_V1_DISCOVER_FIRST_NOT_ADMITTED', 'CAESAR II RichInput P1 v1 (GLRD-shaped)');
    return refuse(ADMISSION_STATUS.UNSUPPORTED_INPUT,
      'RICHINPUT_P1_VERSION_NOT_ADMITTED:' + attr('SCHEMA'), 'CAESAR II RichInput P1 (unqualified version)');
  }
  if (local === 'RichInputXMLv2') {
    if (ns) return refuse(ADMISSION_STATUS.INVALID, 'XML_UNSUPPORTED_NAMESPACE:' + ns);
    // Same identity pair extractXmlProfile requires (xml-profiles.js r4): schema + profile.
    if (attr('schema') === 'RichInputXMLv2.1') return attr('profile') === 'CII-V14-ASCII-CRLF-B001' ? {kind: 'R4'} :
      refuse(ADMISSION_STATUS.UNSUPPORTED_INPUT, 'RICHINPUT_V2_1_PROFILE_NOT_ADMITTED:' + attr('profile'),
        'CAESAR II RichInputXMLv2.1 (unqualified profile)');
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
    // Zero/empty element models are already refused upstream: extractXmlProfile (NUMELT >= 1, R4 records
    // required) and buildXmlGraph (XML_ELEMENT_COUNT_LIMIT); no second guard is kept here.
    const profile = extractXmlProfile(document);
    const graph = buildXmlGraph(profile, {member: 'TOPO-B-ADMISSION', sha256, byteLength});
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

function measuredBase(name, epoch, sha256, byteLength, authority, utf8Bom) {
  return {name: String(name ?? ''), epoch, generationId: sha256 ? 'TOPO-B-ADM:' + sha256 + ':' + epoch : null,
    digest: {algorithm: 'SHA-256', sha256, byteLength, authority: sha256 ? authority : 'NOT_MEASURED', utf8Bom}};
}

const failed = (base, outcome, root = null) => result(base, outcome, emptyEvidence(), root);
const checkEpoch = epoch => {
  if (!Number.isSafeInteger(epoch) || epoch < 0) throw new TypeError('ADMISSION_EPOCH_INVALID');
};

/**
 * Shared pipeline. `bytes` are what the digest covers; `decode()` returns {text, bom} with any BOM already
 * removed from text (the digest keeps it) or throws XML_INVALID_UTF8.
 */
async function admitSource(bytes, authority, decode, {name = '', epoch = 0, expectedSha256 = null,
  cryptoRef = globalThis.crypto, parser = globalThis.DOMParser && new globalThis.DOMParser()}) {
  const at = (sha256, bom = null) => measuredBase(name, epoch, sha256, bytes.length, authority, bom);
  if (!bytes.length) return failed(at(null), refuse(ADMISSION_STATUS.INVALID, 'XML_EMPTY_INPUT'));
  if (bytes.length > MAX_BYTES) return failed(at(null), refuse(ADMISSION_STATUS.INVALID, 'XML_BYTE_SIZE_LIMIT'));
  const sha256 = await sha256RawBytes(bytes, cryptoRef);
  let decoded;
  try { decoded = decode(); } catch { return failed(at(sha256), refuse(ADMISSION_STATUS.INVALID, 'XML_INVALID_UTF8')); }
  const base = at(sha256, decoded.bom);
  if (!decoded.text.trim()) return failed(base, refuse(ADMISSION_STATUS.INVALID, 'XML_EMPTY_INPUT'));
  if (expectedSha256 && sha256 !== String(expectedSha256).toLowerCase())
    return failed(base, refuse(ADMISSION_STATUS.INVALID, 'XML_SHA256_MISMATCH'));
  const parsed = parseSafely(decoded.text, parser);
  if (!parsed.document) return failed(base, parsed);
  const root = parsed.document.documentElement, route = classifyRoot(root);
  if (!route.kind) return failed(base, route, root);
  const extracted = extractAdmitted(route.kind, parsed.document, sha256, bytes.length);
  if (!extracted.evidence) return failed(base, {...extracted, recognizedFormat: PROFILE_LABEL[route.kind]}, root);
  return result(base, {status: ADMISSION_STATUS.ADMITTED, recognizedFormat: PROFILE_LABEL[route.kind]}, extracted.evidence, root);
}

/**
 * Preferred entry point: admission of the exact file bytes (Uint8Array/ArrayBuffer). The digest is the
 * file's own SHA-256 (BOM included); UTF-8 is decoded strictly (invalid -> INVALID); a UTF-8 BOM is
 * recorded as digest.utf8Bom 'PRESENT' and stripped only for parsing. The caller's buffer is copied, never changed.
 */
export async function admitXmlBytes(bytes, options = {}) {
  checkEpoch(options.epoch ?? 0);
  if (!(bytes instanceof Uint8Array || bytes instanceof ArrayBuffer))
    return failed(measuredBase(options.name, options.epoch ?? 0, null, null, null, null), refuse(ADMISSION_STATUS.INVALID, 'XML_BYTES_REQUIRED'));
  const snapshot = bytes instanceof Uint8Array ? new Uint8Array(bytes) : new Uint8Array(bytes.slice(0));
  const bom = snapshot[0] === 0xEF && snapshot[1] === 0xBB && snapshot[2] === 0xBF;
  const decode = () => {
    const text = new TextDecoder('utf-8', {fatal: true, ignoreBOM: true}).decode(snapshot);
    return {text: bom ? text.slice(1) : text, bom: bom ? 'PRESENT' : 'ABSENT'};
  };
  return admitSource(snapshot, 'XML_FILE_BYTES_MEASURED', decode, options);
}

/**
 * Text entry point (already-decoded string, e.g. File.text()). The digest covers the string re-encoded as
 * UTF-8 and is labelled DECODED_TEXT_REENCODED_UTF8: it is NOT the original file's byte digest.
 */
export async function admitXmlFormat(text, options = {}) {
  checkEpoch(options.epoch ?? 0);
  if (typeof text !== 'string')
    return failed(measuredBase(options.name, options.epoch ?? 0, null, null, null, null), refuse(ADMISSION_STATUS.INVALID, 'XML_TEXT_REQUIRED'));
  const bom = text.startsWith('﻿');
  const decode = () => ({text: bom ? text.slice(1) : text, bom: bom ? 'PRESENT_IN_TEXT' : 'ABSENT'});
  return admitSource(new TextEncoder().encode(text), 'DECODED_TEXT_REENCODED_UTF8', decode, options);
}


/** True when a held admission no longer belongs to the current source bytes or epoch. */
export function isStaleAdmission(admission, {sha256, epoch}) {
  return !admission?.generationId || admission.digest.sha256 !== String(sha256 || '').toLowerCase() ||
    admission.epoch !== epoch;
}

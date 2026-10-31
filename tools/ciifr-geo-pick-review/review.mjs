/** Offline read-only pick evidence for PR183 exports. No physical identity approval. */
export const REPORT_CONTRACT = 'CIIFR.GeometryPickReview.v1';
const SCENE_CONTRACT = 'CIIFR.GeometryDisplaySnapshot.v1';
const EVIDENCE_CONTRACT = 'CIIFR.XmlGeometryPreview.v1';
const SHA = /^[a-f0-9]{64}$/;
const fail = code => { throw new Error(`GEO_PICK_REVIEW_${code}`); };
const key = (side, kind, id) => JSON.stringify([side, kind, String(id)]);

function validateEnvelope(payload) {
  if (payload?.schema !== EVIDENCE_CONTRACT || payload?.viewerScene?.contract !== SCENE_CONTRACT)
    fail('SCHEMA_INVALID');
  const scene = payload.viewerScene;
  if (scene.writerEligible !== false || scene.physicalIdentityQualified !== false)
    fail('ENGINEERING_AUTHORITY_INVALID');
  if (!Number.isSafeInteger(payload.epoch) || payload.epoch < 0 || scene.epoch !== payload.epoch ||
      typeof scene.binding !== 'string' || !scene.binding.length) fail('STALE_SNAPSHOT');
  if (!Array.isArray(payload.candidates?.rows) || !scene.objects || Array.isArray(scene.objects) ||
      typeof scene.objects !== 'object') fail('LEDGER_INVALID');
  for (const side of ['SOURCE', 'TARGET']) {
    const graph = payload.graphs?.[side.toLowerCase()];
    const info = scene.inputs?.[side.toLowerCase()];
    if (!graph || !info || graph.member !== info.member || graph.xmlSha256 !== info.xmlSha256 ||
        graph.byteAuthority !== 'XML_BYTES_MEASURED' || !SHA.test(graph.xmlSha256 || ''))
      fail('SOURCE_PROVENANCE_MISMATCH');
  }
  return scene;
}

function objectFor(scene, side, kind, id) {
  const matches = Object.entries(scene.objects).filter(([objectId, item]) =>
    item?.side === side && item.kind === kind &&
    String(kind === 'NODE' ? item.nodeId : item.elementIndex) === String(id));
  if (matches.length !== 1) fail(matches.length ? 'DUPLICATE_OBJECT' : 'OBJECT_NOT_FOUND');
  const [objectId, item] = matches[0], info = scene.inputs[side.toLowerCase()];
  const expected = JSON.stringify([side, info.member, info.xmlSha256, kind, String(id)]);
  if (objectId !== expected || item.objectId !== expected || item.member !== info.member ||
      item.xmlSha256 !== info.xmlSha256) fail('TYPED_IDENTITY_MISMATCH');
  if (!Array.isArray(item.sourceRows)) fail('SOURCE_LINKS_MISSING');
  return {objectId, item};
}

function expectedLinks(rows, side, kind, id) {
  const sources = [], seen = new Set();
  for (const row of rows) {
    const source = String(row.source), alternatives = row.alternatives;
    if (!Array.isArray(alternatives) || seen.has(source)) fail('LEDGER_INVALID');
    seen.add(source);
    const match = side === 'SOURCE'
      ? (kind === 'NODE' ? source === String(id) : (row.sourceWitness || []).some(x => String(x) === String(id)))
      : (kind === 'NODE' ? alternatives.some(a => String(a.target) === String(id))
        : alternatives.some(a => (a.targetWitness || []).some(x => String(x) === String(id))) ||
          row.segment != null && String(row.segment.element) === String(id));
    if (match) sources.push(source);
  }
  return sources;
}

function assertLinks(actual, expected) {
  if (actual.some(x => typeof x !== 'string') || new Set(actual).size !== actual.length ||
      actual.length !== expected.length || expected.some(x => !actual.includes(x)))
    fail('INCOMPLETE_OR_CONFLICTING_LINKS');
}

/** Resolves all source-row evidence in a frozen exported snapshot, never a live UI pick. */
export function reviewSnapshotPick(payload, {side, kind, id}) {
  if (!['SOURCE', 'TARGET'].includes(side) || !['NODE', 'ELEMENT'].includes(kind) ||
      !(typeof id === 'string' || Number.isSafeInteger(id)) || String(id).length === 0)
    fail('PICK_ARGUMENT_INVALID');
  const scene = validateEnvelope(payload);
  const {objectId, item} = objectFor(scene, side, kind, id);
  const expected = expectedLinks(payload.candidates.rows, side, kind, id);
  assertLinks(item.sourceRows, expected);
  const rows = item.sourceRows.map(source => payload.candidates.rows.find(r => String(r.source) === source));
  return {contract: REPORT_CONTRACT, qualification: 'OFFLINE_SNAPSHOT_ONLY',
    writerEligible: false, physicalIdentityQualified: false,
    epoch: payload.epoch, binding: scene.binding,
    sourceXmlSha256: scene.inputs.source.xmlSha256, targetXmlSha256: scene.inputs.target.xmlSha256,
    picked: {side, kind, id: String(id), objectId},
    sourceRowCount: rows.length, sourceRows: [...item.sourceRows],
    conflict: {reusedTarget: side === 'TARGET' && kind === 'NODE' && rows.length > 1,
      unresolved: rows.some(row => row.status !== 'MATCHED')},
    ledgerRows: rows};
}

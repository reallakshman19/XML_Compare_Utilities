// UXML revamp step 1 benchmark: PSI116 -> UXML v2 -> PS116 on given files. Prints counts only
// (safe for private benchmarks): byte identity, stable ids, a T1 edit that must change exactly
// one field, and a node split that must add exactly one node and keep every other uid.
//   node scripts/uxml-v2-roundtrip.mjs <label>=<file.xml> ...
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {readPsi116V2} from '../uxml/v2/UxmlV2Psi116Reader.js';
import {writePsi116FromUxmlV2} from '../uxml/v2/UxmlV2Psi116Writer.js';
import {runStage, walkEntities, verifyDocument} from '../uxml/v2/UxmlV2Kernel.js';
import {splitNodeTestStage, setValueTestStage} from '../uxml/v2/UxmlV2Stages.js';

const sha = text => createHash('sha256').update(text, 'utf8').digest('hex');
const fields = doc => {
  const out = new Map();
  for (const {entity} of walkEntities(doc))
    for (const [k, v] of Object.entries(entity.values)) out.set(entity.sourceKey + '|' + k, v.text);
  return out;
};
const diffCount = (a, b) => {
  let n = 0;
  for (const [k, v] of a) if (b.get(k) !== v) n += 1;
  for (const k of b.keys()) if (!a.has(k)) n += 1;
  return n;
};
for (const arg of process.argv.slice(2)) {
  const [label, file] = arg.split(/=(.*)/s);
  const text = readFileSync(file, 'utf8');
  const t0 = performance.now();
  const doc = readPsi116V2(text, {fileSha256: sha(text)});
  const t1 = performance.now();
  const out = writePsi116FromUxmlV2(doc).text;
  const t2 = performance.now();
  const again = readPsi116V2(text, {fileSha256: sha(text)});
  const row = {
    label, pipelines: doc.readCounts.pipelines, nodes: doc.readCounts.components, restraints: doc.readCounts.restraints,
    valid: verifyDocument(doc).length === 0, byteIdentical: out === text,
    sameIdTwice: again.revision.id === doc.revision.id, readMs: Math.round(t1 - t0), writeMs: Math.round(t2 - t1),
  };
  // T1 edit on the first branch that has one
  const p = doc.pipelines.find(x => x.values['Temperature.Temperature1']);
  if (p) {
    const r = runStage(setValueTestStage, doc, {uid: p.uid, key: 'Temperature.Temperature1', v: 999});
    const written = writePsi116FromUxmlV2(r.uxml).text;
    const reread = readPsi116V2(written, {fileSha256: sha(written)});
    row.t1EditChangedFields = diffCount(fields(doc), fields(reread));
    row.t1EditSeen = reread.pipelines.find(x => x.sourceKey === p.sourceKey).values['Temperature.Temperature1'].v === 999;
  }
  // split the first PIPE-like node that is not a branch end
  const comp = doc.pipelines.flatMap(x => x.components).find(c => c.values.ComponentType?.v === 'PIPE' || c.values.ComponentType?.v === 'TUBI')
    || doc.pipelines[0].components[1];
  const s = runStage(splitNodeTestStage, doc, {uid: comp.uid});
  const written = writePsi116FromUxmlV2(s.uxml).text;
  const reread = readPsi116V2(written, {fileSha256: sha(written)});
  const uidsBefore = new Set(walkEntities(doc).map(e => e.entity.uid));
  const uidsAfter = walkEntities(s.uxml).map(e => e.entity.uid);
  row.splitNodesAfterReread = reread.readCounts.components - doc.readCounts.components;
  row.splitKeptAllUids = [...uidsBefore].every(u => uidsAfter.includes(u));
  row.splitNewUids = uidsAfter.filter(u => !uidsBefore.has(u)).length;
  console.log(JSON.stringify(row));
}

/**
 * Group 2 (Owner 19 Nov 2026): the transfer from a CAESAR II file, with pipes broken in CAESAR II made into new XML
 * nodes first ("for transfer node wise mapping will be prerequisite"). See CiiNewNodes.js for the rules.
 *
 * transferWithNewNodes(args) -> {doc, xmlText, u2d, newNodes: {splits, refused, stage}}
 *   doc:     the UXML the receipt applies to (the read target, or the target with the new nodes: same uids, lineage kept);
 *   xmlText: that document's PSI116 text (the transfer's target);
 *   u2d:     transferCiiIntoXml's result on xmlText.
 * The transfer runs once when CAESAR II broke no pipe, else twice (the first run only finds the new nodes).
 */
import {runStage, sha256Hex} from '../UxmlV2Kernel.js';
import {readPsi116V2} from '../UxmlV2Psi116Reader.js';
import {writePsi116FromUxmlV2} from '../UxmlV2Psi116Writer.js';
import {transferCiiIntoXml} from './U2dInBrowser.js';
import {findCiiNewNodes, ciiNewNodeStage} from './CiiNewNodes.js';

const decodeXml = bytes => new TextDecoder('utf-8', {ignoreBOM: true}).decode(bytes);

export async function transferWithNewNodes({targetBytes, ...args}) {
  const first = await transferCiiIntoXml({targetBytes, ...args});
  const text = decodeXml(targetBytes);
  const doc = readPsi116V2(text, {fileSha256: sha256Hex(text)});
  const {splits, refused} = findCiiNewNodes(doc, first.matchFull);
  if (!splits.length) return {doc, xmlText: text, u2d: first, newNodes: {splits, refused, stage: null}};
  const stage = runStage(ciiNewNodeStage, doc, {splits});
  const xmlText = writePsi116FromUxmlV2(stage.uxml).text;
  const u2d = await transferCiiIntoXml({targetBytes: new TextEncoder().encode(xmlText), ...args});
  const left = (u2d.matchFull.unmatchedNodesCii || []).filter(id => splits.some(s => s.ciiNode === String(id)));
  if (left.length) throw new Error(`UXML_CII_NEW_NODE_NOT_PAIRED: the new node(s) ${left.join(', ')} were made but the transfer did not pair them; nothing was transferred.`);
  return {doc: stage.uxml, xmlText, u2d, newNodes: {splits, refused, stage}};
}

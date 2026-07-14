import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  ensureCategorized,
  ensureInputXml,
  importLinewiseText,
  linewiseCategorizedCanvasPayload,
  previewText,
} from '../xml-compare/XmlCompareLinewiseWorkflowActions.js';
import {
  linewiseProducerReceiptJson,
  runLinewiseSideloadProducerAdoption,
  startLinewiseProducerRun,
} from '../xml-compare/XmlCompareLinewiseProducerAdoption.js';
import { updateLinewiseWorkflowState } from '../xml-compare/XmlCompareLinewiseWorkflowState.js';
import { applyXmlCompareSideload } from '../xml-compare/XmlCompareSideloadEnricher.js';
import {
  createCategorizedInputXmlWorkerClient,
  installCategorizedInputXmlWorkerRuntime,
} from '../xml-compare/categorized-inputxml-worker/index.js';
import { renderLinewiseWorkflowPopupHtml } from '../xml-compare/XmlCompareLinewiseWorkflowView.js';

function createEndpoint() {
  const listeners = new Map();
  return {
    peer: null,
    terminated: false,
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(listener);
    },
    removeEventListener(type, listener) { listeners.get(type)?.delete(listener); },
    postMessage(message) {
      if (this.terminated) throw new Error('Endpoint terminated.');
      const data = structuredClone(message);
      queueMicrotask(() => this.peer?.emit('message', { data }));
    },
    emit(type, event) {
      for (const listener of listeners.get(type) || []) listener(event);
    },
    terminate() { this.terminated = true; listeners.clear(); },
  };
}

function createWorkerPair() {
  const client = createEndpoint(), worker = createEndpoint();
  client.peer = worker;
  worker.peer = client;
  return { client, worker };
}

const inputXml = `<?xml version="1.0" encoding="UTF-8"?>
<CAESARII XML_TYPE="Input">
<PIPINGMODEL>
<PIPINGELEMENT FROM_NODE="10" TO_NODE="20" LINE_ID="L-OLD" DELTA_X="100" DELTA_Y="0" DELTA_Z="0" DIAMETER="219.1" WALL_THICK="8.18">
  <BEND RADIUS="300" />
</PIPINGELEMENT>
<RESTRAINT NODE="10" TYPE="14" STIFFNESS="1" GAP="0" MU="0" CNODE="0" />
</PIPINGMODEL>
</CAESARII>`;
const sideload = Object.freeze({
  lineIdText: 'FROM_NODE\tTO_NODE\tLINE_ID\n10\t20\tL-NEW',
  nodeNameText: 'FROM_NODE\tTO_NODE\tFROM_NAME\tTO_NAME\n10\t20\tN10\tN20',
  restraintTagText: '',
  coordinateText: '',
});
const imported = importLinewiseText({ fileName: 'linewise.input.xml', text: inputXml });
const state = updateLinewiseWorkflowState(imported, { sideload });

const direct = applyXmlCompareSideload(inputXml, sideload);
const started = startLinewiseProducerRun(state);
assert.equal(started.state.lastEnriched, direct.xmlText, 'worker adoption preserves sideload output bytes');
assert.equal(started.state.producerCategorizationStatus, 'running');
assert.equal(started.request.producer.id, 'xml-compare-linewise-sideload');
assert.equal(started.request.source.content, direct.xmlText);
assert.equal(ensureCategorized(started.state), '', 'running worker owns categorized output without UI fallback');
assert.equal(ensureInputXml(started.state), direct.xmlText, 'enriched InputXML remains available while worker runs');

const pair = createWorkerPair();
const runtime = installCategorizedInputXmlWorkerRuntime({ scope: pair.worker });
const client = createCategorizedInputXmlWorkerClient({ worker: pair.client, clientId: 'xml-compare-linewise-test' });
const completed = await runLinewiseSideloadProducerAdoption(state, client);
assert.equal(completed.producerCategorizationStatus, 'success');
assert.equal(completed.producerCategorizationResult.success, true);
assert.equal(completed.producerCategorizationResult.producer.id, 'xml-compare-linewise-sideload');
assert.equal(completed.producerCategorizationResult.source.fingerprint, completed.producerCategorizationResult.artifact.sourceFingerprint);
assert.ok(completed.lastCategorized.includes('schema="categorized-inputxml/v3"'));
assert.ok(completed.lastCategorized.includes('<LINE_ID>L-NEW</LINE_ID>'));
assert.equal(ensureCategorized(completed), completed.lastCategorized);
assert.equal(previewText(updateLinewiseWorkflowState(completed, { previewMode: 'categorized' })), completed.lastCategorized);
assert.equal(ensureInputXml(completed), direct.xmlText);
assert.equal(linewiseCategorizedCanvasPayload(completed, 'a').ready, true);
assert.equal(linewiseCategorizedCanvasPayload(completed, 'a').text, completed.lastCategorized);
assert.ok(linewiseProducerReceiptJson(completed).includes('XmlCompareLinewiseProducerReceipt.v1'));
assert.ok(linewiseProducerReceiptJson(completed).includes('xml-compare-linewise-sideload'));
const successHtml = renderLinewiseWorkflowPopupHtml(updateLinewiseWorkflowState(completed, { open: true, tab: 'sideload' }));
assert.ok(successHtml.includes('Worker categorization passed'));
assert.ok(successHtml.includes('Download producer receipt JSON'));

const rejectedClient = Object.freeze({
  producer: Object.freeze({
    categorizeInputXml: async () => Object.freeze({
      success: false,
      diagnostics: Object.freeze([{ severity: 'error', code: 'TEST_REJECTED', message: 'Rejected by producer service.' }]),
      diagnosticCounts: Object.freeze({ total: 1, error: 1, warning: 0, information: 0 }),
      artifact: null,
    }),
  }),
});
const rejected = await runLinewiseSideloadProducerAdoption(state, rejectedClient);
assert.equal(rejected.producerCategorizationStatus, 'failed');
assert.equal(rejected.producerCategorizationError.code, 'TEST_REJECTED');
assert.equal(rejected.lastEnriched, direct.xmlText);
assert.equal(ensureInputXml(rejected), direct.xmlText);
assert.equal(ensureCategorized(rejected), '');
assert.equal(linewiseCategorizedCanvasPayload(rejected, 'b').ready, false);
assert.ok(renderLinewiseWorkflowPopupHtml(updateLinewiseWorkflowState(rejected, { open: true, tab: 'preview' })).includes('Worker categorization failed'));

const throwingClient = Object.freeze({
  producer: Object.freeze({
    categorizeInputXml: async () => { throw Object.assign(new Error('Worker transport unavailable.'), { code: 'WORKER_UNAVAILABLE' }); },
  }),
});
const failed = await runLinewiseSideloadProducerAdoption(state, throwingClient);
assert.equal(failed.producerCategorizationStatus, 'failed');
assert.equal(failed.producerCategorizationError.code, 'WORKER_UNAVAILABLE');
assert.equal(failed.lastEnriched, direct.xmlText);
assert.equal(ensureCategorized(failed), '');

const ordinary = importLinewiseText({ fileName: 'ordinary.input.xml', text: inputXml });
assert.equal(ordinary.producerCategorizationStatus, 'idle');
assert.ok(ensureCategorized(ordinary).includes('categorized-inputxml/v3'), 'ordinary imports retain direct compatibility');

const tabSource = fs.readFileSync(new URL('../tabs/xml-compare-tab.js', import.meta.url), 'utf8');
assert.ok(tabSource.includes('createCategorizedInputXmlWorkerClient'), 'XML Compare tab imports the worker client');
assert.ok(tabSource.includes('startLinewiseProducerRun'), 'XML Compare tab starts producer adoption');
assert.ok(tabSource.includes('finishLinewiseProducerRun'), 'XML Compare tab consumes successful worker results');
assert.ok(tabSource.includes('failLinewiseProducerRun'), 'XML Compare tab retains worker failure evidence');
assert.ok(tabSource.includes('linewiseWorkerClient'), 'XML Compare tab owns a lazy worker client');
assert.ok(tabSource.includes('linewiseProducerAbort'), 'XML Compare tab owns request cancellation');
assert.ok(tabSource.includes('.close?.()'), 'XML Compare tab closes the worker client during cleanup');

client.close();
runtime.dispose();
assert.equal(pair.client.terminated, true);
assert.equal(runtime.isDisposed(), true);

console.log('XML Compare line-wise producer adoption tests passed');

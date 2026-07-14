/**
 * Functionality: resolves and loads producer-owned companion topology files
 * after the user selects one managed source JSON file. Inputs are the source
 * filename, page URL, browser fetch adapter, and validator controller. Output
 * is the independently validated artifact set. Fallback: explicit candidate
 * locations are tried in order; failure remains visible and manual controls
 * stay available. This module never imports or invokes a topology builder.
 */

const COMPANION_KINDS = Object.freeze(['canonical', 'ledger', 'inputXml']);

export class TopologyCompanionLoadError extends Error {
  /** @param {string} sourceFileName @param {readonly string[]} attempts */
  constructor(sourceFileName, attempts) {
    super(`No companion topology artifacts were found for ${sourceFileName}. Tried: ${attempts.join('; ')}`);
    this.name = 'TopologyCompanionLoadError';
    this.sourceFileName = sourceFileName;
    this.attempts = Object.freeze([...attempts]);
  }
}

/** @param {string} sourceFileName @returns {Readonly<Record<string, string>>} */
export function topologyCompanionFileNames(sourceFileName) {
  const name = String(sourceFileName ?? '').trim();
  if (!/\.json$/i.test(name)) throw new TypeError(`Managed source filename must end with .json: ${name || '(empty)'}.`);
  const stem = name.replace(/\.json$/i, '');
  return Object.freeze({
    stem,
    canonical: `${stem}.canonical-topology.json`,
    ledger: `${stem}.topology-trace-ledger.json`,
    inputXml: `${stem}.topology.input.xml`,
  });
}

/** @param {string} sourceFileName @param {string} pageUrl @returns {readonly string[]} */
export function topologyCompanionBaseUrls(sourceFileName, pageUrl) {
  const names = topologyCompanionFileNames(sourceFileName);
  const page = new URL(pageUrl);
  const encodedStem = encodeURIComponent(names.stem);
  const configured = page.searchParams.getAll('topologyArtifactBase').map((value) => normalizedBaseUrl(value, page.href));
  const siblingProducer = new URL(`../../../3D_Converters/Benchmarks/${encodedStem}/`, import.meta.url).href;
  const colocatedArtifacts = new URL(`../../topology-artifacts/${encodedStem}/`, import.meta.url).href;
  return Object.freeze([...new Set([...configured, siblingProducer, colocatedArtifacts])]);
}

/** @param {string} sourceFileName @param {string} pageUrl @param {typeof fetch} fetchImpl @returns {Promise<Readonly<Record<string, unknown>>>} */
export async function loadTopologyCompanionSet(sourceFileName, pageUrl, fetchImpl) {
  if (typeof fetchImpl !== 'function') throw new TypeError('A browser fetch function is required for companion artifact loading.');
  const names = topologyCompanionFileNames(sourceFileName), attempts = [];
  for (const baseUrl of topologyCompanionBaseUrls(sourceFileName, pageUrl)) {
    try {
      const canonical = await requiredText(new URL(names.canonical, baseUrl).href, fetchImpl);
      const ledger = await requiredText(new URL(names.ledger, baseUrl).href, fetchImpl);
      const inputXml = await optionalText(new URL(names.inputXml, baseUrl).href, fetchImpl);
      return Object.freeze({ baseUrl, names, canonical, ledger, inputXml });
    } catch (error) {
      attempts.push(`${baseUrl} (${error?.message || String(error)})`);
    }
  }
  throw new TopologyCompanionLoadError(sourceFileName, attempts);
}

/** @param {Readonly<Record<string, unknown>>} controller @param {File} file @param {string} pageUrl @param {typeof fetch} fetchImpl @returns {Promise<Readonly<Record<string, unknown>>>} */
export async function loadTopologySourceFile(controller, file, pageUrl, fetchImpl) {
  if (!file || typeof file.text !== 'function') throw new TypeError('A managed source JSON File is required.');
  await controller.loadArtifact('source', await file.text(), file.name);
  const companions = await loadTopologyCompanionSet(file.name, pageUrl, fetchImpl);
  for (const kind of COMPANION_KINDS) {
    if (companions[kind] === null) continue;
    await controller.loadArtifact(kind, companions[kind], companions.names[kind]);
  }
  return Object.freeze({ companions, validation: controller.validate() });
}

/** @param {string} value @param {string} pageUrl @returns {string} */
function normalizedBaseUrl(value, pageUrl) {
  const url = new URL(value, pageUrl);
  if (!url.pathname.endsWith('/')) url.pathname = `${url.pathname}/`;
  return url.href;
}

/** @param {string} url @param {typeof fetch} fetchImpl @returns {Promise<string>} */
async function requiredText(url, fetchImpl) {
  const response = await fetchImpl(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.text();
}

/** @param {string} url @param {typeof fetch} fetchImpl @returns {Promise<string|null>} */
async function optionalText(url, fetchImpl) {
  const response = await fetchImpl(url, { cache: 'no-store' });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.text();
}

export const _test = Object.freeze({ normalizedBaseUrl, requiredText, optionalText });

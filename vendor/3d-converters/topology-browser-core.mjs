// tabs/universal-enrichment-workbench/source-text.js
function normalizeSourceText(value) {
  return String(value ?? "").replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").trim();
}
function byteLengthOf(value, TextEncoderCtor = globalThis.TextEncoder) {
  if (typeof TextEncoderCtor !== "function") {
    throw new Error("TextEncoder is required to measure source bytes.");
  }
  return new TextEncoderCtor().encode(String(value ?? "")).byteLength;
}

// tabs/universal-enrichment-workbench/source-structure.js
var SOURCE_KINDS = /* @__PURE__ */ new Set(["xml", "inputxml", "stagedjson"]);
var NAME_PATTERN = /^[A-Za-z_][\w:.-]*/;
function displayName(name) {
  return String(name || "").split(":").pop();
}
function localName(name) {
  return displayName(name).toLowerCase();
}
function rootAttribute(tagText, name) {
  const pattern = new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`, "i");
  return tagText.match(pattern)?.[1] || "";
}
function maskXmlBlocks(text5) {
  return text5.replace(/<!--[\s\S]*?-->/g, "").replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, "").replace(/<\?[\s\S]*?\?>/g, "").replace(/<!DOCTYPE[\s\S]*?>/gi, "");
}
function scanXmlTags(text5) {
  const cleaned = maskXmlBlocks(text5);
  const tags = cleaned.match(/<[^>]*>/g) || [];
  const stack = [];
  const names = [];
  const roots = [];
  const errors = [];
  let rootTag = "";
  for (const token of tags) {
    const body = token.slice(1, -1).trim();
    if (!body || body.startsWith("!") || body.startsWith("?")) continue;
    const closing = body.startsWith("/");
    const match = body.replace(/^\//, "").match(NAME_PATTERN);
    if (!match) {
      errors.push(`Invalid XML tag: ${token}`);
      continue;
    }
    const name = match[0];
    if (closing) {
      const opened = stack.pop();
      if (opened !== name) errors.push(`Mismatched XML tag: expected </${opened || ""}> but found </${name}>.`);
      continue;
    }
    if (!stack.length) {
      roots.push(name);
      if (!rootTag) rootTag = body;
    }
    names.push(localName(name));
    if (!body.endsWith("/")) stack.push(name);
  }
  if (stack.length) errors.push(`Unclosed XML tag: <${stack.at(-1)}>.`);
  if (roots.length !== 1) errors.push(`Expected one XML root element, found ${roots.length}.`);
  return { errors, names, rootName: displayName(roots[0]), rootTag };
}
function parseXmlWithDom(text5, ParserCtor) {
  if (typeof ParserCtor !== "function") return null;
  const document = new ParserCtor().parseFromString(text5, "application/xml");
  const parserError = document.querySelector?.("parsererror");
  const root = document.documentElement;
  if (parserError || !root) {
    return { errors: [parserError?.textContent?.trim() || "Malformed XML document."] };
  }
  const names = Array.from(document.getElementsByTagName("*"), (node) => localName(node.localName || node.nodeName));
  return {
    errors: [],
    names,
    rootName: displayName(root.localName || root.nodeName),
    rootTag: root.outerHTML?.slice(1, root.outerHTML.indexOf(">")) || root.nodeName,
    xmlType: root.getAttribute?.("XML_TYPE") || root.getAttribute?.("xml_type") || ""
  };
}
function inputXmlEvidence(xml) {
  const names = xml.names || [];
  const xmlType = String(xml.xmlType || rootAttribute(xml.rootTag, "XML_TYPE")).toLowerCase();
  const rootName = localName(xml.rootName);
  if (rootName === "pipingelement") return true;
  if (rootName !== "caesarii") return names.includes("pipingelement");
  return xmlType === "input" || names.includes("pipingmodel") || names.includes("pipingelement");
}
function inspectXmlStructure(sourceText, ParserCtor = globalThis.DOMParser) {
  const text5 = normalizeSourceText(sourceText);
  if (!text5) return { ok: false, rootName: "", errors: ["Source text is empty."], warnings: [] };
  const parsed = parseXmlWithDom(text5, ParserCtor) || scanXmlTags(text5);
  const errors = [...parsed.errors || []];
  if (!text5.startsWith("<")) errors.push("XML source must begin with an element or declaration.");
  return {
    ok: errors.length === 0,
    rootName: parsed.rootName || "",
    sourceKind: inputXmlEvidence(parsed) ? "inputxml" : "xml",
    errors,
    warnings: []
  };
}
function inspectJsonStructure(sourceText) {
  const text5 = normalizeSourceText(sourceText);
  if (!text5) return { ok: false, rootShape: "", errors: ["Source text is empty."], warnings: [] };
  try {
    const value = JSON.parse(text5);
    const rootShape = Array.isArray(value) ? "array" : typeof value;
    const errors = value && (rootShape === "array" || rootShape === "object") ? [] : ["StagedJSON root must be an object or array."];
    return { ok: errors.length === 0, rootShape, errors, warnings: [] };
  } catch (error) {
    return { ok: false, rootShape: "", errors: [`Malformed JSON: ${error.message}`], warnings: [] };
  }
}
function detectSourceKind(sourceText, ParserCtor = globalThis.DOMParser) {
  const text5 = normalizeSourceText(sourceText);
  if (!text5) return "unknown";
  if (/^[\[{]/.test(text5)) {
    try {
      JSON.parse(text5);
      return "stagedjson";
    } catch {
      return "stagedjson";
    }
  }
  if (text5.startsWith("<")) return inspectXmlStructure(text5, ParserCtor).sourceKind || "xml";
  return "unknown";
}
function analyzeSourceText(sourceText, requestedKind = "auto", ParserCtor = globalThis.DOMParser) {
  const detectedKind = detectSourceKind(sourceText, ParserCtor);
  const effectiveKind = SOURCE_KINDS.has(requestedKind) ? requestedKind : detectedKind;
  if (effectiveKind === "stagedjson") {
    return { ...inspectJsonStructure(sourceText), detectedKind, effectiveKind };
  }
  if (effectiveKind === "xml" || effectiveKind === "inputxml") {
    const xml = inspectXmlStructure(sourceText, ParserCtor);
    const errors = [...xml.errors];
    const mismatch2 = xml.ok && detectedKind !== "unknown" && detectedKind !== effectiveKind;
    if (mismatch2) errors.push(`Selected ${effectiveKind}, but ${detectedKind} structure was detected.`);
    return { ...xml, ok: errors.length === 0, detectedKind, effectiveKind, errors };
  }
  return { ok: false, detectedKind, effectiveKind: "unknown", errors: ["Unable to detect a supported source kind."], warnings: [] };
}

// tabs/universal-enrichment-workbench/source-envelope.js
var VALID_KINDS = /* @__PURE__ */ new Set(["xml", "inputxml", "stagedjson"]);
var VALID_ORIGINS = /* @__PURE__ */ new Set(["file", "paste", "editor"]);
function bytesToHex(buffer) {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
async function sha256Hex(value, cryptoApi = globalThis.crypto) {
  if (!cryptoApi?.subtle?.digest) throw new Error("Web Crypto SHA-256 is unavailable.");
  const bytes = new TextEncoder().encode(String(value ?? ""));
  return bytesToHex(await cryptoApi.subtle.digest("SHA-256", bytes));
}
async function createSourceFileId(sourceText, sourceKind, hashText2 = sha256Hex) {
  const normalizedText = normalizeSourceText(sourceText);
  const identityHash = await hashText2(`${sourceKind}\0${normalizedText}`);
  return `source-${identityHash.slice(0, 32)}`;
}
function envelopeFieldErrors(envelope) {
  const errors = [];
  if (envelope?.schema !== "SourceEnvelope.v1") errors.push("Envelope schema must be SourceEnvelope.v1.");
  if (!VALID_KINDS.has(envelope?.sourceKind)) errors.push("Envelope sourceKind is invalid.");
  if (!VALID_ORIGINS.has(envelope?.origin)) errors.push("Envelope origin is invalid.");
  if (!Number.isInteger(envelope?.revision) || envelope.revision < 1) errors.push("Envelope revision must be a positive integer.");
  if (!/^[a-f0-9]{64}$/.test(envelope?.contentHash || "")) errors.push("Envelope contentHash must be SHA-256 hex.");
  if (!/^source-[a-f0-9]{32}$/.test(envelope?.sourceFileId || "")) errors.push("Envelope sourceFileId is invalid.");
  if (!envelope?.sourceText) errors.push("Envelope sourceText is empty.");
  if (envelope?.byteLength !== byteLengthOf(envelope?.sourceText || "")) errors.push("Envelope byteLength does not match sourceText.");
  return errors;
}
function validateSourceEnvelope(envelope) {
  const structural = envelope?.validation || {};
  const errors = [...structural.errors || [], ...envelopeFieldErrors(envelope)];
  return { ok: errors.length === 0, errors: [...new Set(errors)], warnings: [...structural.warnings || []] };
}
async function createSourceEnvelope(input, dependencies = {}) {
  const sourceText = normalizeSourceText(input.sourceText);
  const hashText2 = dependencies.hashText || sha256Hex;
  const analysis = input.analysis || analyzeSourceText(sourceText, input.sourceKind, dependencies.ParserCtor);
  const contentHash = await hashText2(sourceText);
  const sourceFileId = await createSourceFileId(sourceText, input.sourceKind, hashText2);
  const envelope = {
    schema: "SourceEnvelope.v1",
    sourceFileId,
    sourceKind: input.sourceKind,
    sourceName: String(input.sourceName || "untitled-source"),
    sourceText,
    contentHash,
    origin: input.origin,
    revision: input.revision,
    byteLength: byteLengthOf(sourceText),
    createdAt: (dependencies.now || (() => (/* @__PURE__ */ new Date()).toISOString()))(),
    validation: { ok: analysis.ok, errors: [...analysis.errors], warnings: [...analysis.warnings] }
  };
  return { ...envelope, validation: validateSourceEnvelope(envelope) };
}

// tabs/universal-enrichment-workbench/graph-identity.js
async function createSourceEntityId(sourceFileId, sourceKind, sourcePath, entityKind, hashText2 = sha256Hex) {
  const identity = `${sourceFileId}\0${sourceKind}\0${sourcePath}\0${entityKind}`;
  const hash = await hashText2(identity);
  return `entity-${hash.slice(0, 32)}`;
}

// tabs/model-converters/converters/component-topology/topology-values.js
var TOPOLOGY_TOLERANCE_MM = 0.5;
var SOURCE_CONNECTION_TOLERANCE_MM = 1;
var REFERENCE_CONNECTION_TOLERANCE_MM = 75;
var ROUTE_TYPES = Object.freeze([
  "PIPE",
  "VALV",
  "FLAN",
  "GASK",
  "INST",
  "REDU",
  "ELBO",
  "BEND",
  "TEE",
  "OLET"
]);
var DEFERRED_ENGINEERING = Object.freeze([
  "OD",
  "WALL",
  "MATERIAL",
  "TEMPERATURE",
  "PRESSURE",
  "INSULATION"
]);
function cleanText(value) {
  return value == null ? "" : String(value).trim();
}
function strictPoint(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record2 = (
    /** @type {Record<string, unknown>} */
    value
  );
  const keys = ["x", "y", "z"].every((key) => Object.hasOwn(record2, key)) ? ["x", "y", "z"] : ["X", "Y", "Z"];
  if (!keys.every((key) => Object.hasOwn(record2, key))) return null;
  const numbers = keys.map((key) => Number(record2[key]));
  if (!numbers.every(Number.isFinite)) return null;
  return { x: numbers[0], y: numbers[1], z: numbers[2] };
}
function pointDistance(start, end) {
  if (!start || !end) return Number.POSITIVE_INFINITY;
  return Math.hypot(end.x - start.x, end.y - start.y, end.z - start.z);
}
function componentCategory(type) {
  const value = cleanText(type).toUpperCase();
  if (value === "VALV" || value === "VALVE") return "VALVE";
  if (value === "FLAN" || value === "FLANGE") return "FLANGE";
  if (value === "GASK" || value === "GASKET") return "GASK";
  if (value === "REDU" || value === "REDUCER") return "REDUCER";
  if (value === "ELBO" || value === "BEND" || value === "ELBOW") return "ELBO/BEND";
  if (value === "SUPPORT" || value === "ATTA") return "SUPPORT";
  return value;
}
function geometryClass(type, positions, toleranceMm) {
  const category = componentCategory(type);
  if (category === "SUPPORT") return "DEFERRED";
  if (category === "TEE" || category === "OLET") return "JUNCTION";
  if (positions.APOS && positions.LPOS) {
    return pointDistance(positions.APOS, positions.LPOS) > toleranceMm ? "FINITE" : "POINT";
  }
  return positions.POS ? "POINT" : "UNKNOWN";
}
function uniqueText(values) {
  return [...new Set(values.map(cleanText).filter(Boolean))];
}
function xmlAttribute(value) {
  return cleanText(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
function sequenceId(value) {
  return String(value).padStart(6, "0");
}

// tabs/model-converters/converters/component-topology/topology-support-policy.js
var EXPLICIT_RESTRAINT_FIELDS = Object.freeze([
  "SUPPORT_KIND",
  "SUPPORT_MAPPER_KIND",
  "SUPPORT_TYPE",
  "CMPSUPTYPE",
  "MDSSUPPTYPE",
  "CMPSTRESSN"
]);
var RESTRAINT_TEXT = /\b(ANCHOR|FIXED|GUIDE|LINE\s*STOP|LINESTOP|SPRING|HANGER|REST|SHOE|BASE\s*PLATE|PIPE\s*SUPPORT)\b/i;
var NON_RESTRAINT_ATTACHMENT_TEXT = /\b(FENCE|FLOOR|WALL|ROOF|SLAB)\b[\s\S]*\b(OPENING|PENETRATION|SLEEVE)\b|\b(OPENING|PENETRATION|SLEEVE)\b[\s\S]*\b(FENCE|FLOOR|WALL|ROOF|SLAB)\b/i;
var EMPTY_MARKERS = /* @__PURE__ */ new Set(["", "0", "NONE", "UNSET", "FALSE", "N/A", "NA"]);
function meaningful(value) {
  const normalized = cleanText(value).toUpperCase();
  return !EMPTY_MARKERS.has(normalized);
}
function explicitRestraintEvidence(attributes) {
  for (const field of EXPLICIT_RESTRAINT_FIELDS) {
    if (meaningful(attributes[field])) return { field, value: cleanText(attributes[field]) };
  }
  const nodeType = Number(attributes.NODETYPE);
  if (Number.isFinite(nodeType) && nodeType > 0) return { field: "NODETYPE", value: cleanText(attributes.NODETYPE) };
  const stiffness = Number(String(attributes.NODESTIFF ?? "").replace(/[^0-9.-]/g, ""));
  if (Number.isFinite(stiffness) && stiffness > 0) return { field: "NODESTIFF", value: cleanText(attributes.NODESTIFF) };
  return null;
}
function classifySupportProjection(attributes = {}) {
  const explicit = explicitRestraintEvidence(attributes);
  if (explicit) return Object.freeze({
    disposition: "EMIT_SUPPORT_ATTACHMENT",
    authority: `ATTRIBUTE:${explicit.field}`,
    reason: `${explicit.field} provides explicit stress-support evidence (${explicit.value}).`
  });
  const description = [attributes.DTXR, attributes.ISONOTE, attributes.DESCRIPTION].map(cleanText).filter(Boolean).join(" | ");
  if (NON_RESTRAINT_ATTACHMENT_TEXT.test(description) && !RESTRAINT_TEXT.test(description)) {
    return Object.freeze({
      disposition: "DEFER_SUPPORT",
      authority: "NON_RESTRAINT_ATTACHMENT_DESCRIPTION",
      reason: `Attachment describes an opening/penetration without restraint evidence: ${description}`
    });
  }
  if (RESTRAINT_TEXT.test(description)) return Object.freeze({
    disposition: "EMIT_SUPPORT_ATTACHMENT",
    authority: "DESCRIPTION_RESTRAINT_SEMANTICS",
    reason: `Description contains explicit restraint semantics: ${description}`
  });
  return Object.freeze({
    disposition: "EMIT_SUPPORT_ATTACHMENT",
    authority: "LEGACY_ATTA_FALLBACK",
    reason: "No explicit non-restraint classification was found; preserve the legacy ATTA-to-REST policy."
  });
}
var _test = Object.freeze({
  explicitRestraintEvidence,
  meaningful
});

// tabs/model-converters/converters/component-topology/topology-source-model.js
var COMPONENT_PORTS = Object.freeze([
  ["APOS", "A"],
  ["POS", "P"],
  ["LPOS", "L"]
]);
var BRANCH_PORTS = Object.freeze([
  ["HPOS", "H"],
  ["TPOS", "T"]
]);
function record(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? (
    /** @type {Record<string, unknown>} */
    value
  ) : {};
}
function portDescriptors(owner, sourcePath, definitions, orderStart) {
  const attributes = record(owner.attributes);
  return definitions.flatMap(([field, role], index) => {
    const position = strictPoint(attributes[field]);
    if (!position) return [];
    return [{
      field,
      role,
      position,
      order: orderStart + index,
      sourcePath: `${sourcePath}.attributes.${field}`
    }];
  });
}
function componentDescriptor(child, branchIndex, sourceIndex, order, toleranceMm, branchSourcePath) {
  const sourcePath = `${branchSourcePath}.children[${sourceIndex}]`;
  const attributes = record(child.attributes);
  const sourceType = cleanText(child.type ?? attributes.TYPE).toUpperCase();
  const positions = {
    APOS: strictPoint(attributes.APOS),
    POS: strictPoint(attributes.POS),
    LPOS: strictPoint(attributes.LPOS)
  };
  const spanLengthMm = pointDistance(positions.APOS, positions.LPOS);
  const supportProjection = componentCategory(sourceType) === "SUPPORT" ? classifySupportProjection(attributes) : null;
  return {
    sourcePath,
    sourceType,
    branchIndex,
    sourceIndex,
    order,
    name: cleanText(child.name ?? attributes.NAME),
    sourceRef: cleanText(attributes.REF),
    attributes,
    enrichedAttributes: record(child.enrichedAttributes),
    positions,
    supportProjection,
    geometryClassification: geometryClass(sourceType, positions, toleranceMm),
    finiteSpan: Number.isFinite(spanLengthMm) && spanLengthMm > toleranceMm,
    spanLengthMm,
    isRouteComponent: ROUTE_TYPES.includes(sourceType),
    ports: portDescriptors(child, sourcePath, COMPONENT_PORTS, order * 10)
  };
}
function branchDescriptor(branch, branchIndex, order, toleranceMm, rootPath) {
  const sourcePath = `${rootPath}[${branchIndex}]`;
  const attributes = record(branch.attributes);
  const children = Array.isArray(branch.children) ? branch.children : [];
  return {
    sourcePath,
    sourceType: "BRANCH",
    branchIndex,
    order,
    name: cleanText(branch.name ?? attributes.NAME),
    sourceRef: cleanText(attributes.REF),
    attributes,
    ports: portDescriptors(branch, sourcePath, BRANCH_PORTS, order * 10),
    components: children.map((child, sourceIndex) => componentDescriptor(
      record(child),
      branchIndex,
      sourceIndex,
      order + sourceIndex + 1,
      toleranceMm,
      sourcePath
    ))
  };
}
async function assignEntityIds(entities, sourceFileId) {
  const ids = await Promise.all(entities.map((entity) => createSourceEntityId(
    sourceFileId,
    "stagedjson",
    cleanText(entity.sourcePath),
    "json-object"
  )));
  return entities.map((entity, index) => ({ ...entity, sourceEntityId: ids[index] }));
}
async function assignPortIds(entities, sourceFileId) {
  const descriptors = entities.flatMap((entity) => entity.ports.map((port) => ({
    ...port,
    sourceEntityId: entity.sourceEntityId,
    sourceType: entity.sourceType
  })));
  const ids = await Promise.all(descriptors.map((port) => createSourceEntityId(
    sourceFileId,
    "stagedjson",
    cleanText(port.sourcePath),
    "json-object"
  )));
  return descriptors.map((port, index) => ({
    ...port,
    key: `${port.sourceEntityId}:${port.role}`,
    sourcePortId: ids[index]
  }));
}
function attachPorts(entities, ports) {
  const byEntity = /* @__PURE__ */ new Map();
  for (const port of ports) byEntity.set(port.sourceEntityId, [...byEntity.get(port.sourceEntityId) ?? [], port]);
  return entities.map((entity) => ({ ...entity, ports: Object.freeze(byEntity.get(entity.sourceEntityId) ?? []) }));
}
async function buildTopologySourceModel(sourceText, options) {
  const envelope = await createSourceEnvelope({
    sourceText,
    sourceKind: "stagedjson",
    sourceName: options.sourceName,
    origin: "file",
    revision: 1
  });
  if (!envelope.validation.ok) throw new TypeError(`Invalid managed-stage source: ${envelope.validation.errors.join("; ")}`);
  const parsed = JSON.parse(envelope.sourceText);
  const parsedRecord = record(parsed);
  const rawBranches = Array.isArray(parsed) ? parsed : Array.isArray(parsedRecord.objects) ? parsedRecord.objects : Array.isArray(parsedRecord.hierarchy) ? parsedRecord.hierarchy : parsedRecord.branches;
  if (!Array.isArray(rawBranches) || !rawBranches.length) throw new TypeError("Managed-stage source must contain a non-empty branch array.");
  const rootPath = Array.isArray(parsed) ? "$" : Array.isArray(parsedRecord.objects) ? "$.objects" : Array.isArray(parsedRecord.hierarchy) ? "$.hierarchy" : "$.branches";
  let order = 0;
  const bareBranches = rawBranches.map((branch, branchIndex) => {
    const descriptor = branchDescriptor(record(branch), branchIndex, order, options.toleranceMm, rootPath);
    order += descriptor.components.length + 1;
    return descriptor;
  });
  const bareEntities = bareBranches.flatMap((branch) => [branch, ...branch.components]);
  const identifiedEntities = await assignEntityIds(bareEntities, envelope.sourceFileId);
  const ports = await assignPortIds(identifiedEntities, envelope.sourceFileId);
  const entities = attachPorts(identifiedEntities, ports);
  const entityByPath = new Map(entities.map((entity) => [entity.sourcePath, entity]));
  const branches = bareBranches.map((branch) => {
    const identified = entityByPath.get(branch.sourcePath);
    const components = branch.components.map((component) => ({
      ...entityByPath.get(component.sourcePath),
      sourceBranchEntityId: identified.sourceEntityId,
      sourceBranchName: identified.name
    }));
    return Object.freeze({ ...identified, components: Object.freeze(components) });
  });
  return Object.freeze({
    schema: "ComponentTopologySourceModel.v1",
    sourceIdentity: Object.freeze({
      schema: "SourceEnvelope.v1",
      entityIdentitySchema: "UniversalSourceGraph.v1",
      sourceFileId: envelope.sourceFileId,
      contentHash: envelope.contentHash,
      sourceName: envelope.sourceName,
      sourceKind: envelope.sourceKind,
      sourceRevision: envelope.revision
    }),
    branches: Object.freeze(branches),
    components: Object.freeze(branches.flatMap((branch) => branch.components)),
    entities: Object.freeze(branches.flatMap((branch) => [branch, ...branch.components])),
    sourcePorts: Object.freeze(ports)
  });
}

// tabs/model-converters/converters/component-topology/topology-connectivity.js
function createDisjointSet(ports) {
  const parent = new Map(ports.map((port) => [port.key, port.key]));
  const rank = new Map(ports.map((port) => [port.key, 0]));
  const find = (key) => {
    const current = parent.get(key);
    if (!current) throw new Error(`Unknown source port key ${key}.`);
    if (current === key) return key;
    const root = find(current);
    parent.set(key, root);
    return root;
  };
  const unite = (left, right) => {
    let leftRoot = find(left), rightRoot = find(right);
    if (leftRoot === rightRoot) return leftRoot;
    const leftRank = rank.get(leftRoot) ?? 0, rightRank = rank.get(rightRoot) ?? 0;
    if (leftRank < rightRank) [leftRoot, rightRoot] = [rightRoot, leftRoot];
    parent.set(rightRoot, leftRoot);
    if (leftRank === rightRank) rank.set(leftRoot, leftRank + 1);
    return leftRoot;
  };
  return Object.freeze({ find, unite });
}
function portForRole(entity, role) {
  return entity.ports.find((port) => port.role === role) ?? null;
}
function routeAnchors(component) {
  const category = componentCategory(component.sourceType);
  if (category === "SUPPORT") return null;
  if (category === "OLET") {
    const point3 = portForRole(component, "P");
    return point3 ? { entry: point3, exit: point3 } : null;
  }
  if (category === "TEE" && component.finiteSpan !== true) {
    const point3 = portForRole(component, "P");
    return point3 ? { entry: point3, exit: point3 } : null;
  }
  if (component.geometryClassification !== "FINITE" && !(category === "TEE" && component.finiteSpan === true)) return null;
  const entry = portForRole(component, "A"), exit = portForRole(component, "L");
  return entry && exit ? { entry, exit } : null;
}
function sameFiniteSpan(left, right, toleranceMm) {
  const leftStart = portForRole(left, "A"), leftEnd = portForRole(left, "L");
  const rightStart = portForRole(right, "A"), rightEnd = portForRole(right, "L");
  return Boolean(leftStart && leftEnd && rightStart && rightEnd && left.finiteSpan === true && right.finiteSpan === true && pointDistance(leftStart.position, rightStart.position) <= toleranceMm && pointDistance(leftEnd.position, rightEnd.position) <= toleranceMm);
}
function findManagedOverlapGroups(branches, toleranceMm) {
  return branches.flatMap((branch) => {
    const pipes = branch.components.filter((component) => componentCategory(component.sourceType) === "PIPE" && cleanText(component.attributes.AUTO_GENERATED_PIPE).toLowerCase() === "true");
    const instruments = branch.components.filter((component) => componentCategory(component.sourceType) === "INST");
    return instruments.flatMap((instrument) => {
      const pipe = pipes.find((candidate) => sameFiniteSpan(candidate, instrument, toleranceMm));
      return pipe ? [{
        primary: instrument,
        secondary: pipe,
        sourceEntityIds: [instrument.sourceEntityId, pipe.sourceEntityId],
        authority: "AUTO_GENERATED_PIPE_COMPONENT_SPAN"
      }] : [];
    });
  });
}
function uniteVerified(left, right, toleranceMm, acceptedSourcePrecisionMm, set, issues, evidence) {
  const residual = pointDistance(left.position, right.position);
  if (residual <= toleranceMm) {
    set.unite(left.key, right.key);
    return;
  }
  if (residual <= acceptedSourcePrecisionMm) {
    set.unite(left.key, right.key);
    issues.push({
      code: "SOURCE_CONNECTION_PRECISION_RESIDUAL",
      blocking: false,
      residualMm: residual,
      toleranceMm,
      acceptedSourcePrecisionMm,
      leftPortId: left.sourcePortId,
      rightPortId: right.sourcePortId,
      ...evidence
    });
    return;
  }
  issues.push({
    code: "EXPLICIT_CONNECTION_RESIDUAL_EXCEEDED",
    blocking: true,
    residualMm: residual,
    toleranceMm,
    leftPortId: left.sourcePortId,
    rightPortId: right.sourcePortId,
    ...evidence
  });
}
function connectBranchRoute(branch, toleranceMm, set, issues, secondaryIds) {
  const anchors = branch.components.filter((component) => !secondaryIds.has(component.sourceEntityId)).map(routeAnchors).filter(Boolean);
  for (let index = 1; index < anchors.length; index += 1) {
    uniteVerified(anchors[index - 1].exit, anchors[index].entry, toleranceMm, SOURCE_CONNECTION_TOLERANCE_MM, set, issues, {
      authority: "BRANCH_CHILD_ORDER",
      sourcePath: branch.sourcePath
    });
  }
  const head = portForRole(branch, "H"), tail = portForRole(branch, "T");
  const headTarget = head && anchors.length ? nearestPort(head, [anchors[0].entry, anchors[0].exit]) : null;
  const tailTarget = tail && anchors.length ? nearestPort(tail, [anchors.at(-1).entry, anchors.at(-1).exit]) : null;
  if (head && headTarget) uniteVerified(head, headTarget, toleranceMm, SOURCE_CONNECTION_TOLERANCE_MM, set, issues, {
    authority: "BRANCH_HEAD_ORDER",
    sourcePath: branch.sourcePath
  });
  if (tail && tailTarget) uniteVerified(tailTarget, tail, toleranceMm, SOURCE_CONNECTION_TOLERANCE_MM, set, issues, {
    authority: "BRANCH_TAIL_ORDER",
    sourcePath: branch.sourcePath
  });
}
function nearestPort(point3, candidates) {
  return candidates.map((port) => ({ port, distance: pointDistance(point3.position, port.position) })).sort((left, right) => left.distance - right.distance)[0]?.port ?? null;
}
function connectBranchReferences(branches, toleranceMm, set, issues) {
  const byName = new Map(branches.map((branch) => [cleanText(branch.name), branch]));
  for (const branch of branches) for (const [field, role] of [["HREF", "H"], ["TREF", "T"]]) {
    const reference = cleanText(branch.attributes[field]);
    const target = byName.get(reference), sourcePort = portForRole(branch, role);
    if (!reference || !target || !sourcePort) continue;
    const targetPort = nearestPort(sourcePort, [portForRole(target, "H"), portForRole(target, "T")].filter(Boolean));
    if (targetPort) uniteVerified(sourcePort, targetPort, toleranceMm, REFERENCE_CONNECTION_TOLERANCE_MM, set, issues, {
      authority: field,
      sourcePath: branch.sourcePath,
      reference
    });
  }
}
function reciprocalRole(component, target) {
  const aliases2 = new Set([cleanText(component.sourceRef), cleanText(component.name)].filter(Boolean));
  if (aliases2.has(cleanText(target.attributes.HREF))) return "H";
  if (aliases2.has(cleanText(target.attributes.TREF))) return "T";
  return "";
}
function planCrefConnections(model, toleranceMm, set, issues) {
  const branches = model.branches, byName = new Map(branches.map((branch) => [cleanText(branch.name), branch]));
  const components = model.components.filter((component) => ["TEE", "OLET"].includes(componentCategory(component.sourceType)));
  return components.flatMap((component) => {
    const reference = cleanText(component.attributes.CREF);
    if (!reference) return [];
    const target = byName.get(reference), junctionPort = portForRole(component, "P");
    const role = target ? reciprocalRole(component, target) : "";
    const targetPort = target && role ? portForRole(target, role) : null;
    if (!target || !junctionPort || !targetPort) {
      issues.push({ code: "CREF_TARGET_UNRESOLVED", blocking: true, sourcePath: component.sourcePath, reference });
      return [];
    }
    const residualMm = pointDistance(junctionPort.position, targetPort.position);
    const merged = residualMm <= toleranceMm;
    if (merged) set.unite(junctionPort.key, targetPort.key);
    return [{ component, targetBranch: target, junctionPort, targetPort, targetRole: role, residualMm, merged }];
  });
}
function buildExplicitConnectivity(model, toleranceMm) {
  const set = createDisjointSet(model.sourcePorts), issues = [];
  const overlapGroups = findManagedOverlapGroups(model.branches, toleranceMm);
  const secondaryIds = new Set(overlapGroups.map((group) => group.secondary.sourceEntityId));
  for (const branch of model.branches) connectBranchRoute(branch, toleranceMm, set, issues, secondaryIds);
  connectBranchReferences(model.branches, toleranceMm, set, issues);
  const crefConnections = planCrefConnections(model, toleranceMm, set, issues);
  return Object.freeze({
    set,
    crefConnections: Object.freeze(crefConnections),
    overlapGroups: Object.freeze(overlapGroups),
    issues: Object.freeze(issues)
  });
}

// tabs/stagedjson-to-enrichxml/sj-type-mapper.js
var DEFAULT_TYPE_OVERRIDES = Object.freeze({
  FBLI: "FLAN",
  INST: "VALV",
  BEND: "ELBO",
  ANCI: "ATTA"
});
var PIPE_BOUNDARY_TYPES = Object.freeze(/* @__PURE__ */ new Set([
  "PIPE",
  "ELBO",
  "BEND",
  "TEE",
  "OLET",
  "REDU"
]));
var RIGID_TYPES = Object.freeze(/* @__PURE__ */ new Set([
  "VALV",
  "FLAN",
  "GASK",
  "INST"
]));
var SUPPORT_TYPES = Object.freeze(/* @__PURE__ */ new Set([
  "ATTA",
  "SUPPORT",
  "ANCI"
]));
function mapComponentType(rawType, overrides = {}) {
  const upper2 = String(rawType ?? "").toUpperCase().trim();
  if (!upper2) return "PIPE";
  const merged = { ...DEFAULT_TYPE_OVERRIDES, ...overrides };
  return merged[upper2] ?? upper2;
}
function isRigidType(componentType) {
  return RIGID_TYPES.has(String(componentType).toUpperCase());
}
function isSupportType(componentType) {
  return SUPPORT_TYPES.has(String(componentType).toUpperCase());
}
function rigidValue(componentType) {
  const upper2 = String(componentType).toUpperCase();
  if (upper2 === "PIPE") return 0;
  if (RIGID_TYPES.has(upper2)) return 2;
  return 0;
}
function attaConnectionType(supportKind) {
  const u = String(supportKind ?? "").toUpperCase();
  if (/ANCH|FIXED|FIX/.test(u)) return "ANCHOR";
  if (/GUIDE|GT01/.test(u)) return "GUIDE";
  if (/SPRING|HANG/.test(u)) return "SPRING";
  return "SUPPORT";
}

// tabs/stagedjson-to-enrichxml/sj-branch-identity.js
function canonicalBranchRoot(value) {
  return text(value).replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/\\+/g, "/").replace(/\/{2,}/g, "/").replace(/\/$/, "").replace(/\/B0*\d+$/i, "");
}
function branchSuffix(value) {
  return text(value).match(/\/(B0*\d+)$/i)?.[1]?.toUpperCase() || "";
}
function resolveBranchIdentity({ sourceName, owner }) {
  const source = text(sourceName);
  const ownerRoot = canonicalBranchRoot(owner);
  const sourceRoot = canonicalBranchRoot(source);
  return Object.freeze({
    sourceName: source,
    owner: text(owner),
    canonicalName: ownerRoot || sourceRoot || source,
    suffix: branchSuffix(source)
  });
}
function text(value) {
  return String(value ?? "").trim();
}

// tabs/stagedjson-to-enrichxml/sj-parser.js?v=4
var CONTAINER_TYPES = /* @__PURE__ */ new Set(["BRANCH", "SITE", "ZONE", "GROUP", "WORLD"]);
var EMPTY_BRANCH = Object.freeze({ sourceName: "", owner: "", canonicalName: "", suffix: "" });
function parseStagedJson(stagedJson, config = {}) {
  const root = Array.isArray(stagedJson) ? stagedJson : stagedJson.objects || [stagedJson];
  const records = [];
  walkNodes(root, [], EMPTY_BRANCH, records, config);
  return records;
}
function groupByBranch(records) {
  const map = /* @__PURE__ */ new Map();
  for (const record2 of records) {
    const branch = record2.branchName || "/UNMAPPED";
    if (!map.has(branch)) map.set(branch, []);
    map.get(branch).push(record2);
  }
  return map;
}
function walkNodes(nodes, ancestorPath, inheritedBranch, output, config) {
  nodes.forEach((node, index) => {
    if (!node || typeof node !== "object" || Array.isArray(node)) return;
    const attrs = flatAttrs(node);
    const rawType = text2(node.type || attrs.TYPE || attrs.RAW_TYPE).toUpperCase();
    const branch = rawType === "BRANCH" ? resolveBranchIdentity({ sourceName: text2(node.name || attrs.NAME), owner: attrs.OWNER }) : inheritedBranch;
    const path = [...ancestorPath, index];
    if (!CONTAINER_TYPES.has(rawType) || rawType === "BRANCH") {
      if (rawType !== "BRANCH") output.push(buildRecord(node, rawType, path, branch, config));
    }
    const children = Array.isArray(node.children) ? node.children : [];
    walkNodes(children, [...path, "children"], branch, output, config);
  });
}
function buildRecord(node, rawType, path, branch, config) {
  const attrs = flatAttrs(node);
  const enrichedAttributes = plain(node.enrichedAttributes);
  const componentType = mapComponentType(
    attrs.RAW_TYPE || rawType,
    config.typeOverrides || {}
  );
  const isSupport = isSupportType(componentType);
  const boreMm = finiteNumber(enrichedAttributes.nominalBoreMm) ?? parseBore(attrs);
  const dtxr = text2(attrs.DTXR || "");
  const spre = text2(attrs.SPRE || "");
  return {
    path,
    name: text2(node.name),
    branchName: branch.canonicalName,
    sourceBranchName: branch.sourceName,
    branchOwner: branch.owner,
    branchSuffix: branch.suffix,
    rawType,
    componentType,
    isSupport,
    boreMm,
    attrs,
    enrichedAttributes: Object.keys(enrichedAttributes).length ? enrichedAttributes : null,
    dtxr,
    spre,
    ispe: text2(attrs.ISPE || ""),
    mtxx: text2(attrs.MTXX || ""),
    mesc: text2(attrs["MESC OF SPREF"] || ""),
    insuMm: finiteNumber(enrichedAttributes.insulationThicknessMm) ?? parseMm(attrs.INSU),
    anglDeg: parseDeg(attrs.ANGL),
    ref: text2(attrs.REF || attrs.COMPRE || ""),
    trackingNo: text2(attrs["TRACKING_NO."] || ""),
    supportTag: text2(attrs.SUPPORT_TAG || ""),
    supportKind: text2(attrs.SUPPORT_KIND || attrs.SUPPORT_MAPPER_KIND || ""),
    supportType: text2(attrs.SUPPORT_TYPE || ""),
    cmpStressN: text2(attrs.CMPSTRESSN || ""),
    cmpSupRefN: text2(attrs.CMPSUPREFN || ""),
    nodegap: parseMm(attrs.NODEGAP),
    nodestiff: parseNum(attrs.NODESTIFF),
    nodefriction: parseNum(attrs.NODEFRICTION),
    sourceWeightKg: firstNumber(attrs.CMPWEIGHTDRY, attrs.NWEI, attrs.WEIGHT) ?? 0,
    resolved: null
  };
}
function flatAttrs(node) {
  const attributes = node?.attributes;
  return attributes && typeof attributes === "object" && !Array.isArray(attributes) ? attributes : {};
}
function parseBore(attrs) {
  const keys = ["ABORE", "HBORE", "LBORE", "BORE", "HBOR", "TBOR", "COMPBORE"];
  for (const key of keys) {
    const value = parseMm(attrs[key]);
    if (value !== null && value > 0) return value;
  }
  return null;
}
function parseMm(value) {
  if (value === null || value === void 0) return null;
  const normalized = String(value).replace(/mm|in|ft/gi, "").replace(/,/g, "").trim();
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}
function parseDeg(value) {
  if (value === null || value === void 0) return null;
  const normalized = String(value).replace(/degree|deg|°/gi, "").trim();
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}
function parseNum(value) {
  if (value === null || value === void 0) return null;
  const normalized = String(value).replace(/[^0-9.-]/g, "");
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}
function firstNumber(...values) {
  for (const value of values) {
    const parsed = parseNum(value);
    if (parsed !== null) return parsed;
  }
  return null;
}
function finiteNumber(value) {
  if (value === null || value === void 0 || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
function plain(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
function text2(value) {
  return String(value ?? "").trim();
}

// tabs/stagedjson-to-enrichxml/sj-rating-resolver.js
var DEFAULT_RATING_SEQUENCE = Object.freeze([
  ["200", 2e4],
  ["150", 15e3],
  ["100", 1e4],
  ["900", 900],
  ["600", 600],
  ["300", 300],
  ["25", 2500],
  ["15", 1500],
  ["5", 5e3],
  ["9", 900],
  ["3", 300],
  ["6", 600],
  ["1", 150]
]);
var DTXR_RATING_PATTERNS = Object.freeze([
  [/\b20000\s*#/, 2e4],
  [/\b15000\s*#/, 15e3],
  [/\b10000\s*#/, 1e4],
  [/\b9000\s*#/, 9e3],
  [/\b6000\s*#/, 6e3],
  [/\b5000\s*#/, 5e3],
  [/\b3000\s*#/, 3e3],
  [/\b2500\s*#/, 2500],
  [/\b1500\s*#/, 1500],
  [/\b900\s*#/, 900],
  [/\b600\s*#/, 600],
  [/\b300\s*#/, 300],
  [/\b150\s*#/, 150],
  [/\bclass\s*20000\b/i, 2e4],
  [/\bclass\s*15000\b/i, 15e3],
  [/\bclass\s*10000\b/i, 1e4],
  [/\bclass\s*9000\b/i, 9e3],
  [/\bclass\s*6000\b/i, 6e3],
  [/\bclass\s*5000\b/i, 5e3],
  [/\bclass\s*3000\b/i, 3e3],
  [/\bclass\s*2500\b/i, 2500],
  [/\bclass\s*1500\b/i, 1500],
  [/\bclass\s*900\b/i, 900],
  [/\bclass\s*600\b/i, 600],
  [/\bclass\s*300\b/i, 300],
  [/\bclass\s*150\b/i, 150],
  [/\bPN\s*250\b/i, 2500],
  [/\bPN\s*150\b/i, 1500],
  [/\bPN\s*100\b/i, 1e3],
  [/\bPN\s*63\b/i, 630],
  [/\bPN\s*40\b/i, 400],
  [/\bPN\s*25\b/i, 250],
  [/\bPN\s*16\b/i, 160],
  [/\bPN\s*10\b/i, 100]
]);
function ratingFromPipingClass(pipingClass, ratingSequence = DEFAULT_RATING_SEQUENCE) {
  const clean = String(pipingClass ?? "").replace(/^\/+/, "").split("/").pop().toUpperCase().trim();
  if (!clean) return { rating: null, source: "none", confidence: "NONE" };
  for (const [prefix, value] of ratingSequence) {
    const p = String(prefix).toUpperCase();
    if (clean.startsWith(p)) {
      return { rating: Number(value), source: `piping-class-prefix:${prefix}`, confidence: "HIGH" };
    }
  }
  return { rating: null, source: "none", confidence: "NONE" };
}
function ratingFromHashClass(spreValue) {
  const src = String(spreValue ?? "");
  const hit = src.match(/-(\d+)#/);
  if (hit) {
    const n = Number(hit[1]);
    if (Number.isFinite(n) && n > 0) {
      return { rating: n, source: `spre-hash-class:${hit[0]}`, confidence: "HIGH" };
    }
  }
  return { rating: null, source: "none", confidence: "NONE" };
}
function ratingFromDtxr(dtxr) {
  const src = String(dtxr ?? "");
  for (const [pattern, value] of DTXR_RATING_PATTERNS) {
    if (pattern.test(src)) {
      return { rating: value, source: `dtxr-keyword:${pattern.source}`, confidence: "MED" };
    }
  }
  return { rating: null, source: "none", confidence: "NONE" };
}
function resolveRating(attrs, ratingSequence = DEFAULT_RATING_SEQUENCE, config = {}) {
  if (!attrs) return { rating: null, source: "none", confidence: "NONE" };
  const classMap = config.classRatingOverrides;
  if (classMap) {
    const spre = attrs.SPRE || attrs.ISPE || attrs.LSTU || "";
    const cls = pipingClassFromSpre(spre);
    if (cls && classMap[cls] != null) {
      return { rating: Number(classMap[cls]), source: `class-override:${cls}`, confidence: "HIGH" };
    }
  }
  for (const key of ["SPRE", "ISPE", "LSTU"]) {
    const val = attrs[key];
    if (val) {
      const result = ratingFromHashClass(val);
      if (result.rating !== null) return result;
    }
  }
  for (const key of ["SPRE", "ISPE", "LSTU"]) {
    const val = attrs[key];
    if (val) {
      const result = ratingFromPipingClass(val, ratingSequence);
      if (result.rating !== null) return result;
    }
  }
  const dtxr = attrs.DTXR || attrs.RAW_TYPE || "";
  if (dtxr) {
    const result = ratingFromDtxr(dtxr);
    if (result.rating !== null) return result;
  }
  return { rating: null, source: "unresolved", confidence: "NONE" };
}
function pipingClassFromSpre(spre) {
  const parts = String(spre || "").replace(/^\/+/, "").split("/");
  return parts.length >= 2 ? parts.slice(0, -1).join("/") : parts[0] || "";
}

// tabs/stagedjson-to-enrichxml/sj-wall-resolver.js
var NPS_TO_DN = Object.freeze({
  "0.5": 15,
  "0.75": 20,
  "1": 25,
  "1.25": 32,
  "1.5": 40,
  "2": 50,
  "2.5": 65,
  "3": 80,
  "4": 100,
  "6": 150,
  "8": 200,
  "10": 250,
  "12": 300,
  "14": 350,
  "16": 400,
  "18": 450,
  "20": 500,
  "24": 600
});
var ASME_WALL_MM = Object.freeze({
  "0.5": { "40": 2.77, "80": 3.73, "STD": 2.77, "XS": 3.73 },
  "0.75": { "40": 2.87, "80": 3.91, "STD": 2.87, "XS": 3.91 },
  "1": { "40": 3.38, "80": 4.55, "STD": 3.38, "XS": 4.55 },
  "1.25": { "40": 3.56, "80": 4.85, "STD": 3.56, "XS": 4.85 },
  "1.5": { "40": 3.68, "80": 5.08, "STD": 3.68, "XS": 5.08 },
  "2": { "40": 3.91, "80": 5.54, "STD": 3.91, "XS": 5.54 },
  "2.5": { "40": 5.16, "80": 7.01, "STD": 5.16, "XS": 7.01 },
  "3": { "40": 5.49, "80": 7.62, "STD": 5.49, "XS": 7.62 },
  "4": { "40": 6.02, "80": 8.56, "160": 13.49, "STD": 6.02, "XS": 8.56 },
  "6": { "40": 7.11, "80": 10.97, "160": 18.26, "STD": 7.11, "XS": 10.97 },
  "8": { "40": 8.18, "80": 12.7, "160": 23.01, "STD": 9.53, "XS": 12.7 },
  "10": { "40": 9.27, "80": 15.09, "160": 28.58, "STD": 9.53, "XS": 15.09 },
  "12": { "40": 10.31, "80": 17.48, "160": 33.32, "STD": 9.53, "XS": 17.48 },
  "14": { "40": 11.13, "80": 19.05, "STD": 9.53, "XS": 19.05 },
  "16": { "40": 12.7, "80": 21.44, "STD": 9.53, "XS": 21.44 },
  "18": { "40": 14.27, "80": 23.83, "STD": 9.53, "XS": 23.83 },
  "20": { "40": 15.09, "80": 26.19, "STD": 9.53, "XS": 26.19 },
  "24": { "40": 17.48, "80": 30.96, "STD": 9.53, "XS": 30.96 }
});
var ASME_STD_WALL = Object.freeze({
  15: 2.77,
  20: 2.87,
  25: 3.38,
  32: 3.56,
  40: 3.68,
  50: 3.91,
  65: 5.16,
  80: 5.49,
  100: 6.02,
  150: 7.11,
  200: 8.18,
  250: 9.27,
  300: 9.53,
  350: 9.53,
  400: 9.53,
  450: 9.53,
  500: 9.53,
  600: 9.53
});
function boreMmToNps(boreMm) {
  const bore = Number(boreMm);
  if (!Number.isFinite(bore) || bore <= 0) return "";
  let best = null;
  for (const [nps, dn] of Object.entries(NPS_TO_DN)) {
    const err = Math.abs(dn - bore);
    if (!best || err < best.err) best = { nps, err };
  }
  return best && best.err <= Math.max(2, bore * 0.02) ? best.nps : "";
}
function scheduleFromDtxr(text5) {
  const src = String(text5 ?? "").toUpperCase().replace(/SCH\.?/g, " SCH ");
  if (/\bXXS\b|DOUBLE\s+EXTRA\s+STRONG/.test(src)) return "XXS";
  if (/\bXS\b|EXTRA\s+STRONG/.test(src)) return "XS";
  if (/\bSTD\b|STANDARD\s+WT/.test(src)) return "STD";
  const hit = src.match(/\bSCH(?:EDULE)?\s*[-:]?\s*(\d{1,3})\s*S?\b/) || src.match(/\bSCHEDULE\s*(\d{1,3})\b/);
  return hit ? String(Number(hit[1])) : "";
}
function resolveWallFromDtxr({ boreMm, dtxrValues = [] }) {
  const nps = boreMmToNps(boreMm);
  if (!nps) return null;
  for (const dtxr of dtxrValues) {
    if (!dtxr) continue;
    const schedule = scheduleFromDtxr(dtxr);
    if (!schedule) continue;
    const wall = ASME_WALL_MM[nps]?.[schedule];
    if (wall) {
      return { wallMm: wall, nps, schedule, dtxr, source: "asme-b36.10", confidence: "HIGH" };
    }
  }
  return null;
}
function fallbackStdWall(boreMm) {
  const bore = Math.round(Number(boreMm));
  const wall = ASME_STD_WALL[bore];
  if (wall) return { wallMm: wall, source: "asme-b36.10-std-fallback", confidence: "MED" };
  return null;
}
function resolveWall({ boreMm, dtxrValues = [], spre = "" }, config = {}) {
  const wallMap = config.classWallOverrides;
  if (wallMap && spre) {
    const cls = pipingClassFromSpre2(spre);
    const key = `${cls}||${boreMm || 0}`;
    const overSch = wallMap[key];
    if (overSch) {
      const nps = boreMmToNps(boreMm);
      const wall = nps ? ASME_WALL_MM[nps]?.[overSch] : null;
      if (wall) return { wallMm: wall, nps, schedule: overSch, source: `class-override:${key}`, confidence: "HIGH" };
    }
  }
  const fromDtxr = resolveWallFromDtxr({ boreMm, dtxrValues });
  if (fromDtxr) return fromDtxr;
  return fallbackStdWall(boreMm);
}
function pipingClassFromSpre2(spre) {
  const parts = String(spre || "").replace(/^\/+/, "").split("/");
  return parts.length >= 2 ? parts.slice(0, -1).join("/") : parts[0] || "";
}

// tabs/stagedjson-to-enrichxml/sj-corrosion-resolver.js
var DEFAULT_CORROSION_TABLE = Object.freeze([
  // Stainless / duplex → 0
  { prefix: "SS", corrMm: 0 },
  { prefix: "DSS", corrMm: 0 },
  { prefix: "SDSS", corrMm: 0 },
  { prefix: "316", corrMm: 0 },
  { prefix: "304", corrMm: 0 },
  // HDPE / GRP → 0
  { prefix: "GRP", corrMm: 0 },
  { prefix: "FRP", corrMm: 0 },
  { prefix: "PE", corrMm: 0 },
  // Carbon / low-alloy steel → 1.5
  { prefix: "", corrMm: 1.5 }
  // catch-all
]);
function extractClassToken(spreValue) {
  const raw = String(spreValue ?? "").trim();
  const last = raw.replace(/^\/+/, "").split("/").pop() || "";
  return last.split("-")[0].toUpperCase();
}
function resolveCorrosion(spreValue, boreMm, config = {}) {
  const corrMap = config.classCorrOverrides;
  if (corrMap && spreValue) {
    const cls = pipingClassFromSpre3(spreValue);
    const key = `${cls}||${boreMm || 0}`;
    const overCorr = corrMap[key];
    if (overCorr != null && Number.isFinite(Number(overCorr))) {
      return { corrMm: Number(overCorr), source: `class-override:${key}`, confidence: "HIGH" };
    }
  }
  const table = buildCorrosionTable(config.corrosionOverrides || {}, DEFAULT_CORROSION_TABLE);
  const token = extractClassToken(spreValue);
  if (!token && !spreValue) {
    return { corrMm: config.corrDefault != null ? Number(config.corrDefault) : 1.5, source: "default", confidence: "LOW" };
  }
  const sorted = [...table].sort((a, b) => b.prefix.length - a.prefix.length);
  for (const row of sorted) {
    const prefix = String(row.prefix).toUpperCase();
    if (prefix && token.startsWith(prefix)) {
      return { corrMm: Number(row.corrMm), source: `class-prefix:${prefix}`, confidence: "MED" };
    }
    if (!prefix) {
      return { corrMm: Number(row.corrMm), source: "class-default", confidence: "LOW" };
    }
  }
  return { corrMm: config.corrDefault != null ? Number(config.corrDefault) : 1.5, source: "default", confidence: "LOW" };
}
function pipingClassFromSpre3(spre) {
  const parts = String(spre || "").replace(/^\/+/, "").split("/");
  return parts.length >= 2 ? parts.slice(0, -1).join("/") : parts[0] || "";
}
function buildCorrosionTable(overridesMap = {}, baseTable = DEFAULT_CORROSION_TABLE) {
  const extra = Object.entries(overridesMap).map(([prefix, corrMm]) => ({
    prefix: String(prefix).toUpperCase(),
    corrMm: Number(corrMm)
  }));
  return [...extra, ...baseTable];
}

// tabs/stagedjson-to-enrichxml/sj-restraint-resolver.js
var RESTRAINT_CODE_MAP = Object.freeze({
  ANC: 1,
  GUI: 8,
  GUIDE: 8,
  LIM: 9,
  LIMIT: 9,
  XSNB: 10,
  YSNB: 11,
  ZSNB: 12,
  "+X": 13,
  "+Y": 14,
  "+Z": 15,
  "-X": 16,
  "-Y": 17,
  "-Z": 18,
  "+RX": 19,
  "+RY": 20,
  "+RZ": 21,
  "-RX": 22,
  "-RY": 23,
  "-RZ": 24,
  "+LIM": 25,
  "-LIM": 26,
  XROD: 27,
  YROD: 28,
  ZROD: 29,
  XSPR: 54,
  YSPR: 55,
  ZSPR: 56
});
var DEFAULT_FRICTION = 0.3;
function classifySupportKind(attrs) {
  const a = attrs || {};
  const raw = firstText(a, [
    "SUPPORT_KIND",
    "SUPPORT_MAPPER_KIND",
    "SUPPORT_TYPE",
    "CMPSUPTYPE",
    "NODETYPE",
    "MDSSUPPTYPE"
  ]) || firstText(a, ["DTXR"]);
  return mapKindString(raw);
}
function mapKindString(raw) {
  const u = String(raw ?? "").toUpperCase().trim();
  if (!u) return "REST";
  if (/ANCHOR|FIXED|FIX|ANCI/.test(u)) return "ANCHOR";
  if (/GUIDE|GT01/.test(u)) return "GUIDE";
  if (/LINE\s*STOP|LINESTOP|ST06|LS[-_]/.test(u)) return "LINESTOP";
  if (/SPRING|HANG|HANGER/.test(u)) return "SPRING";
  if (/REST|SHOE|BASE\s*PLATE|SUPPORT|ATTA/.test(u)) return "REST";
  return "REST";
}
function resolveRestraint(attrs, verticalAxis = "Y") {
  const kind = classifySupportKind(attrs);
  const gap = numAttr(attrs, ["NODEGAP", "CMPSUPGAP", "GAP_MM"]) ?? 0;
  const stiffness = numAttr(attrs, ["NODESTIFF", "STIFFNESS"]) ?? 0;
  const friction = numAttr(attrs, ["NODEFRICTION", "FRICTION"]) ?? (kind === "REST" ? DEFAULT_FRICTION : 0);
  switch (kind) {
    case "ANCHOR":
      return { kind, type: "ANC", gap, friction: 0, stiffness: 0, direction: "A", confidence: "HIGH" };
    case "GUIDE":
      return { kind, type: "GUI", gap, friction: 0, stiffness, direction: "GUI", confidence: "HIGH" };
    case "LINESTOP":
      return { kind, type: "LIM", gap, friction: 0, stiffness, direction: "LIM", confidence: "HIGH" };
    case "SPRING":
      return {
        kind,
        type: verticalAxis === "Z" ? "ZSPR" : "YSPR",
        gap: 0,
        friction: 0,
        stiffness,
        direction: verticalAxis === "Z" ? "+Z" : "+Y",
        confidence: "HIGH"
      };
    default:
      return {
        kind: "REST",
        type: verticalAxis === "Z" ? "+Z" : "+Y",
        gap,
        friction,
        stiffness: 0,
        direction: verticalAxis === "Z" ? "+Z" : "+Y",
        confidence: "HIGH"
      };
  }
}
function formatRestraintXml(r) {
  const lines = ["<Restraint>"];
  lines.push(`  <Type>${r.type}</Type>`);
  if (r.gap > 0) lines.push(`  <Gap>${r.gap}</Gap>`);
  if (r.stiffness > 0) lines.push(`  <Stiffness>${r.stiffness}</Stiffness>`);
  if (r.friction > 0) lines.push(`  <Friction>${r.friction}</Friction>`);
  lines.push("</Restraint>");
  return lines.join("\n");
}
function firstText(attrs, keys) {
  for (const key of keys) {
    const v = attrs?.[key];
    if (v !== void 0 && v !== null && String(v).trim()) return String(v).trim();
  }
  return "";
}
function numAttr(attrs, keys) {
  for (const key of keys) {
    const v = attrs?.[key];
    if (v === void 0 || v === null) continue;
    const s = String(v).replace(/[^0-9.-]/g, "");
    const n = Number(s);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

// tabs/stagedjson-to-enrichxml/sj-weight-db.js
var VALVE_TYPE_KEYWORDS = Object.freeze({
  GATE: /\bGATE\b/i,
  GLOBE: /\bGLOBE\b/i,
  CHECK: /\bCHECK\b/i,
  BALL: /\bBALL\b/i,
  BUTTERFLY: /\bBUTTERFLY\b/i,
  PLUG: /\bPLUG\b/i,
  NEEDLE: /\bNEEDLE\b/i,
  CONTROL: /\bCONTROL\b/i,
  SAFETY: /\bSAFETY|RELIEF\b/i,
  SWING: /\bSWING\b/i,
  DIAPHRAGM: /\bDIAPHRAGM\b/i
});
var DN_TO_OD_MM = Object.freeze({
  15: 21.3,
  20: 26.7,
  25: 33.4,
  32: 42.2,
  40: 48.3,
  50: 60.3,
  65: 73,
  80: 88.9,
  100: 114.3,
  125: 141.3,
  150: 168.3,
  200: 219.1,
  250: 273,
  300: 323.8,
  350: 355.6,
  400: 406.4,
  450: 457.2,
  500: 508,
  600: 609.6
});
var FLANGE_WEIGHT_KG = Object.freeze({
  25: { 150: 1.2, 300: 1.8, 600: 2.5, 900: 3.8, 1500: 6.2 },
  40: { 150: 1.8, 300: 2.5, 600: 3.8, 900: 5.5, 1500: 9 },
  50: { 150: 2.5, 300: 3.5, 600: 5.2, 900: 7.5, 1500: 12.5 },
  80: { 150: 4.5, 300: 6.2, 600: 9.5, 900: 14, 1500: 23 },
  100: { 150: 6.5, 300: 9.5, 600: 14, 900: 21, 1500: 34 },
  150: { 150: 11.5, 300: 17, 600: 25, 900: 38, 1500: 62 },
  200: { 150: 19, 300: 28, 600: 42, 900: 65, 1500: 106 },
  250: { 150: 28, 300: 43, 600: 65, 900: 100, 1500: 165 },
  300: { 150: 42, 300: 63, 600: 95, 900: 148, 1500: 245 },
  350: { 150: 55, 300: 85, 600: 130, 900: 200, 1500: 330 },
  400: { 150: 72, 300: 110, 600: 170, 900: 265, 1500: 440 },
  450: { 150: 90, 300: 140, 600: 215, 900: 335, 1500: 560 },
  500: { 150: 115, 300: 175, 600: 275, 900: 425, 1500: 715 },
  600: { 150: 165, 300: 255, 600: 400, 900: 625, 1500: 1050 }
});
var GATE_VALVE_KG = Object.freeze({
  25: { 150: 5, 300: 7, 600: 9, 900: 12, 1500: 18 },
  40: { 150: 8, 300: 11, 600: 15, 900: 20, 1500: 30 },
  50: { 150: 12, 300: 17, 600: 24, 900: 32, 1500: 48 },
  80: { 150: 22, 300: 32, 600: 45, 900: 60, 1500: 90 },
  100: { 150: 38, 300: 55, 600: 78, 900: 104, 1500: 156 },
  150: { 150: 75, 300: 110, 600: 155, 900: 207, 1500: 310 },
  200: { 150: 130, 300: 190, 600: 270, 900: 360, 1500: 540 },
  250: { 150: 210, 300: 310, 600: 440, 900: 585, 1500: 880 },
  300: { 150: 320, 300: 470, 600: 665, 900: 885, 1500: 1330 },
  350: { 150: 450, 300: 660, 600: 935, 900: 1245, 1500: 1870 },
  400: { 150: 610, 300: 895, 600: 1265, 900: 1685, 1500: 2530 },
  450: { 150: 800, 300: 1175, 600: 1660, 900: 2215, 1500: 3320 },
  500: { 150: 1030, 300: 1510, 600: 2135, 900: 2845, 1500: 4270 },
  600: { 150: 1560, 300: 2285, 600: 3230, 900: 4305, 1500: 6460 }
});
var GLOBE_VALVE_KG = Object.freeze(
  Object.fromEntries(
    Object.entries(GATE_VALVE_KG).map(([dn, ratings]) => [
      dn,
      Object.fromEntries(Object.entries(ratings).map(([r, w]) => [r, Math.round(w * 1.4)]))
    ])
  )
);
var CHECK_VALVE_KG = Object.freeze(
  Object.fromEntries(
    Object.entries(GATE_VALVE_KG).map(([dn, ratings]) => [
      dn,
      Object.fromEntries(Object.entries(ratings).map(([r, w]) => [r, Math.round(w * 0.8)]))
    ])
  )
);
var BALL_VALVE_KG = Object.freeze(
  Object.fromEntries(
    Object.entries(GATE_VALVE_KG).map(([dn, ratings]) => [
      dn,
      Object.fromEntries(Object.entries(ratings).map(([r, w]) => [r, Math.round(w * 0.7)]))
    ])
  )
);
var BUTTERFLY_VALVE_KG = Object.freeze(
  Object.fromEntries(
    Object.entries(GATE_VALVE_KG).map(([dn, ratings]) => [
      dn,
      Object.fromEntries(Object.entries(ratings).map(([r, w]) => [r, Math.round(w * 0.3)]))
    ])
  )
);
var VALVE_WEIGHT_TABLES = Object.freeze({
  GATE: GATE_VALVE_KG,
  GLOBE: GLOBE_VALVE_KG,
  CHECK: CHECK_VALVE_KG,
  BALL: BALL_VALVE_KG,
  BUTTERFLY: BUTTERFLY_VALVE_KG,
  PLUG: GATE_VALVE_KG,
  // approximate
  SWING: CHECK_VALVE_KG,
  // approximate
  CONTROL: GLOBE_VALVE_KG,
  // approximate
  SAFETY: GLOBE_VALVE_KG,
  // approximate
  DIAPHRAGM: GATE_VALVE_KG,
  // approximate
  NEEDLE: GATE_VALVE_KG,
  // approximate
  GENERIC: GATE_VALVE_KG
  // last resort
});
var GASKET_WEIGHT_KG = Object.freeze({
  25: { 150: 0.1, 300: 0.15, 600: 0.2, 900: 0.3, 1500: 0.5 },
  50: { 150: 0.2, 300: 0.3, 600: 0.4, 900: 0.6, 1500: 0.9 },
  100: { 150: 0.5, 300: 0.7, 600: 1, 900: 1.5, 1500: 2.2 },
  150: { 150: 0.8, 300: 1.2, 600: 1.7, 900: 2.5, 1500: 3.8 },
  200: { 150: 1.2, 300: 1.8, 600: 2.5, 900: 3.8, 1500: 5.7 },
  250: { 150: 1.8, 300: 2.7, 600: 3.8, 900: 5.7, 1500: 8.5 },
  300: { 150: 2.5, 300: 3.8, 600: 5.4, 900: 8, 1500: 12 },
  400: { 150: 4.2, 300: 6.3, 600: 9, 900: 13.5, 1500: 20 },
  600: { 150: 9, 300: 13.5, 600: 19, 900: 28, 1500: 42 }
});

// tabs/stagedjson-to-enrichxml/sj-weight-resolver.js
function detectValveType(dtxr) {
  const src = String(dtxr ?? "");
  for (const [type, pattern] of Object.entries(VALVE_TYPE_KEYWORDS)) {
    if (pattern.test(src)) return type;
  }
  return "GENERIC";
}
function lookupFromTable(table, boreMm, rating) {
  const bore = Math.round(boreMm);
  const rat = Math.round(rating);
  const availBores = Object.keys(table).map(Number).sort((a, b) => a - b);
  if (!availBores.length) return null;
  const nearestRating = nearestKey(Object.keys(table[availBores[0]] || {}).map(Number), rat);
  if (table[bore]?.[nearestRating] !== void 0) {
    const w = table[bore][nearestRating];
    return { weightKg: w, method: nearestRating === rat ? "exact" : "rating-interpolated" };
  }
  const lo = availBores.filter((b) => b <= bore).pop();
  const hi = availBores.filter((b) => b >= bore)[0];
  if (!lo && !hi) return null;
  if (!lo) return { weightKg: table[hi][nearestRating] ?? 0, method: "bore-extrapolated" };
  if (!hi) return { weightKg: table[lo][nearestRating] ?? 0, method: "bore-extrapolated" };
  if (lo === hi) return { weightKg: table[lo][nearestRating] ?? 0, method: "bore-interpolated" };
  const wLo = table[lo][nearestRating] ?? 0;
  const wHi = table[hi][nearestRating] ?? 0;
  const t = (bore - lo) / (hi - lo);
  return { weightKg: Math.round(wLo + t * (wHi - wLo)), method: "bore-interpolated" };
}
function resolveValveWeight({ boreMm, rating, dtxr }) {
  const valveType = detectValveType(dtxr);
  const table = VALVE_WEIGHT_TABLES[valveType] ?? VALVE_WEIGHT_TABLES.GENERIC;
  const rat = rating || 150;
  const result = lookupFromTable(table, boreMm, rat);
  if (!result) return { weightKg: 0, valveType, source: "not-found", confidence: "NONE" };
  return {
    weightKg: result.weightKg,
    valveType,
    source: `built-in-db:${valveType}`,
    confidence: result.method === "exact" ? "HIGH" : "MED"
  };
}
function resolveFlangeWeight({ boreMm, rating }) {
  const rat = rating || 150;
  const result = lookupFromTable(FLANGE_WEIGHT_KG, boreMm, rat);
  if (!result) return { weightKg: 0, source: "not-found", confidence: "NONE" };
  return {
    weightKg: result.weightKg,
    source: `built-in-db:FLAN`,
    confidence: result.method === "exact" ? "HIGH" : "MED"
  };
}
function resolveGasketWeight({ boreMm, rating }) {
  const rat = rating || 150;
  const result = lookupFromTable(GASKET_WEIGHT_KG, boreMm, rat);
  if (!result) return { weightKg: 0.2, source: "default-gasket", confidence: "LOW" };
  return {
    weightKg: result.weightKg,
    source: "built-in-db:GASK",
    confidence: result.method === "exact" ? "HIGH" : "MED"
  };
}
function resolveRigidWeight({ componentType, boreMm, rating, dtxr }) {
  const type = String(componentType ?? "").toUpperCase();
  if (type === "VALV") return resolveValveWeight({ boreMm, rating, dtxr });
  if (type === "FLAN") return resolveFlangeWeight({ boreMm, rating });
  if (type === "GASK") return resolveGasketWeight({ boreMm, rating });
  return resolveValveWeight({ boreMm, rating, dtxr: "" });
}
function nearestKey(keys, target) {
  if (!keys.length) return target;
  return keys.reduce(
    (best, k) => Math.abs(k - target) < Math.abs(best - target) ? k : best
  );
}

// tabs/stagedjson-to-enrichxml/sj-point-resolver.js
function parsePoint(value) {
  if (!value) return null;
  if (typeof value === "object" && !Array.isArray(value)) {
    return pointFromObj(value);
  }
  if (typeof value === "string") {
    return pointFromString(value);
  }
  return null;
}
function bestPosition(attrs) {
  if (!attrs || typeof attrs !== "object") return null;
  const keys = ["APOS", "POS", "LPOS", "HPOS", "TPOS", "BPOS"];
  for (const key of keys) {
    const pt = parsePoint(attrs[key]);
    if (pt) return pt;
  }
  return null;
}
function arrivePosition(attrs) {
  if (!attrs) return null;
  return parsePoint(attrs.APOS) ?? parsePoint(attrs.HPOS) ?? parsePoint(attrs.POS) ?? null;
}
function leavePosition(attrs) {
  if (!attrs) return null;
  return parsePoint(attrs.LPOS) ?? parsePoint(attrs.TPOS) ?? parsePoint(attrs.POS) ?? null;
}
function formatPosition(pt) {
  if (!pt) return "";
  return `${r3(pt.x)} ${r3(pt.y)} ${r3(pt.z)}`;
}
function pointFromObj(obj) {
  const x = num(obj.x ?? obj.X);
  const y = num(obj.y ?? obj.Y);
  const z = num(obj.z ?? obj.Z);
  if (x === null || y === null || z === null) return null;
  return { x, y, z };
}
function pointFromString(str) {
  const tokens = str.trim().split(/\s+/);
  if (tokens.length < 6) return null;
  const vals = {};
  for (let i = 0; i < tokens.length - 1; i += 2) {
    const axis = tokens[i].toUpperCase();
    const raw = tokens[i + 1]?.replace(/mm|in|ft/gi, "");
    const n = num(raw);
    if (n === null) return null;
    if (axis === "E") vals.x = n;
    else if (axis === "N" || axis === "S") vals.y = axis === "S" ? -n : n;
    else if (axis === "U" || axis === "D") vals.z = axis === "D" ? -n : n;
  }
  if (vals.x === void 0 || vals.y === void 0 || vals.z === void 0) return null;
  return { x: vals.x, y: vals.y, z: vals.z };
}
function num(v) {
  if (v === null || v === void 0 || v === "") return null;
  const s = String(v).replace(/mm|in|ft|,/gi, "").trim();
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
function r3(n) {
  return Number(n).toFixed(3);
}

// tabs/stagedjson-to-enrichxml/sj-enrichment-authority.js
var AUTHORITY_SOURCE = "stagedjson-cii2019-enriched-attributes/v1";
function applyAuthoritativeEnrichment(record2, resolved = {}) {
  const enriched = plain2(record2?.enrichedAttributes);
  const output = { ...resolved };
  assignNumber(output, enriched, "pressureRating", "rating", "ratingSource");
  assignNumber(output, enriched, "wallThicknessMm", "wallMm", "wallSource");
  assignNumber(output, enriched, "corrosionAllowanceMm", "corrMm", "corrSource");
  assignNumber(output, enriched, "pipeOdMm", "odMm", "odSource");
  assignNumber(output, enriched, "componentWeightKg", "weightKg", "weightSource");
  return output;
}
function authoritativeNumber(record2, enrichedKey, resolvedKey, fallback = null) {
  const enriched = finiteNumber2(record2?.enrichedAttributes?.[enrichedKey]);
  if (enriched !== null) return enriched;
  const resolved = finiteNumber2(record2?.resolved?.[resolvedKey]);
  if (resolved !== null) return resolved;
  return finiteNumber2(fallback);
}
function assignNumber(output, enriched, enrichedKey, outputKey, sourceKey) {
  const value = finiteNumber2(enriched[enrichedKey]);
  if (value === null) return;
  output[outputKey] = value;
  output[sourceKey] = AUTHORITY_SOURCE;
  const confidenceKey = sourceKey.replace(/Source$/, "Confidence");
  if (confidenceKey !== sourceKey) output[confidenceKey] = "HIGH";
}
function finiteNumber2(value) {
  if (value === null || value === void 0 || value === "") return null;
  const match = String(value).replace(/,/g, "").match(/[-+]?(?:\d+\.?\d*|\.\d+)(?:[Ee][-+]?\d+)?/);
  const parsed = match ? Number(match[0]) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}
function plain2(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

// tabs/stagedjson-to-enrichxml/sj-node-contract.js
var XML_BOUNDARY_TYPES = /* @__PURE__ */ new Set(["PIPE", "ELBO", "BEND", "TEE", "OLET", "REDU", "REDUCER"]);
var DN_TO_NPS_INCH = Object.freeze({
  15: 0.5,
  20: 0.75,
  25: 1,
  32: 1.25,
  40: 1.5,
  50: 2,
  65: 2.5,
  80: 3,
  90: 3.5,
  100: 4,
  125: 5,
  150: 6,
  200: 8,
  250: 10,
  300: 12,
  350: 14,
  400: 16,
  450: 18,
  500: 20,
  550: 22,
  600: 24
});
function isXmlBoundaryComponent(componentType) {
  return XML_BOUNDARY_TYPES.has(upper(componentType));
}
function resolveXmlEngineeringValues(record2) {
  return {
    odMm: authoritativeNumber(record2, "pipeOdMm", "odMm"),
    wallMm: authoritativeNumber(record2, "wallThicknessMm", "wallMm"),
    corrMm: authoritativeNumber(record2, "corrosionAllowanceMm", "corrMm"),
    insulationMm: authoritativeNumber(record2, "insulationThicknessMm", "insulationMm", record2?.insuMm) ?? 0,
    weightKg: authoritativeNumber(record2, "componentWeightKg", "weightKg", record2?.sourceWeightKg)
  };
}
function projectBoundaryNodeContract(record2, startNodeNumber) {
  const componentType = normalizedType(record2?.componentType);
  if (!isXmlBoundaryComponent(componentType)) {
    throw new TypeError(`No boundary-node contract for ${componentType || "(blank)"}.`);
  }
  const common = commonSpec(record2);
  let nodes;
  if (componentType === "ELBO") {
    nodes = [{
      ...common,
      nodeNumber: startNodeNumber,
      nodeName: "",
      endpoint: 0,
      includeRigid: false,
      componentType: "ELBO",
      connectionType: "",
      position: arrivePosition(record2.attrs) ?? bestPosition(record2.attrs),
      bendRadius: resolveBendRadius(record2),
      bendType: 0,
      alphaAngle: null,
      dtxrSource: ""
    }];
  } else if (componentType === "TEE") {
    nodes = [{
      ...common,
      nodeNumber: startNodeNumber + 10,
      nodeName: "",
      endpoint: 1,
      includeRigid: false,
      componentType: "BRAN",
      connectionType: "TEE",
      position: leavePosition(record2.attrs) ?? bestPosition(record2.attrs),
      bendRadius: 0,
      alphaAngle: null,
      dtxrSource: ""
    }];
  } else if (componentType === "REDU") {
    nodes = [{
      ...common,
      nodeNumber: startNodeNumber + 10,
      nodeName: "",
      endpoint: 2,
      includeRigid: false,
      componentType: "REDU",
      connectionType: "",
      position: leavePosition(record2.attrs) ?? bestPosition(record2.attrs),
      bendRadius: 0,
      alphaAngle: resolveReducerAlphaAngle(record2),
      dtxrSource: ""
    }];
  } else {
    nodes = genericBoundaryPair(record2, startNodeNumber, common);
  }
  return Object.freeze({
    nodes: Object.freeze(nodes.map((node) => Object.freeze(node))),
    numberingSpan: 2,
    primaryNodeNumber: nodes[0].nodeNumber
  });
}
function genericBoundaryPair(record2, startNodeNumber, common) {
  const rigid = rigidValue(record2.componentType);
  return [
    {
      ...common,
      nodeNumber: startNodeNumber,
      nodeName: record2.name,
      endpoint: 1,
      includeRigid: true,
      rigid,
      componentType: normalizedType(record2.componentType),
      connectionType: record2.connectionType || record2.resolved?.connectionType || "",
      position: arrivePosition(record2.attrs),
      bendRadius: 0,
      alphaAngle: finiteNumber3(record2.anglDeg),
      dtxrSource: record2.dtxr ? "staged-json-position-group" : ""
    },
    {
      ...common,
      nodeNumber: startNodeNumber + 10,
      nodeName: "",
      endpoint: 2,
      includeRigid: true,
      rigid,
      componentType: normalizedType(record2.componentType),
      connectionType: "",
      position: leavePosition(record2.attrs),
      bendRadius: 0,
      alphaAngle: null,
      dtxrSource: ""
    }
  ];
}
function commonSpec(record2) {
  return {
    weight: 0,
    componentRefNo: record2.ref || record2.name,
    dimensions: resolveXmlEngineeringValues(record2),
    sif: 0,
    dtxrPos: record2.dtxr || ""
  };
}
function resolveBendRadius(record2) {
  const explicit = firstPositive(
    record2?.enrichedAttributes?.bendRadiusMm,
    record2?.resolved?.bendRadiusMm,
    record2?.attrs?.RADI,
    record2?.attrs?.BEND_RADIUS
  );
  if (explicit !== null) return explicit;
  const nominalBore = firstPositive(record2?.enrichedAttributes?.nominalBoreMm, record2?.boreMm);
  const nps = DN_TO_NPS_INCH[Math.round(nominalBore ?? NaN)];
  if (!nps) return 0;
  const description = upper(record2?.dtxr);
  const factor = /\bSR\b|SHORT\s*RADIUS/.test(description) ? 1 : 1.5;
  return Math.round(nps * 25.4 * factor);
}
function resolveReducerAlphaAngle(record2) {
  const explicit = firstPositive(record2?.anglDeg, record2?.attrs?.ANGL);
  if (explicit !== null) return explicit;
  const start = arrivePosition(record2?.attrs);
  const end = leavePosition(record2?.attrs);
  if (!start || !end) return null;
  const axialLength = Math.max(
    Math.abs(end.x - start.x),
    Math.abs(end.y - start.y),
    Math.abs(end.z - start.z)
  );
  if (!(axialLength > 0)) return null;
  const largeDn = firstPositive(
    record2?.enrichedAttributes?.nominalBoreMm,
    record2?.boreMm,
    record2?.attrs?.ABORE,
    record2?.attrs?.HBORE,
    record2?.attrs?.HBOR
  );
  const smallDn = firstPositive(
    record2?.attrs?.LBORE,
    record2?.attrs?.TBORE,
    record2?.attrs?.TBOR
  );
  const largeOd = resolveXmlEngineeringValues(record2).odMm ?? DN_TO_OD_MM[Math.round(largeDn ?? NaN)];
  const smallOd = DN_TO_OD_MM[Math.round(smallDn ?? NaN)];
  if (!(largeOd > 0) || !(smallOd > 0) || largeOd === smallOd) return null;
  const radialChange = Math.abs(largeOd - smallOd) / 2;
  return Math.round(Math.atan2(radialChange, axialLength) * 180 / Math.PI * 1e3) / 1e3;
}
function normalizedType(value) {
  const type = upper(value);
  if (type === "BEND") return "ELBO";
  if (type === "REDUCER") return "REDU";
  return type;
}
function firstPositive(...values) {
  for (const value of values) {
    const parsed = finiteNumber3(value);
    if (parsed !== null && parsed > 0) return parsed;
  }
  return null;
}
function finiteNumber3(value) {
  if (value === null || value === void 0 || value === "") return null;
  const match = String(value).replace(/,/g, "").match(/[-+]?(?:\d+\.?\d*|\.\d+)(?:[Ee][-+]?\d+)?/);
  const parsed = match ? Number(match[0]) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}
function upper(value) {
  return String(value ?? "").trim().toUpperCase();
}

// tabs/stagedjson-to-enrichxml/sj-xml-writer.js?v=4
var XML_NS = "http://aveva.com/pipeStress116.xsd";
var NULL_TEMP = "-100000";
function buildEnrichedXml(branchMap, config = {}) {
  const lines = [];
  lines.push(`<?xml version="1.0" encoding="utf-8"?>`);
  lines.push(`<PipeStressExport xmlns="${XML_NS}">`);
  const now = /* @__PURE__ */ new Date();
  lines.push(`<DateTime>${now.toLocaleString("en-GB")}</DateTime>`);
  lines.push(`<Source>StagedJSON\u2192EnrichXML</Source>`);
  lines.push(`<Version>1.0</Version>`);
  lines.push(`<Purpose>StagedJSON enrichment output</Purpose>`);
  lines.push(`<ProjectName>${esc(config.projectName || "")}</ProjectName>`);
  lines.push(`<MDBName>${esc(config.mdbName || "/")}</MDBName>`);
  lines.push(`<TitleLine>StagedJSON Enriched Export</TitleLine>`);
  lines.push(`<Units>`);
  lines.push(`  <DistanceUnits>mm</DistanceUnits>`);
  lines.push(`  <BoreUnits>mm</BoreUnits>`);
  lines.push(`  <PressureUnits>pascal</PressureUnits>`);
  lines.push(`  <TemperatureUnits>degC</TemperatureUnits>`);
  lines.push(`  <WeightUnits>kg</WeightUnits>`);
  lines.push(`  <ForceUnits>newton</ForceUnits>`);
  lines.push(`  <WallThicknessUnits>mm</WallThicknessUnits>`);
  lines.push(`  <FluidDensityUnits>kg/m3</FluidDensityUnits>`);
  lines.push(`</Units>`);
  lines.push(`<RestrainOpenEnds>Yes</RestrainOpenEnds>`);
  lines.push(`<AmbientTemperature>21</AmbientTemperature>`);
  lines.push(`<Pipe>`);
  lines.push(`<FullName>${esc(config.pipeName || "/STAGEDJSON-EXPORT")}</FullName>`);
  let nodeCounter = 10;
  for (const [branchName, records] of branchMap) {
    const branchBlock = buildBranchBlock(branchName, records, config, nodeCounter);
    lines.push(...branchBlock.lines);
    nodeCounter += branchBlock.numberingSpan * 10;
  }
  lines.push(`</Pipe>`);
  lines.push(`</PipeStressExport>`);
  return lines.join("\n");
}
function buildBranchBlock(branchName, records, config, startNum) {
  const lines = [`<Branch>`];
  lines.push(`<Branchname>${esc(branchName)}</Branchname>`);
  let t1 = NULL_TEMP, t2 = NULL_TEMP, t3 = NULL_TEMP;
  let p1 = "0", p2 = "0", p3 = "0";
  for (const rec of records) {
    const ea = rec.enrichedAttributes || {};
    const attrs = rec.attrs || {};
    if (t1 === NULL_TEMP && (ea.designTemperatureC !== void 0 || attrs.T1 !== void 0)) {
      t1 = ea.designTemperatureC ?? attrs.T1 ?? attrs.T ?? NULL_TEMP;
    }
    if (t2 === NULL_TEMP && (ea.operatingTemperatureC !== void 0 || attrs.T2 !== void 0)) {
      t2 = ea.operatingTemperatureC ?? attrs.T2 ?? NULL_TEMP;
    }
    if (t3 === NULL_TEMP && (ea.minimumTemperatureC !== void 0 || attrs.T3 !== void 0)) {
      t3 = ea.minimumTemperatureC ?? attrs.T3 ?? NULL_TEMP;
    }
    if (p1 === "0") {
      if (ea.designPressureMpa !== void 0 && ea.designPressureMpa !== null) p1 = ea.designPressureMpa * 1e6;
      else if (attrs.P1 !== void 0) p1 = attrs.P1;
      else if (attrs.P !== void 0) p1 = attrs.P;
    }
    if (p2 === "0") p2 = attrs.P2 ?? "0";
    if (p3 === "0") p3 = attrs.P3 ?? "0";
  }
  lines.push(`<Temperature>`);
  lines.push(`  <Temperature1>${t1}</Temperature1>`);
  lines.push(`  <Temperature2>${t2}</Temperature2>`);
  lines.push(`  <Temperature3>${t3}</Temperature3>`);
  for (let i = 4; i <= 9; i += 1) lines.push(`  <Temperature${i}>${NULL_TEMP}</Temperature${i}>`);
  lines.push(`</Temperature>`);
  lines.push(`<Pressure>`);
  lines.push(`  <Pressure1>${p1}</Pressure1>`);
  lines.push(`  <Pressure2>${p2}</Pressure2>`);
  lines.push(`  <Pressure3>${p3}</Pressure3>`);
  for (let i = 4; i <= 9; i += 1) lines.push(`  <Pressure${i}>0</Pressure${i}>`);
  lines.push(`</Pressure>`);
  lines.push(`<MaterialNumber>0</MaterialNumber>`);
  lines.push(`<InsulationDensity>0</InsulationDensity>`);
  lines.push(`<FluidDensity>0</FluidDensity>`);
  let numberingSpan = 0;
  for (const rec of records) {
    const allocationStart = startNum + numberingSpan * 10;
    const nodeXml = buildNodeBlocks(rec, allocationStart, config);
    rec.xmlNodeNum = nodeXml.primaryNodeNumber ?? allocationStart;
    lines.push(...nodeXml.lines);
    numberingSpan += nodeXml.numberingSpan;
  }
  lines.push(`</Branch>`);
  return { lines, numberingSpan };
}
function buildNodeBlocks(rec, nodeNum, config) {
  const type = rec.componentType;
  if (isSupportType(type)) {
    return {
      lines: buildSupportNode(rec, nodeNum, config),
      numberingSpan: 1,
      primaryNodeNumber: nodeNum
    };
  }
  if (isXmlBoundaryComponent(type)) {
    const projection = projectBoundaryNodeContract(rec, nodeNum);
    return {
      lines: projection.nodes.flatMap(buildProjectedNode),
      numberingSpan: projection.numberingSpan,
      primaryNodeNumber: projection.primaryNodeNumber
    };
  }
  return {
    lines: buildRigidNode(rec, nodeNum, config),
    numberingSpan: 1,
    primaryNodeNumber: nodeNum
  };
}
function buildSupportNode(rec, nodeNum, config) {
  const resolved = rec.resolved || {};
  const position = bestPosition(rec.attrs);
  const dimensions = resolveXmlEngineeringValues(rec);
  const lines = [`<Node>`];
  lines.push(`  <NodeNumber>${nodeNum}</NodeNumber>`);
  lines.push(`  <NodeName>${esc(rec.supportTag || rec.name)}</NodeName>`);
  lines.push(`  <Endpoint>1</Endpoint>`);
  lines.push(`  <Rigid>0</Rigid>`);
  lines.push(`  <ComponentType>ATTA</ComponentType>`);
  lines.push(`  <Weight>0</Weight>`);
  lines.push(`  <ComponentRefNo>${esc(rec.ref || rec.name)}</ComponentRefNo>`);
  lines.push(`  <ConnectionType>${esc(resolved.connectionType || "SUPPORT")}</ConnectionType>`);
  lines.push(...buildMandatoryDims(dimensions));
  if (position) lines.push(`  <Position>${formatPosition(position)}</Position>`);
  lines.push(`  <BendRadius>0</BendRadius>`);
  lines.push(`  <SIF>0</SIF>`);
  const restraints = Array.isArray(resolved.restraint) ? resolved.restraint : resolved.restraint ? [resolved.restraint] : [];
  for (const restraint of restraints) {
    if (restraint && (restraint.type || restraint.kind)) {
      lines.push(`  ${formatRestraintXml(restraint).split("\n").join("\n  ")}`);
    }
  }
  const dtxrPs = rec.cmpStressN || rec.supportTag || rec.dtxr;
  if (dtxrPs) lines.push(`  <DTXR_PS>${esc(dtxrPs)}</DTXR_PS>`);
  if (dtxrPs) lines.push(`  <DTXR_SOURCE>staged-json-ps-fallback</DTXR_SOURCE>`);
  lines.push(`</Node>`);
  return lines;
}
function buildProjectedNode(spec) {
  const lines = [`<Node>`];
  lines.push(`  <NodeNumber>${spec.nodeNumber}</NodeNumber>`);
  lines.push(`  <NodeName>${esc(spec.nodeName || "")}</NodeName>`);
  lines.push(`  <Endpoint>${spec.endpoint}</Endpoint>`);
  if (spec.includeRigid !== false) lines.push(`  <Rigid>${spec.rigid ?? 0}</Rigid>`);
  lines.push(`  <ComponentType>${esc(spec.componentType)}</ComponentType>`);
  lines.push(`  <Weight>${spec.weight ?? 0}</Weight>`);
  lines.push(`  <ComponentRefNo>${esc(spec.componentRefNo)}</ComponentRefNo>`);
  lines.push(`  <ConnectionType>${esc(spec.connectionType || "")}</ConnectionType>`);
  lines.push(...buildMandatoryDims(spec.dimensions));
  if (spec.position) lines.push(`  <Position>${formatPosition(spec.position)}</Position>`);
  lines.push(`  <BendRadius>${spec.bendRadius ?? 0}</BendRadius>`);
  if (spec.bendType !== void 0 && spec.bendType !== null) {
    lines.push(`  <BendType>${spec.bendType}</BendType>`);
  }
  if (spec.alphaAngle !== void 0 && spec.alphaAngle !== null) {
    lines.push(`  <AlphaAngle>${spec.alphaAngle}</AlphaAngle>`);
  }
  lines.push(`  <SIF>${spec.sif ?? 0}</SIF>`);
  if (spec.dtxrPos) lines.push(`  <DTXR_POS>${esc(spec.dtxrPos)}</DTXR_POS>`);
  if (spec.dtxrSource) lines.push(`  <DTXR_SOURCE>${esc(spec.dtxrSource)}</DTXR_SOURCE>`);
  lines.push(`</Node>`);
  return lines;
}
function buildRigidNode(rec, nodeNum, config) {
  const position = bestPosition(rec.attrs);
  const engineering = resolveXmlEngineeringValues(rec);
  const weight = engineering.weightKg ?? rec.sourceWeightKg ?? 0;
  const lines = [`<Node>`];
  lines.push(`  <NodeNumber>${nodeNum}</NodeNumber>`);
  lines.push(`  <NodeName>${esc(rec.name)}</NodeName>`);
  lines.push(`  <Endpoint>1</Endpoint>`);
  lines.push(`  <Rigid>${rigidValue(rec.componentType)}</Rigid>`);
  lines.push(`  <ComponentType>${esc(rec.componentType)}</ComponentType>`);
  lines.push(`  <Weight>${Number(weight).toFixed(2)}</Weight>`);
  lines.push(`  <ComponentRefNo>${esc(rec.ref || rec.name)}</ComponentRefNo>`);
  lines.push(`  <ConnectionType></ConnectionType>`);
  lines.push(...buildMandatoryDims(engineering));
  if (position) lines.push(`  <Position>${formatPosition(position)}</Position>`);
  lines.push(`  <BendRadius>0</BendRadius>`);
  lines.push(`  <SIF>0</SIF>`);
  if (rec.dtxr) lines.push(`  <DTXR_POS>${esc(rec.dtxr)}</DTXR_POS>`);
  if (rec.dtxr) lines.push(`  <DTXR_SOURCE>staged-json-position-group</DTXR_SOURCE>`);
  lines.push(`</Node>`);
  return lines;
}
function buildMandatoryDims(values = {}) {
  return [
    `  <OutsideDiameter>${values.odMm ?? 0}</OutsideDiameter>`,
    `  <WallThickness>${values.wallMm ?? 0}</WallThickness>`,
    `  <CorrosionAllowance>${values.corrMm ?? 0}</CorrosionAllowance>`,
    `  <InsulationThickness>${values.insulationMm ?? 0}</InsulationThickness>`
  ];
}
function esc(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// tabs/stagedjson-to-enrichxml/sj-audit.js
function buildAudit(records, branchMap) {
  const totalNodes = records.length;
  const branchReports = [];
  for (const [branchName, branchRecords] of branchMap) {
    branchReports.push(buildBranchAudit(branchName, branchRecords));
  }
  const totals = aggregateTotals(branchReports);
  const overallPct = totalNodes > 0 ? Math.round(totals.resolved / totalNodes * 100) : 0;
  return {
    schema: "stagedjson-enrichxml-audit/v1",
    totalNodes,
    totalBranches: branchMap.size,
    overallPct,
    totals,
    branches: branchReports
  };
}
function buildBranchAudit(branchName, records) {
  const fields = ["rating", "wall", "corr", "weight", "restraint"];
  const counts = initCounts(fields);
  const issues = [];
  for (const rec of records) {
    const r = rec.resolved || {};
    scoreField(counts, "rating", r.ratingConfidence, rec, issues);
    scoreField(counts, "wall", r.wallConfidence, rec, issues);
    scoreField(counts, "corr", r.corrConfidence, rec, issues);
    if (rec.isSupport) {
      scoreField(counts, "restraint", r.restraint?.confidence ?? "NONE", rec, issues);
    }
    if (isRigidByType(rec.componentType)) {
      scoreField(counts, "weight", r.weightConfidence, rec, issues);
    }
  }
  const total = records.length;
  const resolvedCount = records.filter((r) => isResolved(r.resolved)).length;
  const pct = total > 0 ? Math.round(resolvedCount / total * 100) : 0;
  return {
    branchName,
    totalNodes: total,
    resolvedNodes: resolvedCount,
    pct,
    fieldCounts: counts,
    issues: issues.slice(0, 50)
    // cap for UI
  };
}
function initCounts(fields) {
  const obj = {};
  for (const f of fields) obj[f] = { HIGH: 0, MED: 0, LOW: 0, NONE: 0 };
  return obj;
}
function scoreField(counts, field, confidence, rec, issues) {
  const c = String(confidence || "NONE").toUpperCase();
  if (!counts[field]) return;
  counts[field][c] = (counts[field][c] || 0) + 1;
  if (c === "NONE") {
    issues.push({
      field,
      severity: "MISSING",
      name: rec.name,
      type: rec.componentType,
      bore: rec.boreMm
    });
  }
}
function isResolved(resolved) {
  if (!resolved) return false;
  return resolved.ratingConfidence !== "NONE" || resolved.wallConfidence !== "NONE" || resolved.corrConfidence !== "NONE";
}
function isRigidByType(t) {
  return ["VALV", "FLAN", "GASK"].includes(String(t || "").toUpperCase());
}
function aggregateTotals(branchReports) {
  let resolved = 0, partial = 0, missing2 = 0;
  for (const b of branchReports) {
    resolved += b.resolvedNodes;
    missing2 += b.issues.filter((i) => i.severity === "MISSING").length;
  }
  return { resolved, missing: missing2 };
}

// tabs/stagedjson-to-enrichxml/sj-enrichment-engine.js
function runEnrichment(input) {
  const { stagedJsonText, config = {} } = input;
  const parsed = typeof stagedJsonText === "string" ? JSON.parse(stagedJsonText) : stagedJsonText;
  const records = parseStagedJson(parsed, config);
  const ratingSeq = config.ratingSequence;
  const vertAxis = config.verticalAxis || "Y";
  const enriched = records.map((record2) => enrichRecord(record2, { config, ratingSeq, vertAxis }));
  let grouped = groupSupportsHierarchy(enriched);
  grouped = groupSupportsByPos(grouped);
  const branchMap = groupByBranch(grouped);
  const xmlText = buildEnrichedXml(branchMap, config);
  const audit = buildAudit(grouped, branchMap);
  return { xmlText, audit, records: grouped };
}
function groupSupportsHierarchy(records) {
  const byName = /* @__PURE__ */ new Map();
  records.forEach((record2) => byName.set(record2.attrs?.NAME || record2.name, record2));
  const toRemove = /* @__PURE__ */ new Set();
  const getRoot = (record2) => {
    let current = record2;
    const visited = /* @__PURE__ */ new Set();
    while (current && !visited.has(current)) {
      visited.add(current);
      const parentRef = [
        current.attrs?.MDSSREF,
        current.attrs?.MDSGUIDEREF,
        current.attrs?.["PREV-NAME"]
      ].find((reference) => reference && byName.has(reference));
      if (parentRef && parentRef !== (current.attrs?.NAME || current.name)) current = byName.get(parentRef);
      else break;
    }
    return current;
  };
  records.forEach((record2) => {
    if (record2.componentType !== "ATTA" && record2.componentType !== "SUPPORT") return;
    const root = getRoot(record2);
    if (root && root !== record2) {
      if (!root.resolved) root.resolved = {};
      if (!root.resolved.restraint) root.resolved.restraint = [];
      else if (!Array.isArray(root.resolved.restraint)) root.resolved.restraint = [root.resolved.restraint];
      if (record2.resolved?.restraint) {
        if (Array.isArray(record2.resolved.restraint)) root.resolved.restraint.push(...record2.resolved.restraint);
        else root.resolved.restraint.push(record2.resolved.restraint);
      }
      if (record2.dtxr) root.dtxr = (root.dtxr ? `${root.dtxr} + ` : "") + record2.dtxr;
      toRemove.add(record2);
    }
  });
  deduplicateRootRestraints(records, toRemove);
  return records.filter((record2) => !toRemove.has(record2));
}
function groupSupportsByPos(records) {
  const byPos = /* @__PURE__ */ new Map();
  const toRemove = /* @__PURE__ */ new Set();
  records.forEach((record2) => {
    if (record2.componentType !== "ATTA" && record2.componentType !== "SUPPORT") return;
    const point3 = bestPosition(record2.attrs);
    if (!point3) return;
    const posKey = formatPosition(point3);
    if (byPos.has(posKey)) {
      const root = byPos.get(posKey);
      if (record2.resolved?.restraint) {
        if (!root.resolved) root.resolved = {};
        if (!root.resolved.restraint) root.resolved.restraint = [];
        else if (!Array.isArray(root.resolved.restraint)) root.resolved.restraint = [root.resolved.restraint];
        if (Array.isArray(record2.resolved.restraint)) root.resolved.restraint.push(...record2.resolved.restraint);
        else root.resolved.restraint.push(record2.resolved.restraint);
      }
      if (record2.dtxr && (!root.dtxr || !root.dtxr.includes(record2.dtxr))) {
        root.dtxr = (root.dtxr ? `${root.dtxr} + ` : "") + record2.dtxr;
      }
      if (record2.componentType === "SUPPORT" && root.componentType === "ATTA") {
        root.componentType = "SUPPORT";
        root.isSupport = true;
      }
      if (record2.name && !record2.name.includes("/SREF") && root.name && root.name.includes("/SREF")) {
        root.name = record2.name;
      }
      toRemove.add(record2);
    } else {
      byPos.set(posKey, record2);
    }
  });
  deduplicateRootRestraints(records, toRemove);
  return records.filter((record2) => !toRemove.has(record2));
}
function deduplicateRootRestraints(records, toRemove) {
  records.forEach((record2) => {
    if (toRemove.has(record2) || !record2.resolved?.restraint) return;
    if (!Array.isArray(record2.resolved.restraint)) record2.resolved.restraint = [record2.resolved.restraint];
    const seen = /* @__PURE__ */ new Set();
    record2.resolved.restraint = record2.resolved.restraint.filter((restraint) => {
      const key = typeof restraint === "object" && restraint !== null ? restraint.type || restraint.kind : restraint;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  });
}
function enrichRecord(record2, context) {
  const { config, ratingSeq, vertAxis } = context;
  const attrs = record2.attrs;
  const boreMm = record2.boreMm || 100;
  const dtxrValues = [record2.dtxr, attrs?.DTXR, attrs?.RAW_TYPE].filter(Boolean);
  let ratingResult = resolveRating(attrs, ratingSeq, config);
  let wallResult = resolveWall({ boreMm, dtxrValues, spre: record2.spre }, config);
  let corrResult = resolveCorrosion(record2.spre || "", boreMm, config);
  const odMm = lookupOd(boreMm);
  let restraintResult = null;
  let connectionType = null;
  if (isSupportType(record2.componentType)) {
    restraintResult = resolveRestraint(attrs, vertAxis);
    connectionType = attaConnectionType(record2.supportKind);
  }
  let weightResult = null;
  if (isRigidType(record2.componentType)) {
    weightResult = resolveRigidWeight({
      componentType: record2.componentType,
      boreMm,
      rating: ratingResult.rating,
      dtxr: record2.dtxr
    });
  }
  const nodeOverrides = config.nodeOverrides?.[record2.name] || {};
  const branchOverrides = config.branchOverrides?.[record2.branchName] || config.branchOverrides?.[record2.sourceBranchName] || {};
  if (nodeOverrides.rating || branchOverrides.rating) {
    ratingResult = {
      rating: Number(nodeOverrides.rating || branchOverrides.rating),
      source: "manual-override",
      confidence: "HIGH"
    };
  }
  if (nodeOverrides.wall || branchOverrides.wall) {
    wallResult = {
      wallMm: nodeOverrides.wall || branchOverrides.wall,
      source: "manual-override",
      confidence: "HIGH"
    };
  }
  if (nodeOverrides.corr || branchOverrides.corr) {
    corrResult = {
      corrMm: Number(nodeOverrides.corr || branchOverrides.corr),
      source: "manual-override",
      confidence: "HIGH"
    };
  }
  if (nodeOverrides.weight || branchOverrides.weight) {
    weightResult = {
      weightKg: Number(nodeOverrides.weight || branchOverrides.weight),
      valveType: "manual-override",
      source: "manual-override",
      confidence: "HIGH"
    };
  }
  if (nodeOverrides.restraint || branchOverrides.restraint) {
    restraintResult = nodeOverrides.restraint || branchOverrides.restraint;
  }
  const resolved = {
    rating: ratingResult.rating,
    ratingSource: ratingResult.source,
    ratingConfidence: ratingResult.confidence,
    wallMm: wallResult?.wallMm ?? null,
    wallSource: wallResult?.source ?? "unresolved",
    wallConfidence: wallResult?.confidence ?? "NONE",
    corrMm: corrResult.corrMm,
    corrSource: corrResult.source,
    corrConfidence: corrResult.confidence,
    odMm,
    restraint: restraintResult,
    restraintSource: restraintResult ? "resolved" : "unresolved",
    restraintConfidence: restraintResult ? "HIGH" : "NONE",
    connectionType,
    weightKg: weightResult?.weightKg ?? null,
    weightSource: weightResult?.source ?? null,
    weightConfidence: weightResult?.confidence ?? "NONE"
  };
  return {
    ...record2,
    resolved: applyAuthoritativeEnrichment(record2, resolved)
  };
}
function lookupOd(boreMm) {
  const bore = Math.round(Number(boreMm));
  if (DN_TO_OD_MM[bore]) return DN_TO_OD_MM[bore];
  const keys = Object.keys(DN_TO_OD_MM).map(Number).sort((a, b) => a - b);
  const nearest = keys.reduce((best, key) => Math.abs(key - bore) < Math.abs(best - bore) ? key : best);
  return DN_TO_OD_MM[nearest] ?? null;
}

// tabs/model-converters/converters/component-topology/topology-geometry-distance.js
function pointSegmentDistance(point3, start, end) {
  const vector = { x: end.x - start.x, y: end.y - start.y, z: end.z - start.z };
  const offset = { x: point3.x - start.x, y: point3.y - start.y, z: point3.z - start.z };
  const lengthSquared = vector.x ** 2 + vector.y ** 2 + vector.z ** 2;
  const raw = lengthSquared ? (offset.x * vector.x + offset.y * vector.y + offset.z * vector.z) / lengthSquared : 0;
  const parameter = Math.max(0, Math.min(1, raw));
  const projected = {
    x: start.x + parameter * vector.x,
    y: start.y + parameter * vector.y,
    z: start.z + parameter * vector.z
  };
  return { distanceMm: pointDistance(point3, projected), parameter, projected };
}

// tabs/model-converters/converters/component-topology/topology-support-reference.js
var ATTACHMENT_REFERENCE_FIELDS = Object.freeze(["ATTACHED_COMPONENT_REF", "COMPRE"]);
function aliases(component) {
  return uniqueText([
    component.sourceRef,
    component.name,
    component.attributes?.REF,
    component.attributes?.NAME
  ]);
}
function buildSupportAttachmentIndex(model) {
  const byBranchAlias = /* @__PURE__ */ new Map();
  const byAlias = /* @__PURE__ */ new Map();
  for (const component of model.components.filter((row) => row.isRouteComponent === true)) {
    for (const alias of aliases(component)) {
      const branchKey = `${component.sourceBranchEntityId}|${alias}`;
      byBranchAlias.set(branchKey, [...byBranchAlias.get(branchKey) ?? [], component]);
      byAlias.set(alias, [...byAlias.get(alias) ?? [], component]);
    }
  }
  return Object.freeze({ byBranchAlias, byAlias });
}
function attachmentReferences(component) {
  return uniqueText(ATTACHMENT_REFERENCE_FIELDS.map((field) => component.attributes?.[field]));
}
function resolveSupportAttachment(component, index) {
  const references = attachmentReferences(component);
  const resolved = [];
  const unresolved = [];
  for (const reference of references) {
    const branchMatches = index.byBranchAlias.get(`${component.sourceBranchEntityId}|${reference}`) ?? [];
    if (branchMatches.length === 1) {
      resolved.push(branchMatches[0]);
      continue;
    }
    const globalMatches = index.byAlias.get(reference) ?? [];
    if (globalMatches.length === 1) resolved.push(globalMatches[0]);
    else unresolved.push(reference);
  }
  return Object.freeze({
    references,
    sourceEntityIds: uniqueText(resolved.map((row) => row.sourceEntityId)),
    sourcePaths: uniqueText(resolved.map((row) => row.sourcePath)),
    unresolvedReferences: uniqueText(unresolved),
    authority: resolved.length ? "ATTACHED_COMPONENT_REF/COMPRE" : ""
  });
}
var _test2 = Object.freeze({ aliases, attachmentReferences });

// tabs/model-converters/converters/component-topology/topology-support-edge-splitter.js
function pointText(point3) {
  if (!point3) return "(none)";
  return `${point3.x.toFixed(3)},${point3.y.toFixed(3)},${point3.z.toFixed(3)}`;
}
function distanceText(value) {
  return Number.isFinite(value) ? Number(value).toFixed(3) : "unbounded";
}
function rankedSupportCandidates(edgeSpecs, support, scope) {
  const attached = new Set(support.attachedComponentEntityIds ?? []);
  return edgeSpecs.flatMap((edge, index) => {
    const owns = support.sourceBranchEntityIds.some((id) => edge.sourceEntityIds.includes(id));
    const referenced = edge.sourceEntityIds.some((id) => attached.has(id));
    if (scope === "owning" && !owns) return [];
    if (scope === "referenced" && !referenced) return [];
    const proximity = pointSegmentDistance(support.sourcePosition, edge.fromPort.position, edge.toPort.position);
    return [{ edge, index, owns, referenced, ...proximity }];
  }).sort((left, right) => left.distanceMm - right.distanceMm || left.index - right.index);
}
function supportProjectionError(support, owning, global, toleranceMm) {
  const classification = global && global.distanceMm <= toleranceMm ? "POSSIBLE_WRONG_BRANCH_OWNERSHIP" : "SOURCE_SUPPORT_POSITION_OR_ROUTE_INVALID";
  const owningText = owning ? `${owning.edge.sourcePath}/${owning.edge.segmentRole}@${pointText(owning.projected)}` : "(none)";
  const globalText = global ? `${global.edge.sourcePath}/${global.edge.segmentRole}@${pointText(global.projected)}:${distanceText(global.distanceMm)}mm` : "(none)";
  return new Error(
    `Support ${support.tag || support.id} is ${distanceText(owning?.distanceMm)} mm from its owning branch; limit is ${distanceText(toleranceMm)} mm. [${classification}] sourcePath=${support.sourcePaths.join("|")}; branches=${support.sourceBranchNames.join("|")}; positionAuthority=${support.positionAuthority}; position=${pointText(support.sourcePosition)}; nearestOwning=${owningText}; nearestAny=${globalText}.`
  );
}
function unresolvedReferenceError(support) {
  return new Error(
    `Support ${support.tag || support.id} has unresolved attachment reference(s): ${support.unresolvedAttachmentReferences.join(", ")}. sourcePath=${support.sourcePaths.join("|")}.`
  );
}
function acceptMatch(support, match, authority) {
  support.connectionResidual = match.distanceMm;
  support.edgeParameter = match.parameter;
  support.attachmentPosition = match.projected;
  support.attachmentAuthority = authority;
  support.attachmentEdgeSourcePath = match.edge.sourcePath;
  support.attachmentPort = {
    ...support.port,
    position: match.projected,
    sourcePath: `${support.port.sourcePath}:PROJECTED_ATTACHMENT`,
    canonicalPositionAuthority: true,
    attachmentAuthority: authority,
    sourcePosition: support.sourcePosition
  };
}
function matchSupportsToEdges(edgeSpecs, supports, toleranceMm) {
  const matches = /* @__PURE__ */ new Map();
  for (const support of supports) {
    const referenced = rankedSupportCandidates(edgeSpecs, support, "referenced");
    if (support.attachmentReferences.length && !referenced.length) throw unresolvedReferenceError(support);
    const owning = rankedSupportCandidates(edgeSpecs, support, "owning");
    const global = rankedSupportCandidates(edgeSpecs, support, "all");
    const match = referenced[0] ?? owning[0];
    if (!match || !referenced.length && match.distanceMm > toleranceMm) {
      throw supportProjectionError(support, owning[0], global[0], toleranceMm);
    }
    const authority = referenced.length ? `${support.attachmentAuthorities.join("+") || "ATTACHED_COMPONENT_REF/COMPRE"}:${support.attachmentReferences.join("|")}` : "OWNING_BRANCH_PROXIMITY";
    acceptMatch(support, match, authority);
    matches.set(match.index, [...matches.get(match.index) ?? [], support]);
  }
  return matches;
}
function effectivePort(support) {
  return support.attachmentPort ?? support.port;
}
function splitOneEdge(spec, supports, set, topologyToleranceMm) {
  const ordered = [...supports].sort((left, right) => left.edgeParameter - right.edgeParameter || left.order - right.order);
  const interior = [], atStart = [], atEnd = [];
  for (const support of ordered) {
    const port = effectivePort(support);
    if (pointDistance(port.position, spec.fromPort.position) <= topologyToleranceMm) {
      set.unite(port.key, spec.fromPort.key);
      atStart.push(support);
    } else if (pointDistance(port.position, spec.toPort.position) <= topologyToleranceMm) {
      set.unite(port.key, spec.toPort.key);
      atEnd.push(support);
    } else interior.push(support);
  }
  const interiorPoints = [];
  for (const support of interior) {
    const port = effectivePort(support);
    const previous = interiorPoints.at(-1);
    if (previous && pointDistance(previous.port.position, port.position) <= topologyToleranceMm) {
      set.unite(previous.port.key, port.key);
      previous.supports.push(support);
    } else interiorPoints.push({ port, supports: [support] });
  }
  const points = [{ port: spec.fromPort, supports: atStart }, ...interiorPoints, { port: spec.toPort, supports: atEnd }];
  return points.slice(1).map((point3, index) => {
    const attachments = uniqueText([...points[index].supports, ...point3.supports].flatMap((row) => row.sourceEntityIds));
    return {
      ...spec,
      fromPort: points[index].port,
      toPort: point3.port,
      sourceEntityIds: uniqueText([...spec.sourceEntityIds, ...attachments]),
      sourceTypes: attachments.length ? uniqueText([...spec.sourceTypes, "SUPPORT"]) : spec.sourceTypes,
      segmentRole: interior.length ? `${spec.segmentRole}_SUPPORT_SPLIT` : spec.segmentRole
    };
  });
}
function splitEdgeSpecsAtSupports(specs, supports, connectivity, topologyToleranceMm, projectionToleranceMm) {
  const matches = matchSupportsToEdges(specs, supports, projectionToleranceMm);
  return specs.flatMap((spec, index) => {
    const assigned = matches.get(index) ?? [];
    return assigned.length ? splitOneEdge(spec, assigned, connectivity.set, topologyToleranceMm) : [spec];
  });
}
var _test3 = Object.freeze({
  rankedSupportCandidates,
  supportProjectionError,
  unresolvedReferenceError
});

// tabs/model-converters/converters/component-topology/topology-engineering-projection.js
function componentKey(path) {
  const branchIndex = Number(path[0]);
  const childrenIndex = path.indexOf("children");
  const sourceIndex = Number(path[childrenIndex + 1]);
  if (!Number.isInteger(branchIndex) || !Number.isInteger(sourceIndex)) {
    throw new TypeError(`Enrichment record has an invalid source path: ${JSON.stringify(path)}.`);
  }
  return `${branchIndex}:${sourceIndex}`;
}
function supportPortOrNull(component) {
  return portForRole(component, "P") ?? portForRole(component, "A") ?? portForRole(component, "L") ?? null;
}
function supportPort(component) {
  const port = supportPortOrNull(component);
  if (!port) throw new Error(`Support ${component.sourcePath} has no usable source position port.`);
  return port;
}
function componentRecordIndex(model, records) {
  const byPath = new Map(model.components.map((component) => [`${component.branchIndex}:${component.sourceIndex}`, component]));
  const entries = records.map((record2) => {
    const path = componentKey(record2.path);
    const component = byPath.get(path);
    if (!component) throw new Error(`Enrichment record ${path} has no source-model component.`);
    return { component, record: record2 };
  });
  return {
    entries,
    recordBySourceEntityId: new Map(entries.map(({ component, record: record2 }) => [component.sourceEntityId, record2]))
  };
}
function hasManagedStageEngineeringAuthority(component) {
  const enriched = component.enrichedAttributes ?? {};
  return cleanText(enriched.schema) === "stagedjson-cii2019-enriched-attributes/v1" && cleanText(enriched.componentType).toUpperCase() === "SUPPORT" && cleanText(enriched.status).toLowerCase() === "resolved" && enriched.needsReview === false;
}
function isProjectedSupport(component) {
  return isSupportType(component.sourceType) && (cleanText(component.supportProjection?.disposition) !== "DEFER_SUPPORT" || hasManagedStageEngineeringAuthority(component));
}
function mergeAttachment(anchor, attachment) {
  anchor.attachmentReferences.push(...attachment.references);
  anchor.attachedComponentEntityIds.push(...attachment.sourceEntityIds);
  anchor.attachedComponentSourcePaths.push(...attachment.sourcePaths);
  anchor.unresolvedAttachmentReferences.push(...attachment.unresolvedReferences);
  if (attachment.authority) anchor.attachmentAuthorities.push(attachment.authority);
}
function supportNameIndex(model) {
  const index = /* @__PURE__ */ new Map();
  for (const component of model.components) {
    const name = cleanText(component.attributes.NAME || component.name);
    if (!name) continue;
    index.set(name, [...index.get(name) ?? [], component]);
  }
  return index;
}
function referenceTarget(current, reference, byName) {
  const candidates = byName.get(reference) ?? [];
  return candidates.find((row) => row.sourceBranchEntityId === current.sourceBranchEntityId) ?? (candidates.length === 1 ? candidates[0] : null);
}
function buildSupportAnchors(model, supportEntries, attachmentIndex) {
  const anchors = supportEntries.map(({ component, record: record2 }, order) => {
    const port = supportPort(component);
    const enrichmentPosition = bestPosition(record2.attrs);
    const anchor = {
      id: `SA-${String(order + 1).padStart(6, "0")}`,
      order,
      component,
      record: record2,
      port,
      position: port.position,
      sourcePosition: port.position,
      positionAuthority: `SOURCE_PORT:${port.role}`,
      positionAuthorityResidualMm: enrichmentPosition ? pointDistance(enrichmentPosition, port.position) : null,
      sourceEntityIds: [component.sourceEntityId],
      sourceBranchEntityIds: [component.sourceBranchEntityId],
      sourceBranchNames: [component.sourceBranchName],
      sourcePaths: [component.sourcePath],
      tag: cleanText(record2.supportTag || record2.cmpSupRefN || record2.name),
      restraints: Array.isArray(record2.resolved?.restraint) ? record2.resolved.restraint : [record2.resolved?.restraint].filter(Boolean),
      attachmentReferences: [],
      attachedComponentEntityIds: [],
      attachedComponentSourcePaths: [],
      unresolvedAttachmentReferences: [],
      attachmentAuthorities: []
    };
    mergeAttachment(anchor, resolveSupportAttachment(component, attachmentIndex));
    return anchor;
  });
  const byPosition = new Map(anchors.map((anchor) => [formatPosition(anchor.position), anchor]));
  const supportComponents = model.components.filter(isProjectedSupport);
  const byName = supportNameIndex(model);
  for (const component of supportComponents) {
    const anchor = findSupportAnchor(component, byPosition, byName);
    if (!anchor) throw new Error(`Support ${component.sourcePath} was not retained by the engineering grouping contract.`);
    anchor.sourceEntityIds.push(component.sourceEntityId);
    anchor.sourceBranchEntityIds.push(component.sourceBranchEntityId);
    anchor.sourceBranchNames.push(component.sourceBranchName);
    anchor.sourcePaths.push(component.sourcePath);
    mergeAttachment(anchor, resolveSupportAttachment(component, attachmentIndex));
  }
  return anchors.map((anchor) => ({
    ...anchor,
    sourceEntityIds: uniqueText(anchor.sourceEntityIds),
    sourceBranchEntityIds: uniqueText(anchor.sourceBranchEntityIds),
    sourceBranchNames: uniqueText(anchor.sourceBranchNames),
    sourcePaths: uniqueText(anchor.sourcePaths),
    attachmentReferences: uniqueText(anchor.attachmentReferences),
    attachedComponentEntityIds: uniqueText(anchor.attachedComponentEntityIds),
    attachedComponentSourcePaths: uniqueText(anchor.attachedComponentSourcePaths),
    unresolvedAttachmentReferences: uniqueText(anchor.unresolvedAttachmentReferences),
    attachmentAuthorities: uniqueText(anchor.attachmentAuthorities)
  }));
}
function findSupportAnchor(component, byPosition, byName) {
  let current = component;
  const visited = /* @__PURE__ */ new Set();
  while (current && !visited.has(current.sourceEntityId)) {
    visited.add(current.sourceEntityId);
    const position = supportPortOrNull(current)?.position ?? null;
    const direct = position ? byPosition.get(formatPosition(position)) : null;
    if (direct) return direct;
    const currentName = cleanText(current.attributes.NAME || current.name);
    const reference = ["MDSSREF", "MDSGUIDEREF", "PREV-NAME"].map((field) => cleanText(current.attributes[field])).find((value) => value && value !== currentName && referenceTarget(current, value, byName));
    current = reference ? referenceTarget(current, reference, byName) : null;
  }
  return null;
}
function assignRigidEdges(edges, nodes, rigids, toleranceMm) {
  const nodeById2 = new Map(nodes.map((node) => [node.id, node]));
  return rigids.map((rigid) => {
    const natural = edges.filter((edge) => edge.sourceEntityIds.includes(rigid.component.sourceEntityId));
    const branch = edges.filter((edge) => edge.sourceEntityIds.includes(rigid.component.sourceBranchEntityId));
    const naturalIds = new Set(natural.map((edge) => edge.id));
    const branchIds = new Set(branch.map((edge) => edge.id));
    const pool = [
      ...natural,
      ...branch.filter((edge) => !naturalIds.has(edge.id)),
      ...edges.filter((edge) => !naturalIds.has(edge.id) && !branchIds.has(edge.id))
    ];
    const ranked = pool.map((edge) => ({
      edge,
      authorityRank: naturalIds.has(edge.id) ? 0 : branchIds.has(edge.id) ? 1 : 2,
      distanceMm: pointSegmentDistance(
        rigid.position,
        nodeById2.get(edge.fromNodeId).position,
        nodeById2.get(edge.toNodeId).position
      ).distanceMm
    })).sort((left, right) => left.authorityRank - right.authorityRank || left.distanceMm - right.distanceMm || left.edge.id.localeCompare(right.edge.id));
    const selected = ranked[0];
    if (!selected) throw new Error(`Rigid ${rigid.component.sourcePath} has no unique InputXML element assignment.`);
    if (selected.authorityRank === 2 && selected.distanceMm > toleranceMm) {
      throw new Error(`Rigid ${rigid.component.sourcePath} is ${selected.distanceMm} mm from the nearest connected InputXML element; limit is ${toleranceMm} mm.`);
    }
    return {
      sourceEntityId: rigid.component.sourceEntityId,
      sourcePath: rigid.component.sourcePath,
      edgeId: selected.edge.id,
      inputXmlElementId: selected.edge.inputXmlElementIds[0],
      inputXmlNodeId: nodeById2.get(selected.edge.toNodeId).inputXmlNodeIds[0],
      connectionResidual: selected.distanceMm,
      componentType: rigid.record.componentType,
      weightKg: Number(rigid.record.resolved?.weightKg ?? rigid.record.sourceWeightKg ?? 0)
    };
  });
}
function buildTopologyEngineeringProjection(sourceText, model, options) {
  const enrichment = runEnrichment({ stagedJsonText: sourceText, config: options.enrichmentConfig });
  const index = componentRecordIndex(model, enrichment.records);
  const attachmentIndex = buildSupportAttachmentIndex(model);
  const supportEntries = index.entries.filter(({ component, record: record2 }) => isSupportType(record2.componentType) && isProjectedSupport(component));
  const supports = buildSupportAnchors(model, supportEntries, attachmentIndex);
  const deferredSupports = model.components.filter((component) => isSupportType(component.sourceType) && !isProjectedSupport(component));
  const rigids = index.entries.filter(({ record: record2 }) => isRigidType(record2.componentType)).map(({ component, record: record2 }) => ({
    component,
    record: record2,
    position: bestPosition(record2.attrs)
  }));
  if (rigids.some((rigid) => !rigid.position)) throw new Error("At least one rigid source component has no valid position.");
  return Object.freeze({
    recordBySourceEntityId: index.recordBySourceEntityId,
    supports: Object.freeze(supports),
    deferredSupports: Object.freeze(deferredSupports.map((component) => Object.freeze({
      sourceEntityId: component.sourceEntityId,
      sourcePath: component.sourcePath,
      sourceBranchEntityId: component.sourceBranchEntityId,
      sourceBranchName: component.sourceBranchName,
      sourceRef: component.sourceRef,
      policy: component.supportProjection
    }))),
    rigids: Object.freeze(rigids),
    metrics: Object.freeze({
      supports: supports.length,
      restraints: supports.reduce((sum, row) => sum + row.restraints.length, 0),
      rigids: rigids.length
    })
  });
}

// tabs/model-converters/converters/component-topology/topology-canonical-builder.js
function componentEdgeSpecs(component, overlap) {
  if (overlap?.secondary.sourceEntityId === component.sourceEntityId) return [];
  const category = componentCategory(component.sourceType);
  const finite = component.geometryClassification === "FINITE" || category === "TEE" && component.finiteSpan === true;
  if (!finite) return [];
  if (category === "OLET" || category === "SUPPORT") return [];
  const start = portForRole(component, "A"), end = portForRole(component, "L");
  if (!start || !end) return [];
  const participants = overlap?.sourceEntityIds ?? [component.sourceEntityId];
  const participantTypes = overlap ? [overlap.primary.sourceType, overlap.secondary.sourceType] : [component.sourceType];
  const base = {
    sourceEntityIds: [...participants, component.sourceBranchEntityId],
    sourceTypes: [...participantTypes, "BRANCH"],
    sourcePath: component.sourcePath,
    connectionAuthority: "SOURCE_COMPONENT_GEOMETRY",
    projectionCardinality: overlap ? "MANY_TO_ONE" : "ONE_TO_ONE",
    projectionMergeAuthority: overlap?.authority ?? "",
    mergeSourceEntityIds: overlap?.sourceEntityIds ?? []
  };
  if (category === "ELBO/BEND" || category === "TEE") {
    const centre = portForRole(component, "P");
    if (!centre) return [];
    return [
      { ...base, fromPort: start, toPort: centre, segmentRole: `${category}_RUN_IN` },
      { ...base, fromPort: centre, toPort: end, segmentRole: `${category}_RUN_OUT` }
    ];
  }
  return [{ ...base, fromPort: start, toPort: end, segmentRole: category }];
}
function crefEdgeSpecs(connections) {
  return connections.filter((connection) => !connection.merged).map((connection) => ({
    fromPort: connection.junctionPort,
    toPort: connection.targetPort,
    sourceEntityIds: [connection.component.sourceEntityId, connection.component.sourceBranchEntityId, connection.targetBranch.sourceEntityId],
    sourceTypes: [connection.component.sourceType, "BRANCH"],
    sourcePath: connection.component.sourcePath,
    segmentRole: "CREF_BRANCH_CONNECTION",
    connectionAuthority: `CREF/${connection.targetRole}REF`,
    connectionResidual: connection.residualMm
  }));
}
function pointFeatureSpecs(model) {
  return model.components.flatMap((component) => {
    const category = componentCategory(component.sourceType);
    if (component.geometryClassification !== "POINT" || ["TEE", "OLET", "SUPPORT"].includes(category)) return [];
    const port = portForRole(component, "P") ?? portForRole(component, "A") ?? portForRole(component, "L");
    return port ? [{ component, port, kind: category }] : [];
  });
}
function junctionSpecs(model) {
  return model.components.flatMap((component) => {
    const kind = componentCategory(component.sourceType);
    if (!["TEE", "OLET"].includes(kind)) return [];
    const port = portForRole(component, "P");
    return port ? [{ component, port, kind }] : [];
  });
}
function boundarySpecs(model) {
  const branchNames = new Set(model.branches.map((branch) => cleanText(branch.name)));
  const componentAliases = new Set(model.components.flatMap((component) => [component.sourceRef, component.name]).map(cleanText).filter(Boolean));
  const branchBoundaries = model.branches.flatMap((branch) => [["HREF", "H"], ["TREF", "T"]].flatMap(([field, role]) => {
    const reference = cleanText(branch.attributes[field]);
    if (!reference || branchNames.has(reference) || componentAliases.has(reference)) return [];
    const port = portForRole(branch, role);
    return port ? [{ port, sourceEntityIds: [branch.sourceEntityId], relationship: `${field}:${reference}`, sourcePath: branch.sourcePath }] : [];
  }));
  const teeBoundaries = model.components.flatMap((component) => {
    if (componentCategory(component.sourceType) !== "TEE" || cleanText(component.attributes.CREF)) return [];
    const port = portForRole(component, "P");
    return port ? [{ port, sourceEntityIds: [component.sourceEntityId], relationship: "TEE_BRANCH_PORT:EXTERNAL_OR_UNMODELED", sourcePath: component.sourcePath }] : [];
  });
  return [...branchBoundaries, ...teeBoundaries];
}
function maximumResidual(ports, origin) {
  if (ports.length < 2) return 0;
  return Math.max(...ports.map((port) => pointDistance(origin, port.position)));
}
function canonicalPort(ports) {
  return ports.find((port) => port.canonicalPositionAuthority === true) ?? ports[0];
}
function buildNodes(model, connectivity, edgeSpecs, junctions, boundaries) {
  const branchIndexByComponentId = /* @__PURE__ */ new Map();
  if (model.branches) {
    model.branches.forEach((branch, bIdx) => {
      if (branch.components) {
        branch.components.forEach((comp) => {
          branchIndexByComponentId.set(comp.sourceEntityId, bIdx);
        });
      }
    });
  }
  const projectedPorts = edgeSpecs.flatMap((edge) => [edge.fromPort, edge.toPort]);
  const terminalPorts = [...junctions.map((row) => row.port), ...boundaries.map((row) => row.port)];
  const portByKey = new Map(model.sourcePorts.map((port) => [port.key, port]));
  for (const port of [...projectedPorts, ...terminalPorts]) portByKey.set(port.key, port);
  const usedKeys = new Set([...projectedPorts, ...terminalPorts].map((port) => port.key));
  const usedRoots = new Set([...usedKeys].map(connectivity.set.find));
  const groups = /* @__PURE__ */ new Map();
  for (const port of portByKey.values()) {
    const root = connectivity.set.find(port.key);
    if (!usedRoots.has(root)) continue;
    groups.set(root, [...groups.get(root) ?? [], port]);
  }
  const ordered = [...groups.entries()].map(([root, ports]) => ({
    root,
    ports: ports.sort((left, right) => left.order - right.order)
  })).sort((left, right) => left.ports[0].order - right.ports[0].order);
  const branchCounters = /* @__PURE__ */ new Map();
  const nodes = ordered.map((group, index) => {
    const authority = canonicalPort(group.ports);
    let bIdx = branchIndexByComponentId.get(authority.sourceEntityId);
    if (bIdx === void 0) bIdx = 0;
    const count = (branchCounters.get(bIdx) ?? 0) + 1;
    branchCounters.set(bIdx, count);
    const caesarNodeNumber = (bIdx + 1) * 1e4 + count * 10;
    return {
      id: `CN-${sequenceId(index + 1)}`,
      position: { ...authority.position },
      sourcePortIds: uniqueText(group.ports.map((port) => port.sourcePortId)),
      sourceEntityIds: uniqueText(group.ports.map((port) => port.sourceEntityId)),
      inputXmlNodeIds: [String(caesarNodeNumber)],
      positionAuthority: authority.attachmentAuthority || authority.sourcePath,
      connectionAuthority: uniqueText(group.ports.map((port) => port.sourcePath)),
      connectionResidual: maximumResidual(group.ports, authority.position)
    };
  });
  return {
    nodes,
    rootToNode: new Map(ordered.map((group, index) => [group.root, nodes[index]]))
  };
}
function buildEdges(specs, connectivity, rootToNode, issues) {
  return specs.flatMap((spec, index) => {
    const from = rootToNode.get(connectivity.set.find(spec.fromPort.key));
    const to = rootToNode.get(connectivity.set.find(spec.toPort.key));
    if (!from || !to) throw new Error(`Canonical edge endpoint is missing for ${spec.sourcePath}.`);
    if (from.id === to.id) {
      issues.push({ code: "CANONICAL_ZERO_LENGTH_EDGE_BLOCKED", blocking: true, sourcePath: spec.sourcePath, segmentRole: spec.segmentRole });
      return [];
    }
    const id = `CE-${sequenceId(index + 1)}`, inputId = `PE-${sequenceId(index + 1)}`;
    return [{
      id,
      fromNodeId: from.id,
      toNodeId: to.id,
      sourceEntityIds: uniqueText(spec.sourceEntityIds),
      sourcePortIds: uniqueText([spec.fromPort.sourcePortId, spec.toPort.sourcePortId]),
      sourceTypes: uniqueText(spec.sourceTypes),
      inputXmlElementIds: [inputId],
      segmentRole: spec.segmentRole,
      connectionAuthority: spec.connectionAuthority,
      connectionResidual: Number(spec.connectionResidual ?? 0),
      projectionCardinality: spec.projectionCardinality ?? "ONE_TO_ONE",
      projectionMergeAuthority: spec.projectionMergeAuthority ?? "",
      mergeSourceEntityIds: uniqueText(spec.mergeSourceEntityIds ?? [])
    }];
  });
}
function nodeDegrees(edges) {
  const degrees = /* @__PURE__ */ new Map();
  for (const edge of edges) for (const id of [edge.fromNodeId, edge.toNodeId]) degrees.set(id, (degrees.get(id) ?? 0) + 1);
  return degrees;
}
function buildCanonicalTopology(model, connectivity, engineering, toleranceMm, supportProjectionToleranceMm) {
  const issues = [...connectivity.issues];
  const overlapBySource = new Map(connectivity.overlapGroups.flatMap((group) => [
    [group.primary.sourceEntityId, group],
    [group.secondary.sourceEntityId, group]
  ]));
  const componentEdges = model.components.flatMap((component) => componentEdgeSpecs(
    component,
    overlapBySource.get(component.sourceEntityId) ?? null
  ));
  const rawEdgeSpecs = [...componentEdges, ...crefEdgeSpecs(connectivity.crefConnections)];
  const edgeSpecs = splitEdgeSpecsAtSupports(
    rawEdgeSpecs,
    engineering.supports,
    connectivity,
    toleranceMm,
    supportProjectionToleranceMm
  );
  const pointSpecs = pointFeatureSpecs(model), rawJunctions = junctionSpecs(model), rawBoundaries = boundarySpecs(model);
  const { nodes, rootToNode } = buildNodes(model, connectivity, edgeSpecs, rawJunctions, rawBoundaries);
  const edges = buildEdges(edgeSpecs, connectivity, rootToNode, issues);
  const degrees = nodeDegrees(edges);
  const pointFeatures = pointSpecs.map((spec, index) => ({
    id: `PF-${sequenceId(index + 1)}`,
    kind: spec.kind,
    position: { ...spec.port.position },
    sourceEntityIds: uniqueText([spec.component.sourceEntityId, spec.component.sourceBranchEntityId]),
    sourceTypes: [spec.component.sourceType, "BRANCH"]
  }));
  const junctions = rawJunctions.map((spec, index) => {
    const node = rootToNode.get(connectivity.set.find(spec.port.key));
    const targetBranches = connectivity.crefConnections.filter((connection) => connection.component.sourceEntityId === spec.component.sourceEntityId).map((connection) => connection.targetBranch.sourceEntityId);
    return {
      id: `CJ-${sequenceId(index + 1)}`,
      kind: spec.kind,
      nodeId: node.id,
      position: { ...node.position },
      expectedDegree: degrees.get(node.id) ?? 0,
      sourceEntityIds: uniqueText([spec.component.sourceEntityId, spec.component.sourceBranchEntityId, ...targetBranches]),
      sourceTypes: [spec.component.sourceType, "BRANCH"],
      sourceRelationship: cleanText(spec.component.attributes.CREF) ? `CREF:${spec.component.attributes.CREF}` : "EXTERNAL_OR_UNMODELED"
    };
  });
  const boundaries = rawBoundaries.map((spec, index) => {
    const node = rootToNode.get(connectivity.set.find(spec.port.key));
    return {
      id: `CB-${sequenceId(index + 1)}`,
      nodeId: node.id,
      position: { ...node.position },
      sourceEntityIds: spec.sourceEntityIds,
      relationship: spec.relationship,
      sourceRelationship: spec.relationship
    };
  });
  const supports = engineering.supports.map((support) => {
    const port = support.attachmentPort ?? support.port;
    const node = rootToNode.get(connectivity.set.find(port.key));
    if (!node) throw new Error(`Support ${support.id} has no canonical attachment node.`);
    return {
      id: support.id,
      nodeId: node.id,
      inputXmlNodeId: node.inputXmlNodeIds[0],
      position: { ...node.position },
      sourcePosition: { ...support.sourcePosition },
      attachmentPosition: { ...support.attachmentPosition },
      attachmentAuthority: support.attachmentAuthority,
      attachmentReferences: support.attachmentReferences,
      attachedComponentEntityIds: support.attachedComponentEntityIds,
      attachmentEdgeSourcePath: support.attachmentEdgeSourcePath,
      tag: support.tag,
      sourceEntityIds: support.sourceEntityIds,
      sourcePaths: support.sourcePaths,
      restraints: support.restraints,
      connectionResidual: support.connectionResidual
    };
  });
  const rigids = assignRigidEdges(edges, nodes, engineering.rigids, supportProjectionToleranceMm);
  return Object.freeze({
    schema: "CanonicalTopology.v1",
    sourceIdentity: model.sourceIdentity,
    coordinateFrame: Object.freeze({ schema: "ManagedStage.XYZ.v1", unit: "mm", axisFabrication: false }),
    toleranceMm: toleranceMm ?? TOPOLOGY_TOLERANCE_MM,
    nodes: Object.freeze(nodes),
    edges: Object.freeze(edges),
    pointFeatures: Object.freeze(pointFeatures),
    junctions: Object.freeze(junctions),
    boundaries: Object.freeze(boundaries),
    supports: Object.freeze(supports),
    rigids: Object.freeze(rigids),
    buildIssues: Object.freeze(issues)
  });
}

// tabs/model-converters/converters/component-topology/topology-ledger-builder.js
function objectsForSource(canonical, sourceEntityId) {
  const contains = (row) => row.sourceEntityIds.includes(sourceEntityId);
  return {
    edges: canonical.edges.filter(contains),
    points: canonical.pointFeatures.filter(contains),
    junctions: canonical.junctions.filter(contains),
    boundaries: canonical.boundaries.filter(contains),
    supports: canonical.supports.filter(contains),
    rigids: canonical.rigids.filter((row) => row.sourceEntityId === sourceEntityId)
  };
}
function dispositionFor(source, objects) {
  const category = componentCategory(source.sourceType);
  if (category === "SUPPORT") {
    if (objects.supports.length) return "EMIT_SUPPORT_ATTACHMENT";
    if (cleanText(source.supportProjection?.disposition) === "DEFER_SUPPORT") return "DEFER_SUPPORT";
    return "BLOCK_AMBIGUOUS";
  }
  if (category === "TEE") return "EMIT_TEE_JUNCTION";
  if (category === "OLET") return "EMIT_OLET_JUNCTION";
  if (source.sourceType === "BRANCH") {
    if (objects.boundaries.length) return "EXTERNAL_BOUNDARY";
    if (objects.edges.length) return "EMIT_ROUTE_EDGE";
    if (objects.junctions.length) return objects.junctions[0].kind === "OLET" ? "EMIT_OLET_JUNCTION" : "EMIT_TEE_JUNCTION";
    if (objects.points.length) return "EMIT_POINT_FEATURE";
    return "BLOCK_AMBIGUOUS";
  }
  if (source.geometryClassification === "POINT") return "EMIT_POINT_FEATURE";
  if (source.geometryClassification === "UNKNOWN") return "BLOCK_AMBIGUOUS";
  if (category === "PIPE") return "EMIT_ROUTE_EDGE";
  if (category === "ELBO/BEND") return "EMIT_BEND_EDGE_SET";
  return "EMIT_INLINE_COMPONENT_EDGE";
}
function deferredProperties(source, disposition) {
  const category = componentCategory(source.sourceType);
  if (disposition === "EMIT_SUPPORT_ATTACHMENT") return [];
  if (disposition === "DEFER_SUPPORT") return ["SUPPORT_ATTACHMENT", "RESTRAINT"];
  if (category === "TEE" || category === "OLET") return ["SIF_VALUES"];
  if (category === "VALVE" || category === "FLANGE") return [...DEFERRED_ENGINEERING, "RIGID", "WEIGHT"];
  if (category === "GASK") return [...DEFERRED_ENGINEERING, "RIGID_MERGE_POLICY"];
  if (category === "INST") return [...DEFERRED_ENGINEERING, "RIGID", "WEIGHT", "INSTRUMENT_SEMANTICS"];
  if (category === "REDUCER") return [...DEFERRED_ENGINEERING, "DIAMETER_TRANSITION"];
  if (category === "ELBO/BEND") return [...DEFERRED_ENGINEERING, "BEND_ENGINEERING_PROPERTIES"];
  return source.sourceType === "BRANCH" ? [] : [...DEFERRED_ENGINEERING];
}
function lossClassification(disposition, isMerge) {
  if (isMerge) return "EXPLICIT_CANONICAL_OVERLAP";
  if (disposition === "EMIT_SUPPORT_ATTACHMENT") return "LOSSLESS_SUPPORT_ATTACHMENT";
  if (disposition === "DEFER_SUPPORT") return "DEFERRED_NON_RESTRAINT_ATTACHMENT";
  if (disposition === "EMIT_POINT_FEATURE") return "POINT_FEATURE_ONLY";
  if (disposition === "EMIT_TEE_JUNCTION" || disposition === "EMIT_OLET_JUNCTION") return "JUNCTION_CONNECTIVITY";
  if (disposition === "EXTERNAL_BOUNDARY") return "EXTERNAL_BOUNDARY";
  if (disposition === "BLOCK_AMBIGUOUS") return "BLOCKED_AMBIGUOUS";
  if (disposition === "EMIT_BEND_EDGE_SET") return "LOSSLESS_MULTI_EDGE";
  return "LOSSLESS_TOPOLOGY";
}
function operationFor(disposition) {
  const operations = {
    EMIT_ROUTE_EDGE: "emit-route-edge-set",
    EMIT_INLINE_COMPONENT_EDGE: "emit-inline-component-edge",
    EMIT_BEND_EDGE_SET: "emit-bend-edge-set",
    EMIT_POINT_FEATURE: "emit-point-feature",
    EMIT_TEE_JUNCTION: "emit-tee-junction",
    EMIT_OLET_JUNCTION: "emit-olet-junction",
    EMIT_SUPPORT_ATTACHMENT: "emit-support-restraint",
    DEFER_SUPPORT: "defer-support",
    EXTERNAL_BOUNDARY: "emit-external-boundary",
    BLOCK_AMBIGUOUS: "block-ambiguous"
  };
  return operations[disposition] ?? "record-topology-decision";
}
function projectionCardinality(edgeCount, disposition, isMerge) {
  if (disposition === "BLOCK_AMBIGUOUS") return "BLOCKED";
  if (disposition === "DEFER_SUPPORT") return "DEFERRED";
  if ((disposition === "EMIT_POINT_FEATURE" || disposition === "EXTERNAL_BOUNDARY") && edgeCount === 0) return "POINT_ONLY";
  if (edgeCount === 1 && isMerge) return "MANY_TO_ONE";
  if (edgeCount > 1) return "ONE_TO_MANY";
  if (edgeCount === 1) return "ONE_TO_ONE";
  if (disposition === "EMIT_TEE_JUNCTION" || disposition === "EMIT_OLET_JUNCTION") return "JUNCTION_ONLY";
  return "POINT_ONLY";
}
function affectedHeaderEdges(source, canonical, objects) {
  if (componentCategory(source.sourceType) !== "OLET" || !objects.junctions.length) return [];
  const nodeId = objects.junctions[0].nodeId;
  return canonical.edges.filter((edge) => edge.segmentRole !== "CREF_BRANCH_CONNECTION" && (edge.fromNodeId === nodeId || edge.toNodeId === nodeId));
}
function edgeNodeIds(edges) {
  return uniqueText(edges.flatMap((edge) => [edge.fromNodeId, edge.toNodeId]));
}
function ledgerRecord(source, canonical, index) {
  const objects = objectsForSource(canonical, source.sourceEntityId);
  const disposition = dispositionFor(source, objects);
  const headerEdges = affectedHeaderEdges(source, canonical, objects);
  const referenceEdges = objects.edges.filter((edge) => edge.segmentRole === "CREF_BRANCH_CONNECTION");
  const rigidEdges = canonical.edges.filter((edge) => objects.rigids.some((rigid) => rigid.edgeId === edge.id));
  const effectiveEdgeRows = [...objects.edges, ...headerEdges, ...rigidEdges];
  const effectiveEdges = uniqueText(effectiveEdgeRows.map((edge) => edge.id));
  const nodeIds = uniqueText([
    ...edgeNodeIds(objects.edges),
    ...objects.junctions.map((junction) => junction.nodeId),
    ...objects.boundaries.map((boundary) => boundary.nodeId),
    ...objects.supports.map((support) => support.nodeId)
  ]);
  const affectedSourceEntityIds = uniqueText([
    ...objects.edges.flatMap((edge) => edge.sourceEntityIds),
    ...objects.junctions.flatMap((junction) => junction.sourceEntityIds),
    ...objects.boundaries.flatMap((boundary) => boundary.sourceEntityIds)
  ]).filter((id) => id !== source.sourceEntityId);
  const inputXmlElementIds = uniqueText(effectiveEdgeRows.flatMap((edge) => edge.inputXmlElementIds));
  const singleEdge = effectiveEdgeRows.length === 1 ? effectiveEdgeRows[0] : null;
  const mergeEdge = objects.edges.find((edge) => edge.projectionCardinality === "MANY_TO_ONE" && edge.mergeSourceEntityIds.includes(source.sourceEntityId));
  const isMerge = Boolean(mergeEdge);
  const projectedCategory = singleEdge ? componentCategory(singleEdge.sourceTypes[0]) : "";
  const sourceCategory = componentCategory(source.sourceType);
  return {
    id: `TL-${sequenceId(index + 1)}`,
    sourceEntityId: source.sourceEntityId,
    sourcePath: source.sourcePath,
    sourceType: source.sourceType,
    sourceRef: source.sourceRef,
    primaryDisposition: disposition,
    canonicalNodeIds: nodeIds,
    canonicalEdgeIds: uniqueText(objects.edges.map((edge) => edge.id)),
    pointFeatureIds: uniqueText(objects.points.map((point3) => point3.id)),
    junctionIds: uniqueText(objects.junctions.map((junction) => junction.id)),
    boundaryIds: uniqueText(objects.boundaries.map((boundary) => boundary.id)),
    affectedEdgeIds: uniqueText(headerEdges.map((edge) => edge.id)),
    branchEdgeIds: uniqueText(referenceEdges.map((edge) => edge.id)),
    affectedSourceEntityIds,
    inputXmlElementIds,
    inputXmlChildIds: uniqueText([
      ...objects.supports.flatMap((support) => support.restraints.map((_, restraintIndex) => `RESTRAINT:${support.id}:${restraintIndex + 1}`)),
      ...objects.rigids.map((rigid) => `RIGID:${rigid.edgeId}`)
    ]),
    inputXmlFromNode: singleEdge ? canonical.nodes.find((node) => node.id === singleEdge.fromNodeId)?.inputXmlNodeIds[0] ?? "" : "",
    inputXmlToNode: singleEdge ? canonical.nodes.find((node) => node.id === singleEdge.toNodeId)?.inputXmlNodeIds[0] ?? "" : "",
    projectionCardinality: projectionCardinality(effectiveEdges.length, disposition, isMerge),
    deferredProperties: deferredProperties(source, disposition),
    lossClassification: lossClassification(disposition, isMerge),
    operation: operationFor(disposition),
    evidence: {
      identityAuthority: "SourceEnvelope.v1/UniversalSourceGraph.v1",
      geometryClassification: source.geometryClassification ?? "BRANCH",
      sourceCref: cleanText(source.attributes.CREF),
      sourceHref: cleanText(source.attributes.HREF),
      sourceTref: cleanText(source.attributes.TREF),
      supportProjectionAuthority: cleanText(source.supportProjection?.authority),
      supportProjectionReason: cleanText(source.supportProjection?.reason),
      cardinalityReason: effectiveEdges.length > 1 ? "EXPLICIT_COMPONENT_SEGMENTATION_OR_JUNCTION" : "DIRECT_PROJECTION",
      mergeAuthority: mergeEdge?.projectionMergeAuthority ?? "",
      reclassification: isMerge && projectedCategory !== sourceCategory ? `${sourceCategory}_TO_${projectedCategory}_SHARED_COMPONENT_SPAN` : "",
      headerSegmentationAuthority: componentCategory(source.sourceType) === "OLET" ? "MANAGED_SOURCE_COMPONENT_BOUNDARY" : ""
    },
    status: disposition === "BLOCK_AMBIGUOUS" ? "ERROR" : "ACCEPTED"
  };
}
function buildTopologyTraceLedger(model, canonical) {
  const records = model.entities.map((source, index) => ledgerRecord(source, canonical, index));
  const routeRecords = records.filter((row) => model.components.some((component) => component.sourceEntityId === row.sourceEntityId && component.isRouteComponent));
  return Object.freeze({
    schema: "TopologyTraceLedger.v1",
    sourceIdentity: model.sourceIdentity,
    sourcePorts: Object.freeze(model.sourcePorts.map((port) => ({
      sourcePortId: port.sourcePortId,
      sourceEntityId: port.sourceEntityId,
      sourcePath: port.sourcePath,
      role: port.role,
      field: port.field,
      sourceType: port.sourceType
    }))),
    records: Object.freeze(records),
    summary: Object.freeze({
      sourceRecords: records.length,
      branchRecords: model.branches.length,
      routeRecords: routeRecords.length,
      supportRecords: model.components.filter((component) => componentCategory(component.sourceType) === "SUPPORT").length,
      deferredSupportRecords: records.filter((row) => row.primaryDisposition === "DEFER_SUPPORT").length,
      blockedRecords: records.filter((row) => row.primaryDisposition === "BLOCK_AMBIGUOUS").length
    })
  });
}

// converters/xml-cii2019-core/line-density-resolver.js
var DENSITY_ALIASES = Object.freeze({
  density: Object.freeze(["density", "Density", "DENSITY", "FluidDensity", "Fluid Density", "Density kg/m3", "kg/m3"]),
  densityMixed: Object.freeze(["densityMixed", "Density Mixed", "Mixed Density", "Mixed kg/m3", "Density (Mixed)", "Mixed"]),
  densityGas: Object.freeze(["densityGas", "Density Gas", "Gas Density", "Gas kg/m3", "Density (Gas)", "Gas"]),
  densityLiquid: Object.freeze(["densityLiquid", "Density Liquid", "Liquid Density", "Liquid kg/m3", "Density (Liquid)", "Liquid", "Liq Density"]),
  phase: Object.freeze(["phase", "Phase", "PHASE", "Fluid Phase", "Medium Phase", "Medium", "State"])
});

// converters/xml-cii2019-core/linelist-mapping.js
var LINE_LIST_PROCESS_VALUE_ALIASES = Object.freeze({
  p1: Object.freeze(["p1", "P1", "Pressure1", "Design Pressure", "Design Pres", "DesignPressure", "Pressure Design", "Pressure Max kPa(g)", "Pressure Max", "PressureMax", "P1 / Design Pressure", "P1 / Design Pres", "P1 Design Pressure", "P1 Design Pres"]),
  hydroPressure: Object.freeze(["hydroPressure", "HydroPressure", "hydro_pressure", "Hydro Test Pressure", "Hydrotest Pressure", "Hydro Pressure", "Hydro Pr", "Hyd Test Pr", "Hyd. Test Pressure", "Test Pressure", "TEST_PRESSURE", "HYDRO_TEST_PRESSURE", "Pressure Test", "Proof Pressure", "Hydro/Test Pressure", "Pressure2"]),
  t1: Object.freeze(["t1", "T1", "Temperature1", "Design Temp", "Design Temperature", "Temp Max C", "Temp Max", "T1 (C)", "T1 C"]),
  t2: Object.freeze(["t2", "T2", "Temperature2", "Temperature 2", "Operating Temp", "Operating Temperature", "Temp. C", "Temp C", "T2 (C)", "T2 C"]),
  t3: Object.freeze(["t3", "T3", "Temperature3", "Temperature 3", "Temp Min C", "Temp Min", "Minimum Temp", "Min Temp", "T3 (C)", "T3 C"]),
  density: Object.freeze(["density", "Density", "DENSITY", "FluidDensity", "Fluid Density", "Density kg/m3", "kg/m3"]),
  densityMixed: Object.freeze(["densityMixed", "Density Mixed", "Mixed Density", "Mixed kg/m3", "Density (Mixed)", "Mixed"]),
  densityGas: Object.freeze(["densityGas", "Density Gas", "Gas Density", "Gas kg/m3", "Density (Gas)", "Gas"]),
  densityLiquid: Object.freeze(["densityLiquid", "Density Liquid", "Liquid Density", "Liquid kg/m3", "Density (Liquid)", "Liquid", "Liq Density"]),
  phase: Object.freeze(["phase", "Phase", "PHASE", "Fluid Phase", "Medium Phase", "Medium", "State"])
});
function cleanMaterialText(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ").toUpperCase();
}
function cleanMaterialCode(value) {
  return String(value ?? "").trim().replace(/\s+/g, "").toUpperCase();
}
function mapMaterialTextToCiiCode(materialText, materialMap) {
  const key = cleanMaterialText(materialText);
  if (!key) return null;
  const rows = Array.isArray(materialMap) ? materialMap : [];
  return rows.find((row) => {
    const candidates = [
      row.material,
      row.Material,
      row.materialName,
      row.Material_Name,
      row.description,
      row.Description,
      row.name,
      row.Name
    ];
    return candidates.some((value) => cleanMaterialText(value) === key);
  }) || null;
}

// converters/xml-cii2019-core/support-mapping-config.js
var HALT = "STOP";
var LINE_LIMIT_KIND = `LINE${HALT}`;
var SUPPORT_INTENT_FIELDS = "SPRE,SKEY,NAME,DESCRIPTION,DESC,CMPSUPTYPE,DTXR,SUPPORT_TYPE,SUPPORT_KIND,SUPPORT_MAPPER_KIND,MDSSUPPTYPE";
var LIMIT_PATTERN = String.raw`\b(?:LINE\s*STOP|LIMIT\s*STOP|AXIAL\s*STOP|DIRECTIONAL\s+ANCHOR)\b`;
var REQUIRED_SUPPORT_RULES = Object.freeze([
  Object.freeze({
    id: "builtin-user-limit",
    enabled: true,
    priority: 10,
    source: "all",
    field: SUPPORT_INTENT_FIELDS,
    pattern: LIMIT_PATTERN,
    match: "regex",
    kind: LINE_LIMIT_KIND,
    label: ["LIMIT/PIPE/LINE", HALT, "-> LIM"].join(" ")
  }),
  Object.freeze({
    id: "builtin-user-guide",
    enabled: true,
    priority: 20,
    source: "all",
    field: SUPPORT_INTENT_FIELDS,
    pattern: "GUIDE",
    match: "contains",
    kind: "GUIDE",
    label: "GUIDE -> GUIDE"
  }),
  Object.freeze({
    id: "builtin-user-rest",
    enabled: true,
    priority: 30,
    source: "all",
    field: SUPPORT_INTENT_FIELDS,
    pattern: "REST,SHOE,BP,BEARING PLATE,WP,WEAR PAD,ANCI",
    match: "contains",
    kind: "REST",
    label: "REST/SHOE/BP/WP/ANCI -> REST"
  }),
  Object.freeze({
    id: "builtin-atta-rest",
    enabled: true,
    priority: 40,
    source: "all",
    field: "ComponentType,COMPONENTTYPE",
    pattern: "ATTA",
    match: "equals",
    kind: "REST",
    label: "ComponentType ATTA -> REST (+Y)"
  })
]);

// converters/xml-cii2019-core/config.js
var LINE_LIST_PROCESS_FIELDS = Object.freeze(["p1", "hydroPressure", "t1", "t2", "t3", "density"]);
var DEFAULT_PIPING_CLASS_MATCH = Object.freeze({ classExactScore: 1e3, overrideScore: 1100, leadingNumericExactScore: 940, prefixBaseScore: 910, startsWithScore: 860, numericDistanceBaseScore: 760, numericDistancePenalty: 45, numericDistanceMax: 5, fuzzyRatioWeight: 780, fuzzyMinRatio: 0.6, ambiguousScoreDelta: 50, minAcceptScore: 760, reviewBelowConfidence: 1, maxCandidates: 8, rowScoring: { boreToleranceMm: 1, classExactWeight: 1e3, boreExactWeight: 300, boreNearWeight: 220, componentExactWeight: 180, pipeRigidWeight: 120, ratingExactWeight: 80, scheduleExactWeight: 60, minAcceptScore: 1e3, ambiguousScoreDelta: 50 } });
var DEFAULT_TEE_SIF_TYPE_MAPPING = Object.freeze([
  { code: 1, label: "Reinforced Fabricated Tee", patterns: ["\\bREINFORCED\\b.*\\bFAB(?:RICATED)?\\b.*\\bTEE\\b", "\\bFAB(?:RICATED)?\\b.*\\bREINFORCED\\b.*\\bTEE\\b", "\\bREINF(?:ORCED)?\\b.*\\bTEE\\b"] },
  { code: 2, label: "Unreinforced Fabricated Tee", patterns: ["\\bUN[-\\s]?REINFORCED\\b.*\\bFAB(?:RICATED)?\\b.*\\bTEE\\b", "\\bFAB(?:RICATED)?\\b.*\\bUN[-\\s]?REINFORCED\\b.*\\bTEE\\b", "\\bUNREINF(?:ORCED)?\\b.*\\bTEE\\b"] },
  { code: 3, label: "Welding Tee", patterns: ["\\bWELD(?:ING)?\\s+TEE\\b", "\\bTEE\\b.*\\bB\\s*\\.?\\s*W\\.?\\b", "\\bTEE\\b.*\\bBUTT\\s*[- ]?\\s*WELD\\b", "\\bTEE\\b.*\\bBUTTWELD\\b", "\\bTEE\\s+(?:EQUAL|REDUC(?:ING|ER)?)\\b", "\\bTEEB?\\b"] },
  { code: 4, label: "Sweepolet", patterns: ["\\bSWEEPOLET\\b", "\\bSWEEP\\s*OLET\\b"] },
  { code: 5, label: "Weldolet", patterns: ["\\bWELDOLET\\b", "\\bWELD\\s*OLET\\b", "\\bWOLET\\b", "\\bBRANCH\\s+OUTLET\\b.*\\bB\\s*\\.?\\s*W\\.?\\b", "\\bBRANCH\\s+FITTING\\b.*\\bB\\s*\\.?\\s*W\\.?\\b", "\\bOLET\\b.*\\bB\\s*\\.?\\s*W\\.?\\b"] },
  { code: 6, label: "Extruded Welding Tee", patterns: ["\\bEXTRUDED\\b.*\\bWELD(?:ING)?\\b.*\\bTEE\\b", "\\bEXTRUDED\\b.*\\bTEE\\b", "\\bEXT(?:RUDED)?\\s+TEE\\b"] }
]);

// converters/xml-cii2019-core/piping-class-resolver.js
var DEFAULT_PIPING_CLASS_MATCH_CONFIG = Object.freeze({
  classExactScore: 1e3,
  overrideScore: 1100,
  leadingNumericExactScore: 940,
  prefixBaseScore: 910,
  startsWithScore: 860,
  numericDistanceBaseScore: 760,
  numericDistancePenalty: 45,
  numericDistanceMax: 5,
  fuzzyRatioWeight: 780,
  fuzzyMinRatio: 0.6,
  ambiguousScoreDelta: 50,
  minAcceptScore: 760,
  reviewBelowConfidence: 1,
  maxCandidates: 8,
  rowScoring: Object.freeze({
    boreToleranceMm: 1,
    classExactWeight: 1e3,
    boreExactWeight: 300,
    boreNearWeight: 220,
    componentExactWeight: 180,
    pipeRigidWeight: 120,
    ratingExactWeight: 80,
    scheduleExactWeight: 60,
    minAcceptScore: 1e3,
    ambiguousScoreDelta: 50
  })
});

// converters/xml-cii2019-core/default-piping-class-material-code-rows.js
var EXACT_ROWS = Object.freeze([
  ["11261", "106", "CS", "ASTM A106-B", "150", "1", 90, "Exact seed: carbon steel base class"],
  ["11441", "106", "CS Sour", "ASTM A106-B", "150", "3", 90, "Exact seed: carbon steel sour"],
  ["31441", "106", "CS Sour", "ASTM A106-B", "300", "3", 90, "Exact seed: carbon steel sour"],
  ["61261", "106", "CS", "ASTM A106-B", "600", "1", 90, "Exact seed: carbon steel rating family"],
  ["91261", "106", "CS", "ASTM A106-B", "900", "1", 90, "Exact seed: carbon steel rating family"],
  ["11472", "177", "LT CS", "ASTM A333-6", "150", "", 90, "Exact seed: low-temperature carbon steel"],
  ["11503", "177", "LT CS Sour", "ASTM A333-6", "150", "", 90, "Exact seed: low-temperature sour carbon steel"],
  ["12021", "181", "1.25Cr-0.5Mo", "ASTM A335-P11", "150", "", 90, "Exact seed: alloy steel"],
  ["12040", "186", "5Cr-0.5Mo", "ASTM A335-P5", "150", "", 90, "Exact seed: alloy steel"],
  ["12090", "190", "9Cr-1Mo", "ASTM A335-P9", "150", "", 90, "Exact seed: alloy steel"],
  ["13021", "163", "SS 316", "ASTM A312-TP316", "150", "", 90, "Exact seed: stainless steel 316"],
  ["13081", "155", "SS 304", "ASTM A312-TP304", "150", "", 90, "Exact seed: stainless steel 304"]
]);
var PATTERN_GROUPS = Object.freeze([
  {
    patterns: ["?10*", "?11*", "?12*", "?13*", "?14*", "??10*", "??11*", "??12*", "??13*", "??14*"],
    materials: [
      ["106", "Carbon steel", "ASTM A106-B", 82, "Pattern: CS seamless pipe family from CAPS material descriptions"],
      ["305", "Carbon steel", "API 5L-B", 76, "Pattern: CS API 5L-B line-pipe family from CAPS material descriptions"],
      ["367", "Carbon steel", "ASTM A672-C65", 76, "Pattern: CS welded pipe family from CAPS material descriptions"]
    ]
  },
  {
    patterns: ["?108*", "?117*", "?118*", "?138*", "?148*", "?147*", "?150*", "??108*", "??117*", "??118*", "??138*", "??148*"],
    materials: [
      ["177", "LT carbon steel", "ASTM A333-6", 82, "Pattern: LTCS seamless pipe family from CAPS material descriptions"],
      ["364", "LT carbon steel", "ASTM A671-CC65", 74, "Pattern: LTCS welded pipe family from CAPS material descriptions"]
    ]
  },
  {
    patterns: ["?2021", "??2021"],
    materials: [
      ["181", "Alloy steel 1.25Cr-0.5Mo", "ASTM A335-P11", 82, "Pattern: alloy steel family from CAPS material descriptions"],
      ["379", "Alloy steel 1.25Cr-0.5Mo", "ASTM A691-1.25Cr", 74, "Pattern: alloy welded family from CAPS material descriptions"]
    ]
  },
  {
    patterns: ["?2040", "??2040"],
    materials: [
      ["186", "Alloy steel 5Cr-0.5Mo", "ASTM A335-P5", 82, "Pattern: alloy steel family from CAPS material descriptions"],
      ["374", "Alloy steel 5Cr-0.5Mo", "ASTM A691-5Cr", 74, "Pattern: alloy welded family from CAPS material descriptions"]
    ]
  },
  {
    patterns: ["?2090", "?2093", "??2090", "??2093"],
    materials: [
      ["190", "Alloy steel 9Cr-1Mo", "ASTM A335-P9", 82, "Pattern: alloy steel family from CAPS material descriptions"],
      ["375", "Alloy steel 9Cr-1Mo", "ASTM A691-9Cr", 74, "Pattern: alloy welded family from CAPS material descriptions"]
    ]
  },
  {
    patterns: ["?3012", "?3013", "?3015", "?3052", "?3055", "??3012", "??3013", "??3015", "??3052", "??3055"],
    materials: [
      ["168", "Stainless steel 321/347", "ASTM A312-TP321", 82, "Pattern: SS 321/347 seamless pipe family from CAPS material descriptions"],
      ["225", "Stainless steel 321/347", "ASTM A358-321", 76, "Pattern: SS 321/347 welded pipe family from CAPS material descriptions"]
    ]
  },
  {
    patterns: ["?3021", "?3024", "?3032", "?3034", "?3060", "?3061", "?3197", "?3220", "?3411", "?3421", "?3430", "?3451", "?3461", "??3021", "??3024", "??3032", "??3034", "??3060", "??3061", "??3197", "??3220", "??3411", "??3421", "??3430", "??3451", "??3461"],
    materials: [
      ["163", "Stainless steel 316", "ASTM A312-TP316", 82, "Pattern: SS 316 seamless pipe family from CAPS material descriptions"],
      ["213", "Stainless steel 316", "ASTM A358-316", 76, "Pattern: SS 316 welded pipe family from CAPS material descriptions"]
    ]
  },
  {
    patterns: ["?3081", "?3085", "?3086", "?3087", "?3092", "?3095", "?3097", "?3191", "?3500", "??3081", "??3085", "??3086", "??3087", "??3092", "??3095", "??3097", "??3191", "??3500"],
    materials: [
      ["155", "Stainless steel 304", "ASTM A312-TP304", 82, "Pattern: SS 304 seamless pipe family from CAPS material descriptions"],
      ["192", "Stainless steel 304", "ASTM A358-304", 76, "Pattern: SS 304 welded pipe family from CAPS material descriptions"]
    ]
  },
  {
    patterns: ["?3035", "??3035"],
    materials: [
      ["164", "Stainless steel 317L", "ASTM A312-TP317L", 82, "Pattern: SS 317L seamless pipe family from CAPS material descriptions"],
      ["214", "Stainless steel 317L", "ASTM A358-317L", 76, "Pattern: SS 317L welded pipe family from CAPS material descriptions"]
    ]
  }
]);
function makeRow(pipingClass, materialCode, materialCategory, materialName, rating, corrosion, confidence, note, capsMaterialCount = 1) {
  return { pipingClass, materialCode, materialCategory, materialName, rating, corrosion, confidence, capsMaterialCount, note };
}
function buildDefaultRows() {
  const rows = EXACT_ROWS.map(([pipingClass, materialCode, materialCategory, materialName, rating, corrosion, confidence, note]) => makeRow(pipingClass, materialCode, materialCategory, materialName, rating, corrosion, confidence, note));
  for (const group of PATTERN_GROUPS) {
    for (const pattern of group.patterns) {
      for (const [materialCode, materialCategory, materialName, confidence, note] of group.materials) {
        rows.push(makeRow(pattern, materialCode, materialCategory, materialName, "", "", confidence, note));
      }
    }
  }
  return rows;
}
var DEFAULT_PIPING_CLASS_MATERIAL_CODE_ROWS = Object.freeze(buildDefaultRows());

// converters/xml-cii2019-core/piping-class-material-code-resolver.js
function text3(value) {
  return String(value ?? "").trim();
}
function normalizeClass(value) {
  return text3(value).toUpperCase().replace(/\s+/g, "");
}
function baseClass(value) {
  const normalized = normalizeClass(value);
  const match = normalized.match(/^(\d+)[A-Z].*$/);
  return match ? match[1] : normalized;
}
function wildcardExpression(pattern) {
  const escaped = normalizeClass(pattern).replace(/[.+^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escaped.replace(/\?/g, ".").replace(/\*/g, ".*")}$`);
}
function rowMatch(row, effectiveClass, allowSuffixNormalization) {
  const pattern = normalizeClass(row?.pipingClass);
  if (!pattern) return null;
  if (pattern === effectiveClass) return { method: "exact", rank: 3, specificity: pattern.length };
  const effectiveBase = allowSuffixNormalization ? baseClass(effectiveClass) : effectiveClass;
  if (allowSuffixNormalization && effectiveBase !== effectiveClass && pattern === effectiveBase) {
    return { method: "normalized-suffix", rank: 2, specificity: pattern.length };
  }
  if (!pattern.includes("*") && !pattern.includes("?")) return null;
  if (!wildcardExpression(pattern).test(effectiveClass) && !wildcardExpression(pattern).test(effectiveBase)) return null;
  const specificity = pattern.replace(/[?*]/g, "").length;
  return { method: "wildcard", rank: 1, specificity };
}
function compareCandidates(left, right) {
  return right.rank - left.rank || right.specificity - left.specificity || right.confidence - left.confidence || left.index - right.index;
}
function sameResolutionTier(left, right) {
  return left.rank === right.rank && left.specificity === right.specificity && left.confidence === right.confidence;
}
function resolveConfiguredMaterialCode({ pipingClass, config }) {
  const mapConfig = config?.pipingClassMaterialCodeMap;
  if (mapConfig?.enabled === false) return null;
  const useAppDefaults = config?.useDefaultPipingClassMaterialCodeMap === true;
  if (!mapConfig && !useAppDefaults) return null;
  const effectiveClass = normalizeClass(pipingClass);
  if (!effectiveClass) return null;
  const threshold = Number.isFinite(Number(mapConfig?.confidenceThreshold)) ? Number(mapConfig.confidenceThreshold) : 80;
  const rows = Array.isArray(mapConfig?.rows) && mapConfig.rows.length ? mapConfig.rows : useAppDefaults ? DEFAULT_PIPING_CLASS_MATERIAL_CODE_ROWS : [];
  const candidates = rows.map((row, index) => {
    const matched = rowMatch(row, effectiveClass, mapConfig?.normalizeClassSuffix !== false);
    const confidence = Number(row?.confidence);
    const materialCode = text3(row?.materialCode);
    if (!matched || !materialCode || !Number.isFinite(confidence) || confidence < threshold) return null;
    return { ...matched, confidence, materialCode, row, index };
  }).filter(Boolean).sort(compareCandidates);
  const best = candidates[0];
  if (!best) return null;
  const conflictingCodes = candidates.filter((candidate) => sameResolutionTier(candidate, best)).map((candidate) => candidate.materialCode).filter((code, index, all) => all.indexOf(code) === index);
  if (conflictingCodes.length > 1) return null;
  return {
    materialCode: best.materialCode,
    materialName: text3(best.row.materialName),
    materialCategory: text3(best.row.materialCategory),
    confidence: best.confidence,
    method: best.method,
    matchedRow: best.row
  };
}

// converters/xml-cii2019-core/service-process-fallback.js
var DEFAULT_FIELDS = Object.freeze(["p1", "hydroPressure", "t1", "t2", "t3", "density"]);
var PROCESS_ALIASES = Object.freeze({
  p1: Object.freeze(["p1", "P1", "Pressure1", "Design Pressure", "DesignPressure", "Pressure Max kPa(g)", "Pressure Max", "PressureMax", "Operating Pressure"]),
  hydroPressure: Object.freeze(["hydroPressure", "hydro_pressure", "HydroPressure", "Hydro Test Pressure", "Hydrotest Pressure", "Hydro Pressure", "Hydro Pr", "Hyd Test Pr", "Test Pressure", "TEST_PRESSURE", "HYDRO_TEST_PRESSURE", "Pressure2", "Hydro/Test Pressure"]),
  t1: Object.freeze(["t1", "T1", "Temperature1", "Design Temp", "Design Temperature", "Temp Max \xBAC", "Temp Max \xB0C", "Temp Max", "Operating Temp"]),
  t2: Object.freeze(["t2", "T2", "Temperature2", "Temp. \xBAC", "Temp. \xB0C", "Operating Temp", "Operating Temperature", "Temperature"]),
  t3: Object.freeze(["t3", "T3", "Temperature3", "Temp Min \xBAC", "Temp Min \xB0C", "Min Temp", "Minimum Temp"]),
  density: Object.freeze(["density", "Density", "fluidDensity", "FluidDensity", "Fluid Density", "densityMixed", "densityGas", "densityLiquid", "Mixed kg/m\xB3", "Gas kg/m\xB3", "Liquid kg/m\xB3"])
});
var SERVICE_ALIASES = Object.freeze(["service", "Service", "SERVICE", "fluid", "Fluid", "FLUID", "lineKey1", "Key 1", "ColumnX1", "Medium", "medium"]);

// converters/xml-cii2019-core/branch-process-resolver.js
function text4(value) {
  return String(value ?? "").trim();
}
function headerKey(value) {
  return text4(value).toUpperCase().replace(/[^A-Z0-9]+/g, "");
}
function readAny(row, keys) {
  if (!row || typeof row !== "object") return "";
  const wanted = (keys || []).map(headerKey).filter(Boolean);
  for (const source of [row, row._raw]) {
    if (!source || typeof source !== "object") continue;
    for (const key of keys || []) {
      const direct = source[key];
      if (text4(direct)) return text4(direct);
    }
    for (const [key, value] of Object.entries(source)) {
      if (wanted.includes(headerKey(key)) && text4(value)) return text4(value);
    }
  }
  return "";
}
function firstText2(row, keys) {
  return readAny(row, keys);
}
function overrideValue(overrides, bucketName, keys = []) {
  const bucket = overrides?.[bucketName];
  if (bucket && typeof bucket === "object" && !Array.isArray(bucket)) {
    for (const key of keys) {
      if (key && Object.prototype.hasOwnProperty.call(bucket, key) && text4(bucket[key])) return text4(bucket[key]);
    }
  }
  if (bucket !== void 0 && (typeof bucket !== "object" || bucket === null) && text4(bucket)) return text4(bucket);
  return "";
}
function classRowMaterial(row) {
  return readAny(row, ["materialName", "Material_Name", "Material Name", "Material", "material", "MATERIAL", "Mat", "MAT", "MOC"]);
}
function materialMapRowCode(row) {
  return cleanMaterialCode(readAny(row, ["code", "Code", "materialCode", "MaterialCode", "Material Code", "MAT_CODE", "CII Code", "CA3"]));
}
function materialMapRowNames(row) {
  return [readAny(row, ["material", "Material"]), readAny(row, ["materialName", "Material_Name", "Material Name"]), readAny(row, ["description", "Description"]), readAny(row, ["name", "Name"])].map(text4).filter(Boolean);
}
function materialComparable(value) {
  return cleanMaterialText(value).replace(/\b(ASTM|ASME|API)\b/g, " ").replace(/\bA\s*\/\s*SA\b/g, " ").replace(/\bSA\b/g, " ").replace(/\bGR(?:ADE)?\.?\b/g, " ").replace(/\bCL(?:ASS)?\.?\b/g, "CL").replace(/[^A-Z0-9]/g, "");
}
function mapMaterialTextToCiiCodeRobust(materialText, materialMap) {
  const exact = mapMaterialTextToCiiCode(materialText, materialMap);
  if (exact) return exact;
  const key = materialComparable(materialText);
  if (!key) return null;
  const rows = Array.isArray(materialMap) ? materialMap : [];
  const suffix = rows.find((row) => {
    if (!materialMapRowCode(row)) return false;
    return materialMapRowNames(row).some((candidate) => {
      const cand = materialComparable(candidate);
      if (!cand) return false;
      return cand === key || cand.length >= 4 && key.endsWith(cand) || key.length >= 4 && cand.endsWith(key);
    });
  });
  if (suffix) return suffix;
  const compositeMatches = rows.flatMap((row, rowIndex) => materialMapRowNames(row).flatMap((candidate) => {
    const comparable = materialComparable(candidate), position = key.indexOf(comparable);
    return materialMapRowCode(row) && comparable.length >= 4 && position >= 0 ? [{ row, rowIndex, position, length: comparable.length }] : [];
  }));
  compositeMatches.sort((left, right) => left.position - right.position || right.length - left.length || left.rowIndex - right.rowIndex);
  if (compositeMatches.length) return compositeMatches[0].row;
  const designations = key.match(/[A-Z]\d{5}/g) ?? [];
  return designations.flatMap((designation) => rows.filter((row) => materialMapRowCode(row) && materialMapRowNames(row).some((candidate) => materialComparable(candidate).includes(designation))))[0] ?? null;
}
var SERVICE_FALLBACK_FIELDS = Object.freeze(["p1", "hydroPressure", "t1", "t2", "t3", "density"]);
function resolveMaterialCodeFromLineMaterial({ lineRow, materialMap, pipingClassRow, pipingClass, overrides = {}, overrideKeys = [], xmlNode, xmlBranch, config = {} }) {
  const lineMaterialRaw = firstText2(lineRow, ["material", "Material", "MATERIAL", "Material_Name", "Material Name", "MOC"]);
  const classMaterialRaw = classRowMaterial(pipingClassRow);
  const materialOverride = overrideValue(overrides, "material", overrideKeys);
  const preferredMaterial = materialOverride || classMaterialRaw || lineMaterialRaw;
  const materialText = cleanMaterialText(preferredMaterial);
  const explicitMaterialCode = overrideValue(overrides, "materialCode", [...overrideKeys, classMaterialRaw, lineMaterialRaw, materialText].filter(Boolean));
  const legacyMaterialCode = overrideValue(overrides, "material", [classMaterialRaw, lineMaterialRaw, materialText].filter(Boolean));
  const configuredMaterialCode = resolveConfiguredMaterialCode({ pipingClass, config });
  const manualResult = explicitMaterialCode ? { material: materialText, materialCode: cleanMaterialCode(explicitMaterialCode), source: "override" } : legacyMaterialCode && legacyMaterialCode !== materialOverride ? { material: materialText, materialCode: cleanMaterialCode(legacyMaterialCode), source: "override" } : null;
  const configuredResult = configuredMaterialCode ? {
    material: materialText || cleanMaterialText(configuredMaterialCode.materialName),
    materialCode: cleanMaterialCode(configuredMaterialCode.materialCode),
    source: "piping-class-config-map",
    matchedRow: configuredMaterialCode.matchedRow,
    confidence: configuredMaterialCode.confidence,
    matchMethod: configuredMaterialCode.method
  } : null;
  if (config?.pipingClassMaterialCodeMap?.manualOverrideWins !== false && manualResult) return manualResult;
  const configuredIsExact = configuredResult && configuredResult.matchMethod !== "wildcard";
  if (config?.pipingClassMaterialCodeMap?.exactPipingClassFirst !== false && configuredIsExact) return configuredResult;
  const directClassCode = cleanMaterialCode(readAny(pipingClassRow, ["materialCode", "Material Code", "MATERIAL_CODE", "MAT_CODE", "Mat Code", "MatID", "MaterialCode", "CA3"]));
  if (directClassCode) return { material: materialText || cleanMaterialText(classMaterialRaw), materialCode: directClassCode, source: "piping-class-material-code", matchedRow: pipingClassRow };
  const directLineCode = cleanMaterialCode(readAny(lineRow, ["materialCode", "Material Code", "MATERIAL_CODE", "MAT_CODE", "Mat Code", "MatID", "MaterialCode", "CA3"]));
  if (directLineCode) return { material: materialText || cleanMaterialText(lineMaterialRaw), materialCode: directLineCode, source: materialOverride ? "override-material-code" : "line-list-material-code", matchedRow: lineRow };
  if (configuredResult) return configuredResult;
  if (manualResult) return manualResult;
  const fromClassMaterial = mapMaterialTextToCiiCodeRobust(classMaterialRaw, materialMap);
  const fromClassCode = materialMapRowCode(fromClassMaterial);
  if (fromClassCode) return { material: cleanMaterialText(classMaterialRaw), materialCode: fromClassCode, source: "piping-class-material-map", matchedRow: fromClassMaterial };
  const fromLineMaterial = mapMaterialTextToCiiCodeRobust(materialText || lineMaterialRaw, materialMap);
  const fromLineCode = materialMapRowCode(fromLineMaterial);
  if (fromLineCode) return { material: cleanMaterialText(materialText || lineMaterialRaw), materialCode: fromLineCode, source: materialOverride ? "override-material-map" : "line-list-material-map", matchedRow: fromLineMaterial };
  const xmlMaterial = cleanMaterialText(xmlNode?.material || xmlBranch?.material || "");
  const fromXmlMaterial = mapMaterialTextToCiiCodeRobust(xmlMaterial, materialMap);
  const fromXmlCode = materialMapRowCode(fromXmlMaterial);
  if (fromXmlCode) return { material: materialText || xmlMaterial, materialCode: fromXmlCode, source: "xml-material-map", matchedRow: fromXmlMaterial };
  return { material: materialText || cleanMaterialText(lineMaterialRaw) || cleanMaterialText(classMaterialRaw) || xmlMaterial, materialCode: "", source: xmlMaterial ? "xml-fallback" : "blank", matchedRow: null };
}

// converters/xml-cii2019-core/default-material-map-rows.js
var DEFAULT_MATERIAL_MAP_ROWS = Object.freeze([
  {
    "code": "101",
    "material": "A53-A"
  },
  {
    "code": "102",
    "material": "A53-B"
  },
  {
    "code": "103",
    "material": "A105"
  },
  {
    "code": "104",
    "material": "A106-A"
  },
  {
    "code": "105",
    "material": "A106-C"
  },
  {
    "code": "106",
    "material": "A106-B"
  },
  {
    "code": "107",
    "material": "A135-A"
  },
  {
    "code": "108",
    "material": "A135-B"
  },
  {
    "code": "109",
    "material": "A181-60"
  },
  {
    "code": "110",
    "material": "A181-70"
  },
  {
    "code": "111",
    "material": "A182-F310"
  },
  {
    "code": "112",
    "material": "A182-F1"
  },
  {
    "code": "113",
    "material": "A182-F11"
  },
  {
    "code": "114",
    "material": "A182-F11CL1"
  },
  {
    "code": "115",
    "material": "A182-F11CL2"
  },
  {
    "code": "116",
    "material": "A182-F12"
  },
  {
    "code": "117",
    "material": "A182-F12CL1"
  },
  {
    "code": "118",
    "material": "A182-F12CL2"
  },
  {
    "code": "119",
    "material": "A182-F2"
  },
  {
    "code": "120",
    "material": "A182-F21"
  },
  {
    "code": "121",
    "material": "A182-F22"
  },
  {
    "code": "122",
    "material": "A182-F22CL1"
  },
  {
    "code": "123",
    "material": "A182-F22CL3"
  },
  {
    "code": "124",
    "material": "A182-F304"
  },
  {
    "code": "125",
    "material": "A182-F304H"
  },
  {
    "code": "126",
    "material": "A182-F304L"
  },
  {
    "code": "127",
    "material": "A182-F304N"
  },
  {
    "code": "128",
    "material": "A182-F310"
  },
  {
    "code": "129",
    "material": "A182-F316"
  },
  {
    "code": "130",
    "material": "A182-F316H"
  },
  {
    "code": "131",
    "material": "A182-F316L"
  },
  {
    "code": "132",
    "material": "A182-F316N"
  },
  {
    "code": "133",
    "material": "A182-F321"
  },
  {
    "code": "134",
    "material": "A182-F321H"
  },
  {
    "code": "135",
    "material": "A182-F347"
  },
  {
    "code": "136",
    "material": "A182-F347H"
  },
  {
    "code": "137",
    "material": "A182-F348"
  },
  {
    "code": "138",
    "material": "A182-F348H"
  },
  {
    "code": "139",
    "material": "A182-F5"
  },
  {
    "code": "140",
    "material": "A182-F5a"
  },
  {
    "code": "142",
    "material": "A182-F9"
  },
  {
    "code": "143",
    "material": "A182-F91"
  },
  {
    "code": "144",
    "material": "A268-TP405"
  },
  {
    "code": "145",
    "material": "A268-TP410"
  },
  {
    "code": "144",
    "material": "A268-TP429"
  },
  {
    "code": "147",
    "material": "A268-TP430"
  },
  {
    "code": "148",
    "material": "A268-TP446"
  },
  {
    "code": "149",
    "material": "A268-TP4461"
  },
  {
    "code": "150",
    "material": "A285-A"
  },
  {
    "code": "151",
    "material": "A285-B"
  },
  {
    "code": "152",
    "material": "A285-C"
  },
  {
    "code": "153",
    "material": "A312-304"
  },
  {
    "code": "154",
    "material": "A312-304L"
  },
  {
    "code": "155",
    "material": "A312-TP304"
  },
  {
    "code": "156",
    "material": "A312-TP304H"
  },
  {
    "code": "157",
    "material": "A312-TP304L"
  },
  {
    "code": "158",
    "material": "A312-TP304N"
  },
  {
    "code": "159",
    "material": "A312-TP309"
  },
  {
    "code": "160",
    "material": "A312-TP309S"
  },
  {
    "code": "161",
    "material": "A312-TP310"
  },
  {
    "code": "162",
    "material": "A312-TP310S"
  },
  {
    "code": "163",
    "material": "A312-TP316"
  },
  {
    "code": "164",
    "material": "A312-TP316H"
  },
  {
    "code": "165",
    "material": "A312-TP316L"
  },
  {
    "code": "166",
    "material": "A312-TP316N"
  },
  {
    "code": "167",
    "material": "A312-TP317"
  },
  {
    "code": "168",
    "material": "A312-TP321"
  },
  {
    "code": "169",
    "material": "A312-TP321H"
  },
  {
    "code": "170",
    "material": "A312-TP347"
  },
  {
    "code": "171",
    "material": "A312-TP347H"
  },
  {
    "code": "172",
    "material": "A312-TP348"
  },
  {
    "code": "173",
    "material": "A312-TP348H"
  },
  {
    "code": "174",
    "material": "A333-1"
  },
  {
    "code": "175",
    "material": "A333-3"
  },
  {
    "code": "176",
    "material": "A333-4"
  },
  {
    "code": "177",
    "material": "A333-6"
  },
  {
    "code": "178",
    "material": "A333-7"
  },
  {
    "code": "179",
    "material": "A333-9"
  },
  {
    "code": "180",
    "material": "A335-P1"
  },
  {
    "code": "181",
    "material": "A335-P11"
  },
  {
    "code": "182",
    "material": "A335-P12"
  },
  {
    "code": "183",
    "material": "A335-P2"
  },
  {
    "code": "184",
    "material": "A335-P21"
  },
  {
    "code": "185",
    "material": "A335-P22"
  },
  {
    "code": "186",
    "material": "A335-P5"
  },
  {
    "code": "187",
    "material": "A335-P5b"
  },
  {
    "code": "188",
    "material": "A335-P5c"
  },
  {
    "code": "190",
    "material": "A335-P9"
  },
  {
    "code": "191",
    "material": "A335-P91"
  },
  {
    "code": "192",
    "material": "A358-304"
  },
  {
    "code": "193",
    "material": "A358-304CL1"
  },
  {
    "code": "194",
    "material": "A358-304CL2"
  },
  {
    "code": "195",
    "material": "A358-304CL3"
  },
  {
    "code": "196",
    "material": "A358-304L"
  },
  {
    "code": "197",
    "material": "A358-304LCL1"
  },
  {
    "code": "198",
    "material": "A358-304LCL2"
  },
  {
    "code": "199",
    "material": "A358-304LCL3"
  },
  {
    "code": "200",
    "material": "A358-304N"
  },
  {
    "code": "201",
    "material": "A358-304NCL1"
  },
  {
    "code": "202",
    "material": "A358-304NCL2"
  },
  {
    "code": "203",
    "material": "A358-304NCL3"
  },
  {
    "code": "204",
    "material": "A358-309CL1"
  },
  {
    "code": "205",
    "material": "A358-309CL2"
  },
  {
    "code": "206",
    "material": "A358-309CL3"
  },
  {
    "code": "207",
    "material": "A358-309S"
  },
  {
    "code": "208",
    "material": "A358-310S"
  },
  {
    "code": "209",
    "material": "A358-310CL1"
  },
  {
    "code": "210",
    "material": "A358-310CL2"
  },
  {
    "code": "211",
    "material": "A358-310CL3"
  },
  {
    "code": "212",
    "material": "A358-310S"
  },
  {
    "code": "213",
    "material": "A358-316"
  },
  {
    "code": "214",
    "material": "A358-316CL1"
  },
  {
    "code": "215",
    "material": "A358-316CL2"
  },
  {
    "code": "216",
    "material": "A358-316CL3"
  },
  {
    "code": "217",
    "material": "A358-316L"
  },
  {
    "code": "218",
    "material": "A358-316LCL1"
  },
  {
    "code": "219",
    "material": "A358-316LCL2"
  },
  {
    "code": "220",
    "material": "A358-316LCL3"
  },
  {
    "code": "221",
    "material": "A358-316N"
  },
  {
    "code": "222",
    "material": "A358-316NCL1"
  },
  {
    "code": "223",
    "material": "A358-316NCL2"
  },
  {
    "code": "224",
    "material": "A358-316NCL3"
  },
  {
    "code": "225",
    "material": "A358-321"
  },
  {
    "code": "226",
    "material": "A358-321CL1"
  },
  {
    "code": "227",
    "material": "A358-321CL2"
  },
  {
    "code": "228",
    "material": "A358-321CL3"
  },
  {
    "code": "229",
    "material": "A358-347"
  },
  {
    "code": "230",
    "material": "A358-347CL1"
  },
  {
    "code": "231",
    "material": "A358-347CL2"
  },
  {
    "code": "232",
    "material": "A358-347CL3"
  },
  {
    "code": "233",
    "material": "A358-348"
  },
  {
    "code": "234",
    "material": "A358-348CL1"
  },
  {
    "code": "235",
    "material": "A358-348CL2"
  },
  {
    "code": "236",
    "material": "A358-348CL3"
  },
  {
    "code": "237",
    "material": "A369-FP1"
  },
  {
    "code": "238",
    "material": "A369-FP11"
  },
  {
    "code": "239",
    "material": "A369-FP12"
  },
  {
    "code": "240",
    "material": "A369-FP2"
  },
  {
    "code": "241",
    "material": "A369-FP21"
  },
  {
    "code": "242",
    "material": "A369-FP22"
  },
  {
    "code": "243",
    "material": "A369-FP3b"
  },
  {
    "code": "244",
    "material": "A369-FP5"
  },
  {
    "code": "246",
    "material": "A369-FP9"
  },
  {
    "code": "247",
    "material": "A376-304"
  },
  {
    "code": "248",
    "material": "A376-TP304"
  },
  {
    "code": "249",
    "material": "A376-TP304H"
  },
  {
    "code": "250",
    "material": "A376-TP304N"
  },
  {
    "code": "251",
    "material": "A376-TP316"
  },
  {
    "code": "252",
    "material": "A376-TP316H"
  },
  {
    "code": "253",
    "material": "A376-TP316N"
  },
  {
    "code": "254",
    "material": "A376-TP321"
  },
  {
    "code": "255",
    "material": "A376-TP321H"
  },
  {
    "code": "256",
    "material": "A376-TP347"
  },
  {
    "code": "257",
    "material": "A376-TP347H"
  },
  {
    "code": "258",
    "material": "A376-TP348"
  },
  {
    "code": "259",
    "material": "A403-304"
  },
  {
    "code": "260",
    "material": "A403-304H"
  },
  {
    "code": "261",
    "material": "A403-304L"
  },
  {
    "code": "262",
    "material": "A403-304N"
  },
  {
    "code": "263",
    "material": "A403-309"
  },
  {
    "code": "264",
    "material": "A403-310"
  },
  {
    "code": "265",
    "material": "A403-316"
  },
  {
    "code": "266",
    "material": "A403-316H"
  },
  {
    "code": "267",
    "material": "A403-316L"
  },
  {
    "code": "268",
    "material": "A403-316N"
  },
  {
    "code": "269",
    "material": "A403-321"
  },
  {
    "code": "270",
    "material": "A403-321H"
  },
  {
    "code": "271",
    "material": "A403-347"
  },
  {
    "code": "272",
    "material": "A403-347H"
  },
  {
    "code": "273",
    "material": "A403-348"
  },
  {
    "code": "274",
    "material": "A403-348H"
  },
  {
    "code": "275",
    "material": "A403-WP304"
  },
  {
    "code": "276",
    "material": "A403-WP304H"
  },
  {
    "code": "277",
    "material": "A403-WP304L"
  },
  {
    "code": "278",
    "material": "A403-WP304N"
  },
  {
    "code": "279",
    "material": "A403-WP309"
  },
  {
    "code": "280",
    "material": "A403-WP310"
  },
  {
    "code": "281",
    "material": "A403-WP316"
  },
  {
    "code": "282",
    "material": "A403-WP316H"
  },
  {
    "code": "283",
    "material": "A403-WP316L"
  },
  {
    "code": "284",
    "material": "A403-WP316N"
  },
  {
    "code": "285",
    "material": "A403-WP317"
  },
  {
    "code": "286",
    "material": "A403-WP321"
  },
  {
    "code": "287",
    "material": "A403-WP321H"
  },
  {
    "code": "288",
    "material": "A403-WP347"
  },
  {
    "code": "289",
    "material": "A403-WP347H"
  },
  {
    "code": "290",
    "material": "A403-WP348"
  },
  {
    "code": "291",
    "material": "A403-WP348H"
  },
  {
    "code": "292",
    "material": "A430-FP347"
  },
  {
    "code": "293",
    "material": "A430-FP347H"
  },
  {
    "code": "294",
    "material": "A430-FP304"
  },
  {
    "code": "295",
    "material": "A430-FP304H"
  },
  {
    "code": "296",
    "material": "A430-FP316"
  },
  {
    "code": "297",
    "material": "A430-FP316H"
  },
  {
    "code": "298",
    "material": "A430-FP316N"
  },
  {
    "code": "299",
    "material": "A430-FP321"
  },
  {
    "code": "300",
    "material": "A430-FP321H"
  },
  {
    "code": "301",
    "material": "A430-FP347"
  },
  {
    "code": "302",
    "material": "A430-FP347H"
  },
  {
    "code": "303",
    "material": "API-5L-A"
  },
  {
    "code": "304",
    "material": "API-5L-A25"
  },
  {
    "code": "305",
    "material": "API-5L-B"
  },
  {
    "code": "306",
    "material": "API-5L-X65"
  },
  {
    "code": "307",
    "material": "API-5L-X70"
  },
  {
    "code": "308",
    "material": "API-5L-X80"
  },
  {
    "code": "309",
    "material": "API-5LU-U100"
  },
  {
    "code": "310",
    "material": "API-5LU-U80"
  },
  {
    "code": "311",
    "material": "B165-Annealed"
  },
  {
    "code": "312",
    "material": "B241-6061T6"
  },
  {
    "code": "313",
    "material": "B241-6063T6"
  },
  {
    "code": "314",
    "material": "B337-1"
  },
  {
    "code": "315",
    "material": "B337-2"
  },
  {
    "code": "316",
    "material": "B337-3"
  },
  {
    "code": "317",
    "material": "B337-7"
  },
  {
    "code": "318",
    "material": "B42-Annealed"
  },
  {
    "code": "319",
    "material": "B42-Drawn"
  },
  {
    "code": "320",
    "material": "B43"
  },
  {
    "code": "321",
    "material": "A234-WPC"
  },
  {
    "code": "322",
    "material": "API-5L-X60"
  },
  {
    "code": "323",
    "material": "API-5L-X46"
  },
  {
    "code": "324",
    "material": "A213-TP304"
  },
  {
    "code": "325",
    "material": "A213-TP304H"
  },
  {
    "code": "326",
    "material": "A213-TP304L"
  },
  {
    "code": "327",
    "material": "A213-TP304N"
  },
  {
    "code": "328",
    "material": "A213-TP309H"
  },
  {
    "code": "329",
    "material": "A213-TP310H"
  },
  {
    "code": "330",
    "material": "API-5L-X42"
  },
  {
    "code": "331",
    "material": "API-5L-X52"
  },
  {
    "code": "332",
    "material": "API-5L-X56"
  },
  {
    "code": "333",
    "material": "A789-S32304"
  },
  {
    "code": "334",
    "material": "A790-S32304"
  },
  {
    "code": "335",
    "material": "A789-S32900"
  },
  {
    "code": "336",
    "material": "A790-S32900"
  },
  {
    "code": "337",
    "material": "A789-S32803"
  },
  {
    "code": "338",
    "material": "A790-S32803"
  },
  {
    "code": "339",
    "material": "A789-S32760"
  },
  {
    "code": "340",
    "material": "A790-S32760"
  },
  {
    "code": "341",
    "material": "A789-S32750"
  },
  {
    "code": "342",
    "material": "A790-S32750"
  },
  {
    "code": "343",
    "material": "A269-TP304"
  },
  {
    "code": "344",
    "material": "A409-TP304"
  },
  {
    "code": "345",
    "material": "A452-TP304H"
  },
  {
    "code": "346",
    "material": "A452-TP347H"
  },
  {
    "code": "347",
    "material": "A451-CPF8M"
  },
  {
    "code": "348",
    "material": "A451-CPE20N"
  },
  {
    "code": "349",
    "material": "A409-TP348"
  },
  {
    "code": "350",
    "material": "A409-TP347"
  },
  {
    "code": "351",
    "material": "A269-TP304L"
  },
  {
    "code": "352",
    "material": "A269-TP316L"
  },
  {
    "code": "353",
    "material": "A451-CPF8"
  },
  {
    "code": "354",
    "material": "A671-C55"
  },
  {
    "code": "355",
    "material": "A671-CC60"
  },
  {
    "code": "356",
    "material": "A671-CC80"
  },
  {
    "code": "357",
    "material": "A672-B60"
  },
  {
    "code": "358",
    "material": "A672-C60"
  },
  {
    "code": "359",
    "material": "A524-GR1"
  },
  {
    "code": "360",
    "material": "A334-6"
  },
  {
    "code": "361",
    "material": "A381Y35"
  },
  {
    "code": "362",
    "material": "A381Y48"
  },
  {
    "code": "363",
    "material": "A381Y50"
  },
  {
    "code": "364",
    "material": "A671-CC65"
  },
  {
    "code": "365",
    "material": "A671-CB65"
  },
  {
    "code": "366",
    "material": "A672-B65"
  },
  {
    "code": "367",
    "material": "A672-C65"
  },
  {
    "code": "368",
    "material": "A671-CC70"
  },
  {
    "code": "369",
    "material": "A671-CB70"
  },
  {
    "code": "370",
    "material": "A672-B70"
  },
  {
    "code": "371",
    "material": "A672-C70"
  },
  {
    "code": "372",
    "material": "A671-CD70"
  },
  {
    "code": "373",
    "material": "A691-1CR"
  },
  {
    "code": "374",
    "material": "A691-5CR"
  },
  {
    "code": "375",
    "material": "A691-9CR"
  },
  {
    "code": "376",
    "material": "A691-3CR"
  },
  {
    "code": "377",
    "material": "A426-CP5"
  },
  {
    "code": "378",
    "material": "A426-CP9"
  },
  {
    "code": "379",
    "material": "A691-125CR"
  },
  {
    "code": "380",
    "material": "A516-55"
  },
  {
    "code": "381",
    "material": "A516-60"
  },
  {
    "code": "382",
    "material": "A516-65"
  },
  {
    "code": "383",
    "material": "A516-70"
  },
  {
    "code": "384",
    "material": "A240-304"
  },
  {
    "code": "385",
    "material": "A240-304L"
  },
  {
    "code": "386",
    "material": "A240-304N"
  },
  {
    "code": "387",
    "material": "A240-310H"
  },
  {
    "code": "388",
    "material": "A240-310S"
  },
  {
    "code": "389",
    "material": "A240-316"
  },
  {
    "code": "390",
    "material": "A240-316L"
  },
  {
    "code": "391",
    "material": "A240-316N"
  },
  {
    "code": "392",
    "material": "B444-N06625"
  },
  {
    "code": "393",
    "material": "B423-N08825"
  },
  {
    "code": "394",
    "material": "B729-N08020"
  },
  {
    "code": "395",
    "material": "B163-N08800"
  },
  {
    "code": "396",
    "material": "B161-N02201"
  },
  {
    "code": "397",
    "material": "B165-N04400"
  },
  {
    "code": "398",
    "material": "B861-1"
  },
  {
    "code": "399",
    "material": "B861-2"
  },
  {
    "code": "400",
    "material": "B861-3"
  },
  {
    "code": "401",
    "material": "B861-7"
  },
  {
    "code": "402",
    "material": "A312-TP317L"
  },
  {
    "code": "403",
    "material": "B619-N10276"
  },
  {
    "code": "404",
    "material": "A213-T11"
  },
  {
    "code": "405",
    "material": "A213-T12"
  },
  {
    "code": "406",
    "material": "10345S-16-100"
  },
  {
    "code": "407",
    "material": "10345S-40-100"
  },
  {
    "code": "408",
    "material": "10425S-16-100"
  },
  {
    "code": "409",
    "material": "10425S-40-100"
  },
  {
    "code": "410",
    "material": "17715S-16-100"
  },
  {
    "code": "411",
    "material": "17715S-40-100"
  },
  {
    "code": "412",
    "material": "15415S-16-100"
  },
  {
    "code": "413",
    "material": "15415S-40-100"
  },
  {
    "code": "414",
    "material": "17380S-16-100"
  },
  {
    "code": "415",
    "material": "17380S-40-100"
  },
  {
    "code": "416",
    "material": "14922S-16-100"
  },
  {
    "code": "417",
    "material": "14922S-40-100"
  },
  {
    "code": "418",
    "material": "14903S-16-100"
  },
  {
    "code": "419",
    "material": "14903S-40-100"
  },
  {
    "code": "420",
    "material": "14541CS"
  },
  {
    "code": "421",
    "material": "14541HS"
  },
  {
    "code": "422",
    "material": "14571CS"
  },
  {
    "code": "423",
    "material": "14571HS"
  },
  {
    "code": "424",
    "material": "14301S"
  },
  {
    "code": "425",
    "material": "14462S"
  },
  {
    "code": "426",
    "material": "14539S"
  },
  {
    "code": "427",
    "material": "14439S"
  },
  {
    "code": "428",
    "material": "14306S"
  },
  {
    "code": "429",
    "material": "14307S"
  },
  {
    "code": "430",
    "material": "14435S"
  },
  {
    "code": "431",
    "material": "14301W"
  },
  {
    "code": "432",
    "material": "14541W"
  },
  {
    "code": "433",
    "material": "14571W"
  },
  {
    "code": "434",
    "material": "14439W"
  },
  {
    "code": "435",
    "material": "14539W"
  },
  {
    "code": "436",
    "material": "14462W"
  },
  {
    "code": "437",
    "material": "10345W-16"
  },
  {
    "code": "438",
    "material": "10345W-40"
  },
  {
    "code": "439",
    "material": "10425W-16"
  },
  {
    "code": "440",
    "material": "10425W-40"
  },
  {
    "code": "441",
    "material": "15415W-16"
  },
  {
    "code": "442",
    "material": "15415W-40"
  },
  {
    "code": "443",
    "material": "14307W"
  },
  {
    "code": "444",
    "material": "14306W"
  },
  {
    "code": "445",
    "material": "14435W"
  },
  {
    "code": "446",
    "material": "17335S-16-100"
  },
  {
    "code": "447",
    "material": "17335S-40-100"
  },
  {
    "code": "448",
    "material": "STPG370-S"
  },
  {
    "code": "449",
    "material": "STPT370-S"
  },
  {
    "code": "450",
    "material": "STS370-S"
  },
  {
    "code": "451",
    "material": "STPL380-S"
  },
  {
    "code": "468",
    "material": "1.0345S-16-200"
  },
  {
    "code": "469",
    "material": "1.0345S-40-200"
  },
  {
    "code": "470",
    "material": "1.0425S-16-200"
  },
  {
    "code": "471",
    "material": "1.0425S-40-200"
  },
  {
    "code": "472",
    "material": "1.7715S-16-200"
  },
  {
    "code": "473",
    "material": "1.7715S-40-200"
  },
  {
    "code": "474",
    "material": "1.5415S-16-200"
  },
  {
    "code": "475",
    "material": "1.5415S-40-200"
  },
  {
    "code": "476",
    "material": "1.7380S-16-200"
  },
  {
    "code": "477",
    "material": "1.7380S-40-200"
  },
  {
    "code": "478",
    "material": "1.4922S-16-200"
  },
  {
    "code": "479",
    "material": "1.4922S-40-200"
  },
  {
    "code": "480",
    "material": "1.4903S-16-200"
  },
  {
    "code": "481",
    "material": "1.4903S-40-200"
  },
  {
    "code": "482",
    "material": "1.7335S-16-200"
  },
  {
    "code": "483",
    "material": "1.7335S-40-200"
  },
  {
    "code": "484",
    "material": "1.4404S-60"
  },
  {
    "code": "485",
    "material": "1.4311W-60"
  },
  {
    "code": "486",
    "material": "1.4401S-60"
  },
  {
    "code": "487",
    "material": "1.4401W-60"
  },
  {
    "code": "488",
    "material": "1.4311S-60"
  },
  {
    "code": "489",
    "material": "1.4404W-60"
  },
  {
    "code": "490",
    "material": "1.4429S-60"
  },
  {
    "code": "491",
    "material": "1.4429W-60"
  },
  {
    "code": "492",
    "material": "1.7383S-16-100"
  },
  {
    "code": "493",
    "material": "1.7383S-40-100"
  },
  {
    "code": "494",
    "material": "1.4901S-16-100"
  },
  {
    "code": "495",
    "material": "1.4901S-40-100"
  },
  {
    "code": "496",
    "material": "1.7338S-16-100"
  },
  {
    "code": "497",
    "material": "1.7338S-40-100"
  },
  {
    "code": "498",
    "material": "1.4901S-16-200"
  },
  {
    "code": "499",
    "material": "1.4901S-40-200"
  },
  {
    "code": "500",
    "material": "1.7338S-16-200"
  },
  {
    "code": "501",
    "material": "1.7338S-40-200"
  },
  {
    "code": "502",
    "material": "A234-WPB"
  }
]);

// tabs/model-converters/converters/component-topology/topology-inputxml-engineering-context.js
var CONTEXT_FIELDS = Object.freeze([
  "diameter",
  "wall",
  "insulation",
  "corrosion",
  "temperature",
  "pressure",
  "hydro",
  "modulus",
  "poisson",
  "pipeDensity",
  "insulationDensity",
  "fluidDensity",
  "materialNumber",
  "materialName"
]);
function finiteNumber4(value) {
  if (value === null || value === void 0 || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const match = String(value).trim().replaceAll(",", "").match(/[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/);
  const number = match ? Number(match[0]) : Number.NaN;
  return Number.isFinite(number) ? number : null;
}
function physicalWall(diameter, candidates) {
  return candidates.map(finiteNumber4).find((wall) => wall !== null && wall > 0 && diameter !== null && wall * 2 < diameter) ?? null;
}
function engineeringRecord(edge, records) {
  return edge.sourceEntityIds.map((id) => records.get(id)).find((record2) => record2 && !isSupportType(record2.componentType)) ?? null;
}
function engineeringValues(record2) {
  const resolved = record2?.resolved ?? {};
  const enriched = record2?.enrichedAttributes ?? {};
  const attrs = record2?.attrs ?? {};
  const diameter = finiteNumber4(enriched.pipeOdMm ?? resolved.odMm);
  const bore = finiteNumber4(enriched.nominalBoreMm ?? record2?.boreMm ?? attrs.ABORE ?? attrs.BORE ?? attrs.HBORE);
  const directWall = physicalWall(diameter, [resolved.wallMm, enriched.wallThicknessMm, attrs.WTHK, attrs.WTXX]);
  const standardWall = directWall === null && bore !== null ? fallbackStdWall(bore)?.wallMm ?? null : null;
  const materialDensity = finiteNumber4(enriched.materialDensityKgM3 ?? attrs.MDEN);
  const insulationDensity = finiteNumber4(enriched.insulationDensityKgM3 ?? attrs.IDEN);
  const fluidDensity = finiteNumber4(enriched.fluidDensityOpeKgM3 ?? attrs.FDENSITY ?? attrs.FLDEN);
  const directMaterialCode = enriched.materialCode ?? attrs.MESC;
  const mappedMaterial = directMaterialCode ? null : [enriched.material, attrs.MTXX].map((material) => resolveMaterialCodeFromLineMaterial({
    lineRow: { material },
    materialMap: DEFAULT_MATERIAL_MAP_ROWS,
    pipingClassRow: null,
    pipingClass: enriched.pipingClass ?? attrs.SPRE,
    overrides: {},
    overrideKeys: [],
    xmlNode: null,
    xmlBranch: null,
    config: { useDefaultPipingClassMaterialCodeMap: true }
  })).find((result) => result.materialCode) ?? null;
  return {
    diameter,
    wall: directWall ?? physicalWall(diameter, [standardWall]),
    insulation: finiteNumber4(enriched.insulationThicknessMm ?? record2?.insuMm) ?? 0,
    corrosion: finiteNumber4(enriched.corrosionAllowanceMm ?? resolved.corrMm) ?? 0,
    temperature: enriched.designTemperatureC ?? attrs.ITEMTEMP1 ?? attrs.TEMP1,
    pressure: nativePressure(enriched.designPressureMpa ?? enriched.designPressure ?? attrs.ITEMPRES1 ?? attrs.PRES1),
    hydro: enriched.hydroPressure ?? attrs.HPRES,
    modulus: enriched.modulusMpa ?? attrs.YMOD ?? attrs.EMOD,
    poisson: enriched.poissonsRatio ?? attrs.PRAT,
    pipeDensity: materialDensity === null ? null : materialDensity / 1e6,
    insulationDensity: insulationDensity === null ? null : insulationDensity / 1e6,
    fluidDensity: fluidDensity === null ? null : fluidDensity / 1e6,
    materialNumber: directMaterialCode ?? mappedMaterial?.materialCode,
    materialName: mappedMaterial?.material ?? enriched.material ?? attrs.MTXX ?? attrs.MESC,
    lineId: enriched.lineNo ?? record2?.branchName,
    name: record2?.name
  };
}
function missing(value) {
  return value === null || value === void 0 || cleanText(value) === "";
}
function fillContext(target, source) {
  const result = { ...target };
  for (const field of CONTEXT_FIELDS) if (missing(result[field]) && !missing(source[field])) result[field] = source[field];
  return result;
}
function lineContextIndex(records) {
  const contexts = /* @__PURE__ */ new Map();
  for (const record2 of records.values()) {
    const values = engineeringValues(record2);
    const lineId = cleanText(values.lineId);
    if (!lineId) continue;
    contexts.set(lineId, fillContext(contexts.get(lineId) ?? values, values));
  }
  return contexts;
}
function nativePressure(value) {
  const text5 = cleanText(value).toUpperCase();
  return ["ATM", "ATMOSPHERIC", "ATMOSPHERE"].includes(text5) ? 0 : value;
}
function buildEdgeEngineeringValues(edges, records) {
  const contexts = lineContextIndex(records), result = /* @__PURE__ */ new Map();
  for (const edge of edges) {
    const values = engineeringValues(engineeringRecord(edge, records));
    const lineId = cleanText(values.lineId);
    result.set(edge.id, lineId ? fillContext(values, contexts.get(lineId) ?? {}) : values);
  }
  return result;
}
var _test4 = Object.freeze({ missing, fillContext, lineContextIndex, nativePressure });

// tabs/model-converters/converters/component-topology/topology-inputxml-trace-attributes.js
function list(value) {
  return uniqueText(Array.isArray(value) ? value : [value]).join(",");
}
function fixedTrace(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(6) : "";
}
function pointAttributes(point3, prefix) {
  if (!point3 || !["x", "y", "z"].every((axis) => Number.isFinite(Number(point3[axis])))) return [];
  return [
    [`${prefix}_X`, fixedTrace(point3.x)],
    [`${prefix}_Y`, fixedTrace(point3.y)],
    [`${prefix}_Z`, fixedTrace(point3.z)]
  ];
}
function topologyElementTraceAttributes(edge, from, to) {
  return [
    ["CANONICAL_EDGE_ID", cleanText(edge.id)],
    ["FROM_CANONICAL_NODE_ID", cleanText(from.id)],
    ["TO_CANONICAL_NODE_ID", cleanText(to.id)],
    ["SOURCE_ENTITY_IDS", list(edge.sourceEntityIds)],
    ["SOURCE_PORT_IDS", list(edge.sourcePortIds)],
    ["FROM_SOURCE_ENTITY_IDS", list(from.sourceEntityIds)],
    ["TO_SOURCE_ENTITY_IDS", list(to.sourceEntityIds)],
    ["FROM_SOURCE_PORT_IDS", list(from.sourcePortIds)],
    ["TO_SOURCE_PORT_IDS", list(to.sourcePortIds)],
    ["BRANCH_IDS", list(edge.branchIds ?? edge.sourceBranchEntityIds)],
    ["TOPOLOGY_OPERATION", cleanText(edge.topologyOperation ?? edge.segmentRole)],
    ["PROJECTION_CARDINALITY", cleanText(edge.projectionCardinality || "ONE_TO_ONE")],
    ["MERGE_AUTHORITY", cleanText(edge.projectionMergeAuthority)]
  ];
}
function topologyRestraintTraceAttributes(support) {
  return [
    ["SUPPORT_ID", cleanText(support.id)],
    ["CANONICAL_NODE_ID", cleanText(support.nodeId)],
    ["SOURCE_ENTITY_IDS", list(support.sourceEntityIds)],
    ["SOURCE_PATHS", list(support.sourcePaths)],
    ["BRANCH_IDS", list(support.branchIds ?? support.sourceBranchEntityIds)],
    ["ATTACHMENT_AUTHORITY", cleanText(support.attachmentAuthority)],
    ["ATTACHMENT_REFERENCES", list(support.attachmentReferences)],
    ["CONNECTION_RESIDUAL", fixedTrace(support.connectionResidual)],
    ...pointAttributes(support.sourcePosition, "SOURCE"),
    ...pointAttributes(support.attachmentPosition ?? support.position, "ATTACHMENT")
  ];
}
function topologyRigidTraceAttributes(edge, rigids) {
  return [
    ["CANONICAL_EDGE_ID", cleanText(edge.id)],
    ["SOURCE_ENTITY_IDS", list(rigids.map((rigid) => rigid.sourceEntityId))],
    ["SOURCE_PATHS", list(rigids.map((rigid) => rigid.sourcePath))],
    ["BRANCH_IDS", list(rigids.flatMap((rigid) => rigid.branchIds ?? rigid.sourceBranchEntityIds ?? []))],
    ["ASSIGNMENT_AUTHORITY", list(rigids.map((rigid) => rigid.assignmentAuthority))],
    ["CONNECTION_RESIDUAL", fixedTrace(Math.max(0, ...rigids.map((rigid) => Number(rigid.connectionResidual) || 0)))]
  ];
}
var _test5 = Object.freeze({ list, fixedTrace, pointAttributes });

// tabs/model-converters/converters/component-topology/topology-inputxml-writer.js
var SENTINEL = "-1.010100";
function fixed(value) {
  const number = finiteNumber4(value);
  return number === null ? SENTINEL : number.toFixed(6);
}
function globalFixed(value) {
  const number = finiteNumber4(value);
  if (number === null) throw new TypeError(`Invalid canonical global coordinate: ${value}.`);
  return number.toFixed(3);
}
function nodeMap(canonical) {
  return new Map(canonical.nodes.map((node) => [node.id, node]));
}
function nativeAttributes(edge, from, to, values, fromName, toName) {
  const delta = { x: to.position.x - from.position.x, y: to.position.y - from.position.y, z: to.position.z - from.position.z };
  const attributes = [
    ["ID", edge.inputXmlElementIds[0]],
    ["FROM_NODE", fixed(from.inputXmlNodeIds[0])],
    ["TO_NODE", fixed(to.inputXmlNodeIds[0])],
    ["DELTA_X", fixed(delta.x)],
    ["DELTA_Y", fixed(delta.y)],
    ["DELTA_Z", fixed(delta.z)],
    ["DIAMETER", fixed(values.diameter)],
    ["WALL_THICK", fixed(values.wall)],
    ["INSUL_THICK", fixed(values.insulation)],
    ["CORR_ALLOW", fixed(values.corrosion)],
    ["TEMP_EXP_C1", fixed(values.temperature)]
  ];
  for (let index = 2; index <= 9; index += 1) attributes.push([`TEMP_EXP_C${index}`, SENTINEL]);
  attributes.push(["PRESSURE1", fixed(values.pressure)]);
  for (let index = 2; index <= 9; index += 1) attributes.push([`PRESSURE${index}`, SENTINEL]);
  attributes.push(
    ["HYDRO_PRESSURE", fixed(values.hydro)],
    ["MODULUS", fixed(values.modulus)],
    ["POISSONS", fixed(values.poisson)],
    ["PIPE_DENSITY", fixed(values.pipeDensity)],
    ["INSUL_DENSITY", fixed(values.insulationDensity)],
    ["FLUID_DENSITY", fixed(values.fluidDensity)],
    ["MATERIAL_NUM", fixed(values.materialNumber)],
    ["MATERIAL_NAME", cleanText(values.materialName)],
    ["NAME", cleanText(values.name)],
    ["LINE_ID", cleanText(values.lineId)],
    ["FROM_NAME", fromName],
    ["TO_NAME", toName],
    ["FROM_GLOBAL_X", globalFixed(from.position.x)],
    ["FROM_GLOBAL_Y", globalFixed(from.position.y)],
    ["FROM_GLOBAL_Z", globalFixed(from.position.z)],
    ["TO_GLOBAL_X", globalFixed(to.position.x)],
    ["TO_GLOBAL_Y", globalFixed(to.position.y)],
    ["TO_GLOBAL_Z", globalFixed(to.position.z)],
    ["GLOBAL_COORD_BASIS_NODE", from.inputXmlNodeIds[0]],
    ["SOURCE_TYPE", edge.sourceTypes[0]],
    ...topologyElementTraceAttributes(edge, from, to)
  );
  return attributes;
}
function serialize(attributes) {
  return attributes.map(([name, value]) => `${name}="${xmlAttribute(value)}"`).join(" ");
}
function restraintXml(restraint, support, index) {
  const type = cleanText(restraint.type || restraint.kind).toUpperCase();
  const code = RESTRAINT_CODE_MAP[type];
  if (!Number.isFinite(code)) throw new Error(`Unsupported CAESAR restraint type ${type || "(blank)"}.`);
  const cosine = type === "+X" ? [1, 0, 0] : type === "+Y" ? [0, 1, 0] : type === "+Z" ? [0, 0, 1] : [0, 0, 0];
  const attributes = [
    ["ID", `RESTRAINT:${support.id}:${index + 1}`],
    ["NUM", fixed(index + 1)],
    ["NODE", fixed(support.inputXmlNodeId)],
    ["TYPE", fixed(code)],
    ["STIFFNESS", fixed(restraint.stiffness)],
    ["GAP", fixed(restraint.gap)],
    ["FRIC_COEF", fixed(restraint.friction)],
    ["CNODE", SENTINEL],
    ["XCOSINE", fixed(cosine[0])],
    ["YCOSINE", fixed(cosine[1])],
    ["ZCOSINE", fixed(cosine[2])],
    ["TAG", support.tag],
    ["GUID", ""],
    ...topologyRestraintTraceAttributes(support)
  ];
  return `      <RESTRAINT ${serialize(attributes)}/>`;
}
function supportIndex(canonical) {
  const supportsByEdge = /* @__PURE__ */ new Map(), namesByNode = /* @__PURE__ */ new Map();
  for (const support of canonical.supports) {
    namesByNode.set(support.nodeId, support.tag);
    const incident = canonical.edges.filter((edge2) => (edge2.fromNodeId === support.nodeId || edge2.toNodeId === support.nodeId) && support.sourceEntityIds.some((id) => edge2.sourceEntityIds.includes(id)));
    const edge = incident.find((row) => row.toNodeId === support.nodeId) ?? incident[0];
    if (!edge) throw new Error(`Support ${support.id} has no incident InputXML element.`);
    supportsByEdge.set(edge.id, [...supportsByEdge.get(edge.id) ?? [], support]);
  }
  return { supportsByEdge, namesByNode };
}
function elementXml(edge, nodes, values, supports, rigids, names) {
  const from = nodes.get(edge.fromNodeId), to = nodes.get(edge.toNodeId);
  if (!from || !to) throw new Error(`InputXML edge ${edge.id} references a missing canonical node.`);
  const attributes = nativeAttributes(edge, from, to, values, names.get(from.id) ?? "", names.get(to.id) ?? "");
  const children = [];
  if (rigids.length) {
    const weight = rigids.reduce((sum, rigid) => sum + Number(rigid.weightKg || 0), 0);
    const types = [...new Set(rigids.map((rigid) => cleanText(rigid.componentType)).filter(Boolean))];
    children.push(`      <RIGID ${serialize([
      ["ID", `RIGID:${edge.id}`],
      ["WEIGHT", fixed(weight)],
      ["TYPE", types.join("+")],
      ["SOURCE_BODY_COUNT", rigids.length],
      ...topologyRigidTraceAttributes(edge, rigids)
    ])}/>`);
  }
  for (const support of supports) for (const [index, restraint] of support.restraints.entries()) children.push(restraintXml(restraint, support, index));
  return `    <PIPINGELEMENT ${serialize(attributes)}>
${children.join("\n")}${children.length ? "\n" : ""}    </PIPINGELEMENT>`;
}
function buildTopologyInputXml(canonical, engineering, options) {
  if (!cleanText(canonical.canonicalTopologyHash)) throw new Error("Topology InputXML requires a hashed CanonicalTopology.v1 snapshot.");
  const nodes = nodeMap(canonical), supportData = supportIndex(canonical);
  const engineeringByEdge = buildEdgeEngineeringValues(canonical.edges, engineering.recordBySourceEntityId);
  const rigidByEdge = /* @__PURE__ */ new Map();
  for (const rigid of canonical.rigids) rigidByEdge.set(rigid.edgeId, [...rigidByEdge.get(rigid.edgeId) ?? [], rigid]);
  const elements = canonical.edges.map((edge) => elementXml(
    edge,
    nodes,
    engineeringByEdge.get(edge.id),
    supportData.supportsByEdge.get(edge.id) ?? [],
    rigidByEdge.get(edge.id) ?? [],
    supportData.namesByNode
  )).join("\n");
  const restraintCount = canonical.supports.reduce((sum, support) => sum + support.restraints.length, 0);
  const bendCount = canonical.edges.filter((edge) => edge.segmentRole.includes("ELBO/BEND_RUN_IN")).length;
  const modelAttributes = [
    ["JOBNAME", options.jobName],
    ["NUMELT", canonical.edges.length],
    ["NUMNOZ", 0],
    ["NOHGRS", 0],
    ["NUMBEND", bendCount],
    ["NUMRIGID", rigidByEdge.size],
    ["NUMEXPJNT", 0],
    ["NUMREST", restraintCount],
    ["NUMFORCMNT", 0],
    ["NUMUNFLOAD", 0],
    ["NUMWIND", 0],
    ["NUMELEOFF", 0],
    ["NUMALLOW", 0],
    ["NUMISECT", 0],
    ["NORTH_X", 0],
    ["NORTH_Y", 1],
    ["NORTH_Z", 0],
    ["CANONICAL_TOPOLOGY_HASH", canonical.canonicalTopologyHash],
    ["TOPOLOGY_TRACE_LEDGER_HASH", cleanText(options.topologyTraceLedgerHash)]
  ];
  if (cleanText(options.topologyEditDraftHash)) modelAttributes.push(["TOPOLOGY_EDIT_DRAFT_HASH", cleanText(options.topologyEditDraftHash)]);
  if (cleanText(options.topologyEditLedgerHash)) modelAttributes.push(["TOPOLOGY_EDIT_LEDGER_HASH", cleanText(options.topologyEditLedgerHash)]);
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<CAESARII xmlns="COADE" VERSION="11.00" XML_TYPE="Input">',
    `  <PIPINGMODEL xmlns="" ${serialize(modelAttributes)}>`,
    elements,
    "  </PIPINGMODEL>",
    "</CAESARII>",
    ""
  ].join("\n");
}
var _test6 = Object.freeze({ finiteNumber: finiteNumber4, fixed, globalFixed, physicalWall, nodeMap, engineeringRecord, engineeringValues, nativeAttributes, serialize, supportIndex, elementXml });

// tabs/model-converters/converters/component-topology/topology-deterministic-hash.js
var DEFAULT_OMIT_KEYS = Object.freeze([
  "canonicalTopologyHash",
  "topologyTraceLedgerHash",
  "svgSceneHash",
  "parsedInputXmlTopologyHash",
  "topologyParityReportHash"
]);
function canonicalValue(value, omitKeys) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError(`Cannot hash non-finite number: ${value}.`);
    return Object.is(value, -0) ? 0 : value;
  }
  if (Array.isArray(value)) return value.map((item) => canonicalValue(item, omitKeys));
  if (value && typeof value === "object") {
    const record2 = (
      /** @type {Record<string, unknown>} */
      value
    );
    const result = {};
    for (const key of Object.keys(record2).sort()) {
      if (omitKeys.has(key) || record2[key] === void 0) continue;
      result[key] = canonicalValue(record2[key], omitKeys);
    }
    return result;
  }
  throw new TypeError(`Unsupported value in deterministic topology hash: ${typeof value}.`);
}
function canonicalJson(value, options = {}) {
  const omitKeys = new Set(options.omitKeys ?? DEFAULT_OMIT_KEYS);
  return JSON.stringify(canonicalValue(value, omitKeys));
}
function hashText(text5) {
  const bytes = new TextEncoder().encode(String(text5 ?? ""));
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;
  for (const byte of bytes) {
    hash ^= BigInt(byte);
    hash = hash * prime & mask;
  }
  return `fnv1a64:${hash.toString(16).padStart(16, "0")}`;
}
function deterministicHash(value, options = {}) {
  return hashText(canonicalJson(value, options));
}
function stampArtifactHash(artifact, fieldName) {
  if (!fieldName) throw new TypeError("A topology artifact hash field name is required.");
  const hash = deterministicHash(artifact, { omitKeys: [...DEFAULT_OMIT_KEYS, fieldName] });
  return Object.freeze({ ...artifact, [fieldName]: hash });
}
var TOPOLOGY_HASH_ALGORITHM = "fnv1a64-canonical-json-v1";
var _test7 = Object.freeze({ canonicalValue, DEFAULT_OMIT_KEYS });

// tabs/model-converters/converters/component-topology/topology-edit-contract.js
var TOPOLOGY_EDIT_COMMAND_TYPES = Object.freeze([
  "MOVE_NODE",
  "MERGE_NODES",
  "BRIDGE_GAP",
  "ADD_STRAIGHT_ELEMENT",
  "SPLIT_EDGE",
  "DISCONNECT_ENDPOINT",
  "DELETE_EDGE"
]);
var EDIT_DRAFT_HASH_KEYS = Object.freeze(["topologyEditDraftHash"]);
function editError(code, message) {
  const error = (
    /** @type {Error & {code:string}} */
    new Error(message)
  );
  error.name = "TopologyEditCommandError";
  error.code = code;
  return error;
}
function finiteNumber5(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw editError("INVALID_NUMBER", `${label} must be a finite number.`);
  return number;
}
function point(value, label) {
  if (!value || typeof value !== "object") throw editError("INVALID_POINT", `${label} must contain x, y, and z.`);
  const record2 = (
    /** @type {Record<string, unknown>} */
    value
  );
  return {
    x: finiteNumber5(record2.x, `${label}.x`),
    y: finiteNumber5(record2.y, `${label}.y`),
    z: finiteNumber5(record2.z, `${label}.z`)
  };
}
function requiredText(value, label) {
  const text5 = String(value ?? "").trim();
  if (!text5) throw editError("MISSING_VALUE", `${label} is required.`);
  return text5;
}
function textIds(values) {
  return uniqueText(values.map((value) => String(value ?? "").trim()).filter(Boolean));
}
function safeIdPart(value) {
  return value.replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "COMMAND";
}
function finalizeDraft(draft) {
  const withoutHash = { ...draft };
  delete withoutHash.topologyEditDraftHash;
  return Object.freeze({
    ...withoutHash,
    commands: Object.freeze([.../** @type {Record<string, unknown>[]} */
    withoutHash.commands]),
    redoCommands: Object.freeze([.../** @type {Record<string, unknown>[]} */
    withoutHash.redoCommands]),
    topologyEditDraftHash: deterministicHash(withoutHash, { omitKeys: [...EDIT_DRAFT_HASH_KEYS] })
  });
}
function assertCanonical(canonical) {
  if (canonical?.schema !== "CanonicalTopology.v1") throw new TypeError("Topology editing requires CanonicalTopology.v1.");
  if (!String(canonical.canonicalTopologyHash ?? "").trim()) {
    throw new TypeError("Topology editing requires a hashed canonical topology snapshot.");
  }
}
function assertDraft(draft) {
  if (draft?.schema !== "TopologyEditDraft.v1") throw new TypeError("Expected TopologyEditDraft.v1.");
  if (!Array.isArray(draft.commands) || !Array.isArray(draft.redoCommands)) {
    throw new TypeError("TopologyEditDraft.v1 commands and redoCommands must be arrays.");
  }
}
function createTopologyEditDraft(canonical, settings) {
  assertCanonical(canonical);
  if (!settings || typeof settings !== "object") throw new TypeError("Topology edit draft settings are required.");
  return finalizeDraft({
    schema: "TopologyEditDraft.v1",
    baseCanonicalTopologyHash: canonical.canonicalTopologyHash,
    commands: [],
    redoCommands: [],
    engineeringOverrides: {},
    settings: structuredClone(settings),
    nextCommandSequence: 1
  });
}
function appendTopologyEditCommand(draft, type, payload) {
  assertDraft(draft);
  const commandType = requiredText(type, "Command type").toUpperCase();
  if (!TOPOLOGY_EDIT_COMMAND_TYPES.includes(commandType)) {
    throw editError("UNSUPPORTED_COMMAND", `Unsupported topology edit command ${commandType}.`);
  }
  if (!payload || typeof payload !== "object") throw editError("INVALID_PAYLOAD", `${commandType} requires a payload object.`);
  const sequence = finiteNumber5(draft.nextCommandSequence, "nextCommandSequence");
  const command = Object.freeze({
    schema: "TopologyEditCommand.v1",
    id: `EC-${String(sequence).padStart(6, "0")}`,
    type: commandType,
    payload: structuredClone(payload)
  });
  return finalizeDraft({
    ...structuredClone(draft),
    commands: [...draft.commands, command],
    redoCommands: [],
    nextCommandSequence: sequence + 1
  });
}
function undoTopologyEditCommand(draft) {
  assertDraft(draft);
  if (!draft.commands.length) return finalizeDraft(structuredClone(draft));
  const commands = [...draft.commands];
  const command = commands.pop();
  return finalizeDraft({ ...structuredClone(draft), commands, redoCommands: [command, ...draft.redoCommands] });
}
function redoTopologyEditCommand(draft) {
  assertDraft(draft);
  if (!draft.redoCommands.length) return finalizeDraft(structuredClone(draft));
  const [command, ...redoCommands] = draft.redoCommands;
  return finalizeDraft({ ...structuredClone(draft), commands: [...draft.commands, command], redoCommands });
}
var _test8 = Object.freeze({ finalizeDraft });

// tabs/model-converters/converters/component-topology/topology-edit-state.js
function mutableCanonical(canonical) {
  const clone = structuredClone(canonical);
  delete clone.canonicalTopologyHash;
  delete clone.topologyEditDraftHash;
  delete clone.baseCanonicalTopologyHash;
  delete clone.editCommandCount;
  return clone;
}
function nodeById(state, nodeId) {
  const node = state.nodes.find((row) => row.id === nodeId);
  if (!node) throw editError("NODE_NOT_FOUND", `Canonical node ${nodeId} does not exist in the draft.`);
  return node;
}
function edgeById(state, edgeId) {
  const edge = state.edges.find((row) => row.id === edgeId);
  if (!edge) throw editError("EDGE_NOT_FOUND", `Canonical edge ${edgeId} does not exist in the draft.`);
  return edge;
}
function incidentEdges(state, nodeId) {
  return state.edges.filter((edge) => edge.fromNodeId === nodeId || edge.toNodeId === nodeId);
}
function synchronizeNodeDependents(state, nodeId, position) {
  for (const collectionName of ["junctions", "boundaries", "supports"]) {
    for (const row of state[collectionName]) {
      if (row.nodeId !== nodeId) continue;
      row.position = { ...position };
      if (collectionName === "supports") {
        row.attachmentPosition = { ...position };
        row.inputXmlNodeId = nodeById(state, nodeId).inputXmlNodeIds[0];
      }
    }
  }
}
function nextInputXmlNodeId(state, contextEdge) {
  const contextNode = nodeById(state, contextEdge.fromNodeId);
  const contextNumber = finiteNumber5(contextNode.inputXmlNodeIds[0], `InputXML node for ${contextNode.id}`);
  const namespace = Math.floor(contextNumber / 1e4) * 1e4;
  const used = new Set(state.nodes.flatMap((node) => node.inputXmlNodeIds ?? []).map((value) => Number(value)));
  const namespaceValues = [...used].filter((value) => value >= namespace && value < namespace + 1e4);
  let candidate = Math.max(namespace, ...namespaceValues) + 10;
  candidate = Math.ceil(candidate / 10) * 10;
  while (used.has(candidate)) candidate += 10;
  if (candidate >= namespace + 1e4) throw editError("NODE_NAMESPACE_EXHAUSTED", `CAESAR node namespace ${namespace} has no unused node number.`);
  return String(candidate);
}
function inheritedEdge(context, id, inputId, fromNodeId, toNodeId, operation, commandId) {
  return {
    ...structuredClone(context),
    id,
    inputXmlElementIds: [inputId],
    fromNodeId,
    toNodeId,
    segmentRole: operation,
    topologyOperation: operation,
    projectionCardinality: "EDIT_ONE_TO_ONE",
    projectionMergeAuthority: "",
    mergeSourceEntityIds: [],
    connectionAuthority: `TOPOLOGY_EDIT:${commandId}/CONTEXT:${context.id}`,
    connectionResidual: 0,
    engineeringAuthorityEdgeId: context.engineeringAuthorityEdgeId ?? context.id,
    editAncestry: textIds([...context.editAncestry ?? [], context.id, commandId])
  };
}
function refreshDerivedTopology(state) {
  const nodeIndex = new Map(state.nodes.map((node) => [node.id, node]));
  const degree = /* @__PURE__ */ new Map();
  for (const edge of state.edges) {
    degree.set(edge.fromNodeId, (degree.get(edge.fromNodeId) ?? 0) + 1);
    degree.set(edge.toNodeId, (degree.get(edge.toNodeId) ?? 0) + 1);
  }
  for (const junction of state.junctions) {
    const node = nodeIndex.get(junction.nodeId);
    if (node) junction.position = { ...node.position };
    junction.expectedDegree = degree.get(junction.nodeId) ?? 0;
    junction.participatingEdgeIds = incidentEdges(state, junction.nodeId).map((edge) => edge.id);
  }
  for (const boundary of state.boundaries) {
    const node = nodeIndex.get(boundary.nodeId);
    if (node) boundary.position = { ...node.position };
    boundary.participatingEdgeIds = incidentEdges(state, boundary.nodeId).map((edge) => edge.id);
  }
  for (const support of state.supports) {
    const node = nodeIndex.get(support.nodeId);
    if (!node) continue;
    support.position = { ...node.position };
    support.attachmentPosition = { ...node.position };
    support.inputXmlNodeId = node.inputXmlNodeIds[0];
  }
}

// tabs/model-converters/converters/component-topology/topology-edit-operations.js
function moveNode(state, payload) {
  const nodeId = requiredText(payload.nodeId, "MOVE_NODE nodeId");
  const node = nodeById(state, nodeId), before = { ...node.position };
  node.position = point(payload.position, "MOVE_NODE position");
  node.positionAuthority = `TOPOLOGY_EDIT:${nodeId}`;
  synchronizeNodeDependents(state, nodeId, node.position);
  return { targets: [nodeId], changed: [nodeId], created: [], removed: [], before, after: { ...node.position } };
}
function mergeNodeIdentity(target, source) {
  for (const field of ["sourcePortIds", "sourceEntityIds", "sourcePaths", "branchIds", "connectionAuthority"]) {
    target[field] = textIds([...target[field] ?? [], ...source[field] ?? []]);
  }
  target.connectionResidual = Math.max(Number(target.connectionResidual ?? 0), Number(source.connectionResidual ?? 0));
}
function mergeNodes(state, payload) {
  const sourceId = requiredText(payload.sourceNodeId, "MERGE_NODES sourceNodeId");
  const targetId = requiredText(payload.targetNodeId, "MERGE_NODES targetNodeId");
  if (sourceId === targetId) throw editError("IDENTICAL_NODES", "MERGE_NODES requires two different nodes.");
  const source = nodeById(state, sourceId), target = nodeById(state, targetId);
  if (state.edges.some((edge) => edge.fromNodeId === sourceId && edge.toNodeId === targetId || edge.fromNodeId === targetId && edge.toNodeId === sourceId)) throw editError("MERGE_WOULD_COLLAPSE_EDGE", `Merging ${sourceId} into ${targetId} would collapse an existing element.`);
  const rewired = [];
  for (const edge of state.edges) {
    if (edge.fromNodeId === sourceId) {
      edge.fromNodeId = targetId;
      rewired.push(edge.id);
    }
    if (edge.toNodeId === sourceId) {
      edge.toNodeId = targetId;
      rewired.push(edge.id);
    }
  }
  for (const collectionName of ["junctions", "boundaries", "supports"]) {
    for (const row of state[collectionName]) if (row.nodeId === sourceId) row.nodeId = targetId;
  }
  mergeNodeIdentity(target, source);
  state.nodes = state.nodes.filter((node) => node.id !== sourceId);
  synchronizeNodeDependents(state, targetId, target.position);
  return {
    targets: [sourceId, targetId],
    changed: textIds([targetId, ...rewired]),
    created: [],
    removed: [sourceId],
    before: { sourcePosition: source.position, targetPosition: target.position },
    after: { retainedNodeId: targetId }
  };
}
function createContextEdge(state, command, fromNodeId, toNodeId, context) {
  nodeById(state, fromNodeId);
  nodeById(state, toNodeId);
  if (fromNodeId === toNodeId) throw editError("SELF_EDGE", `${command.type} cannot connect a node to itself.`);
  const duplicate = state.edges.find((edge2) => edge2.fromNodeId === fromNodeId && edge2.toNodeId === toNodeId || edge2.fromNodeId === toNodeId && edge2.toNodeId === fromNodeId);
  if (duplicate) throw editError("DUPLICATE_EDGE", `${command.type} duplicates canonical edge ${duplicate.id}.`);
  const idPart = safeIdPart(command.id), edgeId = `EDIT-CE-${idPart}`;
  const operation = command.type === "BRIDGE_GAP" ? "EDIT_BRIDGE_GAP" : "EDIT_ADD_STRAIGHT_ELEMENT";
  const edge = inheritedEdge(context, edgeId, `EDIT-PE-${idPart}`, fromNodeId, toNodeId, operation, command.id);
  state.edges.push(edge);
  return {
    targets: textIds([fromNodeId, toNodeId, context.id]),
    changed: [],
    created: [edgeId],
    removed: [],
    before: null,
    after: { edgeId, fromNodeId, toNodeId, engineeringAuthorityEdgeId: edge.engineeringAuthorityEdgeId }
  };
}
function bridgeGap(state, command) {
  const payload = (
    /** @type {Record<string, unknown>} */
    command.payload
  );
  const context = edgeById(state, requiredText(payload.contextEdgeId, "BRIDGE_GAP contextEdgeId"));
  return createContextEdge(
    state,
    command,
    requiredText(payload.fromNodeId, "BRIDGE_GAP fromNodeId"),
    requiredText(payload.toNodeId, "BRIDGE_GAP toNodeId"),
    context
  );
}
function addStraightElement(state, command) {
  const payload = (
    /** @type {Record<string, unknown>} */
    command.payload
  );
  const fromNodeId = requiredText(payload.fromNodeId, "ADD_STRAIGHT_ELEMENT fromNodeId");
  const from = nodeById(state, fromNodeId);
  const context = edgeById(state, requiredText(payload.contextEdgeId, "ADD_STRAIGHT_ELEMENT contextEdgeId"));
  let toNodeId = String(payload.toNodeId ?? "").trim(), newNodeId = "";
  if (!toNodeId) {
    const idPart = safeIdPart(command.id);
    const newNode = {
      ...structuredClone(from),
      id: `EDIT-CN-${idPart}`,
      position: point(payload.toPosition, "ADD_STRAIGHT_ELEMENT toPosition"),
      inputXmlNodeIds: [nextInputXmlNodeId(state, context)],
      sourcePortIds: [`EDIT-PORT:${command.id}`],
      positionAuthority: `TOPOLOGY_EDIT:${command.id}`,
      connectionAuthority: [`TOPOLOGY_EDIT:${command.id}`],
      connectionResidual: 0,
      editAncestry: [command.id, context.id]
    };
    if (state.nodes.some((node) => node.id === newNode.id)) throw editError("DUPLICATE_EDIT_ID", `Edit node ${newNode.id} already exists.`);
    state.nodes.push(newNode);
    toNodeId = newNode.id;
    newNodeId = newNode.id;
  }
  const result = createContextEdge(state, command, fromNodeId, toNodeId, context);
  return { ...result, created: textIds([newNodeId, ...result.created]) };
}
function interpolate(from, to, fraction) {
  return { x: from.x + (to.x - from.x) * fraction, y: from.y + (to.y - from.y) * fraction, z: from.z + (to.z - from.z) * fraction };
}
function splitFraction(payload, from, to) {
  const length2 = pointDistance(from.position, to.position);
  if (length2 <= 0) throw editError("ZERO_LENGTH_EDGE", "Cannot split a zero-length edge.");
  if (payload.fraction !== void 0) return finiteNumber5(payload.fraction, "SPLIT_EDGE fraction");
  if (payload.distanceMm !== void 0) return finiteNumber5(payload.distanceMm, "SPLIT_EDGE distanceMm") / length2;
  if (payload.position === void 0) throw editError("MISSING_SPLIT_LOCATION", "SPLIT_EDGE requires fraction, distanceMm, or position.");
  const requested = point(payload.position, "SPLIT_EDGE position");
  const vector = { x: to.position.x - from.position.x, y: to.position.y - from.position.y, z: to.position.z - from.position.z };
  const offset = { x: requested.x - from.position.x, y: requested.y - from.position.y, z: requested.z - from.position.z };
  const denominator = vector.x ** 2 + vector.y ** 2 + vector.z ** 2;
  const fraction = (offset.x * vector.x + offset.y * vector.y + offset.z * vector.z) / denominator;
  if (pointDistance(requested, interpolate(from.position, to.position, fraction)) > Number(payload.toleranceMm ?? 0.1)) {
    throw editError("SPLIT_POSITION_OFF_EDGE", "SPLIT_EDGE position is not on the selected edge within tolerance.");
  }
  return fraction;
}
function splitEdge(state, command) {
  const payload = (
    /** @type {Record<string, unknown>} */
    command.payload
  );
  const edgeId = requiredText(payload.edgeId, "SPLIT_EDGE edgeId"), edge = edgeById(state, edgeId);
  const from = nodeById(state, edge.fromNodeId), to = nodeById(state, edge.toNodeId);
  const fraction = splitFraction(payload, from, to);
  if (!(fraction > 0 && fraction < 1)) throw editError("INVALID_SPLIT_FRACTION", "SPLIT_EDGE location must be strictly inside the selected edge.");
  const idPart = safeIdPart(command.id), nodeId = `EDIT-CN-${idPart}`, secondEdgeId = `EDIT-CE-${idPart}`;
  const splitNode = {
    ...structuredClone(from),
    id: nodeId,
    position: interpolate(from.position, to.position, fraction),
    inputXmlNodeIds: [nextInputXmlNodeId(state, edge)],
    sourcePortIds: [`EDIT-PORT:${command.id}`],
    positionAuthority: `TOPOLOGY_EDIT:${command.id}/SPLIT:${edge.id}`,
    connectionAuthority: [`TOPOLOGY_EDIT:${command.id}`],
    connectionResidual: 0,
    editAncestry: textIds([...edge.editAncestry ?? [], edge.id, command.id])
  };
  const originalToNodeId = edge.toNodeId;
  edge.toNodeId = nodeId;
  edge.topologyOperation = "EDIT_SPLIT_EDGE_FIRST";
  edge.connectionAuthority = `TOPOLOGY_EDIT:${command.id}/SPLIT_FIRST:${edge.id}`;
  edge.engineeringAuthorityEdgeId = edge.engineeringAuthorityEdgeId ?? edge.id;
  edge.editAncestry = textIds([...edge.editAncestry ?? [], edge.id, command.id]);
  const second = inheritedEdge(edge, secondEdgeId, `EDIT-PE-${idPart}`, nodeId, originalToNodeId, "EDIT_SPLIT_EDGE_SECOND", command.id);
  state.nodes.push(splitNode);
  state.edges.push(second);
  for (const rigid of state.rigids) if (rigid.edgeId === edgeId && String(rigid.inputXmlNodeId ?? "") !== String(from.inputXmlNodeIds[0])) {
    rigid.edgeId = secondEdgeId;
    rigid.inputXmlElementId = second.inputXmlElementIds[0];
  }
  return { targets: [edgeId], changed: [edgeId], created: [nodeId, secondEdgeId], removed: [], before: { fromNodeId: from.id, toNodeId: originalToNodeId }, after: { splitNodeId: nodeId, secondEdgeId, fraction } };
}
function disconnectEndpoint(state, command) {
  const payload = (
    /** @type {Record<string, unknown>} */
    command.payload
  );
  const edgeId = requiredText(payload.edgeId, "DISCONNECT_ENDPOINT edgeId");
  const endpoint = requiredText(payload.endpoint, "DISCONNECT_ENDPOINT endpoint").toUpperCase();
  if (!["FROM", "TO"].includes(endpoint)) throw editError("INVALID_ENDPOINT", "DISCONNECT_ENDPOINT endpoint must be FROM or TO.");
  const edge = edgeById(state, edgeId), field = endpoint === "FROM" ? "fromNodeId" : "toNodeId";
  const originalNode = nodeById(state, edge[field]);
  if (incidentEdges(state, originalNode.id).length < 2) throw editError("ENDPOINT_NOT_SHARED", `Node ${originalNode.id} is not shared by multiple edges.`);
  const clone = {
    ...structuredClone(originalNode),
    id: `EDIT-CN-${safeIdPart(command.id)}`,
    inputXmlNodeIds: [nextInputXmlNodeId(state, edge)],
    sourcePortIds: [`EDIT-PORT:${command.id}`],
    positionAuthority: `TOPOLOGY_EDIT:${command.id}/DISCONNECT:${originalNode.id}`,
    connectionAuthority: [`TOPOLOGY_EDIT:${command.id}`],
    connectionResidual: 0,
    editAncestry: textIds([...originalNode.editAncestry ?? [], originalNode.id, command.id])
  };
  state.nodes.push(clone);
  edge[field] = clone.id;
  edge.topologyOperation = "EDIT_DISCONNECT_ENDPOINT";
  edge.connectionAuthority = `TOPOLOGY_EDIT:${command.id}/DISCONNECT:${originalNode.id}`;
  edge.editAncestry = textIds([...edge.editAncestry ?? [], edge.id, command.id]);
  return { targets: [edgeId, originalNode.id], changed: [edgeId], created: [clone.id], removed: [], before: { endpoint, nodeId: originalNode.id }, after: { endpoint, nodeId: clone.id } };
}
function deleteEdge(state, payload) {
  const edgeId = requiredText(payload.edgeId, "DELETE_EDGE edgeId"), edge = edgeById(state, edgeId);
  const rigids = state.rigids.filter((rigid) => rigid.edgeId === edgeId);
  if (rigids.length) throw editError("EDGE_HAS_RIGIDS", `Cannot delete ${edgeId}; ${rigids.length} rigid bodies are attached. Reassign them first.`);
  const dependentNodeIds = new Set([...state.supports, ...state.junctions, ...state.boundaries].map((row) => row.nodeId));
  for (const nodeId of [edge.fromNodeId, edge.toNodeId]) if (incidentEdges(state, nodeId).length <= 1) {
    const dependency = dependentNodeIds.has(nodeId) ? " with attached engineering or junction evidence" : "";
    throw editError("DELETE_WOULD_ORPHAN_NODE", `Cannot delete ${edgeId}; endpoint ${nodeId}${dependency} would become an orphan. Bridge or merge it in the same topology transaction first.`);
  }
  state.edges = state.edges.filter((row) => row.id !== edgeId);
  return { targets: [edgeId], changed: [], created: [], removed: [edgeId], removedSourceEntityIds: textIds(edge.sourceEntityIds ?? []), before: structuredClone(edge), after: null };
}
function applyTopologyEditCommand(state, command) {
  if (command?.schema !== "TopologyEditCommand.v1") throw editError("INVALID_COMMAND_SCHEMA", "Expected TopologyEditCommand.v1.");
  const payload = (
    /** @type {Record<string, unknown>} */
    command.payload
  );
  if (command.type === "MOVE_NODE") return moveNode(state, payload);
  if (command.type === "MERGE_NODES") return mergeNodes(state, payload);
  if (command.type === "BRIDGE_GAP") return bridgeGap(state, command);
  if (command.type === "ADD_STRAIGHT_ELEMENT") return addStraightElement(state, command);
  if (command.type === "SPLIT_EDGE") return splitEdge(state, command);
  if (command.type === "DISCONNECT_ENDPOINT") return disconnectEndpoint(state, command);
  if (command.type === "DELETE_EDGE") return deleteEdge(state, payload);
  throw editError("UNSUPPORTED_COMMAND", `Unsupported topology edit command ${command.type}.`);
}

// tabs/model-converters/converters/component-topology/topology-geometry-diagnostics.js
var TOPOLOGY_GEOMETRY_ISSUE_STYLES = Object.freeze({
  BRANCH_DISCONNECTED: { color: "#2563eb", icon: "unlink", canvasFix: "BRIDGE_GAP_OR_MERGE_NODES" },
  ISOLATED_ELEMENT: { color: "#1d4ed8", icon: "plug-zap", canvasFix: "BRIDGE_GAP_OR_DELETE_EDGE" },
  SHORT_ELEMENT: { color: "#f97316", icon: "ruler", canvasFix: "MERGE_NODES_OR_DELETE_EDGE" },
  CENTERLINE_CLASH: { color: "#dc2626", icon: "collision", canvasFix: "MOVE_NODE_OR_SPLIT_EDGE" },
  OVERLAPPING_ELEMENTS: { color: "#be123c", icon: "layers", canvasFix: "DELETE_EDGE_OR_DISCONNECT_ENDPOINT" },
  SNAP_GAP: { color: "#0ea5e9", icon: "magnet", canvasFix: "MERGE_NODES_OR_BRIDGE_GAP" },
  PIPE_BACKTRACK: { color: "#7c3aed", icon: "undo-2", canvasFix: "MOVE_NODE_OR_DELETE_EDGE" },
  RIGHT_ANGLE_WITHOUT_BEND: { color: "#eab308", icon: "corner-down-right", canvasFix: "" },
  BEND_WITHOUT_DIRECTION_CHANGE: { color: "#a855f7", icon: "corner-up-right", canvasFix: "" },
  UNDEFINED_KINK: { color: "#d97706", icon: "git-commit-horizontal", canvasFix: "MOVE_NODE" },
  MULTIWAY_WITHOUT_JUNCTION: { color: "#db2777", icon: "git-fork", canvasFix: "" },
  JUNCTION_WITHOUT_MULTIWAY: { color: "#c026d3", icon: "split", canvasFix: "" },
  BEND_AT_JUNCTION: { color: "#9333ea", icon: "triangle-alert", canvasFix: "" },
  ORPHAN_EDGE_ENDPOINT: { color: "#991b1b", icon: "circle-off", canvasFix: "DELETE_EDGE_OR_ADD_STRAIGHT_ELEMENT" },
  ORPHAN_NODE: { color: "#b91c1c", icon: "circle-dot", canvasFix: "DELETE_OR_CONNECT" },
  ORIGIN_DEFAULTED: { color: "#475569", icon: "map-pin-off", canvasFix: "MOVE_NODE" }
});
function xyz(point3) {
  return [Number(point3.x), Number(point3.y), Number(point3.z)];
}
function subtract(left, right) {
  return left.map((value, index) => value - right[index]);
}
function dot(left, right) {
  return left.reduce((sum, value, index) => sum + value * right[index], 0);
}
function length(value) {
  return Math.hypot(...value);
}
function unit(value) {
  const size = length(value);
  return size > 1e-12 ? value.map((part) => part / size) : null;
}
function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}
function pointDistance2(left, right) {
  return length(subtract(left, right));
}
function angleDegrees(first, second) {
  const left = unit(first), right = unit(second);
  return left && right ? Math.acos(clamp(dot(left, right), -1, 1)) * (180 / Math.PI) : Number.NaN;
}
function segmentDistance(p1, q1, p2, q2) {
  const u = subtract(q1, p1), v = subtract(q2, p2), w = subtract(p1, p2);
  const a = dot(u, u), b = dot(u, v), c = dot(v, v), d = dot(u, w), e = dot(v, w), denominator = a * c - b * b;
  let sNumerator = denominator, sDenominator = denominator, tNumerator = denominator, tDenominator = denominator;
  if (denominator < 1e-12) {
    sNumerator = 0;
    sDenominator = 1;
    tNumerator = e;
    tDenominator = c;
  } else {
    sNumerator = b * e - c * d;
    tNumerator = a * e - b * d;
    if (sNumerator < 0) {
      sNumerator = 0;
      tNumerator = e;
      tDenominator = c;
    } else if (sNumerator > sDenominator) {
      sNumerator = sDenominator;
      tNumerator = e + b;
      tDenominator = c;
    }
  }
  if (tNumerator < 0) {
    tNumerator = 0;
    if (-d < 0) sNumerator = 0;
    else if (-d > a) sNumerator = sDenominator;
    else {
      sNumerator = -d;
      sDenominator = a;
    }
  } else if (tNumerator > tDenominator) {
    tNumerator = tDenominator;
    if (-d + b < 0) sNumerator = 0;
    else if (-d + b > a) sNumerator = sDenominator;
    else {
      sNumerator = -d + b;
      sDenominator = a;
    }
  }
  const sc = Math.abs(sNumerator) < 1e-12 ? 0 : sNumerator / sDenominator, tc = Math.abs(tNumerator) < 1e-12 ? 0 : tNumerator / tDenominator;
  return length(w.map((value, index) => value + sc * u[index] - tc * v[index]));
}
function overlapLength(left, right, tolerance) {
  const a = left.start, b = left.end, c = right.start, d = right.end, axis = subtract(b, a), axisLength = length(axis), direction = unit(axis);
  if (!direction || segmentDistance(a, b, c, d) > tolerance) return 0;
  const rightDirection = unit(subtract(d, c));
  if (!rightDirection || Math.abs(Math.abs(dot(direction, rightDirection)) - 1) > 1e-6) return 0;
  const cOffset = dot(subtract(c, a), direction), dOffset = dot(subtract(d, a), direction);
  return Math.max(0, Math.min(axisLength, Math.max(cOffset, dOffset)) - Math.max(0, Math.min(cOffset, dOffset)));
}
function hasBendEvidence(edge) {
  return /BEND|ELBO/.test(`${cleanText(edge.segmentRole)} ${edge.sourceTypes?.join(" ")}`.toUpperCase());
}
function hasBendPairEvidence(edges) {
  for (let leftIndex = 0; leftIndex < edges.length; leftIndex += 1) for (let rightIndex = leftIndex + 1; rightIndex < edges.length; rightIndex += 1) {
    const left = edges[leftIndex], right = edges[rightIndex], roles = `${cleanText(left.segmentRole)}|${cleanText(right.segmentRole)}`.toUpperCase();
    if (!roles.includes("RUN_IN") || !roles.includes("RUN_OUT")) continue;
    const excluded = new Set([...left.branchIds ?? [], ...right.branchIds ?? []].map(cleanText));
    const rightSources = new Set((right.sourceEntityIds ?? []).map(cleanText).filter((id) => !excluded.has(id)));
    if ((left.sourceEntityIds ?? []).map(cleanText).some((id) => !excluded.has(id) && rightSources.has(id))) return true;
  }
  return false;
}
function finding(code, message, objectIds, details) {
  const style = TOPOLOGY_GEOMETRY_ISSUE_STYLES[code];
  return Object.freeze({ code, severity: "WARNING", blocking: false, message, objectIds: Object.freeze([...objectIds]), details: Object.freeze({ ...details }), color: style.color, icon: style.icon, canvasFix: style.canvasFix });
}
function edgeComponents(edges) {
  const byNode = /* @__PURE__ */ new Map();
  for (const edge of edges) for (const nodeId of [edge.fromNodeId, edge.toNodeId]) byNode.set(nodeId, [...byNode.get(nodeId) ?? [], edge]);
  const remaining = new Set(edges), components = [];
  while (remaining.size) {
    const first = remaining.values().next().value, stack = [first], rows = [];
    remaining.delete(first);
    while (stack.length) {
      const edge = stack.pop();
      rows.push(edge);
      for (const nodeId of [edge.fromNodeId, edge.toNodeId]) for (const next of byNode.get(nodeId) ?? []) if (remaining.delete(next)) stack.push(next);
    }
    components.push(rows);
  }
  return components;
}
function candidatePairs(geometry, tolerance) {
  if (geometry.length < 2) return [];
  const ranges = [0, 1, 2].map((axis) => Math.max(...geometry.map((row) => row.max[axis])) - Math.min(...geometry.map((row) => row.min[axis]))), sweepAxis = ranges.indexOf(Math.max(...ranges));
  const sorted = [...geometry].sort((left, right) => left.min[sweepAxis] - right.min[sweepAxis]), pairs = [];
  for (let leftIndex = 0; leftIndex < sorted.length; leftIndex += 1) for (let rightIndex = leftIndex + 1; rightIndex < sorted.length; rightIndex += 1) {
    const left = sorted[leftIndex], right = sorted[rightIndex];
    if (right.min[sweepAxis] > left.max[sweepAxis] + tolerance) break;
    if ([0, 1, 2].every((axis) => right.min[axis] <= left.max[axis] + tolerance && right.max[axis] >= left.min[axis] - tolerance)) pairs.push([left, right]);
  }
  return pairs;
}
function validateTopologyGeometry(canonical, options) {
  if (canonical?.schema !== "CanonicalTopology.v1") throw new TypeError("Geometry diagnostics require CanonicalTopology.v1.");
  for (const [key, value] of Object.entries(options)) if (!Number.isFinite(Number(value)) || Number(value) < 0) throw new TypeError(`Geometry diagnostic option ${key} must be a non-negative finite number.`);
  const findings = [], nodes = new Map(canonical.nodes.map((node) => [cleanText(node.id), node])), degree = /* @__PURE__ */ new Map(), incident = /* @__PURE__ */ new Map(), geometry = [];
  for (const edge of canonical.edges) {
    const from = nodes.get(cleanText(edge.fromNodeId)), to = nodes.get(cleanText(edge.toNodeId));
    if (!from || !to) {
      findings.push(finding("ORPHAN_EDGE_ENDPOINT", `Element ${edge.id} references a missing endpoint.`, [edge.id], {}));
      continue;
    }
    for (const nodeId of [edge.fromNodeId, edge.toNodeId]) {
      degree.set(nodeId, (degree.get(nodeId) ?? 0) + 1);
      incident.set(nodeId, [...incident.get(nodeId) ?? [], edge]);
    }
    const start = xyz(from.position), end = xyz(to.position), edgeLength = pointDistance2(start, end);
    if (edgeLength > options.toleranceMm && edgeLength < options.shortElementMm) findings.push(finding("SHORT_ELEMENT", `Element ${edge.id} is ${edgeLength.toFixed(3)} mm; threshold is ${options.shortElementMm} mm.`, [edge.id], { lengthMm: edgeLength }));
    geometry.push({ edge, start, end, min: start.map((value, axis) => Math.min(value, end[axis])), max: start.map((value, axis) => Math.max(value, end[axis])) });
  }
  for (const node of canonical.nodes) {
    const nodeId = cleanText(node.id), nodeDegree = degree.get(nodeId) ?? 0;
    if (!nodeDegree) findings.push(finding("ORPHAN_NODE", `Node ${nodeId} has no incident element.`, [nodeId], {}));
    const authority = cleanText(node.positionAuthority).toUpperCase(), atOrigin = length(xyz(node.position)) <= options.originToleranceMm;
    if (atOrigin && (!node.sourcePortIds?.length || /DEFAULT|UNKNOWN|MISSING/.test(authority))) findings.push(finding("ORIGIN_DEFAULTED", `Node ${nodeId} is at 0,0,0 without authoritative source-port geometry.`, [nodeId], { positionAuthority: node.positionAuthority }));
    const rows = incident.get(nodeId) ?? [], junction = canonical.junctions.find((row) => cleanText(row.nodeId) === nodeId), bendAtNode = hasBendPairEvidence(rows);
    if (rows.length === 2) {
      const vectors = rows.map((edge) => {
        const other = cleanText(edge.fromNodeId) === nodeId ? nodes.get(cleanText(edge.toNodeId)) : nodes.get(cleanText(edge.fromNodeId));
        return subtract(xyz(other.position), xyz(node.position));
      });
      const angle = angleDegrees(vectors[0], vectors[1]);
      if (angle <= options.angleToleranceDeg) findings.push(finding("PIPE_BACKTRACK", `Pipe reverses onto the same ray at ${nodeId} (${angle.toFixed(2)}\xB0).`, [nodeId, rows[0].id, rows[1].id], { angleDeg: angle }));
      else if (bendAtNode && Math.abs(180 - angle) <= options.angleToleranceDeg) findings.push(finding("BEND_WITHOUT_DIRECTION_CHANGE", `Bend evidence at ${nodeId} has no direction change (${angle.toFixed(2)}\xB0).`, [nodeId, ...rows.map((row) => row.id)], { angleDeg: angle }));
      else if (!bendAtNode && Math.abs(90 - angle) <= options.angleToleranceDeg) findings.push(finding("RIGHT_ANGLE_WITHOUT_BEND", `A ${angle.toFixed(2)}\xB0 direction change at ${nodeId} has no bend evidence.`, [nodeId, ...rows.map((row) => row.id)], { angleDeg: angle }));
      else if (!bendAtNode && Math.abs(180 - angle) > options.angleToleranceDeg) findings.push(finding("UNDEFINED_KINK", `Undefined ${angle.toFixed(2)}\xB0 kink at ${nodeId} has no bend evidence.`, [nodeId, ...rows.map((row) => row.id)], { angleDeg: angle }));
    }
    if (rows.length >= 3 && !junction) findings.push(finding("MULTIWAY_WITHOUT_JUNCTION", `${nodeId} has degree ${rows.length} but no TEE/OLET junction record.`, [nodeId, ...rows.map((row) => row.id)], { degree: rows.length }));
    if (junction && rows.length < 3) findings.push(finding("JUNCTION_WITHOUT_MULTIWAY", `${junction.kind} ${junction.id} is defined at degree-${rows.length} node ${nodeId}.`, [junction.id, nodeId], { degree: rows.length }));
    if (junction && bendAtNode) findings.push(finding("BEND_AT_JUNCTION", `Bend evidence and ${junction.kind} ${junction.id} share node ${nodeId}.`, [junction.id, nodeId, ...rows.filter(hasBendEvidence).map((row) => row.id)], {}));
  }
  const byBranch = /* @__PURE__ */ new Map();
  for (const edge of canonical.edges) for (const branchId of edge.branchIds ?? []) byBranch.set(branchId, [...byBranch.get(branchId) ?? [], edge]);
  for (const [branchId, edges] of byBranch) {
    const components = edgeComponents(edges);
    if (components.length > 1) for (const rows of components.slice(1)) findings.push(finding("BRANCH_DISCONNECTED", `Branch ${branchId} contains ${components.length} disconnected route components.`, rows.map((row) => row.id), { branchId, componentCount: components.length }));
    for (const edge of edges) if (edges.length > 1 && (degree.get(edge.fromNodeId) ?? 0) === 1 && (degree.get(edge.toNodeId) ?? 0) === 1) findings.push(finding("ISOLATED_ELEMENT", `Element ${edge.id} is isolated from the rest of branch ${branchId}.`, [edge.id], { branchId }));
  }
  for (const [left, right] of candidatePairs(geometry, options.snapToleranceMm)) {
    const leftNodes = [left.edge.fromNodeId, left.edge.toNodeId];
    if (leftNodes.includes(right.edge.fromNodeId) || leftNodes.includes(right.edge.toNodeId)) continue;
    const overlap = overlapLength(left, right, options.toleranceMm);
    if (overlap > options.toleranceMm) {
      findings.push(finding("OVERLAPPING_ELEMENTS", `Elements ${left.edge.id} and ${right.edge.id} overlap by ${overlap.toFixed(3)} mm.`, [left.edge.id, right.edge.id], { overlapMm: overlap }));
      continue;
    }
    const closestEndpoints = Math.min(...leftNodes.flatMap((leftId) => [right.edge.fromNodeId, right.edge.toNodeId].map((rightId) => pointDistance2(xyz(nodes.get(leftId).position), xyz(nodes.get(rightId).position)))));
    if (closestEndpoints > options.toleranceMm && closestEndpoints <= options.snapToleranceMm) findings.push(finding("SNAP_GAP", `Elements ${left.edge.id} and ${right.edge.id} have unsnapped endpoints ${closestEndpoints.toFixed(3)} mm apart.`, [left.edge.id, right.edge.id], { gapMm: closestEndpoints }));
    else if (segmentDistance(left.start, left.end, right.start, right.end) <= options.toleranceMm) findings.push(finding("CENTERLINE_CLASH", `Elements ${left.edge.id} and ${right.edge.id} intersect without a shared canonical node.`, [left.edge.id, right.edge.id], { clearanceAuthority: "CENTERLINE_ONLY" }));
  }
  const countsByCode = Object.freeze(Object.fromEntries([...new Set(findings.map((row) => row.code))].map((code) => [code, findings.filter((row) => row.code === code).length])));
  return Object.freeze({ schema: "TopologyGeometryDiagnostics.v1", options: Object.freeze({ ...options }), findings: Object.freeze(findings), summary: Object.freeze({ findingCount: findings.length, countsByCode }) });
}
var _test9 = Object.freeze({ xyz, subtract, dot, length, unit, angleDegrees, segmentDistance, overlapLength, hasBendEvidence, hasBendPairEvidence, edgeComponents, candidatePairs });

// tabs/model-converters/converters/component-topology/topology-edit-validation.js
var GEOMETRY_DIAGNOSTIC_OPTIONS = Object.freeze({
  shortElementMm: 6,
  toleranceMm: 0.1,
  snapToleranceMm: 6,
  angleToleranceDeg: 5,
  originToleranceMm: 0.1
});
function finding2(code, blocking, message, objectIds) {
  return Object.freeze({ code, blocking, message, objectIds: Object.freeze([...objectIds]) });
}
function duplicateFindings(rows, field, code) {
  const seen = /* @__PURE__ */ new Set(), duplicates = /* @__PURE__ */ new Set();
  for (const row of rows) {
    const value = String(row[field] ?? "");
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates].map((value) => finding2(code, true, `Duplicate ${field} ${value}.`, [value]));
}
function edgeFindings(canonical, nodeIndex, degree) {
  const findings = [], edgePairs = /* @__PURE__ */ new Map();
  for (const edge of canonical.edges) {
    const from = nodeIndex.get(edge.fromNodeId), to = nodeIndex.get(edge.toNodeId);
    if (!from || !to) {
      findings.push(finding2("MISSING_EDGE_ENDPOINT", true, `Edge ${edge.id} references a missing endpoint.`, [edge.id]));
      continue;
    }
    degree.set(from.id, (degree.get(from.id) ?? 0) + 1);
    degree.set(to.id, (degree.get(to.id) ?? 0) + 1);
    if (from.id === to.id || pointDistance(from.position, to.position) <= Number(canonical.toleranceMm ?? 0.1)) {
      findings.push(finding2("ZERO_LENGTH_EDGE", true, `Edge ${edge.id} has zero length within topology tolerance.`, [edge.id]));
    }
    const pair = [from.id, to.id].sort().join("|");
    if (edgePairs.has(pair)) findings.push(finding2("DUPLICATE_EDGE", true, `Edges ${edgePairs.get(pair)} and ${edge.id} connect the same nodes.`, [edgePairs.get(pair), edge.id]));
    else edgePairs.set(pair, edge.id);
    if (String(edge.id).startsWith("EDIT-CE-") && !String(edge.engineeringAuthorityEdgeId ?? "").trim()) {
      findings.push(finding2("UNRESOLVED_ENGINEERING_AUTHORITY", true, `Edited edge ${edge.id} has no explicit context-edge authority.`, [edge.id]));
    }
    if (String(edge.id).startsWith("EDIT-CE-") && !(edge.sourceEntityIds ?? []).length) {
      findings.push(finding2("UNRESOLVED_ENGINEERING_LINEAGE", true, `Edited edge ${edge.id} has no inherited source lineage.`, [edge.id]));
    }
  }
  return findings;
}
function dependencyFindings(canonical, nodeIndex, degree) {
  const findings = [], edgeIndex = new Map(canonical.edges.map((edge) => [edge.id, edge]));
  for (const node of canonical.nodes) if ((degree.get(node.id) ?? 0) === 0) {
    findings.push(finding2("ISOLATED_NODE", true, `Node ${node.id} is not incident to any edge.`, [node.id]));
  }
  for (const collectionName of ["supports", "junctions", "boundaries"]) for (const row of canonical[collectionName]) {
    if (!nodeIndex.has(row.nodeId)) findings.push(finding2("ORPHAN_NODE_DEPENDENCY", true, `${collectionName} ${row.id} references missing node ${row.nodeId}.`, [row.id]));
    else if ((degree.get(row.nodeId) ?? 0) === 0) findings.push(finding2("ISOLATED_NODE_DEPENDENCY", true, `${collectionName} ${row.id} is attached to isolated node ${row.nodeId}.`, [row.id, row.nodeId]));
  }
  for (const rigid of canonical.rigids) if (!edgeIndex.has(rigid.edgeId)) {
    findings.push(finding2("ORPHAN_RIGID", true, `Rigid ${rigid.sourceEntityId} references missing edge ${rigid.edgeId}.`, [rigid.sourceEntityId]));
  }
  return findings;
}
function validateEditedTopology(canonical, draft) {
  const findings = [
    ...duplicateFindings(canonical.nodes, "id", "DUPLICATE_NODE_ID"),
    ...duplicateFindings(canonical.edges, "id", "DUPLICATE_EDGE_ID")
  ];
  const inputNodeRows = canonical.nodes.flatMap((node) => (node.inputXmlNodeIds ?? []).map((inputXmlNodeId) => ({ id: node.id, inputXmlNodeId })));
  findings.push(...duplicateFindings(inputNodeRows, "inputXmlNodeId", "INPUTXML_NODE_COLLISION"));
  const nodeIndex = new Map(canonical.nodes.map((node) => [node.id, node])), degree = /* @__PURE__ */ new Map();
  findings.push(...edgeFindings(canonical, nodeIndex, degree));
  findings.push(...dependencyFindings(canonical, nodeIndex, degree));
  for (const issue2 of canonical.buildIssues ?? []) if (issue2.blocking !== false) {
    findings.push(finding2(String(issue2.code ?? "CANONICAL_BUILD_ISSUE"), true, `Canonical build issue: ${issue2.code ?? "unknown"}.`, textIds([issue2.sourcePath])));
  }
  if (Object.keys(draft.engineeringOverrides ?? {}).length) findings.push(finding2(
    "ENGINEERING_OVERRIDES_NOT_RELEASED",
    true,
    "Engineering overrides are reserved for the restraints and basic-properties release and cannot be exported yet.",
    []
  ));
  const blockingCount = findings.filter((row) => row.blocking).length;
  return Object.freeze({
    schema: "TopologyEditValidation.v1",
    ok: blockingCount === 0,
    findings: Object.freeze(findings),
    summary: Object.freeze({ findingCount: findings.length, blockingCount })
  });
}
function geometryFindingKey(row) {
  return `${row.code}:${[...row.objectIds ?? []].map(String).sort().join("|")}`;
}
function mergeGeometryDiagnostics(structural, current, base) {
  const diagnosticOptions = Object.freeze({
    ...GEOMETRY_DIAGNOSTIC_OPTIONS,
    toleranceMm: Number(current.toleranceMm ?? GEOMETRY_DIAGNOSTIC_OPTIONS.toleranceMm)
  });
  const currentReport = validateTopologyGeometry(current, diagnosticOptions);
  const baseReport = current === base ? currentReport : validateTopologyGeometry(base, Object.freeze({
    ...diagnosticOptions,
    toleranceMm: Number(base.toleranceMm ?? diagnosticOptions.toleranceMm)
  }));
  const baselineKeys = new Set(baseReport.findings.map(geometryFindingKey));
  const geometryFindings = currentReport.findings.map((row) => Object.freeze({
    ...row,
    blocking: false,
    severity: "WARNING",
    baseline: baselineKeys.has(geometryFindingKey(row))
  }));
  const findings = Object.freeze([...structural.findings, ...geometryFindings]);
  const blockingCount = findings.filter((row) => row.blocking).length;
  return Object.freeze({
    ...structural,
    ok: blockingCount === 0,
    findings,
    geometryDiagnostics: currentReport,
    baselineGeometryDiagnostics: baseReport,
    summary: Object.freeze({ findingCount: findings.length, blockingCount, geometryFindingCount: geometryFindings.length })
  });
}
var _test10 = Object.freeze({ finding: finding2, duplicateFindings, geometryFindingKey });

// tabs/model-converters/converters/component-topology/topology-edit-engine.js
var EDIT_LEDGER_HASH_KEYS = Object.freeze(["topologyEditLedgerHash"]);
function finalizeCanonical(state, draft) {
  refreshDerivedTopology(state);
  const prepared = {
    ...state,
    schema: "CanonicalTopology.v1",
    baseCanonicalTopologyHash: draft.baseCanonicalTopologyHash,
    topologyEditDraftHash: draft.topologyEditDraftHash,
    editCommandCount: draft.commands.length,
    nodes: Object.freeze(state.nodes),
    edges: Object.freeze(state.edges),
    pointFeatures: Object.freeze(state.pointFeatures),
    junctions: Object.freeze(state.junctions),
    boundaries: Object.freeze(state.boundaries),
    supports: Object.freeze(state.supports),
    rigids: Object.freeze(state.rigids),
    buildIssues: Object.freeze(state.buildIssues ?? [])
  };
  return stampArtifactHash(prepared, "canonicalTopologyHash");
}
function editLedger(draft, canonical, records) {
  const removedSourceEntityIds = textIds(records.flatMap((record2) => record2.removedSourceEntityIds ?? []));
  const ledger = {
    schema: "TopologyEditLedger.v1",
    baseCanonicalTopologyHash: draft.baseCanonicalTopologyHash,
    topologyEditDraftHash: draft.topologyEditDraftHash,
    editedCanonicalTopologyHash: canonical.canonicalTopologyHash,
    records: Object.freeze(records),
    removedSourceEntityIds: Object.freeze(removedSourceEntityIds),
    summary: Object.freeze({
      commandCount: records.length,
      createdObjectCount: records.reduce((sum, row) => sum + row.created.length, 0),
      changedObjectCount: records.reduce((sum, row) => sum + row.changed.length, 0),
      removedObjectCount: records.reduce((sum, row) => sum + row.removed.length, 0)
    })
  };
  return Object.freeze({
    ...ledger,
    topologyEditLedgerHash: deterministicHash(ledger, { omitKeys: [...EDIT_LEDGER_HASH_KEYS] })
  });
}
function replayRecord(command, state) {
  const beforeHash = deterministicHash(state, { omitKeys: ["canonicalTopologyHash"] });
  const result = applyTopologyEditCommand(state, command);
  refreshDerivedTopology(state);
  const afterHash = deterministicHash(state, { omitKeys: ["canonicalTopologyHash"] });
  return Object.freeze({
    schema: "TopologyEditLedgerRecord.v1",
    commandId: command.id,
    commandType: command.type,
    targets: Object.freeze(textIds(result.targets ?? [])),
    created: Object.freeze(textIds(result.created ?? [])),
    changed: Object.freeze(textIds(result.changed ?? [])),
    removed: Object.freeze(textIds(result.removed ?? [])),
    removedSourceEntityIds: Object.freeze(textIds(result.removedSourceEntityIds ?? [])),
    before: result.before,
    after: result.after,
    beforeTopologyHash: beforeHash,
    afterTopologyHash: afterHash
  });
}
function materializeTopologyEditDraft(canonical, draft) {
  assertCanonical(canonical);
  assertDraft(draft);
  if (draft.baseCanonicalTopologyHash !== canonical.canonicalTopologyHash) {
    throw editError("STALE_BASE_HASH", `Draft base ${draft.baseCanonicalTopologyHash} does not match canonical ${canonical.canonicalTopologyHash}.`);
  }
  if (!draft.commands.length) {
    const validation2 = mergeGeometryDiagnostics(validateEditedTopology(canonical, draft), canonical, canonical);
    return Object.freeze({ canonicalTopology: canonical, editLedger: editLedger(draft, canonical, []), validation: validation2 });
  }
  const state = mutableCanonical(canonical);
  const records = draft.commands.map((command) => replayRecord(command, state));
  const canonicalTopology = finalizeCanonical(state, draft);
  const validation = mergeGeometryDiagnostics(validateEditedTopology(canonicalTopology, draft), canonicalTopology, canonical);
  return Object.freeze({ canonicalTopology, editLedger: editLedger(draft, canonicalTopology, records), validation });
}
var _test11 = Object.freeze({
  finiteNumber: finiteNumber5,
  point,
  editError,
  safeIdPart,
  nextInputXmlNodeId,
  inheritedEdge,
  interpolate,
  splitFraction,
  refreshDerivedTopology
});

// tabs/model-converters/converters/component-topology/topology-artifact-identity.js
function sourceIndexes(model) {
  const branchByEntity = /* @__PURE__ */ new Map(), pathByEntity = /* @__PURE__ */ new Map(), refByEntity = /* @__PURE__ */ new Map();
  for (const branch of model.branches ?? []) {
    branchByEntity.set(branch.sourceEntityId, branch.sourceEntityId);
    pathByEntity.set(branch.sourceEntityId, branch.sourcePath);
    refByEntity.set(branch.sourceEntityId, branch.sourceRef || branch.name || "");
  }
  for (const component of model.components ?? []) {
    branchByEntity.set(component.sourceEntityId, component.sourceBranchEntityId);
    pathByEntity.set(component.sourceEntityId, component.sourcePath);
    refByEntity.set(component.sourceEntityId, component.sourceRef || component.name || "");
  }
  return { branchByEntity, pathByEntity, refByEntity };
}
function indexedValues(sourceIds, index) {
  return uniqueText(sourceIds.flatMap((id) => index.has(cleanText(id)) ? [index.get(cleanText(id))] : []));
}
function traceRow(row, indexes) {
  const sourceEntityIds = uniqueText(row.sourceEntityIds ?? []);
  return {
    ...row,
    sourceEntityIds,
    sourcePaths: uniqueText([...row.sourcePaths ?? [], ...indexedValues(sourceEntityIds, indexes.pathByEntity)]),
    branchIds: uniqueText([...row.branchIds ?? row.sourceBranchEntityIds ?? [], ...indexedValues(sourceEntityIds, indexes.branchByEntity)])
  };
}
function enrichCanonicalTopologyIdentity(canonical, model) {
  const indexes = sourceIndexes(model);
  const edges = (canonical.edges ?? []).map((edge) => ({
    ...traceRow(edge, indexes),
    topologyOperation: cleanText(edge.topologyOperation ?? edge.segmentRole)
  }));
  const edgeById2 = new Map(edges.map((edge) => [edge.id, edge]));
  const nodes = (canonical.nodes ?? []).map((node) => traceRow(node, indexes));
  const pointFeatures = (canonical.pointFeatures ?? []).map((row) => traceRow(row, indexes));
  const junctions = (canonical.junctions ?? []).map((row) => ({
    ...traceRow(row, indexes),
    participatingEdgeIds: uniqueText(edges.filter((edge) => edge.fromNodeId === row.nodeId || edge.toNodeId === row.nodeId).map((edge) => edge.id))
  }));
  const boundaries = (canonical.boundaries ?? []).map((row) => ({
    ...traceRow(row, indexes),
    participatingEdgeIds: uniqueText(edges.filter((edge) => edge.fromNodeId === row.nodeId || edge.toNodeId === row.nodeId).map((edge) => edge.id))
  }));
  const supports = (canonical.supports ?? []).map((row) => traceRow(row, indexes));
  const rigids = (canonical.rigids ?? []).map((row) => {
    const branchIds = indexedValues([row.sourceEntityId], indexes.branchByEntity);
    const edge = edgeById2.get(row.edgeId);
    const assignmentAuthority = edge?.sourceEntityIds?.includes(row.sourceEntityId) ? "SOURCE_COMPONENT_EDGE" : edge?.sourceEntityIds?.some((id) => branchIds.includes(id)) ? "SOURCE_BRANCH_EDGE" : "GLOBAL_PROXIMITY_FALLBACK";
    return {
      ...row,
      sourceEntityIds: uniqueText([row.sourceEntityId]),
      sourcePaths: uniqueText([row.sourcePath, ...indexedValues([row.sourceEntityId], indexes.pathByEntity)]),
      branchIds,
      assignmentAuthority
    };
  });
  return Object.freeze({
    ...canonical,
    nodes: Object.freeze(nodes),
    edges: Object.freeze(edges),
    pointFeatures: Object.freeze(pointFeatures),
    junctions: Object.freeze(junctions),
    boundaries: Object.freeze(boundaries),
    supports: Object.freeze(supports),
    rigids: Object.freeze(rigids)
  });
}
function sourcePosition(source) {
  const positions = source.positions ?? {};
  return strictPoint(positions.POS) ?? strictPoint(positions.APOS) ?? strictPoint(positions.LPOS);
}
function enrichTopologyTraceLedgerIdentity(ledger, canonical, model, engineering, configuration) {
  const indexes = sourceIndexes(model);
  const sourceEntities = [...model.branches ?? [], ...model.components ?? []];
  const sourceById = new Map(sourceEntities.map((row) => [row.sourceEntityId, row]));
  const supportBySource = /* @__PURE__ */ new Map();
  for (const support of canonical.supports ?? []) {
    for (const sourceEntityId of support.sourceEntityIds ?? []) supportBySource.set(sourceEntityId, support);
  }
  const deferredBySource = new Map((engineering.deferredSupports ?? []).map((row) => [row.sourceEntityId, row]));
  const records = (ledger.records ?? []).map((record2) => {
    const source = sourceById.get(record2.sourceEntityId) ?? {};
    const support = supportBySource.get(record2.sourceEntityId) ?? null;
    const deferred = deferredBySource.get(record2.sourceEntityId) ?? null;
    const sourcePos = support?.sourcePosition ?? sourcePosition(source);
    const evidence = {
      ...record2.evidence ?? {},
      sourcePosition: sourcePos,
      attachmentPosition: support?.attachmentPosition ?? null,
      attachmentAuthority: support?.attachmentAuthority ?? cleanText(deferred?.policy?.authority),
      attachmentReferences: support?.attachmentReferences ?? [],
      connectionResidual: support?.connectionResidual ?? null,
      supportTag: support?.tag ?? cleanText(source.attributes?.NAME ?? source.name)
    };
    return {
      ...record2,
      branchIds: indexedValues([record2.sourceEntityId, ...record2.affectedSourceEntityIds ?? []], indexes.branchByEntity),
      sourcePosition: sourcePos,
      canonicalSupportIds: support ? [support.id] : [],
      evidence
    };
  });
  return Object.freeze({
    ...ledger,
    canonicalTopologyHash: canonical.canonicalTopologyHash,
    topologyConfiguration: Object.freeze({ ...configuration }),
    records: Object.freeze(records)
  });
}
var _test12 = Object.freeze({ sourceIndexes, indexedValues, traceRow, sourcePosition });

// tabs/model-converters/converters/component-topology/topology-svg-scene-builder.js
function sceneNode(row) {
  return Object.freeze({
    id: cleanText(row.id),
    canonicalNodeId: cleanText(row.id),
    inputXmlNodeId: cleanText(row.inputXmlNodeIds?.[0]),
    position: Object.freeze({ ...row.position }),
    sourceEntityIds: Object.freeze(uniqueText(row.sourceEntityIds ?? [])),
    sourcePortIds: Object.freeze(uniqueText(row.sourcePortIds ?? [])),
    sourcePaths: Object.freeze(uniqueText(row.sourcePaths ?? [])),
    branchIds: Object.freeze(uniqueText(row.branchIds ?? [])),
    positionAuthority: cleanText(row.positionAuthority),
    connectionAuthority: Object.freeze(uniqueText(row.connectionAuthority ?? [])),
    connectionResidual: Number(row.connectionResidual ?? 0)
  });
}
function sceneEdge(row, nodes) {
  const from = nodes.get(cleanText(row.fromNodeId));
  const to = nodes.get(cleanText(row.toNodeId));
  if (!from || !to) throw new Error(`SVG scene edge ${row.id} references a missing canonical node.`);
  return Object.freeze({
    id: cleanText(row.id),
    canonicalEdgeId: cleanText(row.id),
    inputXmlElementId: cleanText(row.inputXmlElementIds?.[0]),
    fromCanonicalNodeId: cleanText(row.fromNodeId),
    toCanonicalNodeId: cleanText(row.toNodeId),
    fromPosition: Object.freeze({ ...from.position }),
    toPosition: Object.freeze({ ...to.position }),
    sourceEntityIds: Object.freeze(uniqueText(row.sourceEntityIds ?? [])),
    sourcePortIds: Object.freeze(uniqueText(row.sourcePortIds ?? [])),
    sourcePaths: Object.freeze(uniqueText(row.sourcePaths ?? [])),
    branchIds: Object.freeze(uniqueText(row.branchIds ?? [])),
    sourceTypes: Object.freeze(uniqueText(row.sourceTypes ?? [])),
    segmentRole: cleanText(row.segmentRole),
    topologyOperation: cleanText(row.topologyOperation ?? row.segmentRole),
    projectionCardinality: cleanText(row.projectionCardinality || "ONE_TO_ONE"),
    mergeAuthority: cleanText(row.projectionMergeAuthority),
    mergeSourceEntityIds: Object.freeze(uniqueText(row.mergeSourceEntityIds ?? [])),
    connectionAuthority: cleanText(row.connectionAuthority),
    connectionResidual: Number(row.connectionResidual ?? 0)
  });
}
function sceneSupport(row) {
  return Object.freeze({
    id: cleanText(row.id),
    canonicalSupportId: cleanText(row.id),
    canonicalNodeId: cleanText(row.nodeId),
    inputXmlNodeId: cleanText(row.inputXmlNodeId),
    inputXmlRestraintIds: Object.freeze((row.restraints ?? []).map((_item, index) => `RESTRAINT:${row.id}:${index + 1}`)),
    tag: cleanText(row.tag),
    position: Object.freeze({ ...row.position }),
    sourcePosition: Object.freeze({ ...row.sourcePosition }),
    attachmentPosition: Object.freeze({ ...row.attachmentPosition ?? row.position }),
    sourceEntityIds: Object.freeze(uniqueText(row.sourceEntityIds ?? [])),
    sourcePaths: Object.freeze(uniqueText(row.sourcePaths ?? [])),
    branchIds: Object.freeze(uniqueText(row.branchIds ?? [])),
    attachmentAuthority: cleanText(row.attachmentAuthority),
    attachmentReferences: Object.freeze(uniqueText(row.attachmentReferences ?? [])),
    attachedComponentEntityIds: Object.freeze(uniqueText(row.attachedComponentEntityIds ?? [])),
    connectionResidual: Number(row.connectionResidual ?? 0),
    restraintCount: (row.restraints ?? []).length,
    topologyBearing: true
  });
}
function deferredSupport(record2) {
  const evidence = record2.evidence ?? {};
  const position = evidence.sourcePosition ?? record2.sourcePosition ?? null;
  return Object.freeze({
    id: cleanText(record2.id),
    ledgerRecordId: cleanText(record2.id),
    sourceEntityId: cleanText(record2.sourceEntityId),
    sourceEntityIds: Object.freeze(uniqueText([record2.sourceEntityId, ...record2.affectedSourceEntityIds ?? []])),
    sourcePath: cleanText(record2.sourcePath),
    sourcePaths: Object.freeze(uniqueText([record2.sourcePath])),
    sourceRef: cleanText(record2.sourceRef),
    branchIds: Object.freeze(uniqueText(record2.branchIds ?? [])),
    position: position ? Object.freeze({ ...position }) : null,
    primaryDisposition: cleanText(record2.primaryDisposition),
    projectionCardinality: cleanText(record2.projectionCardinality),
    lossClassification: cleanText(record2.lossClassification),
    status: cleanText(record2.status),
    supportTag: cleanText(evidence.supportTag),
    attachmentAuthority: cleanText(evidence.attachmentAuthority ?? evidence.supportProjectionAuthority),
    topologyBearing: false,
    deferred: true
  });
}
function sceneRigids(rows) {
  const groups = /* @__PURE__ */ new Map();
  for (const row of rows) groups.set(row.edgeId, [...groups.get(row.edgeId) ?? [], row]);
  return Object.freeze([...groups.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([edgeId, group]) => Object.freeze({
    id: `RIGID:${edgeId}`,
    canonicalEdgeId: edgeId,
    inputXmlElementId: cleanText(group[0]?.inputXmlElementId),
    sourceEntityIds: Object.freeze(uniqueText(group.flatMap((row) => row.sourceEntityIds ?? [row.sourceEntityId]))),
    sourcePaths: Object.freeze(uniqueText(group.flatMap((row) => row.sourcePaths ?? [row.sourcePath]))),
    branchIds: Object.freeze(uniqueText(group.flatMap((row) => row.branchIds ?? []))),
    assignmentAuthorities: Object.freeze(uniqueText(group.map((row) => row.assignmentAuthority))),
    connectionResidual: Math.max(0, ...group.map((row) => Number(row.connectionResidual) || 0)),
    componentTypes: Object.freeze(uniqueText(group.map((row) => row.componentType))),
    sourceBodyCount: group.length,
    weightKg: group.reduce((sum, row) => sum + (Number(row.weightKg) || 0), 0)
  })));
}
function buildTopologySvgScene(canonical, ledger, producerDiagnostics = []) {
  if (canonical.schema !== "CanonicalTopology.v1") throw new TypeError(`TopologySvgScene requires CanonicalTopology.v1; received ${canonical.schema || "(missing)"}.`);
  if (ledger.schema !== "TopologyTraceLedger.v1") throw new TypeError(`TopologySvgScene requires TopologyTraceLedger.v1; received ${ledger.schema || "(missing)"}.`);
  const canonicalTopologyHash = cleanText(canonical.canonicalTopologyHash) || deterministicHash(canonical);
  if (cleanText(ledger.canonicalTopologyHash) && cleanText(ledger.canonicalTopologyHash) !== canonicalTopologyHash) {
    throw new Error("Topology trace ledger canonicalTopologyHash does not match the canonical snapshot.");
  }
  const nodes = Object.freeze((canonical.nodes ?? []).map(sceneNode));
  const nodeById2 = new Map(nodes.map((row) => [row.canonicalNodeId, row]));
  const edges = Object.freeze((canonical.edges ?? []).map((row) => sceneEdge(row, nodeById2)));
  const supports = Object.freeze((canonical.supports ?? []).map(sceneSupport));
  const deferredSupports = Object.freeze((ledger.records ?? []).filter((row) => row.primaryDisposition === "DEFER_SUPPORT").map(deferredSupport));
  const rigids = sceneRigids(canonical.rigids ?? []);
  const junctions = Object.freeze((canonical.junctions ?? []).map((row) => Object.freeze({
    ...row,
    canonicalJunctionId: cleanText(row.id),
    canonicalNodeId: cleanText(row.nodeId),
    position: Object.freeze({ ...row.position }),
    participatingCanonicalEdgeIds: Object.freeze(uniqueText(row.participatingEdgeIds ?? edges.filter((edge) => edge.fromCanonicalNodeId === row.nodeId || edge.toCanonicalNodeId === row.nodeId).map((edge) => edge.canonicalEdgeId))),
    sourceEntityIds: Object.freeze(uniqueText(row.sourceEntityIds ?? [])),
    sourcePaths: Object.freeze(uniqueText(row.sourcePaths ?? [])),
    branchIds: Object.freeze(uniqueText(row.branchIds ?? []))
  })));
  const boundaries = Object.freeze((canonical.boundaries ?? []).map((row) => Object.freeze({
    ...row,
    canonicalBoundaryId: cleanText(row.id),
    canonicalNodeId: cleanText(row.nodeId),
    position: Object.freeze({ ...row.position }),
    participatingCanonicalEdgeIds: Object.freeze(uniqueText(row.participatingEdgeIds ?? edges.filter((edge) => edge.fromCanonicalNodeId === row.nodeId || edge.toCanonicalNodeId === row.nodeId).map((edge) => edge.canonicalEdgeId))),
    sourceEntityIds: Object.freeze(uniqueText(row.sourceEntityIds ?? [])),
    sourcePaths: Object.freeze(uniqueText(row.sourcePaths ?? [])),
    branchIds: Object.freeze(uniqueText(row.branchIds ?? []))
  })));
  const pointFeatures = Object.freeze((canonical.pointFeatures ?? []).map((row) => Object.freeze({
    ...row,
    canonicalPointFeatureId: cleanText(row.id),
    position: Object.freeze({ ...row.position }),
    sourceEntityIds: Object.freeze(uniqueText(row.sourceEntityIds ?? [])),
    sourcePaths: Object.freeze(uniqueText(row.sourcePaths ?? [])),
    branchIds: Object.freeze(uniqueText(row.branchIds ?? [])),
    topologyBearing: false
  })));
  const issues = Object.freeze([...canonical.buildIssues ?? [], ...producerDiagnostics].map((row, index) => Object.freeze({
    id: cleanText(row.id) || `SCENE-ISSUE-${String(index + 1).padStart(6, "0")}`,
    ...row
  })));
  const scene = Object.freeze({
    schema: "TopologySvgScene.v1",
    sourceIdentity: canonical.sourceIdentity,
    hashAlgorithm: TOPOLOGY_HASH_ALGORITHM,
    canonicalTopologyHash,
    topologyTraceLedgerHash: cleanText(ledger.topologyTraceLedgerHash) || deterministicHash(ledger),
    coordinateFrame: canonical.coordinateFrame,
    worldCoordinatePrecision: Object.freeze({ unit: "mm", decimals: null, authority: "CanonicalTopology.v1" }),
    nodes,
    edges,
    supports,
    deferredSupports,
    rigids,
    junctions,
    boundaries,
    pointFeatures,
    issues,
    summary: Object.freeze({
      nodes: nodes.length,
      edges: edges.length,
      supports: supports.length,
      deferredSupports: deferredSupports.length,
      rigids: rigids.length,
      junctions: junctions.length,
      boundaries: boundaries.length,
      pointFeatures: pointFeatures.length,
      issues: issues.length
    })
  });
  return stampArtifactHash(scene, "svgSceneHash");
}
var _test13 = Object.freeze({ sceneNode, sceneEdge, sceneSupport, deferredSupport, sceneRigids });

// tabs/model-converters/converters/component-topology/topology-inputxml-parser-values.js
function decodeXml(value) {
  return String(value ?? "").replaceAll("&quot;", '"').replaceAll("&apos;", "'").replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&");
}
function parseAttributes(source) {
  const attributes = {};
  String(source ?? "").replace(/([A-Za-z_][\w:.-]*)\s*=\s*(["'])(.*?)\2/g, (_match, name, _quote, value) => {
    attributes[name.toUpperCase()] = decodeXml(value);
    return "";
  });
  return attributes;
}
function attribute(attributes, name) {
  const target = name.toUpperCase();
  if (Object.hasOwn(attributes, target)) return cleanText(attributes[target]);
  const key = Object.keys(attributes).find((candidate) => candidate.endsWith(`:${target}`));
  return key ? cleanText(attributes[key]) : "";
}
function finiteNumber6(value) {
  if (value === null || value === void 0 || cleanText(value) === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
function normalizeNodeId(value) {
  const number = finiteNumber6(value);
  if (number === null) return cleanText(value);
  return Math.abs(number - Math.round(number)) < 1e-9 ? String(Math.round(number)) : String(number);
}
function normalizedNumber(value, decimals) {
  const number = finiteNumber6(value);
  return number === null ? null : Number(number.toFixed(decimals));
}
function point2(attrs, prefix, decimals) {
  const values = ["X", "Y", "Z"].map((axis) => normalizedNumber(attribute(attrs, `${prefix}_${axis}`), decimals));
  return values.every((value) => value !== null) ? { x: values[0], y: values[1], z: values[2] } : null;
}
function list2(value) {
  return uniqueText(cleanText(value).split(/[|,;\s]+/));
}

// tabs/model-converters/converters/component-topology/topology-inputxml-topology-parser.js
var GLOBAL_DECIMALS = 3;
var DELTA_DECIMALS = 6;
function issue(code, message, context, sequence) {
  return Object.freeze({
    id: `INPUTXML-PARSE-${String(sequence).padStart(6, "0")}`,
    category: code,
    severity: "ERROR",
    blocking: true,
    message,
    ...context
  });
}
function parseRestraint(attrs, elementId) {
  const id = attribute(attrs, "ID");
  return Object.freeze({
    id,
    supportId: attribute(attrs, "SUPPORT_ID") || id.replace(/^RESTRAINT:/, "").replace(/:\d+$/, ""),
    ownerInputXmlElementId: elementId,
    inputXmlNodeId: normalizeNodeId(attribute(attrs, "NODE")),
    canonicalNodeId: attribute(attrs, "CANONICAL_NODE_ID"),
    tag: attribute(attrs, "TAG"),
    type: attribute(attrs, "TYPE"),
    sourceEntityIds: Object.freeze(list2(attribute(attrs, "SOURCE_ENTITY_IDS"))),
    sourcePaths: Object.freeze(list2(attribute(attrs, "SOURCE_PATHS"))),
    branchIds: Object.freeze(list2(attribute(attrs, "BRANCH_IDS"))),
    attachmentAuthority: attribute(attrs, "ATTACHMENT_AUTHORITY"),
    attachmentReferences: Object.freeze(list2(attribute(attrs, "ATTACHMENT_REFERENCES"))),
    connectionResidual: normalizedNumber(attribute(attrs, "CONNECTION_RESIDUAL"), DELTA_DECIMALS),
    sourcePosition: point2(attrs, "SOURCE", DELTA_DECIMALS),
    attachmentPosition: point2(attrs, "ATTACHMENT", DELTA_DECIMALS),
    attributes: Object.freeze(attrs)
  });
}
function parseRigid(attrs, elementId) {
  return Object.freeze({
    id: attribute(attrs, "ID"),
    ownerInputXmlElementId: elementId,
    canonicalEdgeId: attribute(attrs, "CANONICAL_EDGE_ID"),
    sourceEntityIds: Object.freeze(list2(attribute(attrs, "SOURCE_ENTITY_IDS"))),
    sourcePaths: Object.freeze(list2(attribute(attrs, "SOURCE_PATHS"))),
    branchIds: Object.freeze(list2(attribute(attrs, "BRANCH_IDS"))),
    assignmentAuthorities: Object.freeze(list2(attribute(attrs, "ASSIGNMENT_AUTHORITY"))),
    connectionResidual: normalizedNumber(attribute(attrs, "CONNECTION_RESIDUAL"), DELTA_DECIMALS),
    sourceBodyCount: finiteNumber6(attribute(attrs, "SOURCE_BODY_COUNT")),
    weight: finiteNumber6(attribute(attrs, "WEIGHT")),
    attributes: Object.freeze(attrs)
  });
}
function parseChildren(body, elementId, issues, next) {
  const restraints = [], rigids = [], otherChildren = [];
  const pattern = /<([A-Za-z_][\w:.-]*)\b([^>]*)\/?\s*>/g;
  for (const match of String(body ?? "").matchAll(pattern)) {
    const rawTag = cleanText(match[1]);
    const tag = rawTag.includes(":") ? rawTag.split(":").at(-1).toUpperCase() : rawTag.toUpperCase();
    if (tag === "PIPINGELEMENT") continue;
    const attrs = parseAttributes(match[2]);
    if (tag === "RESTRAINT") {
      const row = parseRestraint(attrs, elementId);
      if (!row.id) issues.push(issue("RESTRAINT_ID_MISSING", `RESTRAINT under ${elementId} has no stable ID.`, { inputXmlElementId: elementId }, next()));
      if (!row.canonicalNodeId) issues.push(issue("RESTRAINT_CANONICAL_NODE_ID_MISSING", `RESTRAINT ${row.id || "(unnamed)"} has no CANONICAL_NODE_ID.`, { inputXmlElementId: elementId, inputXmlChildId: row.id }, next()));
      restraints.push(row);
    } else if (tag === "RIGID") {
      const row = parseRigid(attrs, elementId);
      if (!row.id) issues.push(issue("RIGID_ID_MISSING", `RIGID under ${elementId} has no stable ID.`, { inputXmlElementId: elementId }, next()));
      if (!row.canonicalEdgeId) issues.push(issue("RIGID_CANONICAL_EDGE_ID_MISSING", `RIGID ${row.id || "(unnamed)"} has no CANONICAL_EDGE_ID.`, { inputXmlElementId: elementId, inputXmlChildId: row.id }, next()));
      rigids.push(row);
    } else {
      otherChildren.push(Object.freeze({
        id: attribute(attrs, "ID"),
        tag,
        attributes: Object.freeze(attrs),
        ownerInputXmlElementId: elementId
      }));
    }
  }
  return {
    restraints: Object.freeze(restraints),
    rigids: Object.freeze(rigids),
    otherChildren: Object.freeze(otherChildren)
  };
}
function endpointRows(element) {
  return [
    {
      canonicalNodeId: element.fromCanonicalNodeId,
      inputXmlNodeId: element.fromNode,
      position: element.fromPosition,
      sourceEntityIds: element.fromSourceEntityIds?.length ? element.fromSourceEntityIds : element.sourceEntityIds,
      sourcePortIds: element.fromSourcePortIds?.length ? element.fromSourcePortIds : element.sourcePortIds,
      elementId: element.id
    },
    {
      canonicalNodeId: element.toCanonicalNodeId,
      inputXmlNodeId: element.toNode,
      position: element.toPosition,
      sourceEntityIds: element.toSourceEntityIds?.length ? element.toSourceEntityIds : element.sourceEntityIds,
      sourcePortIds: element.toSourcePortIds?.length ? element.toSourcePortIds : element.sourcePortIds,
      elementId: element.id
    }
  ];
}
function buildNodes2(elements, issues, next) {
  const byCanonicalId = /* @__PURE__ */ new Map(), inputToCanonical = /* @__PURE__ */ new Map();
  for (const endpoint of elements.flatMap(endpointRows)) {
    if (!endpoint.canonicalNodeId) continue;
    const existing = byCanonicalId.get(endpoint.canonicalNodeId);
    if (!existing) {
      byCanonicalId.set(endpoint.canonicalNodeId, {
        id: endpoint.canonicalNodeId,
        canonicalNodeId: endpoint.canonicalNodeId,
        inputXmlNodeId: endpoint.inputXmlNodeId,
        position: endpoint.position,
        sourceEntityIds: [...endpoint.sourceEntityIds],
        sourcePortIds: [...endpoint.sourcePortIds],
        incidentInputXmlElementIds: [endpoint.elementId]
      });
    } else {
      if (existing.inputXmlNodeId !== endpoint.inputXmlNodeId) issues.push(issue(
        "CANONICAL_NODE_INPUT_ID_CONFLICT",
        `Canonical node ${endpoint.canonicalNodeId} maps to multiple InputXML node IDs.`,
        { canonicalNodeId: endpoint.canonicalNodeId, expected: existing.inputXmlNodeId, actual: endpoint.inputXmlNodeId },
        next()
      ));
      if (JSON.stringify(existing.position) !== JSON.stringify(endpoint.position)) issues.push(issue(
        "CANONICAL_NODE_COORDINATE_CONFLICT",
        `Canonical node ${endpoint.canonicalNodeId} has conflicting InputXML global coordinates.`,
        { canonicalNodeId: endpoint.canonicalNodeId, expected: existing.position, actual: endpoint.position },
        next()
      ));
      existing.sourceEntityIds.push(...endpoint.sourceEntityIds);
      existing.sourcePortIds.push(...endpoint.sourcePortIds);
      existing.incidentInputXmlElementIds.push(endpoint.elementId);
    }
    const mapped = inputToCanonical.get(endpoint.inputXmlNodeId);
    if (mapped && mapped !== endpoint.canonicalNodeId) issues.push(issue(
      "INPUT_NODE_CANONICAL_ID_CONFLICT",
      `InputXML node ${endpoint.inputXmlNodeId} maps to multiple canonical node IDs.`,
      { inputXmlNodeId: endpoint.inputXmlNodeId, expected: mapped, actual: endpoint.canonicalNodeId },
      next()
    ));
    else if (endpoint.inputXmlNodeId) inputToCanonical.set(endpoint.inputXmlNodeId, endpoint.canonicalNodeId);
  }
  return Object.freeze([...byCanonicalId.values()].map((row) => Object.freeze({
    ...row,
    sourceEntityIds: Object.freeze(uniqueText(row.sourceEntityIds)),
    sourcePortIds: Object.freeze(uniqueText(row.sourcePortIds)),
    incidentInputXmlElementIds: Object.freeze(uniqueText(row.incidentInputXmlElementIds))
  })));
}
function parseElement(attrs, body, index, issues, next) {
  const id = attribute(attrs, "ID");
  const children = parseChildren(body, id || `PIPINGELEMENT[${index}]`, issues, next);
  const row = Object.freeze({
    id,
    inputXmlElementId: id,
    canonicalEdgeId: attribute(attrs, "CANONICAL_EDGE_ID"),
    fromNode: normalizeNodeId(attribute(attrs, "FROM_NODE")),
    toNode: normalizeNodeId(attribute(attrs, "TO_NODE")),
    fromCanonicalNodeId: attribute(attrs, "FROM_CANONICAL_NODE_ID"),
    toCanonicalNodeId: attribute(attrs, "TO_CANONICAL_NODE_ID"),
    fromPosition: point2(attrs, "FROM_GLOBAL", GLOBAL_DECIMALS),
    toPosition: point2(attrs, "TO_GLOBAL", GLOBAL_DECIMALS),
    delta: Object.freeze({
      x: normalizedNumber(attribute(attrs, "DELTA_X"), DELTA_DECIMALS),
      y: normalizedNumber(attribute(attrs, "DELTA_Y"), DELTA_DECIMALS),
      z: normalizedNumber(attribute(attrs, "DELTA_Z"), DELTA_DECIMALS)
    }),
    sourceEntityIds: Object.freeze(list2(attribute(attrs, "SOURCE_ENTITY_IDS"))),
    sourcePortIds: Object.freeze(list2(attribute(attrs, "SOURCE_PORT_IDS"))),
    fromSourceEntityIds: Object.freeze(list2(attribute(attrs, "FROM_SOURCE_ENTITY_IDS"))),
    toSourceEntityIds: Object.freeze(list2(attribute(attrs, "TO_SOURCE_ENTITY_IDS"))),
    fromSourcePortIds: Object.freeze(list2(attribute(attrs, "FROM_SOURCE_PORT_IDS"))),
    toSourcePortIds: Object.freeze(list2(attribute(attrs, "TO_SOURCE_PORT_IDS"))),
    branchIds: Object.freeze(list2(attribute(attrs, "BRANCH_IDS"))),
    topologyOperation: attribute(attrs, "TOPOLOGY_OPERATION"),
    projectionCardinality: attribute(attrs, "PROJECTION_CARDINALITY"),
    mergeAuthority: attribute(attrs, "MERGE_AUTHORITY"),
    sourceType: attribute(attrs, "SOURCE_TYPE"),
    attributes: Object.freeze(attrs),
    ...children
  });
  if (!row.id) issues.push(issue("INPUTXML_ELEMENT_ID_MISSING", `PIPINGELEMENT[${index}] has no ID.`, {}, next()));
  if (!row.canonicalEdgeId) issues.push(issue("CANONICAL_EDGE_ID_MISSING", `PIPINGELEMENT ${row.id || index} has no CANONICAL_EDGE_ID.`, { inputXmlElementId: row.id }, next()));
  if (!row.fromCanonicalNodeId) issues.push(issue("FROM_CANONICAL_NODE_ID_MISSING", `PIPINGELEMENT ${row.id || index} has no FROM_CANONICAL_NODE_ID.`, { inputXmlElementId: row.id }, next()));
  if (!row.toCanonicalNodeId) issues.push(issue("TO_CANONICAL_NODE_ID_MISSING", `PIPINGELEMENT ${row.id || index} has no TO_CANONICAL_NODE_ID.`, { inputXmlElementId: row.id }, next()));
  if (!row.fromPosition || !row.toPosition) issues.push(issue("GLOBAL_COORDINATE_MISSING", `PIPINGELEMENT ${row.id || index} lacks complete global endpoint coordinates.`, { inputXmlElementId: row.id }, next()));
  return row;
}
function parseTopologyInputXml(xmlText) {
  const xml = String(xmlText ?? "");
  if (!/<CAESARII\b/i.test(xml) || !/<PIPINGMODEL\b/i.test(xml)) throw new TypeError("ParsedInputXmlTopology requires CAESARII/PIPINGMODEL InputXML.");
  const modelAttributes = parseAttributes(xml.match(/<PIPINGMODEL\b([^>]*)>/i)?.[1] ?? "");
  const issues = [], elements = [];
  let sequence = 0, match;
  const next = () => ++sequence;
  const paired = /<PIPINGELEMENT\b([^>]*)>([\s\S]*?)<\/PIPINGELEMENT>/gi;
  while (match = paired.exec(xml)) elements.push(parseElement(parseAttributes(match[1]), match[2], elements.length + 1, issues, next));
  if (!elements.length) throw new TypeError("ParsedInputXmlTopology contains no paired PIPINGELEMENT records.");
  const counts = /* @__PURE__ */ new Map();
  for (const element of elements) if (element.canonicalEdgeId) counts.set(element.canonicalEdgeId, (counts.get(element.canonicalEdgeId) ?? 0) + 1);
  for (const [edgeId, count] of counts) if (count !== 1) issues.push(issue("CANONICAL_EDGE_CARDINALITY_INVALID", `Canonical edge ${edgeId} occurs ${count} times in InputXML; expected exactly one.`, { canonicalEdgeId: edgeId, actual: count }, next()));
  const nodes = buildNodes2(elements, issues, next);
  const restraints = Object.freeze(elements.flatMap((element) => element.restraints));
  const rigids = Object.freeze(elements.flatMap((element) => element.rigids));
  const parsed = Object.freeze({
    schema: "ParsedInputXmlTopology.v1",
    hashAlgorithm: TOPOLOGY_HASH_ALGORITHM,
    inputXmlHash: hashText(xml),
    canonicalTopologyHash: attribute(modelAttributes, "CANONICAL_TOPOLOGY_HASH"),
    topologyTraceLedgerHash: attribute(modelAttributes, "TOPOLOGY_TRACE_LEDGER_HASH"),
    serialization: Object.freeze({ coordinateUnit: "mm", globalCoordinateDecimals: GLOBAL_DECIMALS, deltaDecimals: DELTA_DECIMALS, coordinateToleranceMm: 0 }),
    modelAttributes: Object.freeze(modelAttributes),
    nodes,
    elements: Object.freeze(elements),
    restraints,
    rigids,
    issues: Object.freeze(issues),
    summary: Object.freeze({ nodes: nodes.length, elements: elements.length, restraints: restraints.length, rigids: rigids.length, issues: issues.length, blockingIssues: issues.filter((row) => row.blocking).length })
  });
  return stampArtifactHash(parsed, "parsedInputXmlTopologyHash");
}
var INPUTXML_TOPOLOGY_SERIALIZATION = Object.freeze({ globalCoordinateDecimals: GLOBAL_DECIMALS, deltaDecimals: DELTA_DECIMALS, coordinateToleranceMm: 0 });
var _test14 = Object.freeze({ issue, parseRestraint, parseRigid, parseChildren, endpointRows, buildNodes: buildNodes2, parseElement });

// tabs/model-converters/converters/component-topology/topology-parity-values.js
var GLOBAL_DECIMALS2 = 3;
var DELTA_DECIMALS2 = 6;
function sortedText(values) {
  return uniqueText(values ?? []).sort((left, right) => left.localeCompare(right));
}
function numberAt(value, decimals) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(decimals)) : null;
}
function pointAt(value, decimals = GLOBAL_DECIMALS2) {
  if (!value) return null;
  const point3 = { x: numberAt(value.x, decimals), y: numberAt(value.y, decimals), z: numberAt(value.z, decimals) };
  return Object.values(point3).every((item) => item !== null) ? point3 : null;
}
function deltaAt(from, to) {
  return {
    x: numberAt(Number(to.x) - Number(from.x), DELTA_DECIMALS2),
    y: numberAt(Number(to.y) - Number(from.y), DELTA_DECIMALS2),
    z: numberAt(Number(to.z) - Number(from.z), DELTA_DECIMALS2)
  };
}
function same(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}
function mismatch(context) {
  return {
    category: cleanText(context.category),
    severity: cleanText(context.severity) || "ERROR",
    canonicalIdentity: context.canonicalIdentity ?? null,
    inputXmlIdentity: context.inputXmlIdentity ?? null,
    svgIdentity: context.svgIdentity ?? null,
    expected: context.expected ?? null,
    actual: context.actual ?? null,
    sourceEntities: sortedText(context.sourceEntities ?? []),
    sourcePaths: sortedText(context.sourcePaths ?? []),
    decisionTrace: context.decisionTrace ?? [],
    recommendedOwnerModule: cleanText(context.recommendedOwnerModule),
    message: cleanText(context.message)
  };
}
function decisionTrace(ledger, sourceIds, canonicalIds) {
  const sourceSet = new Set(sourceIds);
  const canonicalSet = new Set(canonicalIds);
  return (ledger.records ?? []).filter((record2) => sourceSet.has(record2.sourceEntityId) || (record2.canonicalEdgeIds ?? []).some((id) => canonicalSet.has(id)) || (record2.canonicalNodeIds ?? []).some((id) => canonicalSet.has(id))).map((record2) => ({
    ledgerRecordId: record2.id,
    sourceEntityId: record2.sourceEntityId,
    sourcePath: record2.sourcePath,
    disposition: record2.primaryDisposition,
    operation: record2.operation,
    projectionCardinality: record2.projectionCardinality,
    status: record2.status
  }));
}
function rowMap(rows, key) {
  const map = /* @__PURE__ */ new Map();
  for (const row of rows ?? []) {
    const id = cleanText(key(row));
    if (id) map.set(id, row);
  }
  return map;
}
function canonicalNodeMap(canonical) {
  return rowMap(canonical.nodes, (row) => row.id);
}
function canonicalRigidGroups(canonical) {
  const groups = /* @__PURE__ */ new Map();
  for (const rigid of canonical.rigids ?? []) groups.set(rigid.edgeId, [...groups.get(rigid.edgeId) ?? [], rigid]);
  return new Map([...groups.entries()].map(([edgeId, rows]) => [edgeId, {
    canonicalEdgeId: edgeId,
    sourceEntityIds: sortedText(rows.flatMap((row) => row.sourceEntityIds ?? [row.sourceEntityId])),
    assignmentAuthorities: sortedText(rows.map((row) => row.assignmentAuthority)),
    sourceBodyCount: rows.length
  }]));
}
function parsedIncidentEdges(parsed, canonicalNodeId) {
  return sortedText((parsed.elements ?? []).filter((edge) => edge.fromCanonicalNodeId === canonicalNodeId || edge.toCanonicalNodeId === canonicalNodeId).map((edge) => edge.canonicalEdgeId));
}
function deferredRecords(ledger) {
  return (ledger.records ?? []).filter((record2) => record2.primaryDisposition === "DEFER_SUPPORT");
}

// tabs/model-converters/converters/component-topology/topology-parity-edge-node.js
function compareCanonicalEdgeNodeToInputXml(canonical, parsed, ledger = { records: [] }) {
  const mismatches = [];
  const canonicalNodes = canonicalNodeMap(canonical);
  const inputNodes = rowMap(parsed.nodes, (row) => row.canonicalNodeId);
  const canonicalEdges = rowMap(canonical.edges, (row) => row.id);
  const inputEdges = rowMap(parsed.elements, (row) => row.canonicalEdgeId);
  for (const edge of canonical.edges ?? []) {
    const actual = inputEdges.get(edge.id);
    const sourceEntities = sortedText(edge.sourceEntityIds ?? []);
    const trace = decisionTrace(ledger, sourceEntities, [edge.id, edge.fromNodeId, edge.toNodeId]);
    if (!actual) {
      mismatches.push(mismatch({
        category: "MISSING_IN_INPUTXML_EDGE",
        canonicalIdentity: edge.id,
        expected: edge.inputXmlElementIds?.[0] ?? edge.id,
        actual: null,
        sourceEntities,
        sourcePaths: edge.sourcePaths,
        decisionTrace: trace,
        recommendedOwnerModule: "topology-inputxml-writer.js",
        message: `Canonical edge ${edge.id} has no InputXML PIPINGELEMENT.`
      }));
      continue;
    }
    const expectedIncidence = { from: edge.fromNodeId, to: edge.toNodeId };
    const actualIncidence = { from: actual.fromCanonicalNodeId, to: actual.toCanonicalNodeId };
    if (!same(expectedIncidence, actualIncidence)) mismatches.push(mismatch({
      category: "INCIDENCE_MISMATCH_INPUTXML_EDGE",
      canonicalIdentity: edge.id,
      inputXmlIdentity: actual.id,
      expected: expectedIncidence,
      actual: actualIncidence,
      sourceEntities,
      sourcePaths: edge.sourcePaths,
      decisionTrace: trace,
      recommendedOwnerModule: "topology-inputxml-writer.js",
      message: `InputXML incidence for ${edge.id} does not match canonical FROM/TO.`
    }));
    const from = canonicalNodes.get(edge.fromNodeId), to = canonicalNodes.get(edge.toNodeId);
    const expectedGeometry = { from: pointAt(from?.position), to: pointAt(to?.position), delta: from && to ? deltaAt(from.position, to.position) : null };
    const actualGeometry = { from: actual.fromPosition, to: actual.toPosition, delta: actual.delta };
    if (!same(expectedGeometry, actualGeometry)) mismatches.push(mismatch({
      category: "COORDINATE_MISMATCH_INPUTXML_EDGE",
      canonicalIdentity: edge.id,
      inputXmlIdentity: actual.id,
      expected: expectedGeometry,
      actual: actualGeometry,
      sourceEntities,
      sourcePaths: edge.sourcePaths,
      decisionTrace: trace,
      recommendedOwnerModule: "topology-inputxml-writer.js",
      message: `InputXML world geometry for ${edge.id} differs after writer-precision normalization.`
    }));
    const expectedIdentity = {
      sourceEntityIds: sortedText(edge.sourceEntityIds),
      sourcePortIds: sortedText(edge.sourcePortIds),
      branchIds: sortedText(edge.branchIds),
      topologyOperation: cleanText(edge.topologyOperation ?? edge.segmentRole),
      projectionCardinality: cleanText(edge.projectionCardinality || "ONE_TO_ONE"),
      mergeAuthority: cleanText(edge.projectionMergeAuthority)
    };
    const actualIdentity = {
      sourceEntityIds: sortedText(actual.sourceEntityIds),
      sourcePortIds: sortedText(actual.sourcePortIds),
      branchIds: sortedText(actual.branchIds),
      topologyOperation: cleanText(actual.topologyOperation),
      projectionCardinality: cleanText(actual.projectionCardinality),
      mergeAuthority: cleanText(actual.mergeAuthority)
    };
    if (!same(expectedIdentity, actualIdentity)) mismatches.push(mismatch({
      category: "IDENTITY_MISMATCH_INPUTXML_EDGE",
      canonicalIdentity: edge.id,
      inputXmlIdentity: actual.id,
      expected: expectedIdentity,
      actual: actualIdentity,
      sourceEntities,
      sourcePaths: edge.sourcePaths,
      decisionTrace: trace,
      recommendedOwnerModule: "topology-inputxml-trace-attributes.js",
      message: `InputXML trace identity for ${edge.id} differs from canonical topology.`
    }));
  }
  for (const element of parsed.elements ?? []) if (!canonicalEdges.has(element.canonicalEdgeId)) mismatches.push(mismatch({
    category: "EXTRA_IN_INPUTXML_EDGE",
    inputXmlIdentity: element.id,
    expected: null,
    actual: element.canonicalEdgeId || element.id,
    sourceEntities: element.sourceEntityIds,
    recommendedOwnerModule: "topology-inputxml-writer.js",
    message: `InputXML element ${element.id} has no canonical edge.`
  }));
  for (const node of canonical.nodes ?? []) {
    const actual = inputNodes.get(node.id);
    const sourceEntities = sortedText(node.sourceEntityIds ?? []);
    if (!actual) {
      mismatches.push(mismatch({
        category: "MISSING_IN_INPUTXML_NODE",
        canonicalIdentity: node.id,
        expected: node.inputXmlNodeIds?.[0] ?? node.id,
        actual: null,
        sourceEntities,
        sourcePaths: node.sourcePaths,
        decisionTrace: decisionTrace(ledger, sourceEntities, [node.id]),
        recommendedOwnerModule: "topology-inputxml-writer.js",
        message: `Canonical node ${node.id} is not recoverable from InputXML.`
      }));
      continue;
    }
    const expected = {
      inputXmlNodeId: cleanText(node.inputXmlNodeIds?.[0]),
      position: pointAt(node.position),
      sourceEntityIds: sortedText(node.sourceEntityIds),
      sourcePortIds: sortedText(node.sourcePortIds)
    };
    const actualValue = {
      inputXmlNodeId: cleanText(actual.inputXmlNodeId),
      position: actual.position,
      sourceEntityIds: sortedText(actual.sourceEntityIds),
      sourcePortIds: sortedText(actual.sourcePortIds)
    };
    if (!same(expected, actualValue)) mismatches.push(mismatch({
      category: same(expected.position, actualValue.position) ? "IDENTITY_MISMATCH_INPUTXML_NODE" : "COORDINATE_MISMATCH_INPUTXML_NODE",
      canonicalIdentity: node.id,
      inputXmlIdentity: actual.inputXmlNodeId,
      expected,
      actual: actualValue,
      sourceEntities,
      sourcePaths: node.sourcePaths,
      decisionTrace: decisionTrace(ledger, sourceEntities, [node.id]),
      recommendedOwnerModule: "topology-inputxml-trace-attributes.js",
      message: `InputXML node ${actual.inputXmlNodeId} does not exactly match canonical node ${node.id}.`
    }));
  }
  for (const node of parsed.nodes ?? []) if (!canonicalNodes.has(node.canonicalNodeId)) mismatches.push(mismatch({
    category: "EXTRA_IN_INPUTXML_NODE",
    inputXmlIdentity: node.inputXmlNodeId,
    expected: null,
    actual: node.canonicalNodeId,
    sourceEntities: node.sourceEntityIds,
    recommendedOwnerModule: "topology-inputxml-topology-parser.js",
    message: `InputXML node ${node.inputXmlNodeId} references unknown canonical node ${node.canonicalNodeId}.`
  }));
  return mismatches;
}
function compareCanonicalEdgeNodeToSvgScene(canonical, scene, ledger = { records: [] }) {
  const mismatches = [];
  const canonicalNodes = canonicalNodeMap(canonical);
  const sceneNodes = rowMap(scene.nodes, (row) => row.canonicalNodeId);
  const canonicalEdges = rowMap(canonical.edges, (row) => row.id);
  const sceneEdges = rowMap(scene.edges, (row) => row.canonicalEdgeId);
  for (const edge of canonical.edges ?? []) {
    const actual = sceneEdges.get(edge.id);
    const sourceEntities = sortedText(edge.sourceEntityIds ?? []);
    if (!actual) {
      mismatches.push(mismatch({
        category: "MISSING_IN_SVG_EDGE",
        canonicalIdentity: edge.id,
        expected: edge.id,
        actual: null,
        sourceEntities,
        sourcePaths: edge.sourcePaths,
        decisionTrace: decisionTrace(ledger, sourceEntities, [edge.id]),
        recommendedOwnerModule: "topology-svg-scene-builder.js",
        message: `Canonical edge ${edge.id} has no TopologySvgScene edge.`
      }));
      continue;
    }
    const expected = {
      fromCanonicalNodeId: edge.fromNodeId,
      toCanonicalNodeId: edge.toNodeId,
      fromPosition: pointAt(canonicalNodes.get(edge.fromNodeId)?.position),
      toPosition: pointAt(canonicalNodes.get(edge.toNodeId)?.position),
      inputXmlElementId: cleanText(edge.inputXmlElementIds?.[0]),
      sourceEntityIds: sortedText(edge.sourceEntityIds),
      sourcePortIds: sortedText(edge.sourcePortIds),
      branchIds: sortedText(edge.branchIds),
      topologyOperation: cleanText(edge.topologyOperation ?? edge.segmentRole),
      projectionCardinality: cleanText(edge.projectionCardinality || "ONE_TO_ONE"),
      mergeAuthority: cleanText(edge.projectionMergeAuthority)
    };
    const actualValue = {
      fromCanonicalNodeId: actual.fromCanonicalNodeId,
      toCanonicalNodeId: actual.toCanonicalNodeId,
      fromPosition: pointAt(actual.fromPosition),
      toPosition: pointAt(actual.toPosition),
      inputXmlElementId: cleanText(actual.inputXmlElementId),
      sourceEntityIds: sortedText(actual.sourceEntityIds),
      sourcePortIds: sortedText(actual.sourcePortIds),
      branchIds: sortedText(actual.branchIds),
      topologyOperation: cleanText(actual.topologyOperation),
      projectionCardinality: cleanText(actual.projectionCardinality),
      mergeAuthority: cleanText(actual.mergeAuthority)
    };
    if (!same(expected, actualValue)) mismatches.push(mismatch({
      category: !same([expected.fromCanonicalNodeId, expected.toCanonicalNodeId], [actualValue.fromCanonicalNodeId, actualValue.toCanonicalNodeId]) ? "INCIDENCE_MISMATCH_SVG_EDGE" : !same([expected.fromPosition, expected.toPosition], [actualValue.fromPosition, actualValue.toPosition]) ? "COORDINATE_MISMATCH_SVG_EDGE" : "IDENTITY_MISMATCH_SVG_EDGE",
      canonicalIdentity: edge.id,
      svgIdentity: actual.id,
      expected,
      actual: actualValue,
      sourceEntities,
      sourcePaths: edge.sourcePaths,
      decisionTrace: decisionTrace(ledger, sourceEntities, [edge.id]),
      recommendedOwnerModule: "topology-svg-scene-builder.js",
      message: `SVG scene edge ${actual.id} does not exactly match canonical edge ${edge.id}.`
    }));
  }
  for (const edge of scene.edges ?? []) if (!canonicalEdges.has(edge.canonicalEdgeId)) mismatches.push(mismatch({
    category: "EXTRA_IN_SVG_EDGE",
    svgIdentity: edge.id,
    expected: null,
    actual: edge.canonicalEdgeId || edge.id,
    sourceEntities: edge.sourceEntityIds,
    sourcePaths: edge.sourcePaths,
    recommendedOwnerModule: "topology-svg-scene-builder.js",
    message: `SVG scene edge ${edge.id} has no canonical edge.`
  }));
  for (const node of canonical.nodes ?? []) {
    const actual = sceneNodes.get(node.id);
    if (!actual) {
      mismatches.push(mismatch({
        category: "MISSING_IN_SVG_NODE",
        canonicalIdentity: node.id,
        expected: node.id,
        actual: null,
        sourceEntities: node.sourceEntityIds,
        sourcePaths: node.sourcePaths,
        decisionTrace: decisionTrace(ledger, node.sourceEntityIds ?? [], [node.id]),
        recommendedOwnerModule: "topology-svg-scene-builder.js",
        message: `Canonical node ${node.id} has no TopologySvgScene node.`
      }));
      continue;
    }
    const expected = {
      position: pointAt(node.position),
      inputXmlNodeId: cleanText(node.inputXmlNodeIds?.[0]),
      sourceEntityIds: sortedText(node.sourceEntityIds),
      sourcePortIds: sortedText(node.sourcePortIds),
      branchIds: sortedText(node.branchIds)
    };
    const actualValue = {
      position: pointAt(actual.position),
      inputXmlNodeId: cleanText(actual.inputXmlNodeId),
      sourceEntityIds: sortedText(actual.sourceEntityIds),
      sourcePortIds: sortedText(actual.sourcePortIds),
      branchIds: sortedText(actual.branchIds)
    };
    if (!same(expected, actualValue)) mismatches.push(mismatch({
      category: same(expected.position, actualValue.position) ? "IDENTITY_MISMATCH_SVG_NODE" : "COORDINATE_MISMATCH_SVG_NODE",
      canonicalIdentity: node.id,
      svgIdentity: actual.id,
      expected,
      actual: actualValue,
      sourceEntities: node.sourceEntityIds,
      sourcePaths: node.sourcePaths,
      decisionTrace: decisionTrace(ledger, node.sourceEntityIds ?? [], [node.id]),
      recommendedOwnerModule: "topology-svg-scene-builder.js",
      message: `SVG scene node ${actual.id} does not exactly match canonical node ${node.id}.`
    }));
  }
  for (const node of scene.nodes ?? []) if (!canonicalNodes.has(node.canonicalNodeId)) mismatches.push(mismatch({
    category: "EXTRA_IN_SVG_NODE",
    svgIdentity: node.id,
    expected: null,
    actual: node.canonicalNodeId,
    sourceEntities: node.sourceEntityIds,
    recommendedOwnerModule: "topology-svg-scene-builder.js",
    message: `SVG scene node ${node.id} has no canonical node.`
  }));
  return mismatches;
}
function compareInputXmlEdgeNodeToSvgScene(parsed, scene) {
  const mismatches = [];
  const sceneEdges = rowMap(scene.edges, (row) => row.canonicalEdgeId);
  for (const element of parsed.elements ?? []) {
    const edge = sceneEdges.get(element.canonicalEdgeId);
    if (!edge) continue;
    const inputValue = {
      inputXmlElementId: element.id,
      fromCanonicalNodeId: element.fromCanonicalNodeId,
      toCanonicalNodeId: element.toCanonicalNodeId,
      fromPosition: element.fromPosition,
      toPosition: element.toPosition,
      sourceEntityIds: sortedText(element.sourceEntityIds),
      sourcePortIds: sortedText(element.sourcePortIds),
      branchIds: sortedText(element.branchIds),
      topologyOperation: cleanText(element.topologyOperation),
      projectionCardinality: cleanText(element.projectionCardinality),
      mergeAuthority: cleanText(element.mergeAuthority)
    };
    const svgValue = {
      inputXmlElementId: cleanText(edge.inputXmlElementId),
      fromCanonicalNodeId: edge.fromCanonicalNodeId,
      toCanonicalNodeId: edge.toCanonicalNodeId,
      fromPosition: pointAt(edge.fromPosition),
      toPosition: pointAt(edge.toPosition),
      sourceEntityIds: sortedText(edge.sourceEntityIds),
      sourcePortIds: sortedText(edge.sourcePortIds),
      branchIds: sortedText(edge.branchIds),
      topologyOperation: cleanText(edge.topologyOperation),
      projectionCardinality: cleanText(edge.projectionCardinality),
      mergeAuthority: cleanText(edge.mergeAuthority)
    };
    if (!same(inputValue, svgValue)) mismatches.push(mismatch({
      category: "INPUTXML_SVG_EDGE_MISMATCH",
      inputXmlIdentity: element.id,
      svgIdentity: edge.id,
      expected: inputValue,
      actual: svgValue,
      sourceEntities: element.sourceEntityIds,
      recommendedOwnerModule: "topology-svg-scene-builder.js",
      message: `InputXML and SVG scene disagree for canonical edge ${element.canonicalEdgeId}.`
    }));
  }
  return mismatches;
}

// tabs/model-converters/converters/component-topology/topology-parity-support-rigid.js
function compareSupportsToInput(canonical, parsed, ledger) {
  const rows = [], bySupport = /* @__PURE__ */ new Map();
  for (const restraint of parsed.restraints ?? []) bySupport.set(restraint.supportId, [...bySupport.get(restraint.supportId) ?? [], restraint]);
  const canonicalIds = new Set((canonical.supports ?? []).map((row) => row.id));
  for (const support of canonical.supports ?? []) {
    const actual = bySupport.get(support.id) ?? [], first = actual[0] ?? {};
    const expected = {
      canonicalNodeId: support.nodeId,
      inputXmlNodeId: cleanText(support.inputXmlNodeId),
      restraintCount: support.restraints?.length ?? 0,
      tag: cleanText(support.tag),
      sourceEntityIds: sortedText(support.sourceEntityIds),
      attachmentAuthority: cleanText(support.attachmentAuthority),
      attachmentReferences: sortedText(support.attachmentReferences),
      sourcePosition: pointAt(support.sourcePosition, DELTA_DECIMALS2),
      attachmentPosition: pointAt(support.attachmentPosition ?? support.position, DELTA_DECIMALS2),
      connectionResidual: numberAt(support.connectionResidual, DELTA_DECIMALS2)
    };
    const actualValue = {
      canonicalNodeId: cleanText(first.canonicalNodeId),
      inputXmlNodeId: cleanText(first.inputXmlNodeId),
      restraintCount: actual.length,
      tag: cleanText(first.tag),
      sourceEntityIds: sortedText(actual.flatMap((row) => row.sourceEntityIds ?? [])),
      attachmentAuthority: cleanText(first.attachmentAuthority),
      attachmentReferences: sortedText(first.attachmentReferences),
      sourcePosition: first.sourcePosition ?? null,
      attachmentPosition: first.attachmentPosition ?? null,
      connectionResidual: first.connectionResidual ?? null
    };
    if (!same(expected, actualValue)) rows.push(mismatch({
      category: "SUPPORT_MISMATCH_INPUTXML",
      canonicalIdentity: support.id,
      inputXmlIdentity: actual.map((row) => row.id),
      expected,
      actual: actualValue,
      sourceEntities: support.sourceEntityIds,
      sourcePaths: support.sourcePaths,
      decisionTrace: decisionTrace(ledger, support.sourceEntityIds ?? [], [support.nodeId]),
      recommendedOwnerModule: "topology-inputxml-writer.js",
      message: `InputXML restraint projection for support ${support.id} does not match canonical attachment evidence.`
    }));
  }
  for (const [supportId, actual] of bySupport) if (!canonicalIds.has(supportId)) rows.push(mismatch({
    category: "EXTRA_IN_INPUTXML_SUPPORT",
    inputXmlIdentity: actual.map((row) => row.id),
    expected: null,
    actual: supportId,
    sourceEntities: actual.flatMap((row) => row.sourceEntityIds ?? []),
    recommendedOwnerModule: "topology-inputxml-writer.js",
    message: `InputXML support ${supportId} has no canonical support.`
  }));
  return rows;
}
function compareSupportsToScene(canonical, scene, ledger) {
  const rows = [], map = rowMap(scene.supports, (row) => row.canonicalSupportId);
  const canonicalIds = new Set((canonical.supports ?? []).map((row) => row.id));
  for (const support of canonical.supports ?? []) {
    const actual = map.get(support.id);
    const expected = {
      canonicalNodeId: support.nodeId,
      inputXmlNodeId: cleanText(support.inputXmlNodeId),
      position: pointAt(support.position, DELTA_DECIMALS2),
      sourcePosition: pointAt(support.sourcePosition, DELTA_DECIMALS2),
      attachmentPosition: pointAt(support.attachmentPosition ?? support.position, DELTA_DECIMALS2),
      sourceEntityIds: sortedText(support.sourceEntityIds),
      sourcePaths: sortedText(support.sourcePaths),
      branchIds: sortedText(support.branchIds),
      attachmentAuthority: cleanText(support.attachmentAuthority),
      attachmentReferences: sortedText(support.attachmentReferences),
      connectionResidual: numberAt(support.connectionResidual, DELTA_DECIMALS2),
      restraintCount: support.restraints?.length ?? 0
    };
    const actualValue = actual ? {
      canonicalNodeId: actual.canonicalNodeId,
      inputXmlNodeId: cleanText(actual.inputXmlNodeId),
      position: pointAt(actual.position, DELTA_DECIMALS2),
      sourcePosition: pointAt(actual.sourcePosition, DELTA_DECIMALS2),
      attachmentPosition: pointAt(actual.attachmentPosition, DELTA_DECIMALS2),
      sourceEntityIds: sortedText(actual.sourceEntityIds),
      sourcePaths: sortedText(actual.sourcePaths),
      branchIds: sortedText(actual.branchIds),
      attachmentAuthority: cleanText(actual.attachmentAuthority),
      attachmentReferences: sortedText(actual.attachmentReferences),
      connectionResidual: numberAt(actual.connectionResidual, DELTA_DECIMALS2),
      restraintCount: Number(actual.restraintCount ?? 0)
    } : null;
    if (!same(expected, actualValue)) rows.push(mismatch({
      category: actual ? "SUPPORT_MISMATCH_SVG" : "MISSING_IN_SVG_SUPPORT",
      canonicalIdentity: support.id,
      svgIdentity: actual?.id ?? null,
      expected,
      actual: actualValue,
      sourceEntities: support.sourceEntityIds,
      sourcePaths: support.sourcePaths,
      decisionTrace: decisionTrace(ledger, support.sourceEntityIds ?? [], [support.nodeId]),
      recommendedOwnerModule: "topology-svg-scene-builder.js",
      message: `SVG support projection for ${support.id} does not match canonical attachment evidence.`
    }));
  }
  for (const support of scene.supports ?? []) if (!canonicalIds.has(support.canonicalSupportId)) rows.push(mismatch({
    category: "EXTRA_IN_SVG_SUPPORT",
    svgIdentity: support.id,
    expected: null,
    actual: support.canonicalSupportId,
    sourceEntities: support.sourceEntityIds,
    recommendedOwnerModule: "topology-svg-scene-builder.js",
    message: `SVG support ${support.id} has no canonical support.`
  }));
  return rows;
}
function compareRigidsToInput(canonical, parsed, ledger) {
  const rows = [], expectedMap = canonicalRigidGroups(canonical), actualMap = rowMap(parsed.rigids, (row) => row.canonicalEdgeId);
  for (const [edgeId, expected] of expectedMap) {
    const actual = actualMap.get(edgeId);
    const actualValue = actual ? {
      canonicalEdgeId: actual.canonicalEdgeId,
      sourceEntityIds: sortedText(actual.sourceEntityIds),
      assignmentAuthorities: sortedText(actual.assignmentAuthorities),
      sourceBodyCount: Number(actual.sourceBodyCount)
    } : null;
    if (!same(expected, actualValue)) rows.push(mismatch({
      category: "RIGID_MISMATCH_INPUTXML",
      canonicalIdentity: edgeId,
      inputXmlIdentity: actual?.id ?? null,
      expected,
      actual: actualValue,
      sourceEntities: expected.sourceEntityIds,
      decisionTrace: decisionTrace(ledger, expected.sourceEntityIds, [edgeId]),
      recommendedOwnerModule: "topology-inputxml-writer.js",
      message: `InputXML rigid assignment on ${edgeId} differs from canonical assignment.`
    }));
  }
  for (const rigid of parsed.rigids ?? []) if (!expectedMap.has(rigid.canonicalEdgeId)) rows.push(mismatch({
    category: "EXTRA_IN_INPUTXML_RIGID",
    inputXmlIdentity: rigid.id,
    expected: null,
    actual: rigid.canonicalEdgeId,
    sourceEntities: rigid.sourceEntityIds,
    recommendedOwnerModule: "topology-inputxml-writer.js",
    message: `InputXML RIGID ${rigid.id} has no canonical rigid assignment.`
  }));
  return rows;
}
function compareRigidsToScene(canonical, scene, ledger) {
  const rows = [], expectedMap = canonicalRigidGroups(canonical), actualMap = rowMap(scene.rigids, (row) => row.canonicalEdgeId);
  for (const [edgeId, expected] of expectedMap) {
    const actual = actualMap.get(edgeId);
    const actualValue = actual ? {
      canonicalEdgeId: actual.canonicalEdgeId,
      sourceEntityIds: sortedText(actual.sourceEntityIds),
      assignmentAuthorities: sortedText(actual.assignmentAuthorities),
      sourceBodyCount: Number(actual.sourceBodyCount)
    } : null;
    if (!same(expected, actualValue)) rows.push(mismatch({
      category: "RIGID_MISMATCH_SVG",
      canonicalIdentity: edgeId,
      svgIdentity: actual?.id ?? null,
      expected,
      actual: actualValue,
      sourceEntities: expected.sourceEntityIds,
      decisionTrace: decisionTrace(ledger, expected.sourceEntityIds, [edgeId]),
      recommendedOwnerModule: "topology-svg-scene-builder.js",
      message: `SVG rigid overlay on ${edgeId} differs from canonical assignment.`
    }));
  }
  return rows;
}
function compareDeferredToInput(canonical, parsed, ledger) {
  const rows = [];
  for (const record2 of deferredRecords(ledger)) {
    const canonicalSupport = (canonical.supports ?? []).find((support) => (support.sourceEntityIds ?? []).includes(record2.sourceEntityId));
    const restraints = (parsed.restraints ?? []).filter((restraint) => (restraint.sourceEntityIds ?? []).includes(record2.sourceEntityId));
    if (canonicalSupport || restraints.length) rows.push(mismatch({
      category: "SUPPORT_MISMATCH_DEFERRED_INPUTXML",
      canonicalIdentity: canonicalSupport?.id ?? null,
      inputXmlIdentity: restraints.map((row) => row.id),
      expected: { canonicalSupport: null, restraints: 0, disposition: "DEFER_SUPPORT" },
      actual: { canonicalSupport: canonicalSupport?.id ?? null, restraints: restraints.length },
      sourceEntities: [record2.sourceEntityId],
      sourcePaths: [record2.sourcePath],
      decisionTrace: [record2],
      recommendedOwnerModule: "topology-inputxml-writer.js",
      message: `Deferred support ${record2.sourceRef || record2.sourceEntityId} emitted forbidden topology.`
    }));
  }
  return rows;
}
function compareDeferredToScene(_canonical, scene, ledger) {
  const rows = [], sceneBySource = new Map((scene.deferredSupports ?? []).map((row) => [row.sourceEntityId, row]));
  for (const record2 of deferredRecords(ledger)) {
    const actual = sceneBySource.get(record2.sourceEntityId);
    const expected = {
      sourceEntityId: record2.sourceEntityId,
      sourcePath: record2.sourcePath,
      sourceRef: record2.sourceRef,
      primaryDisposition: "DEFER_SUPPORT",
      projectionCardinality: "DEFERRED",
      lossClassification: "DEFERRED_NON_RESTRAINT_ATTACHMENT",
      topologyBearing: false
    };
    const actualValue = actual ? {
      sourceEntityId: actual.sourceEntityId,
      sourcePath: actual.sourcePath,
      sourceRef: actual.sourceRef,
      primaryDisposition: actual.primaryDisposition,
      projectionCardinality: actual.projectionCardinality,
      lossClassification: actual.lossClassification,
      topologyBearing: actual.topologyBearing
    } : null;
    if (!same(expected, actualValue)) rows.push(mismatch({
      category: actual ? "SUPPORT_MISMATCH_DEFERRED_SVG" : "MISSING_IN_SVG_DEFERRED_SUPPORT",
      svgIdentity: actual?.id ?? null,
      expected,
      actual: actualValue,
      sourceEntities: [record2.sourceEntityId],
      sourcePaths: [record2.sourcePath],
      decisionTrace: [record2],
      recommendedOwnerModule: "topology-svg-scene-builder.js",
      message: `Deferred support ${record2.sourceRef || record2.sourceEntityId} is not represented correctly in the SVG scene.`
    }));
  }
  return rows;
}

// tabs/model-converters/converters/component-topology/topology-parity-junction-boundary.js
function compareJunctionsToInput(canonical, parsed, ledger) {
  return (canonical.junctions ?? []).flatMap((junction) => {
    const expected = sortedText(junction.participatingEdgeIds ?? (canonical.edges ?? []).filter((edge) => edge.fromNodeId === junction.nodeId || edge.toNodeId === junction.nodeId).map((edge) => edge.id));
    const actual = parsedIncidentEdges(parsed, junction.nodeId);
    return same(expected, actual) ? [] : [mismatch({
      category: "JUNCTION_MISMATCH_INPUTXML",
      canonicalIdentity: junction.id,
      expected: { canonicalNodeId: junction.nodeId, participatingEdgeIds: expected },
      actual: { canonicalNodeId: junction.nodeId, participatingEdgeIds: actual },
      sourceEntities: junction.sourceEntityIds,
      sourcePaths: junction.sourcePaths,
      decisionTrace: decisionTrace(ledger, junction.sourceEntityIds ?? [], [junction.id, junction.nodeId, ...expected]),
      recommendedOwnerModule: "topology-inputxml-writer.js",
      message: `InputXML graph participation for junction ${junction.id} differs from canonical topology.`
    })];
  });
}
function compareJunctionsToScene(canonical, scene, ledger) {
  const sceneMap = rowMap(scene.junctions, (row) => row.canonicalJunctionId);
  return (canonical.junctions ?? []).flatMap((junction) => {
    const actual = sceneMap.get(junction.id);
    const expectedValue = {
      canonicalNodeId: junction.nodeId,
      kind: cleanText(junction.kind),
      participatingEdgeIds: sortedText(junction.participatingEdgeIds),
      sourceEntityIds: sortedText(junction.sourceEntityIds)
    };
    const actualValue = actual ? {
      canonicalNodeId: actual.canonicalNodeId,
      kind: cleanText(actual.kind),
      participatingEdgeIds: sortedText(actual.participatingCanonicalEdgeIds),
      sourceEntityIds: sortedText(actual.sourceEntityIds)
    } : null;
    return same(expectedValue, actualValue) ? [] : [mismatch({
      category: "JUNCTION_MISMATCH_SVG",
      canonicalIdentity: junction.id,
      svgIdentity: actual?.id ?? null,
      expected: expectedValue,
      actual: actualValue,
      sourceEntities: junction.sourceEntityIds,
      sourcePaths: junction.sourcePaths,
      decisionTrace: decisionTrace(ledger, junction.sourceEntityIds ?? [], [junction.id, junction.nodeId]),
      recommendedOwnerModule: "topology-svg-scene-builder.js",
      message: `SVG junction ${junction.id} differs from canonical junction participation.`
    })];
  });
}
function compareBoundariesToInput(canonical, parsed, ledger) {
  return (canonical.boundaries ?? []).flatMap((boundary) => {
    const expected = sortedText(boundary.participatingEdgeIds ?? (canonical.edges ?? []).filter((edge) => edge.fromNodeId === boundary.nodeId || edge.toNodeId === boundary.nodeId).map((edge) => edge.id));
    const actual = parsedIncidentEdges(parsed, boundary.nodeId);
    return same(expected, actual) ? [] : [mismatch({
      category: "BOUNDARY_MISMATCH_INPUTXML",
      canonicalIdentity: boundary.id,
      expected: { canonicalNodeId: boundary.nodeId, participatingEdgeIds: expected, relationship: boundary.relationship },
      actual: { canonicalNodeId: boundary.nodeId, participatingEdgeIds: actual },
      sourceEntities: boundary.sourceEntityIds,
      sourcePaths: boundary.sourcePaths,
      decisionTrace: decisionTrace(ledger, boundary.sourceEntityIds ?? [], [boundary.id, boundary.nodeId]),
      recommendedOwnerModule: "topology-inputxml-writer.js",
      message: `InputXML terminal incidence for boundary ${boundary.id} differs from canonical topology.`
    })];
  });
}
function compareBoundariesToScene(canonical, scene, ledger) {
  const map = rowMap(scene.boundaries, (row) => row.canonicalBoundaryId);
  return (canonical.boundaries ?? []).flatMap((boundary) => {
    const actual = map.get(boundary.id);
    const expected = {
      canonicalNodeId: boundary.nodeId,
      position: pointAt(boundary.position),
      relationship: cleanText(boundary.relationship),
      participatingEdgeIds: sortedText(boundary.participatingEdgeIds)
    };
    const actualValue = actual ? {
      canonicalNodeId: actual.canonicalNodeId,
      position: pointAt(actual.position),
      relationship: cleanText(actual.relationship),
      participatingEdgeIds: sortedText(actual.participatingCanonicalEdgeIds)
    } : null;
    return same(expected, actualValue) ? [] : [mismatch({
      category: actual ? "BOUNDARY_MISMATCH_SVG" : "MISSING_IN_SVG_BOUNDARY",
      canonicalIdentity: boundary.id,
      svgIdentity: actual?.id ?? null,
      expected,
      actual: actualValue,
      sourceEntities: boundary.sourceEntityIds,
      sourcePaths: boundary.sourcePaths,
      decisionTrace: decisionTrace(ledger, boundary.sourceEntityIds ?? [], [boundary.id, boundary.nodeId]),
      recommendedOwnerModule: "topology-svg-scene-builder.js",
      message: `SVG boundary ${boundary.id} differs from canonical boundary.`
    })];
  });
}
function comparePointFeaturesToScene(canonical, scene, ledger) {
  const map = rowMap(scene.pointFeatures, (row) => row.canonicalPointFeatureId);
  return (canonical.pointFeatures ?? []).flatMap((feature) => {
    const actual = map.get(feature.id);
    const expected = { kind: feature.kind, position: pointAt(feature.position), sourceEntityIds: sortedText(feature.sourceEntityIds) };
    const actualValue = actual ? { kind: actual.kind, position: pointAt(actual.position), sourceEntityIds: sortedText(actual.sourceEntityIds) } : null;
    return same(expected, actualValue) ? [] : [mismatch({
      category: actual ? "POINT_FEATURE_MISMATCH_SVG" : "MISSING_IN_SVG_POINT_FEATURE",
      canonicalIdentity: feature.id,
      svgIdentity: actual?.id ?? null,
      expected,
      actual: actualValue,
      sourceEntities: feature.sourceEntityIds,
      sourcePaths: feature.sourcePaths,
      decisionTrace: decisionTrace(ledger, feature.sourceEntityIds ?? [], [feature.id]),
      recommendedOwnerModule: "topology-svg-scene-builder.js",
      message: `SVG point feature ${feature.id} differs from canonical point-feature disposition.`
    })];
  });
}

// tabs/model-converters/converters/component-topology/topology-parity-comparisons.js
function compareCanonicalToInputXml(canonical, parsed, ledger = { records: [] }) {
  return [
    ...compareCanonicalEdgeNodeToInputXml(canonical, parsed, ledger),
    ...compareSupportsToInput(canonical, parsed, ledger),
    ...compareRigidsToInput(canonical, parsed, ledger),
    ...compareJunctionsToInput(canonical, parsed, ledger),
    ...compareBoundariesToInput(canonical, parsed, ledger),
    ...compareDeferredToInput(canonical, parsed, ledger)
  ];
}
function compareCanonicalToSvgScene(canonical, scene, ledger = { records: [] }) {
  return [
    ...compareCanonicalEdgeNodeToSvgScene(canonical, scene, ledger),
    ...compareSupportsToScene(canonical, scene, ledger),
    ...compareRigidsToScene(canonical, scene, ledger),
    ...compareJunctionsToScene(canonical, scene, ledger),
    ...compareBoundariesToScene(canonical, scene, ledger),
    ...comparePointFeaturesToScene(canonical, scene, ledger),
    ...compareDeferredToScene(canonical, scene, ledger)
  ];
}
function compareInputXmlToSvgScene(parsed, scene) {
  return compareInputXmlEdgeNodeToSvgScene(parsed, scene);
}

// tabs/model-converters/converters/component-topology/topology-parity-report.js
function buildTopologyParityReport(input) {
  const canonical = input.canonicalTopology ?? input.canonical;
  const parsed = input.parsedInputXmlTopology ?? input.parsedInputXml ?? input.inputXml;
  const scene = input.topologySvgScene ?? input.svgScene;
  const ledger = input.traceLedger ?? input.ledger ?? { records: [] };
  if (canonical?.schema !== "CanonicalTopology.v1") throw new TypeError("Topology parity requires CanonicalTopology.v1.");
  if (parsed?.schema !== "ParsedInputXmlTopology.v1") throw new TypeError("Topology parity requires ParsedInputXmlTopology.v1.");
  if (scene?.schema !== "TopologySvgScene.v1") throw new TypeError("Topology parity requires TopologySvgScene.v1.");
  const raw = [
    ...compareCanonicalToInputXml(canonical, parsed, ledger),
    ...compareCanonicalToSvgScene(canonical, scene, ledger),
    ...compareInputXmlToSvgScene(parsed, scene)
  ];
  if (cleanText(canonical.canonicalTopologyHash) !== cleanText(parsed.canonicalTopologyHash)) raw.unshift(mismatch({
    category: "STALE_HASH_INPUTXML",
    canonicalIdentity: canonical.canonicalTopologyHash,
    inputXmlIdentity: parsed.canonicalTopologyHash,
    expected: canonical.canonicalTopologyHash,
    actual: parsed.canonicalTopologyHash,
    recommendedOwnerModule: "topology-inputxml-writer.js",
    message: "InputXML canonical topology hash is missing or stale."
  }));
  if (cleanText(canonical.canonicalTopologyHash) !== cleanText(scene.canonicalTopologyHash)) raw.unshift(mismatch({
    category: "STALE_HASH_SVG",
    canonicalIdentity: canonical.canonicalTopologyHash,
    svgIdentity: scene.canonicalTopologyHash,
    expected: canonical.canonicalTopologyHash,
    actual: scene.canonicalTopologyHash,
    recommendedOwnerModule: "topology-svg-scene-builder.js",
    message: "SVG scene canonical topology hash is missing or stale."
  }));
  for (const parserIssue of parsed.issues ?? []) raw.push(mismatch({
    category: `INPUTXML_PARSE_${parserIssue.category}`,
    inputXmlIdentity: parserIssue.inputXmlElementId ?? parserIssue.inputXmlChildId ?? null,
    expected: "complete explicit topology identity",
    actual: parserIssue,
    recommendedOwnerModule: "topology-inputxml-topology-parser.js",
    message: parserIssue.message
  }));
  const mismatches = Object.freeze(raw.map((row, index) => Object.freeze({ id: `TPM-${String(index + 1).padStart(6, "0")}`, ...row })));
  const count = (predicate) => mismatches.filter(predicate).length;
  const summary = Object.freeze({
    canonicalNodes: canonical.nodes?.length ?? 0,
    canonicalEdges: canonical.edges?.length ?? 0,
    inputXmlNodes: parsed.nodes?.length ?? 0,
    inputXmlElements: parsed.elements?.length ?? 0,
    svgNodes: scene.nodes?.length ?? 0,
    svgEdges: scene.edges?.length ?? 0,
    supports: canonical.supports?.length ?? 0,
    rigids: canonicalRigidGroups(canonical).size,
    junctions: canonical.junctions?.length ?? 0,
    deferredRecords: deferredRecords(ledger).length,
    topologyMismatchCount: mismatches.length,
    missingInInputXml: count((row) => row.category.includes("MISSING_IN_INPUTXML")),
    missingInSvg: count((row) => row.category.includes("MISSING_IN_SVG")),
    extraInInputXml: count((row) => row.category.includes("EXTRA_IN_INPUTXML")),
    extraInSvg: count((row) => row.category.includes("EXTRA_IN_SVG")),
    incidenceMismatch: count((row) => row.category.includes("INCIDENCE_MISMATCH")),
    coordinateMismatch: count((row) => row.category.includes("COORDINATE_MISMATCH")),
    supportMismatch: count((row) => row.category.includes("SUPPORT")),
    rigidMismatch: count((row) => row.category.includes("RIGID")),
    junctionMismatch: count((row) => row.category.includes("JUNCTION")),
    mismatches: mismatches.length
  });
  const report = Object.freeze({
    schema: "TopologyParityReport.v1",
    hashAlgorithm: TOPOLOGY_HASH_ALGORITHM,
    canonicalTopologyHash: canonical.canonicalTopologyHash || deterministicHash(canonical),
    inputXmlHash: parsed.inputXmlHash,
    parsedInputXmlTopologyHash: parsed.parsedInputXmlTopologyHash,
    svgSceneHash: scene.svgSceneHash,
    topologyTraceLedgerHash: ledger.topologyTraceLedgerHash || deterministicHash(ledger),
    normalization: Object.freeze({
      coordinateUnit: "mm",
      inputXmlGlobalCoordinateDecimals: GLOBAL_DECIMALS2,
      inputXmlDeltaDecimals: DELTA_DECIMALS2,
      svgWorldCoordinates: "CanonicalTopology.v1 unprojected world coordinates",
      toleranceMm: 0,
      toleranceJustification: "Exact equality after deterministic writer-precision normalization."
    }),
    ok: mismatches.length === 0,
    status: mismatches.length === 0 ? "PASS" : "FAIL",
    summary,
    nodeComparison: Object.freeze({ canonical: summary.canonicalNodes, inputXml: summary.inputXmlNodes, svg: summary.svgNodes }),
    edgeComparison: Object.freeze({ canonical: summary.canonicalEdges, inputXml: summary.inputXmlElements, svg: summary.svgEdges }),
    supportComparison: Object.freeze({ canonical: summary.supports, mismatchCount: summary.supportMismatch }),
    rigidComparison: Object.freeze({ canonical: summary.rigids, mismatchCount: summary.rigidMismatch }),
    junctionComparison: Object.freeze({ canonical: summary.junctions, mismatchCount: summary.junctionMismatch }),
    mismatches
  });
  return stampArtifactHash(report, "topologyParityReportHash");
}
function topologyParityMismatchesCsv(report) {
  const headers = ["Mismatch ID", "Severity", "Category", "Canonical ID", "InputXML ID", "SVG ID", "Expected", "Actual", "Source entities", "Source paths", "Recommended owner"];
  const quote = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const rows = (report.mismatches ?? []).map((row) => [
    row.id,
    row.severity,
    row.category,
    typeof row.canonicalIdentity === "string" ? row.canonicalIdentity : JSON.stringify(row.canonicalIdentity),
    typeof row.inputXmlIdentity === "string" ? row.inputXmlIdentity : JSON.stringify(row.inputXmlIdentity),
    typeof row.svgIdentity === "string" ? row.svgIdentity : JSON.stringify(row.svgIdentity),
    JSON.stringify(row.expected),
    JSON.stringify(row.actual),
    (row.sourceEntities ?? []).join("|"),
    (row.sourcePaths ?? []).join("|"),
    row.recommendedOwnerModule
  ]);
  return `${[headers, ...rows].map((row) => row.map(quote).join(",")).join("\n")}
`;
}
var TopologyParityError = class extends Error {
  constructor(report) {
    super(`Topology parity failed with ${report.summary?.topologyMismatchCount ?? report.mismatches?.length ?? "unknown"} mismatch(es).`);
    this.name = "TopologyParityError";
    this.report = report;
  }
};

// tabs/model-converters/converters/component-topology/topology-parity-engine.js
var TOPOLOGY_PARITY_NORMALIZATION = Object.freeze({
  globalCoordinateDecimals: 3,
  deltaDecimals: 6,
  toleranceMm: 0
});

// tabs/model-converters/converters/component-topology/topology-artifact-exporter.js
function componentCounts(model) {
  const counts = {};
  for (const component of model.components) {
    const category = componentCategory(component.sourceType);
    counts[category] = (counts[category] ?? 0) + 1;
  }
  return counts;
}
function referenceCounts(model) {
  const branchNames = new Set(model.branches.map((branch) => cleanText(branch.name)));
  const componentAliases = new Set(model.components.flatMap((component) => [component.sourceRef, component.name]).map(cleanText).filter(Boolean));
  const branchReferences = model.branches.flatMap((branch) => ["HREF", "TREF"].flatMap((field) => {
    const value = cleanText(branch.attributes[field]);
    return value ? [{ value, resolved: branchNames.has(value) || componentAliases.has(value) }] : [];
  }));
  const crefReferences = model.components.flatMap((component) => {
    const value = cleanText(component.attributes.CREF);
    return value ? [{ value, resolved: branchNames.has(value) }] : [];
  });
  return {
    cref: crefReferences.length,
    resolvedCref: crefReferences.filter((row) => row.resolved).length,
    hrefTref: branchReferences.length,
    resolvedHrefTref: branchReferences.filter((row) => row.resolved).length,
    externalReferences: branchReferences.filter((row) => !row.resolved).length
  };
}
function artifactMetrics(model, canonical, ledger, engineering, parsed, scene, parity, toleranceMm) {
  const nodes = new Map(canonical.nodes.map((node) => [node.id, node]));
  const zeroLengthEdges = canonical.edges.filter((edge) => pointDistance(
    nodes.get(edge.fromNodeId)?.position ?? null,
    nodes.get(edge.toNodeId)?.position ?? null
  ) <= toleranceMm).length;
  return Object.freeze({
    source: Object.freeze({
      branches: model.branches.length,
      childRecords: model.components.length,
      routeComponents: model.components.filter((component) => component.isRouteComponent).length,
      supports: model.components.filter((component) => componentCategory(component.sourceType) === "SUPPORT").length,
      componentCounts: Object.freeze(componentCounts(model))
    }),
    references: Object.freeze(referenceCounts(model)),
    canonical: Object.freeze({
      nodes: canonical.nodes.length,
      edges: canonical.edges.length,
      pointFeatures: canonical.pointFeatures.length,
      junctions: canonical.junctions.length,
      boundaries: canonical.boundaries.length,
      supports: canonical.supports.length,
      rigids: canonical.rigids.length,
      zeroLengthEdges
    }),
    ledger: Object.freeze({
      records: ledger.records.length,
      routeRecords: ledger.summary.routeRecords,
      blockedRecords: ledger.summary.blockedRecords,
      deferredSupports: ledger.records.filter((row) => row.primaryDisposition === "DEFER_SUPPORT").length
    }),
    engineering: engineering.metrics,
    inputXml: Object.freeze({
      elements: canonical.edges.length,
      restraints: canonical.supports.reduce((sum, support) => sum + support.restraints.length, 0),
      rigids: new Set(canonical.rigids.map((rigid) => rigid.edgeId)).size,
      rigidBodies: canonical.rigids.length
    }),
    parsedInputXml: Object.freeze({
      nodes: parsed.nodes.length,
      elements: parsed.elements.length,
      restraints: parsed.restraints.length,
      rigids: parsed.rigids.length,
      parseIssues: parsed.issues.length
    }),
    svgScene: scene.summary,
    parity: parity.summary
  });
}
async function buildProducerState(sourceText, options) {
  const model = await buildTopologySourceModel(sourceText, {
    sourceName: options.sourceName,
    toleranceMm: options.toleranceMm
  });
  const engineering = buildTopologyEngineeringProjection(sourceText, model, {
    enrichmentConfig: options.enrichmentConfig
  });
  const connectivity = buildExplicitConnectivity(model, options.toleranceMm);
  const builtCanonical = buildCanonicalTopology(
    model,
    connectivity,
    engineering,
    options.toleranceMm,
    options.supportProjectionToleranceMm
  );
  const canonicalTopology = stampArtifactHash(
    enrichCanonicalTopologyIdentity(builtCanonical, model),
    "canonicalTopologyHash"
  );
  return Object.freeze({ model, engineering, canonicalTopology });
}
function buildArtifactsFromState(state, options, editMetadata, failOnParity) {
  const { model, engineering, canonicalTopology } = state;
  const builtLedger = buildTopologyTraceLedger(model, canonicalTopology);
  const traceLedger = stampArtifactHash(enrichTopologyTraceLedgerIdentity(
    builtLedger,
    canonicalTopology,
    model,
    engineering,
    {
      sourceName: options.sourceName,
      topologyToleranceMm: options.toleranceMm,
      supportProjectionToleranceMm: options.supportProjectionToleranceMm
    }
  ), "topologyTraceLedgerHash");
  const topologyInputXml = buildTopologyInputXml(canonicalTopology, engineering, {
    jobName: options.jobName,
    topologyTraceLedgerHash: traceLedger.topologyTraceLedgerHash,
    topologyEditDraftHash: editMetadata?.editDraft?.topologyEditDraftHash,
    topologyEditLedgerHash: editMetadata?.editLedger?.topologyEditLedgerHash
  });
  const parsedInputXmlTopology = parseTopologyInputXml(topologyInputXml);
  const topologySvgScene = buildTopologySvgScene(canonicalTopology, traceLedger, []);
  const topologyParityReport = buildTopologyParityReport({
    canonicalTopology,
    traceLedger,
    parsedInputXmlTopology,
    topologySvgScene
  });
  const metrics = artifactMetrics(
    model,
    canonicalTopology,
    traceLedger,
    engineering,
    parsedInputXmlTopology,
    topologySvgScene,
    topologyParityReport,
    options.toleranceMm
  );
  const artifacts = Object.freeze({
    sourceIdentity: model.sourceIdentity,
    canonicalTopology,
    traceLedger,
    topologyInputXml,
    parsedInputXmlTopology,
    topologySvgScene,
    topologyParityReport,
    topologyParityMismatchesCsv: topologyParityMismatchesCsv(topologyParityReport),
    metrics,
    buildIssues: canonicalTopology.buildIssues,
    ...editMetadata ?? {}
  });
  if (failOnParity && !topologyParityReport.ok) throw new TopologyParityError(topologyParityReport);
  return artifacts;
}
async function buildComponentTopologyArtifacts(sourceText, options) {
  const state = await buildProducerState(sourceText, options);
  return buildArtifactsFromState(state, options, null, true);
}
async function buildEditedComponentTopologyArtifacts(sourceText, draft, options) {
  const baseState = await buildProducerState(sourceText, options);
  const materialized = materializeTopologyEditDraft(baseState.canonicalTopology, draft);
  const editValidation = materialized.validation;
  const state = Object.freeze({
    ...baseState,
    canonicalTopology: materialized.canonicalTopology
  });
  const artifacts = buildArtifactsFromState(state, options, {
    editDraft: draft,
    editLedger: materialized.editLedger,
    editValidation
  }, false);
  const parityBlocking = artifacts.topologyParityReport.ok ? [] : [Object.freeze({
    code: "TOPOLOGY_PARITY_BLOCKING",
    blocking: true,
    message: `${artifacts.topologyParityReport.summary.topologyMismatchCount} independent topology parity mismatches remain.`,
    objectIds: Object.freeze([])
  })];
  const combinedFindings = Object.freeze([...editValidation.findings, ...parityBlocking]);
  const blockingCount = combinedFindings.filter((finding3) => finding3.blocking).length;
  return Object.freeze({
    ...artifacts,
    editValidation: Object.freeze({
      ...editValidation,
      ok: blockingCount === 0,
      findings: combinedFindings,
      summary: Object.freeze({ findingCount: combinedFindings.length, blockingCount })
    })
  });
}
function topologyArtifactOutputs(artifacts, options) {
  const outputs = [
    Object.freeze({
      name: `${options.stem}.canonical-topology.json`,
      text: `${JSON.stringify(artifacts.canonicalTopology, null, 2)}
`,
      mime: "application/json;charset=utf-8"
    }),
    Object.freeze({
      name: `${options.stem}.topology-trace-ledger.json`,
      text: `${JSON.stringify(artifacts.traceLedger, null, 2)}
`,
      mime: "application/json;charset=utf-8"
    }),
    Object.freeze({
      name: `${options.stem}.topology.input.xml`,
      text: artifacts.topologyInputXml,
      mime: "application/xml;charset=utf-8"
    }),
    Object.freeze({
      name: `${options.stem}.topology-svg-scene.json`,
      text: `${JSON.stringify(artifacts.topologySvgScene, null, 2)}
`,
      mime: "application/json;charset=utf-8"
    }),
    Object.freeze({
      name: `${options.stem}.parsed-inputxml-topology.json`,
      text: `${JSON.stringify(artifacts.parsedInputXmlTopology, null, 2)}
`,
      mime: "application/json;charset=utf-8"
    }),
    Object.freeze({
      name: `${options.stem}.topology-parity-report.json`,
      text: `${JSON.stringify(artifacts.topologyParityReport, null, 2)}
`,
      mime: "application/json;charset=utf-8"
    }),
    Object.freeze({
      name: `${options.stem}.topology-parity-mismatches.csv`,
      text: artifacts.topologyParityMismatchesCsv,
      mime: "text/csv;charset=utf-8"
    })
  ];
  if (artifacts.editDraft) outputs.unshift(Object.freeze({
    name: `${options.stem}.topology-edit-draft.json`,
    text: `${JSON.stringify(artifacts.editDraft, null, 2)}
`,
    mime: "application/json;charset=utf-8"
  }));
  if (artifacts.editLedger) outputs.push(Object.freeze({
    name: `${options.stem}.topology-edit-ledger.json`,
    text: `${JSON.stringify(artifacts.editLedger, null, 2)}
`,
    mime: "application/json;charset=utf-8"
  }));
  return Object.freeze(outputs);
}
var _test15 = Object.freeze({
  componentCounts,
  referenceCounts,
  artifactMetrics,
  buildProducerState,
  buildArtifactsFromState
});

// tabs/model-converters/converters/component-topology/topology-browser-core.js
var TOPOLOGY_BROWSER_CORE_CONTRACT = Object.freeze({
  schema: "TopologyBrowserCore.v1",
  canonicalSchema: "CanonicalTopology.v1",
  draftSchema: "TopologyEditDraft.v1",
  commandSchema: "TopologyEditCommand.v1",
  editLedgerSchema: "TopologyEditLedger.v1",
  geometryDiagnosticsSchema: "TopologyGeometryDiagnostics.v1"
});
export {
  TOPOLOGY_BROWSER_CORE_CONTRACT,
  TOPOLOGY_EDIT_COMMAND_TYPES,
  TOPOLOGY_GEOMETRY_ISSUE_STYLES,
  appendTopologyEditCommand,
  buildComponentTopologyArtifacts,
  buildEditedComponentTopologyArtifacts,
  createTopologyEditDraft,
  materializeTopologyEditDraft,
  redoTopologyEditCommand,
  topologyArtifactOutputs,
  undoTopologyEditCommand,
  validateEditedTopology,
  validateTopologyGeometry
};

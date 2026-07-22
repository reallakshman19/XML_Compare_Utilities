export const PIPELINE_PROPERTY_SECTION_PLAN_SCHEMA = 'PipelinePropertySectionPlan.v1';
export const PIPELINE_PROPERTY_SECTION_SCHEMA = 'PipelinePropertySection.v1';
export const PIPELINE_ELEMENT_PROPERTY_RESOLUTION_SCHEMA = 'PipelineElementPropertyResolution.v1';

const FIELD_DEFS = Object.freeze([
  Object.freeze({ key: 'diameter', xml: 'DIAMETER', aliases: ['diameter', 'boreMm'], domain: 'positive' }),
  Object.freeze({ key: 'wallThickness', xml: 'WALL_THICK', aliases: ['wallThickness'], domain: 'nonNegative' }),
  Object.freeze({ key: 'insulationThickness', xml: 'INSUL_THICK', aliases: ['insulationThickness'], domain: 'nonNegative' }),
  Object.freeze({ key: 'corrosionAllowance', xml: 'CORR_ALLOW', aliases: ['corrosionAllowance'], domain: 'nonNegative' }),
  ...Array.from({ length: 9 }, (_, index) => Object.freeze({
    key: `temperature${index + 1}`, xml: `TEMP_EXP_C${index + 1}`,
    aliases: [`temperature${index + 1}`, `t${index + 1}`], domain: 'finite',
  })),
  ...Array.from({ length: 9 }, (_, index) => Object.freeze({
    key: `pressure${index + 1}`, xml: `PRESSURE_C${index + 1}`,
    aliases: [`pressure${index + 1}`, `p${index + 1}`], domain: 'nonNegative',
  })),
  Object.freeze({ key: 'hydroPressure', xml: 'HYDRO_PRESSURE', aliases: ['hydroPressure'], domain: 'nonNegative' }),
  Object.freeze({ key: 'insulationDensity', xml: 'INSUL_DENSITY', aliases: ['insulationDensity'], domain: 'nonNegative' }),
  Object.freeze({ key: 'fluidDensity', xml: 'FLUID_DENSITY', aliases: ['fluidDensity'], domain: 'nonNegative' }),
  Object.freeze({ key: 'materialNumber', xml: 'MATERIAL_NUM', aliases: ['materialNumber', 'materialCode'], domain: 'integerNonNegative' }),
]);

function text(value) {
  return String(value ?? '').trim();
}

function diagnostic(code, message, details = {}) {
  return Object.freeze({
    severity: 'BLOCKING', code, message, details: Object.freeze({ ...details }),
  });
}

function candidateValue(source, definition) {
  for (const alias of definition.aliases) {
    if (Object.prototype.hasOwnProperty.call(source, alias)) return source[alias];
  }
  return undefined;
}

function validNumber(value, domain) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  if (domain === 'positive' && number <= 0) return null;
  if (domain === 'nonNegative' && number < 0) return null;
  if (domain === 'integerNonNegative' && (!Number.isInteger(number) || number < 0)) return null;
  return number;
}

function normalizedSource(input = {}) {
  const source = { ...(input?.properties || {}), ...(input || {}) };
  const temperatures = Array.isArray(input?.properties?.temperatures)
    ? input.properties.temperatures : input?.temperatures;
  const pressures = Array.isArray(input?.properties?.pressures)
    ? input.properties.pressures : input?.pressures;
  (temperatures || []).forEach((value, index) => { source[`temperature${index + 1}`] = value; });
  (pressures || []).forEach((value, index) => { source[`pressure${index + 1}`] = value; });
  return source;
}

function parseExplicit(input, sourceName) {
  const source = normalizedSource(input);
  const values = {};
  const diagnostics = [];
  for (const definition of FIELD_DEFS) {
    const raw = candidateValue(source, definition);
    if (raw === undefined || raw === null || text(raw) === '') continue;
    const value = validNumber(raw, definition.domain);
    if (value === null) {
      diagnostics.push(diagnostic(
        'PIPELINE_PROPERTY_VALUE_INVALID',
        `${definition.xml} has an invalid numeric value.`,
        { propertyName: definition.xml, value: raw, source: sourceName },
      ));
      continue;
    }
    values[definition.key] = value;
  }
  return Object.freeze({ values: Object.freeze(values), diagnostics: Object.freeze(diagnostics) });
}

function propertyShape(flat = {}) {
  return Object.freeze({
    diameter: flat.diameter ?? null,
    wallThickness: flat.wallThickness ?? null,
    insulationThickness: flat.insulationThickness ?? null,
    corrosionAllowance: flat.corrosionAllowance ?? null,
    temperatures: Object.freeze(Array.from({ length: 9 }, (_, index) => flat[`temperature${index + 1}`] ?? null)),
    pressures: Object.freeze(Array.from({ length: 9 }, (_, index) => flat[`pressure${index + 1}`] ?? null)),
    hydroPressure: flat.hydroPressure ?? null,
    insulationDensity: flat.insulationDensity ?? null,
    fluidDensity: flat.fluidDensity ?? null,
    materialNumber: flat.materialNumber ?? null,
  });
}

function changedValues(previous, explicit) {
  return Object.freeze(Object.fromEntries(
    Object.entries(explicit).filter(([key, value]) => previous[key] !== value),
  ));
}

function sectionStart(input, elementCount, diagnostics) {
  const start = Number(input?.startElementIndex);
  if (!Number.isInteger(start) || start <= 0 || start >= elementCount) {
    diagnostics.push(diagnostic(
      'PIPELINE_PROPERTY_SECTION_START_INVALID',
      'A property-section override must start on an existing element after E1.',
      { startElementIndex: input?.startElementIndex, elementCount },
    ));
    return null;
  }
  return start;
}

function uniqueOverrides(propertySections, elementCount, diagnostics) {
  const seen = new Set();
  const accepted = [];
  for (const source of propertySections || []) {
    const start = sectionStart(source, elementCount, diagnostics);
    if (start === null) continue;
    if (seen.has(start)) {
      diagnostics.push(diagnostic(
        'PIPELINE_PROPERTY_SECTION_DUPLICATE',
        `Property-section element index ${start} is duplicated.`,
        { startElementIndex: start },
      ));
      continue;
    }
    seen.add(start);
    accepted.push({ source, start });
  }
  return accepted.sort((left, right) => left.start - right.start);
}

function baseRequiredDiagnostics(effective, elementCount) {
  if (!elementCount) return [];
  const diagnostics = [];
  if (effective.diameter == null) diagnostics.push(diagnostic(
    'PIPELINE_DIAMETER_REQUIRED', 'The first element of the LINE scope requires a positive DIAMETER.',
  ));
  if (effective.wallThickness == null) diagnostics.push(diagnostic(
    'PIPELINE_WALL_THICKNESS_REQUIRED', 'The first element of the LINE scope requires a finite nonnegative WALL_THICK.',
  ));
  return diagnostics;
}

function buildSections(branchInfo, coordinateRows, propertySections, diagnostics) {
  const elementCount = Math.max(0, coordinateRows.length - 1);
  if (!elementCount) return [];
  const base = parseExplicit(branchInfo, 'BASE_BRANCH_INFO');
  diagnostics.push(...base.diagnostics, ...baseRequiredDiagnostics(base.values, elementCount));
  const sections = [];
  let effective = { ...base.values };
  let sources = Object.fromEntries(Object.keys(effective).map((key) => [key, 'BASE_BRANCH_INFO']));
  sections.push({ start: 0, source: 'BASE_BRANCH_INFO', explicit: { ...base.values }, effective: { ...effective }, sources: { ...sources } });
  for (const override of uniqueOverrides(propertySections, elementCount, diagnostics)) {
    const parsed = parseExplicit(override.source, 'SECTION_OVERRIDE');
    diagnostics.push(...parsed.diagnostics);
    const changed = changedValues(effective, parsed.values);
    if (!Object.keys(changed).length) {
      diagnostics.push(diagnostic(
        'PIPELINE_PROPERTY_SECTION_NO_CHANGE',
        `Property section at element index ${override.start} does not change the effective property set.`,
        { startElementIndex: override.start },
      ));
      continue;
    }
    effective = { ...effective, ...changed };
    sources = { ...sources, ...Object.fromEntries(Object.keys(changed).map((key) => [key, 'SECTION_OVERRIDE'])) };
    sections.push({ start: override.start, source: 'SECTION_OVERRIDE', explicit: { ...changed }, effective: { ...effective }, sources: { ...sources } });
  }
  return sections;
}

function frozenSection(section, index, coordinateRows) {
  return Object.freeze({
    schema: PIPELINE_PROPERTY_SECTION_SCHEMA,
    sectionId: `S${index + 1}`,
    startElementIndex: section.start,
    startNode: Number(coordinateRows[section.start]?.nodeNumber),
    source: section.source,
    explicitProperties: propertyShape(section.explicit),
    effectiveProperties: propertyShape(section.effective),
    effectiveSources: Object.freeze({ ...section.sources }),
    explicitPropertyNames: Object.freeze(Object.keys(section.explicit).map((key) => FIELD_DEFS.find((item) => item.key === key)?.xml || key)),
  });
}

function elementResolutions(sections, elementCount) {
  const result = [];
  let sectionIndex = 0;
  for (let elementIndex = 0; elementIndex < elementCount; elementIndex += 1) {
    if (sectionIndex + 1 < sections.length && sections[sectionIndex + 1].startElementIndex === elementIndex) sectionIndex += 1;
    const section = sections[sectionIndex];
    const isStart = section.startElementIndex === elementIndex;
    result.push(Object.freeze({
      schema: PIPELINE_ELEMENT_PROPERTY_RESOLUTION_SCHEMA,
      elementIndex,
      elementId: `E${elementIndex + 1}`,
      sectionId: section.sectionId,
      propertyDisposition: isStart ? 'SECTION_START' : 'INHERITED',
      properties: section.effectiveProperties,
      emittedProperties: isStart ? section.explicitProperties : propertyShape(),
      effectiveSources: section.effectiveSources,
    }));
  }
  return Object.freeze(result);
}

function uniqueDiagnostics(items) {
  const keys = new Set();
  return items.filter((item) => {
    const key = `${item.code}:${JSON.stringify(item.details)}`;
    if (keys.has(key)) return false;
    keys.add(key);
    return true;
  });
}

export function resolvePipelinePropertySectionPlan({
  branchInfo = {}, coordinateRows = [], propertySections = [],
} = {}) {
  const diagnostics = [];
  const rawSections = buildSections(branchInfo, coordinateRows, propertySections, diagnostics);
  const sections = Object.freeze(rawSections.map((section, index) => frozenSection(section, index, coordinateRows)));
  const elements = elementResolutions(sections, Math.max(0, coordinateRows.length - 1));
  const frozenDiagnostics = Object.freeze(uniqueDiagnostics(diagnostics));
  return Object.freeze({
    schema: PIPELINE_PROPERTY_SECTION_PLAN_SCHEMA,
    lineNo: text(branchInfo.lineNo),
    sectionCount: sections.length,
    sections,
    elements,
    diagnostics: frozenDiagnostics,
    blockerCodes: Object.freeze([...new Set(frozenDiagnostics.map((item) => item.code))]),
    ready: frozenDiagnostics.length === 0,
  });
}

export function buildPipelinePropertySectionPlanJson(plan) {
  return JSON.stringify(plan, null, 2);
}

function cell(value) {
  return value == null ? '' : String(value).replace(/[\t\r\n]/g, ' ');
}

export function buildPipelinePropertySectionLedgerText(plan) {
  const header = ['Schema', 'ElementId', 'SectionId', 'StartElementIndex', 'StartNode', 'PropertyName', 'ExplicitValue', 'EffectiveValue', 'Disposition', 'Source'];
  const rows = [];
  for (const resolution of plan?.elements || []) {
    const section = plan.sections.find((item) => item.sectionId === resolution.sectionId);
    for (const definition of FIELD_DEFS) {
      const effective = normalizedSource(resolution.properties)[definition.key];
      const explicit = normalizedSource(resolution.emittedProperties)[definition.key];
      const disposition = effective == null ? 'UNRESOLVED' : (explicit == null ? 'INHERITED' : 'EXPLICIT');
      rows.push([
        PIPELINE_PROPERTY_SECTION_PLAN_SCHEMA, resolution.elementId, resolution.sectionId,
        section?.startElementIndex, section?.startNode, definition.xml, explicit, effective,
        disposition, resolution.effectiveSources?.[definition.key] || '',
      ]);
    }
  }
  return [header, ...rows].map((row) => row.map(cell).join('\t')).join('\n');
}

export const _internal = Object.freeze({ FIELD_DEFS, parseExplicit, propertyShape, normalizedSource });
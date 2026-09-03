from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one exact anchor, found {count}')
    p.write_text(text.replace(old, new, 1))


# Scope resolver: build a document-wide index of already-qualified mutable fields.
p = Path('tabs/cii-workspace/cii-workspace-find-replace-scope-resolver.js')
text = p.read_text()
old_import = "import { V14_AUX_BLOCKS, canonicalAuxBlock, readAuxPointer, resolveV14AuxiliaryRecord } from './cii-workspace-find-replace-v14-aux-authority.js';"
new_import = "import { buildAuxPointerOwners, physicalSectionRefs, readAuxControlCount, V14_AUX_BLOCKS, canonicalAuxBlock, readAuxPointer, resolveV14AuxiliaryRecord } from './cii-workspace-find-replace-v14-aux-authority.js';"
if text.count(old_import) != 1:
    raise SystemExit('scope resolver aux import anchor mismatch')
text = text.replace(old_import, new_import, 1)

anchor = 'function documentSpans(lines) {'
if text.count(anchor) != 1:
    raise SystemExit('documentSpans anchor mismatch')
addition = r'''function smartSpan(span, metadata = {}) {
  return Object.freeze({ ...span, ...metadata });
}

function documentQualifiedFieldScope(lines) {
  const parsedElements = elementBlocks(lines);
  if (parsedElements.status !== 'PASS') return parsedElements;
  const spans = [];
  const skipped = [];

  for (const element of parsedElements.blocks) {
    const fields = elementMutableFieldSpans(element);
    if (fields.status !== 'PASS') return fields;
    for (const span of fields.spans) {
      if (span.fieldKind !== 'NUMERIC') continue;
      spans.push(smartSpan(span, {
        block: 'ELEMENTS', smartKind: 'NUMERIC',
        smartGroup: `ELEMENTS:${span.fieldIdentity || 'UNKNOWN'}`,
      }));
    }
  }

  const nodeNames = resolveDocumentNodeNameScope(lines, { sectionRefs, elementBlocks, exactElementBlock });
  if (nodeNames.status === 'PASS') {
    for (const span of nodeNames.spans) spans.push(smartSpan(span, {
      block: 'NODENAME', smartKind: 'NODENAME', smartGroup: 'NODENAME',
    }));
  } else {
    skipped.push(...(nodeNames.blockers || []).map((value) => `NODENAME:${value}`));
  }

  for (const [block, spec] of Object.entries(V14_AUX_BLOCKS)) {
    if (block === 'NODENAME' || block === 'FORCMNT') continue;
    const control = readAuxControlCount(lines, spec);
    if (control.status !== 'PASS') {
      skipped.push(...(control.blockers || []).map((value) => `${block}:${value}`));
      continue;
    }
    if (control.count === 0) continue;
    const section = physicalSectionRefs(lines, spec.section);
    if (section.status !== 'PASS') {
      skipped.push(...(section.blockers || []).map((value) => `${block}:${value}`));
      continue;
    }
    const expectedRows = control.count * spec.rowsPerRecord;
    if (section.refs.length !== expectedRows) {
      skipped.push(`${block}:AUX_SECTION_CARDINALITY_MISMATCH:${section.refs.length}:${expectedRows}`);
      continue;
    }
    const ownership = buildAuxPointerOwners(parsedElements.blocks, spec, control.count);
    if (ownership.blockers.length) {
      skipped.push(...ownership.blockers.map((value) => `${block}:${value}`));
      continue;
    }
    for (let pointer = 1; pointer <= control.count; pointer += 1) {
      const owners = ownership.owners.get(pointer) || [];
      if (owners.length !== 1) {
        if (owners.length > 1) skipped.push(`${block}:AUX_POINTER_SHARED:${pointer}:${owners.length}`);
        continue;
      }
      const start = (pointer - 1) * spec.rowsPerRecord;
      const refs = section.refs.slice(start, start + spec.rowsPerRecord);
      const fields = auxiliaryMutableFieldSpans(block, refs);
      if (fields.status !== 'PASS') {
        skipped.push(...(fields.blockers || []).map((value) => `${block}:${pointer}:${value}`));
        continue;
      }
      for (const span of fields.spans) {
        if (span.fieldKind !== 'NUMERIC') continue;
        spans.push(smartSpan(span, {
          block, pointer, ownerElementIndex: owners[0].elementIndex,
          smartKind: 'NUMERIC', smartGroup: `${block}:${span.fieldIdentity || 'UNKNOWN'}`,
        }));
      }
    }
  }

  return Object.freeze({
    status: 'PASS', scope: 'DOCUMENT', fieldAware: true, smartFieldAware: true,
    authority: 'CII_V14_DOCUMENT_QUALIFIED_MUTABLE_FIELD_INDEX',
    spans: Object.freeze(spans), blockers: Object.freeze([]),
    evidence: Object.freeze({
      elementCount: parsedElements.blocks.length,
      mutableSmartFieldCount: spans.length,
      skippedAuthorityCount: skipped.length,
      skippedAuthority: Object.freeze(skipped),
      excluded: Object.freeze(['FORCMNT', 'VARIABLE_LENGTH_TEXT']),
    }),
  });
}

'''
text = text.replace(anchor, addition + anchor, 1)
old_doc = """  if (scope === 'DOCUMENT') {
    if (options.smartFixedWidth === 'NODENAME') {
      return resolveDocumentNodeNameScope(lines, { sectionRefs, elementBlocks, exactElementBlock });
    }
    return Object.freeze({ status: 'PASS', scope, authority: 'TARGET0_PHYSICAL_LINE_BODIES', spans: documentSpans(lines), evidence: Object.freeze({ lineCount: lines.length }), blockers: Object.freeze([]) });
  }"""
new_doc = """  if (scope === 'DOCUMENT') {
    if (options.smartFixedWidth === 'QUALIFIED_FIELDS') return documentQualifiedFieldScope(lines);
    if (options.smartFixedWidth === 'NODENAME') {
      return resolveDocumentNodeNameScope(lines, { sectionRefs, elementBlocks, exactElementBlock });
    }
    return Object.freeze({ status: 'PASS', scope, authority: 'TARGET0_PHYSICAL_LINE_BODIES', spans: documentSpans(lines), evidence: Object.freeze({ lineCount: lines.length }), blockers: Object.freeze([]) });
  }"""
if text.count(old_doc) != 1:
    raise SystemExit('DOCUMENT scope anchor mismatch')
text = text.replace(old_doc, new_doc, 1)
p.write_text(text)


# Validator: resolve exact logical values against the qualified field index.
p = Path('tabs/cii-workspace/cii-workspace-find-replace-validator.js')
text = p.read_text()
old_import = "import { fieldAwareClaimPlan } from './cii-workspace-find-replace-v14-field-claims.js';"
new_import = "import { parseFortranNumber } from '../../parser/fixed-field.js';\nimport { fieldAwareClaimPlan } from './cii-workspace-find-replace-v14-field-claims.js';"
if text.count(old_import) != 1:
    raise SystemExit('validator import anchor mismatch')
text = text.replace(old_import, new_import, 1)

anchor = 'function overlapBlockers(claims) {'
if text.count(anchor) != 1:
    raise SystemExit('validator overlap anchor mismatch')
addition = r'''function sameNumericValue(left, right) {
  const a = parseFortranNumber(left); const b = parseFortranNumber(right);
  return Number.isFinite(a) && Number.isFinite(b) && Object.is(a, b);
}

function serializeNumericLogicalValue(valueInput, width) {
  const raw = String(valueInput ?? '').trim();
  const parsed = parseFortranNumber(raw);
  if (!Number.isFinite(parsed)) return { status: 'BLOCKED', blocker: 'SMART_NUMERIC_REPLACEMENT_REQUIRED' };
  if (raw.length > width) return { status: 'BLOCKED', blocker: `SMART_NUMERIC_REPLACEMENT_TOO_WIDE:${raw.length}:${width}` };
  return { status: 'PASS', value: raw.padStart(width, ' ') };
}

function smartDocumentQualifiedFieldPlan(target0, operation, findText, replaceText, sequence) {
  const resolution = resolveFindReplaceScope(target0, operation, {
    fieldAwareMutation: true,
    smartFixedWidth: 'QUALIFIED_FIELDS',
  });
  if (resolution?.status !== 'PASS') return null;
  const matched = [];
  for (const span of resolution.spans || []) {
    if (span.smartKind === 'NODENAME') {
      if (String(span.semanticValue ?? '').trim() === findText) matched.push(span);
      continue;
    }
    if (span.smartKind === 'NUMERIC' && sameNumericValue(span.semanticValue, findText)) matched.push(span);
  }
  if (!matched.length) return null;

  const groups = new Map();
  for (const span of matched) {
    const group = String(span.smartGroup || `${span.block || span.section || 'UNKNOWN'}:${span.fieldIdentity || 'UNKNOWN'}`);
    const list = groups.get(group) || [];
    list.push(span); groups.set(group, list);
  }
  if (groups.size !== 1) {
    return Object.freeze({
      resolution, matches: Object.freeze(matched), claims: Object.freeze([]),
      blockers: Object.freeze([`SMART_FIELD_AMBIGUOUS:${groups.size}:${[...groups.keys()].join('|')}`]),
      semanticMode: 'AUTO_CII_FIXED_WIDTH', block: 'AMBIGUOUS',
    });
  }

  const [group, spans] = [...groups.entries()][0];
  if (group === 'NODENAME') {
    const plan = nodeNameClaimPlan(target0, findText, replaceText, spans, sequence, resolution);
    const blockers = [...plan.blockers];
    if (asciiLength(findText) == null || asciiLength(replaceText) == null) blockers.unshift('NODENAME_ASCII_TEXT_REQUIRED');
    return Object.freeze({
      resolution, matches: Object.freeze([...plan.matches]), claims: Object.freeze([...plan.claims]),
      blockers: Object.freeze([...new Set(blockers)]), semanticMode: 'AUTO_NODENAME_FIXED_WIDTH', block: 'NODENAME',
    });
  }

  const claims = []; const blockers = [];
  for (const span of spans) {
    const start = Number(span.start); const end = Number(span.end); const width = end - start;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end <= start || end > target0.length) {
      blockers.push(`SMART_FIELD_RANGE_INVALID:${span.fieldIdentity || 'UNKNOWN'}`); continue;
    }
    const serialized = serializeNumericLogicalValue(replaceText, width);
    if (serialized.status !== 'PASS') { blockers.push(`${serialized.blocker}:${span.fieldIdentity || 'UNKNOWN'}`); continue; }
    const before = target0.slice(start, end);
    claims.push(Object.freeze({
      operationIndex: sequence, start, end, before, after: serialized.value,
      scope: 'DOCUMENT', block: span.block || span.section || null,
      authority: resolution.authority || null, fieldIdentity: span.fieldIdentity || null,
      fieldKind: 'NUMERIC', semanticGroup: group,
    }));
  }
  return Object.freeze({
    resolution, matches: Object.freeze(spans), claims: Object.freeze(claims),
    blockers: Object.freeze([...new Set(blockers)]), semanticMode: 'AUTO_CII_NUMERIC_FIXED_WIDTH',
    block: spans[0]?.block || spans[0]?.section || null,
  });
}

'''
text = text.replace(anchor, addition + anchor, 1)
old_plan = """    let smartDocument = null;
    if (!nodeName && scopeToken === 'DOCUMENT' && unequalFixedWidth && findBytes != null && replaceBytes != null) {
      smartDocument = smartDocumentNodeNamePlan(target0, operation, findText, replaceText, sequence);
    }"""
new_plan = """    let smartDocument = null;
    if (!nodeName && scopeToken === 'DOCUMENT' && unequalFixedWidth && findBytes != null && replaceBytes != null) {
      smartDocument = smartDocumentQualifiedFieldPlan(target0, operation, findText, replaceText, sequence);
    }"""
if text.count(old_plan) != 1:
    raise SystemExit('validator smart plan anchor mismatch')
text = text.replace(old_plan, new_plan, 1)
old_summary = """      block: smartDocument ? 'NODENAME' : operation?.block || null,
      semanticMode: smartDocument ? 'AUTO_NODENAME_FIXED_WIDTH' : null,"""
new_summary = """      block: smartDocument ? smartDocument.block : operation?.block || null,
      semanticMode: smartDocument ? smartDocument.semanticMode : null,"""
if text.count(old_summary) != 1:
    raise SystemExit('validator summary smart anchor mismatch')
text = text.replace(old_summary, new_summary, 1)
old_export = "export const _test = Object.freeze({ byteLength, asciiLength, isNodeNameOperation, literalMatchesWithinSpans, nodeNameClaimPlan, overlapBlockers });"
new_export = "export const _test = Object.freeze({ byteLength, asciiLength, isNodeNameOperation, literalMatchesWithinSpans, nodeNameClaimPlan, sameNumericValue, serializeNumericLogicalValue, overlapBlockers });"
if text.count(old_export) != 1:
    raise SystemExit('validator _test export anchor mismatch')
text = text.replace(old_export, new_export, 1)
p.write_text(text)


# Diagnostics: avoid duplicate NO_MATCH error when a stronger blocker already exists;
# translate smart-field failures into operator language.
p = Path('tabs/cii-workspace/cii-workspace-find-replace-editor-model.js')
text = p.read_text()
old = """  const fixed = code.match(/^FIXED_WIDTH_LENGTH_MISMATCH:(\\d+):(\\d+)$/);
  if (fixed) {
    return `Row ${sequence}: this unequal-length change did not resolve to a qualified smart fixed-width field. Do not add spaces manually; use an exact Node Name value or choose the appropriate Element/Block scope.`;
  }"""
new = """  const fixed = code.match(/^FIXED_WIDTH_LENGTH_MISMATCH:(\\d+):(\\d+)$/);
  if (fixed) {
    return `Row ${sequence}: this unequal-length change did not resolve to a qualified CII field. Do not add spaces manually; use an exact logical field value or narrow the scope.`;
  }
  const ambiguous = code.match(/^SMART_FIELD_AMBIGUOUS:(\\d+):(.+)$/);
  if (ambiguous) {
    return `Row ${sequence}: this Find value occurs in ${ambiguous[1]} different qualified CII field types. Narrow to Element/Block scope so the intended engineering field is unambiguous.`;
  }
  const numericWide = code.match(/^SMART_NUMERIC_REPLACEMENT_TOO_WIDE:(\\d+):(\\d+):(.+)$/);
  if (numericWide) {
    return `Row ${sequence}: numeric replacement has ${numericWide[1]} characters but the matched CII field allows ${numericWide[2]}. Enter the logical number only; field spacing is automatic.`;
  }
  if (code.startsWith('SMART_NUMERIC_REPLACEMENT_REQUIRED')) {
    return `Row ${sequence}: the matched CII field is numeric. Enter a valid logical number; fixed-width formatting is automatic.`;
  }"""
if text.count(old) != 1:
    raise SystemExit('editor diagnostic fixed anchor mismatch')
text = text.replace(old, new, 1)
old_no_match = """    if (Number(summary?.matchCount) === 0) {
      entries.push(freezeEntry({"""
new_no_match = """    if (Number(summary?.matchCount) === 0 && !(summary?.blockers || []).length) {
      entries.push(freezeEntry({"""
if text.count(old_no_match) != 1:
    raise SystemExit('editor no-match anchor mismatch')
text = text.replace(old_no_match, new_no_match, 1)
old_info = """    if (summary?.semanticMode === 'AUTO_NODENAME_FIXED_WIDTH') {
      entries.push(freezeEntry({
        severity: 'INFO', code: 'SMART_FIXED_WIDTH_NODENAME', sequences: [sequence],
        message: `Row ${sequence}: exact Node Name field resolved automatically. Fixed-width padding is handled by the CII serializer; no Fortran spacing is required.`,
      }));
    }"""
new_info = """    if (summary?.semanticMode === 'AUTO_NODENAME_FIXED_WIDTH') {
      entries.push(freezeEntry({
        severity: 'INFO', code: 'SMART_FIXED_WIDTH_NODENAME', sequences: [sequence],
        message: `Row ${sequence}: exact Node Name field resolved automatically. Fixed-width padding is handled by the CII serializer; no Fortran spacing is required.`,
      }));
    } else if (summary?.semanticMode === 'AUTO_CII_NUMERIC_FIXED_WIDTH') {
      entries.push(freezeEntry({
        severity: 'INFO', code: 'SMART_FIXED_WIDTH_NUMERIC', sequences: [sequence],
        message: `Row ${sequence}: exact numeric CII field resolved automatically. The logical number is serialized at the field's fixed physical width.`,
      }));
    }"""
if text.count(old_info) != 1:
    raise SystemExit('editor smart info anchor mismatch')
text = text.replace(old_info, new_info, 1)
p.write_text(text)


# UI wording: smart support is no longer Node Name-only.
p = Path('tabs/cii-workspace/cii-workspace-find-replace.js')
text = p.read_text()
old = 'Excel paste: copy Find and Replace columns, click the first Find cell, then paste. Do not add Fortran padding spaces; smart fixed-width formatting is automatic for recognized fields.'
new = 'Excel paste: copy Find and Replace columns, click the first Find cell, then paste. Do not add Fortran padding spaces; qualified Node Name and numeric CII fields are serialized automatically. Ambiguous logical values must be narrowed with Element/Block scope.'
if text.count(old) != 1:
    raise SystemExit('UI smart guidance anchor mismatch')
p.write_text(text.replace(old, new, 1))

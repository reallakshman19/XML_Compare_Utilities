export const TABLE_CATEGORIZED_XML_EXPORT_POLICY_SCHEMA = 'table-categorized-xml-export-policy/v1';

export const DEFAULT_TABLE_CATEGORIZED_EXPORT_POLICY = Object.freeze({
  documentRootTag: '',
  rootPartitionTag: '',
  includeXmlDeclaration: false,
  valueMode: 'child-elements',
  attributeFields: Object.freeze([]),
  childElementFields: Object.freeze([]),
});

const XML_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_.-]*$/;

function clean(value) {
  return String(value ?? '').trim();
}

function stringList(value) {
  return Object.freeze((Array.isArray(value) ? value : []).map(clean).filter(Boolean));
}

export function isValidXmlTagName(value) {
  return XML_NAME_PATTERN.test(clean(value));
}

export function normalizeExportPolicy(profile = {}) {
  const policy = profile?.exportPolicy || {};
  return Object.freeze({
    documentRootTag: clean(policy.documentRootTag),
    rootPartitionTag: clean(policy.rootPartitionTag),
    includeXmlDeclaration: Boolean(policy.includeXmlDeclaration),
    valueMode: clean(policy.valueMode || 'child-elements'),
    attributeFields: stringList(policy.attributeFields),
    childElementFields: stringList(policy.childElementFields),
  });
}

export function validateExportPolicy(profile = {}) {
  const policy = normalizeExportPolicy(profile);
  const diagnostics = [];
  if (policy.documentRootTag && !isValidXmlTagName(policy.documentRootTag)) {
    diagnostics.push(blocker('export_policy_document_root_tag_invalid', 'documentRootTag is not a valid XML tag.'));
  }
  if (policy.rootPartitionTag && !isValidXmlTagName(policy.rootPartitionTag)) {
    diagnostics.push(blocker('export_policy_root_partition_tag_invalid', 'rootPartitionTag is not a valid XML tag.'));
  }
  for (const field of [...policy.attributeFields, ...policy.childElementFields]) {
    if (!isValidXmlTagName(field)) {
      diagnostics.push(blocker('export_policy_field_tag_invalid', `Export field ${field} is not a valid XML tag.`, field));
    }
  }
  return Object.freeze(diagnostics);
}

export function exportPolicyPresent(profile = {}) {
  return Boolean(profile?.exportPolicy && typeof profile.exportPolicy === 'object');
}

function blocker(code, message, ref = '') {
  return Object.freeze({ severity: 'BLOCKER', code, message, ref });
}

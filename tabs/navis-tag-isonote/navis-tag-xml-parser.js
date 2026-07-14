import { NAVIS_TAG_EVIDENCE_SCHEMA, parseCoordinate, text, unitScaleToMm } from './navis-tag-isonote-contracts.js';

function decodeXml(value) {
  return String(value ?? '')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
}
function stripTags(value) { return decodeXml(String(value ?? '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim(); }
function attrs(source) {
  const output = {};
  String(source || '').replace(/([A-Za-z_:][\w:.-]*)\s*=\s*["']([^"']*)["']/g, (_, key, value) => { output[key] = decodeXml(value); return ''; });
  return output;
}
function firstTagBody(source, tag) { return String(source || '').match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, 'i'))?.[1] || ''; }
function firstPos3f(source) {
  const match = String(source || '').match(/<pos3f\b([^>]*)\/?\s*>/i);
  if (!match) return null;
  const a = attrs(match[1]);
  const point = { x: Number(a.x), y: Number(a.y), z: Number(a.z) };
  return Object.values(point).every(Number.isFinite) ? point : null;
}
function boundsMidpoint(source) {
  const min = firstPos3f(firstTagBody(source, 'min'));
  const max = firstPos3f(firstTagBody(source, 'max'));
  if (!min || !max) return null;
  return { x: (min.x + max.x) / 2, y: (min.y + max.y) / 2, z: (min.z + max.z) / 2 };
}
function parseCreatedDate(commentBody) {
  const match = commentBody.match(/<date\b([^>]*)\/?\s*>/i);
  if (!match) return '';
  const a = attrs(match[1]);
  const parts = ['year', 'month', 'day'].map((key) => String(a[key] || '').padStart(2, '0'));
  if (!parts[0]) return '';
  const time = ['hour', 'minute', 'second'].map((key) => String(a[key] || '0').padStart(2, '0')).join(':');
  return `${parts.join('-')}T${time}`;
}
function rootUnit(source, override) {
  if (override && override !== 'auto') return override;
  const exchange = source.match(/<exchange\b([^>]*)>/i);
  return attrs(exchange?.[1] || '').units || 'm';
}

export function parseNavisTagXml(xmlText, inputConfig = {}) {
  const source = String(xmlText || '');
  const diagnostics = [];
  if (!source.trim()) return { tags: [], diagnostics: [{ severity: 'ERROR', code: 'NAVIS_XML_EMPTY', message: 'Navis Tag XML is empty.' }], summary: { tagCount: 0 } };
  const units = rootUnit(source, inputConfig.navisUnits);
  const tags = [];
  const viewRegex = /<view\b([^>]*)>([\s\S]*?)<\/view>/gi;
  let viewMatch;
  let viewIndex = 0;
  while ((viewMatch = viewRegex.exec(source))) {
    viewIndex += 1;
    const viewAttrs = attrs(viewMatch[1]);
    const viewBody = viewMatch[2];
    const comments = new Map();
    const commentRegex = /<comment\b([^>]*)>([\s\S]*?)<\/comment>/gi;
    let commentMatch;
    while ((commentMatch = commentRegex.exec(viewBody))) {
      const commentAttrs = attrs(commentMatch[1]);
      const body = stripTags(firstTagBody(commentMatch[2], 'body'));
      comments.set(commentAttrs.id || `COMMENT-${comments.size + 1}`, {
        id: commentAttrs.id || '', status: commentAttrs.status || '', body,
        user: stripTags(firstTagBody(commentMatch[2], 'user')),
        createdDate: parseCreatedDate(commentMatch[2]),
      });
    }
    const tagRegex = /<rltag\b([^>]*)>([\s\S]*?)<\/rltag>/gi;
    let tagMatch;
    let tagIndex = 0;
    while ((tagMatch = tagRegex.exec(viewBody))) {
      tagIndex += 1;
      const tagAttrs = attrs(tagMatch[1]);
      const commentId = tagAttrs.commentid || tagAttrs.id || '';
      const comment = comments.get(commentId) || null;
      const pos3dBody = firstTagBody(tagMatch[2], 'pos3d');
      const rawPosition = firstPos3f(pos3dBody) || boundsMidpoint(firstTagBody(tagMatch[2], 'bounds'));
      const scale = unitScaleToMm(units, rawPosition ? Object.values(rawPosition) : []);
      const position = rawPosition ? { x: rawPosition.x * scale, y: rawPosition.y * scale, z: rawPosition.z * scale, unitScale: scale } : null;
      const codes = [];
      if (!comment) codes.push('COMMENT_LINK_NOT_FOUND');
      if (!comment?.body) codes.push('COMMENT_BODY_EMPTY');
      if (!rawPosition) codes.push('TAG_POSITION_MISSING');
      if (pos3dBody === '' && rawPosition) codes.push('POSITION_FROM_BOUNDS');
      const evidence = {
        schema: NAVIS_TAG_EVIDENCE_SCHEMA,
        evidenceId: `${viewAttrs.guid || `VIEW-${viewIndex}`}:RL-${tagAttrs.id || tagIndex}`,
        viewIndex,
        viewName: viewAttrs.name || `View ${viewIndex}`,
        viewGuid: viewAttrs.guid || '',
        tagId: tagAttrs.id || String(tagIndex),
        commentId,
        commentBody: comment?.body || '',
        commentUser: comment?.user || '',
        commentStatus: comment?.status || '',
        commentDate: comment?.createdDate || '',
        rawPosition,
        position,
        units,
        diagnostics: codes,
      };
      tags.push(evidence);
      codes.forEach((code) => diagnostics.push({ severity: code === 'COMMENT_BODY_EMPTY' ? 'WARN' : 'ERROR', code, evidenceId: evidence.evidenceId, message: `${code} for ${evidence.evidenceId}.` }));
    }
  }
  if (!tags.length) diagnostics.push({ severity: 'ERROR', code: 'NAVIS_TAGS_NOT_FOUND', message: 'No <rltag> records were found.' });
  return { tags, diagnostics, summary: { viewCount: viewIndex, tagCount: tags.length, validTagCount: tags.filter((tag) => tag.position && tag.commentBody).length, units } };
}

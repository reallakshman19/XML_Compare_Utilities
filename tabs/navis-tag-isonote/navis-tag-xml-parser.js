import { NAVIS_TAG_EVIDENCE_SCHEMA, coordinateProfileOptions, normalizeConfig, parseCoordinate, text, unitScaleToMm } from './navis-tag-isonote-contracts.js';

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
function localTagPattern(tag) { return `(?:[A-Za-z_][\\w.-]*:)?${tag}`; }
function firstTagBody(source, tag) {
  return String(source || '').match(new RegExp(`<${localTagPattern(tag)}\\b[^>]*>([\\s\\S]*?)<\\/${localTagPattern(tag)}>`, 'i'))?.[1] || '';
}
function blocks(source, tag) {
  const regex = new RegExp(`<${localTagPattern(tag)}\\b([^>]*)>([\\s\\S]*?)<\\/${localTagPattern(tag)}>`, 'gi');
  const output = [];
  let match;
  while ((match = regex.exec(String(source || '')))) output.push({ attrs: attrs(match[1]), body: match[2], index: match.index });
  return output;
}
function firstPos3f(source) {
  const match = String(source || '').match(new RegExp(`<${localTagPattern('pos3f')}\\b([^>]*)\\/?\\s*>`, 'i'));
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
  const match = String(commentBody || '').match(new RegExp(`<${localTagPattern('date')}\\b([^>]*)\\/?\\s*>`, 'i'));
  if (!match) return '';
  const a = attrs(match[1]);
  if (!a.year || !a.month || !a.day) return '';
  const date = [a.year, a.month, a.day].map((part, index) => index ? String(part).padStart(2, '0') : String(part)).join('-');
  const time = ['hour', 'minute', 'second'].map((key) => String(a[key] || '0').padStart(2, '0')).join(':');
  return `${date}T${time}`;
}
function rootUnit(source, override) {
  if (override && override !== 'auto') return override;
  const exchange = String(source || '').match(new RegExp(`<${localTagPattern('exchange')}\\b([^>]*)>`, 'i'));
  return attrs(exchange?.[1] || '').units || 'm';
}
function diagnostic(severity, code, message, context = {}) { return { severity, code, message, ...context }; }

export function parseNavisTagXml(xmlText, inputConfig = {}, identityTrace = null) {
  const source = String(xmlText || '');
  const config = normalizeConfig(inputConfig);
  const diagnostics = [];
  if (!source.trim()) return { tags: [], diagnostics: [diagnostic('ERROR', 'NAVIS_XML_EMPTY', 'Navis Tag XML is empty.')], summary: { viewCount: 0, tagCount: 0, validTagCount: 0, units: '' } };
  if (!new RegExp(`<${localTagPattern('exchange')}\\b`, 'i').test(source)) diagnostics.push(diagnostic('ERROR', 'NAVIS_EXCHANGE_ROOT_MISSING', 'No Navis <exchange> root was found.'));

  const units = rootUnit(source, config.navisUnits);
  const tags = [];
  const viewBlocks = blocks(source, 'view');
  viewBlocks.forEach((view, viewIndexZero) => {
    const viewIndex = viewIndexZero + 1;
    const viewAttrs = view.attrs;
    const comments = new Map();
    for (const commentBlock of blocks(view.body, 'comment')) {
      const id = commentBlock.attrs.id || `COMMENT-${comments.size + 1}`;
      if (comments.has(id)) diagnostics.push(diagnostic('WARN', 'DUPLICATE_COMMENT_ID_IN_VIEW', `Duplicate comment id ${id} in ${viewAttrs.name || `View ${viewIndex}`}.`, { viewGuid: viewAttrs.guid || '', commentId: id }));
      comments.set(id, { id, status: commentBlock.attrs.status || '', body: stripTags(firstTagBody(commentBlock.body, 'body')), user: stripTags(firstTagBody(commentBlock.body, 'user')), createdDate: parseCreatedDate(commentBlock.body) });
    }

    const usedCommentIds = new Set();
    blocks(view.body, 'rltag').forEach((tagBlock, tagIndexZero) => {
      const tagIndex = tagIndexZero + 1;
      const tagAttrs = tagBlock.attrs;
      const commentId = tagAttrs.commentid || tagAttrs.id || '';
      const comment = comments.get(commentId) || null;
      if (commentId) usedCommentIds.add(commentId);
      const pos3dBody = firstTagBody(tagBlock.body, 'pos3d');
      const directPosition = firstPos3f(pos3dBody);
      const fallbackPosition = directPosition ? null : boundsMidpoint(firstTagBody(tagBlock.body, 'bounds'));
      const rawPosition = directPosition || fallbackPosition;
      const positionSource = directPosition ? 'RLTAG_POS3D' : fallbackPosition ? 'RLTAG_BOUNDS_MIDPOINT' : 'NONE';
      const position = rawPosition ? parseCoordinate(rawPosition, units, coordinateProfileOptions(config, 'navis')) : null;
      const codes = [];
      if (!comment) codes.push('COMMENT_LINK_NOT_FOUND');
      if (!comment?.body) codes.push('COMMENT_BODY_EMPTY');
      if (!rawPosition) codes.push('TAG_POSITION_MISSING');
      if (positionSource === 'RLTAG_BOUNDS_MIDPOINT') codes.push('POSITION_FROM_BOUNDS');
      const tagId = tagAttrs.id || String(tagIndex);
      const evidence = {
        schema: NAVIS_TAG_EVIDENCE_SCHEMA,
        evidenceId: `${viewAttrs.guid || `VIEW-${viewIndex}`}:RL-${tagId}:C-${commentId || 'NONE'}`,
        viewIndex, viewName: viewAttrs.name || `View ${viewIndex}`, viewGuid: viewAttrs.guid || '', tagId, commentId,
        commentBody: comment?.body || '', commentUser: comment?.user || '', commentStatus: comment?.status || '', commentDate: comment?.createdDate || '',
        rawPosition, position, positionSource, units, coordinateProfileName: position?.profileName || config.navisCoordinateProfileName, datumOffsetMm: position?.datumOffsetMm || null, tagAttributes: tagAttrs, diagnostics: codes,
      };
      tags.push(evidence);
      codes.forEach((code) => diagnostics.push(diagnostic(code === 'COMMENT_BODY_EMPTY' || code === 'POSITION_FROM_BOUNDS' ? 'WARN' : 'ERROR', code, `${code} for ${evidence.evidenceId}.`, { evidenceId: evidence.evidenceId, viewGuid: evidence.viewGuid, tagId: evidence.tagId, commentId: evidence.commentId })));
    });
    for (const [commentId, comment] of comments) if (!usedCommentIds.has(commentId)) diagnostics.push(diagnostic('WARN', 'COMMENT_WITHOUT_RLTAG', `Comment ${commentId} is not referenced by an rltag.`, { viewGuid: viewAttrs.guid || '', commentId, commentBody: comment.body }));
  });

  if (!viewBlocks.length) diagnostics.push(diagnostic('ERROR', 'NAVIS_VIEWS_NOT_FOUND', 'No <view> records were found.'));
  if (!tags.length) diagnostics.push(diagnostic('ERROR', 'NAVIS_TAGS_NOT_FOUND', 'No <rltag> records were found.'));
  const result = {
    tags, diagnostics,
    summary: {
      viewCount: viewBlocks.length, tagCount: tags.length, validTagCount: tags.filter((tag) => tag.position && tag.commentBody).length,
      boundsFallbackCount: tags.filter((tag) => tag.positionSource === 'RLTAG_BOUNDS_MIDPOINT').length,
      unresolvedCommentCount: tags.filter((tag) => !tag.commentBody).length,
      unresolvedPositionCount: tags.filter((tag) => !tag.position).length,
      units,
      coordinateProfileName: config.navisCoordinateProfileName,
      datumOffsetMm: coordinateProfileOptions(config, 'navis'),
    },
  };
  return applyAnchorTransformation(result, identityTrace, config);
}

export function applyAnchorTransformation(navisParse, identityTrace, inputConfig = {}) {
  if (!navisParse || !Array.isArray(navisParse.tags)) return navisParse;
  const config = normalizeConfig(inputConfig);
  const tagId = text(config.navisAnchorTagId);
  const supportId = text(config.navisAnchorSupportIdentity);
  if (!tagId || !supportId || !identityTrace) {
    navisParse.anchor = {
      active: false,
      tagId: '',
      supportIdentity: '',
      deltaEMm: 0,
      deltaNMm: 0,
      deltaElMm: 0,
      summaryText: '',
    };
    return navisParse;
  }

  const anchorTag = navisParse.tags.find((t) =>
    text(t.tagId) === tagId ||
    text(t.commentId) === tagId ||
    text(t.viewIndex) === tagId
  );
  const targetId = supportId.toLowerCase().replace(/^\//, '');
  const anchorRow = (identityTrace.rows || []).find((row) => {
    const canonical = text(row.canonicalIdentity).toLowerCase().replace(/^\//, '');
    const raw = text(row.tableIdentityRaw).toLowerCase().replace(/^\//, '');
    if (canonical === targetId || raw === targetId) return true;
    if ((row.groupedIdentities || []).some((id) => text(id).toLowerCase().replace(/^\//, '') === targetId)) return true;
    return false;
  });

  if (!anchorTag || !anchorRow || !anchorTag.rawPosition || !anchorRow.position) {
    navisParse.anchor = {
      active: false,
      tagId,
      supportIdentity: supportId,
      deltaEMm: 0,
      deltaNMm: 0,
      deltaElMm: 0,
      summaryText: `Anchor configured (Tag ${tagId} -> PS ${supportId}) but target was not found.`,
    };
    return navisParse;
  }

  const units = anchorTag.units || 'm';
  const scale = unitScaleToMm(units, [anchorTag.rawPosition.x, anchorTag.rawPosition.y, anchorTag.rawPosition.z]);
  const rawE = anchorTag.rawPosition.x * scale;
  const rawN = anchorTag.rawPosition.y * scale;
  const rawEL = anchorTag.rawPosition.z * scale;

  const jsonE = Number(anchorRow.position?.x);
  const jsonN = Number(anchorRow.position?.y);
  const jsonEL = Number(anchorRow.position?.z);

  if (![rawE, rawN, rawEL, jsonE, jsonN, jsonEL].every(Number.isFinite)) {
    navisParse.anchor = {
      active: false,
      tagId,
      supportIdentity: supportId,
      deltaEMm: 0,
      deltaNMm: 0,
      deltaElMm: 0,
      summaryText: `Anchor configured (Tag ${tagId} -> PS ${supportId}) but coordinates were invalid.`,
    };
    return navisParse;
  }

  const deltaE = jsonE - rawE;
  const deltaN = jsonN - rawN;
  const deltaEL = jsonEL - rawEL;

  const effectiveConfig = {
    ...config,
    navisEastingDatumMm: deltaE,
    navisNorthingDatumMm: deltaN,
    navisElevationDatumMm: deltaEL,
  };
  const options = coordinateProfileOptions(effectiveConfig, 'navis');

  for (const tag of navisParse.tags) {
    if (!tag.rawPosition) continue;
    const newPos = parseCoordinate(tag.rawPosition, tag.units, options);
    tag.position = newPos;
    tag.datumOffsetMm = newPos?.datumOffsetMm || { x: deltaE, y: deltaN, z: deltaEL };
    tag.transformBasis = `ANCHOR_OVERRIDE: Tag ${anchorTag.tagId} -> ${anchorRow.canonicalIdentity} (ΔE=${deltaE.toFixed(3)}, ΔN=${deltaN.toFixed(3)}, ΔEL=${deltaEL.toFixed(3)} mm)`;
  }

  navisParse.anchor = {
    active: true,
    tagId: anchorTag.tagId,
    commentId: anchorTag.commentId,
    supportIdentity: anchorRow.canonicalIdentity,
    deltaEMm: deltaE,
    deltaNMm: deltaN,
    deltaElMm: deltaEL,
    summaryText: `ANCHOR OVERRIDE: Tag ${anchorTag.tagId} -> ${anchorRow.canonicalIdentity} (ΔE=${deltaE.toFixed(3)}, ΔN=${deltaN.toFixed(3)}, ΔEL=${deltaEL.toFixed(3)} mm)`,
  };
  if (navisParse.summary) {
    navisParse.summary.datumOffsetMm = { x: deltaE, y: deltaN, z: deltaEL };
  }

  return navisParse;
}

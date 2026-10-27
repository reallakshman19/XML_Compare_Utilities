import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  assignIsoNoteSourceRoles, classifyIsoNoteSource, validateIsoNoteSourceLayout
} from '../xml-compare/table-categorizer/table-categorized-xml-iso-note-source-setup.js';
import { ISO_NOTE_DUAL_SOURCE_PROFILE } from '../xml-compare/table-categorizer/table-categorized-xml-iso-note-dual-source.js';
import { parseTableSource } from '../xml-compare/table-categorizer/table-categorized-xml-source-parser.js';
import { validateEditableProfile } from '../xml-compare/table-categorizer/table-categorized-xml-profile-validation.js';

const mapping = 'PS NO\tpipe\nPS-124.1\tLINE-123';
const notes = 'JOBNAME\tLinenoinCII\tNODE_NUM\tSupportISONOTE\nPROJECT\t/LINE-123\t5790\t/PS-124.1 :ISONOTE REST(4kN)';
const parsed = (sourceId, sourceText) => parseTableSource(sourceText, { sourceId, delimiterMode: 'auto' });
const draft = (sourceId, sourceText) => ({ sourceId, sourceText });
assert.equal(classifyIsoNoteSource(draft('S1', mapping)), 'mapping');
assert.equal(classifyIsoNoteSource(draft('S1', notes)), 'notes');
assert.equal(classifyIsoNoteSource(draft('S2', '')), 'empty');
assert.equal(classifyIsoNoteSource(draft('S1', 'foo\tbar\na\tb')), 'unknown');

const reversed = assignIsoNoteSourceRoles([draft('S1', notes), draft('S2', mapping)]);
assert.equal(reversed.mapping.sourceId, 'S2');
assert.equal(reversed.notes.sourceId, 'S1');
assert.equal(reversed.swapped, true);
const onlyNotes = assignIsoNoteSourceRoles([draft('S1', notes)]);
assert.equal(onlyNotes.mapping, null, 'do not fabricate PS mapping from a single ISO note input');
assert.equal(onlyNotes.notes.sourceId, 'S1', 'ISO notes must be moved to S2');
assert.equal(onlyNotes.useExamples, false);
const onlyMapping = assignIsoNoteSourceRoles([draft('S1', mapping)]);
assert.equal(onlyMapping.mapping.sourceId, 'S1');
assert.equal(onlyMapping.notes, null, 'S2 must remain empty until user supplies ISO notes');
const empty = assignIsoNoteSourceRoles([draft('S1', '')]);
assert.equal(empty.useExamples, true, 'only an entirely empty workspace uses bundled examples');

const missingS2 = validateEditableProfile(ISO_NOTE_DUAL_SOURCE_PROFILE, { sources: [parsed('S1', mapping)] });
assert.equal(missingS2.length, 1, 'missing S2 must not generate dozens of resolver blockers');
assert.equal(missingS2[0].code, 'iso_note_source_not_parsed');
assert.match(missingS2[0].message, /S2 \(ISO notes\)/);
assert.equal(missingS2[0].severity, 'BLOCKER');
const misplaced = validateEditableProfile(ISO_NOTE_DUAL_SOURCE_PROFILE, { sources: [parsed('S1', notes)] });
assert.equal(misplaced.length, 2, 'wrong table in S1 and absent S2 are two actionable errors');
assert.ok(misplaced.some((diag) => diag.code === 'iso_note_source_role_mismatch'));
assert.ok(misplaced.some((diag) => diag.code === 'iso_note_source_not_parsed'));
assert.equal(validateIsoNoteSourceLayout({}, [parsed('S1', mapping)]).length, 0, 'other templates must remain unaffected');

const correct = validateEditableProfile(ISO_NOTE_DUAL_SOURCE_PROFILE, {
  sources: [parsed('S1', mapping), parsed('S2', notes)]
});
assert.ok(!correct.some((diag) => diag.severity === 'BLOCKER'), JSON.stringify(correct));

const runtime = fs.readFileSync(new URL('../tabs/xml-compare-table-categorized-runtime.js', import.meta.url), 'utf8');
assert.match(runtime, /assignIsoNoteSourceRoles\(state\.sources\)/);
assert.match(runtime, /roles\.useExamples/);
assert.match(runtime, /setActiveTab\(layoutBlocker \? 'source' : 'levels'\)/);
assert.match(runtime, /transformRules: notes && classifyIsoNoteSource\(notes\) === 'notes' \? isoRules : \[\]/);
console.log('table-categorized-iso-source-setup.test.js passed');

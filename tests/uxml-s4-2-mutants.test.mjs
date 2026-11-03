/** S4.2 isolated mutants: original regression red, one mutation per disposable copy. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,copyFileSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const root=fileURLToPath(new URL('../',import.meta.url));
const target='uxml/UxmlCategorizedPatchBack.js';
const patchModules=[
  "uxml/UxmlCategorizedPatchBackSourceModel.js",
  "uxml/UxmlCategorizedPatchBackSourceIntegrity.js",
  "uxml/UxmlCategorizedPatchBackSlice1.js",
  "uxml/UxmlCategorizedPatchBackProjection.js",
  "uxml/UxmlCategorizedPatchBackCarry.js",
  "uxml/UxmlCategorizedPatchBackClassifier.js",
  "uxml/UxmlCategorizedPatchBackPreflight.js",
  "uxml/UxmlCategorizedPatchBackWriter.js"
];
const fixtures=[
  ...patchModules,
  target,'uxml/UxmlCategorizedPatchBackProvenance.js','uxml/UxmlCategorizedProjectionMap.js','uxml/UxmlCategorizedInputXmlSchemaMapper.js',
  'uxml/UxmlInputXmlSchemaMapper.js','uxml/UxmlInputXmlSourceStructure.js',
  'uxml/UxmlConstants.js','uxml/UxmlTypes.js','uxml/UxmlValidationGate.js',
  'uxml/UxmlInputXmlDeltaGraph.js',
  'xml-compare/CategorizedInputXmlConverter.js',
  'xml-compare/XmlCompareCoordinateSideload.js',
  'xml-compare/XmlCompareCoordinateDiagnostics.js',
  'utils/line-no-metadata.js',
  'tests/uxml-s4-2-patch-back.test.mjs',
  'docs/GREInputxml.xml','docs/PLB314Inputxml.xml',
  'opt/mock-xml.xml','converters/scripts/pdf_inputxml_profile_bm_cii.xml',
];
function kill({name,old,replacement,pattern,edits}){
  const dir=mkdtempSync(join(tmpdir(),'s42-mutation-'));
  try{
    for(const path of fixtures){
      const dest=join(dir,path);
      mkdirSync(dirname(dest),{recursive:true});
      copyFileSync(join(root,path),dest);
      if(process.env.S42_MUTANT_COPY_CRLF==='1'&&/\.(?:m?js)$/.test(path)){
        const contents=readFileSync(dest,'utf8');
        writeFileSync(dest,contents.replace(/\r?\n/g,'\r\n'));
      }
    }
    writeFileSync(join(dir,'package.json'),'{"type":"module"}\n');
    const run=()=>spawnSync(process.execPath,
      ['--test','--test-name-pattern='+pattern,'tests/uxml-s4-2-patch-back.test.mjs'],
      {cwd:dir,encoding:'utf8',timeout:80000,
        env:Object.fromEntries(Object.entries(process.env).filter(([key])=>key!=='NODE_TEST_CONTEXT'))});
    const green=run();
    assert.equal(green.status,0,'baseline failed: '+name+'\n'+green.stdout+'\n'+green.stderr);
    assert.match(green.stdout,/# pass 1\b/,'targeted baseline must actually run');
    // A mechanically extracted guard may reside in a focused module.
    // Find its unique exact source seam; never edit a non-matching file.
    for(const edit of edits??[{old,replacement}]){
      let witnessed=0;
      for(const file of [target,...patchModules]){
        const at=join(dir,file),source=readFileSync(at,'utf8').replace(/\r\n/g,'\n');
        const count=source.split(edit.old).length-1;
        if(!count)continue;
        witnessed+=count;
        const changed=count===1?source.replace(edit.old,edit.replacement):
          source.split(edit.old).join(edit.replacement);
        writeFileSync(at,changed);
      }
      assert.equal(witnessed,edit.replaceCount??1,
        'exact declared source seam count: '+name);
    }
    const red=run(),output=red.stdout+'\n'+red.stderr;
    assert.notEqual(red.status,0,'SURVIVED '+name+'\n'+output);
    assert.match(output,/^not ok \d+ - S4\.2/m,'must fail an original S4.2 test');
    assert.match(output,/# fail 1\b/,'one targeted original test must fail');
    process.stdout.write('RED_VERIFIED S4.2 '+name+
      ' original regression red LF-or-CRLF='+Boolean(process.env.S42_MUTANT_COPY_CRLF)+'\n');
  }finally{rmSync(dir,{recursive:true,force:true});}
}
const mutants=[
  {name:'INPUT_TYPE_GUARD',
   edits:[{old:"if(typeof originalText!=='string'||typeof baselineCategorized!=='string'||\n     typeof editedCategorized!=='string'||!options||typeof options!=='object')",
   replacement:"if(false&&(typeof originalText!=='string'||typeof baselineCategorized!=='string'||\n     typeof editedCategorized!=='string'||!options||typeof options!=='object'))",replaceCount:2}],
   pattern:'S4.2 REFUSE invalid input types without output bytes'},
  {name:'ORIGINAL_SHA_GUARD',
   edits:[{old:"if(!/^[a-f\\d]{64}$/i.test(clean(options.fileSha256))||\n     measured!==clean(options.fileSha256).toLowerCase())return fail(R.HASH);",
   replacement:"if(false&&(!/^[a-f\\d]{64}$/i.test(clean(options.fileSha256))||\n     measured!==clean(options.fileSha256).toLowerCase()))return fail(R.HASH);",replaceCount:2}],
   pattern:'S4.2 REFUSE original SHA mismatch before source binding'},
  {name:'EXACT_BASELINE_GUARD',
   edits:[{old:"if(baselineCategorized!==baselineCanonical)return fail(R.BASELINE);",
    replacement:"if(false&&baselineCategorized!==baselineCanonical)return fail(R.BASELINE);"},
    {old:"if(authoritative!==baselineCategorized)return fail(R.BASELINE);",
    replacement:"if(false&&authoritative!==baselineCategorized)return fail(R.BASELINE);"}],
   pattern:'S4.2 REFUSE stale baseline before any write'},
  {name:'BASELINE_S41_BIND_GUARD',
   old:"if(!originalBinding)return fail(R.UNBOUND);",
   replacement:"if(false&&!originalBinding)return fail(R.UNBOUND);",
   pattern:'S4.2 REFUSE unbound duplicate physical record source'},
  {name:'ELEMENT_COUNT_GUARD',
   edits:[{old:"if(!oldCat||!newCat||oldCat.items.length!==newCat.items.length||\n     !equalArray(oldCat.lineIds,newCat.lineIds))return fail(R.STRUCTURE);",
    replacement:"if(false&&(!oldCat||!newCat||oldCat.items.length!==newCat.items.length||\n     !equalArray(oldCat.lineIds,newCat.lineIds)))return fail(R.STRUCTURE);"},
    {old:"if(oldElements.length!==newElements.length){",
    replacement:"if(false&&oldElements.length!==newElements.length){"}],
   pattern:'S4.2 REFUSE added or removed Categorized element'},
  {name:'CATEGORY_ORDER_GUARD',
   old:"if(equalArray([...oldIds].sort(),[...newIds].sort()))return fail(R.REORDER);",
   replacement:"if(false&&equalArray([...oldIds].sort(),[...newIds].sort()))return fail(R.REORDER);",
   pattern:'S4.2 REFUSE changed Categorized element order'},
  {name:'SOURCE_IDENTITY_ATTRIBUTE_GUARD',
   old:"if(before.depth===0&&identityFields.has(before.name.toUpperCase()))",
   replacement:"if(false&&before.depth===0&&identityFields.has(before.name.toUpperCase()))",
   pattern:'S4.2 REFUSE FROM_NODE/TO_NODE and LINE_ID identity changes'},
  {name:'ATTRIBUTE_STRUCTURE_GUARD',
   old:"if(!old||!next||old.masked!==next.masked||old.attrs.length!==next.attrs.length)",
   replacement:"if(false&&(!old||!next||old.masked!==next.masked||old.attrs.length!==next.attrs.length))",
   pattern:'S4.2 REFUSE existing attribute deletion or added stanza markup'},
  {"name":"SHARED_EXTERNAL_OWNERSHIP_GUARD","edits":[{"old":"if(!beforeStanza||!afterStanza||\n         sharedExternal(lexedRows,rowIndex,beforeStanza,afterStanza,next)||\n         ambiguousStanzaAttributes(beforeStanza)||\n         ambiguousStanzaAttributes(afterStanza))","replacement":"if(false&&(!beforeStanza||!afterStanza||\n         sharedExternal(lexedRows,rowIndex,beforeStanza,afterStanza,next)||\n         ambiguousStanzaAttributes(beforeStanza)||\n         ambiguousStanzaAttributes(afterStanza)))"},{"old":"if(externalEdits.length){","replacement":"if(false&&externalEdits.length){"}],"pattern":"S4.2 REFUSE duplicated external stanza ownership across source rows"},
  {name:'UNITS_IMMUTABLE_GUARD',
   old:"if(suffix&&(!/^\\s*<UNITS(?=[\\s/>])[\\s\\S]*<\\/UNITS\\s*>\\s*$/i.test(suffix)||\n       !after.endsWith(suffix)))return fail(R.UNITS);",
   replacement:"if(false&&suffix&&(!/^\\s*<UNITS(?=[\\s/>])[\\s\\S]*<\\/UNITS\\s*>\\s*$/i.test(suffix)||\n       !after.endsWith(suffix)))return fail(R.UNITS);",
   pattern:'S4.2 REFUSE edited non-record UNITS source witness'},
  {name:'UNSAFE_VALUE_GUARD',
   old:"if(oldValue===null||newValue===null)return {error:UXML_CATEGORIZED_PATCH_REFUSALS.VALUE};",
   replacement:"if(false&&(oldValue===null||newValue===null))return {error:UXML_CATEGORIZED_PATCH_REFUSALS.VALUE};",
   pattern:'S4.2 REFUSE unsafe raw XML attribute-value characters'},
  {name:'SOURCE_OFFSET_GUARD',
   old:"const charStart=source.start+field.start,charEnd=source.start+field.end;",
   replacement:"const charStart=source.start+field.start+1,charEnd=source.start+field.end+1;",
   pattern:'S4.2 GRE one numeric physical attribute byte-range patch'},
  {name:'S3_PARITY_GATE_INTEGRITY',
   old:"newStrict=mapCaesarInputXmlToUxmlStrict(patched,{fileSha256:patchedHash});",
   replacement:"newStrict={components:[]};",
   pattern:'S4.2 GRE one numeric physical attribute byte-range patch'},
  {name:'DERIVED_PROJECTION_PARITY_GUARD',
   old:"if(regenerated!==editedCategorized)return fail(R.S40_MISMATCH);",
   replacement:"if(regenerated!==editedCategorized)return fail(R.DERIVED);",
   pattern:'S4.2 slice1 REFUSE snapshot-only stale DIAMETER at the S4.0 parity gate'},
  {name:'S41_PATCHED_REBIND_GUARD',
   old:"if(!patchedBinding||!equalArray(refKeys(patchedBinding),refKeys(originalBinding)))",
   replacement:"if(false&&(!patchedBinding||!equalArray(refKeys(patchedBinding),refKeys(originalBinding))))",
   pattern:'S4.2 REFUSE post-edit duplicate physical snapshots despite same S3 key-set'},
  {name:'NO_EDIT_BYTE_IDENTITY_GUARD',
   old:"let patchedBytes=originalBytes;",
   replacement:"let patchedBytes=originalBytes.slice(1);",
   pattern:'S4.2 GRE no-edit preserves original UTF-8 bytes exactly'},
  {"name":"WRONG_STANZA_INDEX_GUARD","edits":[{"old":"const beforeStanza=old.stanzas[before.stanzaIndex];","replacement":"const beforeStanza=old.stanzas[1];"},{"old":"const afterStanza=next.stanzas[after.stanzaIndex];","replacement":"const afterStanza=next.stanzas[1];"}],"pattern":"S4.2 REFUSE shared node in second RESTRAINT with first unrelated stanza"},
  {"name":"COMMENT_LEXER_OWNER_GUARD","old":"if(raw.startsWith('<!--',open)){","replacement":"if(false&&raw.startsWith('<!--',open)){","pattern":"S4.2 REFUSE shared node in stanza after comment-hidden RESTRAINT decoy"},
  {"name":"NUMERIC_NODE_NORMALIZATION_GUARD","edits":[{"old":"return normalizeExternalNode(decoded);","replacement":"return clean(decoded);"},{"old":"if(externalEdits.length){","replacement":"if(false&&externalEdits.length){"}],"pattern":"S4.2 REFUSE numerically equal owner nodes 20 vs 20.0 across records"},
  {"name":"EXTERNAL_NODE_IDENTITY_OWNED_GUARD","old":"if(externalControlAttrs.has(before.name.toUpperCase()))","replacement":"if(false&&externalControlAttrs.has(before.name.toUpperCase()))","pattern":"S4.2 REFUSE external NODE moving to another owned node"},
  {"name":"EXTERNAL_NODE_IDENTITY_SENTINEL_GUARD","old":"if(externalControlAttrs.has(before.name.toUpperCase()))","replacement":"if(false&&externalControlAttrs.has(before.name.toUpperCase()))","pattern":"S4.2 REFUSE external NODE moving to unset sentinel"},
  {"name":"S40_CONTROL_ATTRS_GUARD","old":"const externalControlAttrs=new Set(['NUM','NUMBER','SIF_NUM','DISP_NUM',","replacement":"const externalControlAttrs=new Set(['NUMBER','SIF_NUM','DISP_NUM',","pattern":"S4.2 REFUSE every S4.0 external stanza control or node-reference attribute edit"},
  {"name":"NODE_OWNER_ALL_ROWS_GUARD","edits":[{"old":"for(let i=0;i<lexedRows.length;i++){","replacement":"for(let i=0;i<1;i++){"},{"old":"if(externalEdits.length){","replacement":"if(false&&externalEdits.length){"}],"pattern":"S4.2 REFUSE shared node in second RESTRAINT with first unrelated stanza"},
  {"name":"CONTROL_WHITESPACE_GUARD","old":"if(/[\\t\\r\\n]/.test(newValue))","replacement":"if(false&&/[\\t\\r\\n]/.test(newValue))","pattern":"S4.2 REFUSE newline, tab and carriage return in changed attribute values"},
  {"name":"NESTED_ATTRIBUTE_REFUSAL_GUARD","old":"if(before.depth>1)return {error:UXML_CATEGORIZED_PATCH_REFUSALS.NESTED};","replacement":"if(false&&before.depth>1)return {error:UXML_CATEGORIZED_PATCH_REFUSALS.NESTED};","pattern":"S4.2 REFUSE nested child attribute edit with distinct nested code"},
  {"name":"CANONICAL_XML_ENCODING_GUARD","old":"if(after.value.replace(/>/g,'&gt;')!==encoded)","replacement":"if(false&&after.value.replace(/>/g,'&gt;')!==encoded)","pattern":"S4.2 REFUSE noncanonical XML entity in changed value"},
  {"name":"SECOND_BYTE_VALUE_INTEGRITY_GUARD","old":"if(!equalArray(Array.from(originalBytes.slice(start,end)),Array.from(utf8(c.oldRaw))))","replacement":"if(false&&!equalArray(Array.from(originalBytes.slice(start,end)),Array.from(utf8(c.oldRaw))))","pattern":"S4.2 REFUSE mismatched byte witness at second integrity loop"},
  {"name":"EXTERNAL_NODE_NUM_REFERENCE_GUARD","old":"if(externalControlAttrs.has(before.name.toUpperCase()))","replacement":"if(false&&externalControlAttrs.has(before.name.toUpperCase()))","pattern":"S4.2 REFUSE moved DISPLACEMENTS and FORCESMOMENTS NODE_NUM controls"},
  {"name":"S40_COMMENT_HARVEST_GATE","old":"if(externalEdits.length){","replacement":"if(false&&externalEdits.length){","pattern":"S4.2 R2 REFUSE S4.0 comment-harvested RESTRAINT sharing owner"},
  {"name":"S40_CDATA_HARVEST_GATE","old":"if(externalEdits.length){","replacement":"if(false&&externalEdits.length){","pattern":"S4.2 R2 REFUSE S4.0 CDATA-harvested RESTRAINT sharing owner"},
  {"name":"S40_NESTED_BEND_GATE","old":"if(externalEdits.length){","replacement":"if(false&&externalEdits.length){","pattern":"S4.2 R2 REFUSE S4.0 nested BEND RESTRAINT sharing owner"},
  {"name":"S40_NESTED_RIGID_DISP_GATE","old":"if(externalEdits.length){","replacement":"if(false&&externalEdits.length){","pattern":"S4.2 R2 REFUSE S4.0 nested RIGID DISPLACEMENTS sharing owner"},
  {"name":"S40_SIF_COMMENT_GATE","old":"if(externalEdits.length){","replacement":"if(false&&externalEdits.length){","pattern":"S4.2 R2 REFUSE comment-harvested SIF in same element body"},
  {"name":"S40_CASE_ALIAS_AND_EXACT_ATTR_GATE","edits":[{"old":"ambiguousStanzaAttributes(beforeStanza)||\n         ambiguousStanzaAttributes(afterStanza)","replacement":"false"},{"old":"if(externalEdits.length){","replacement":"if(false&&externalEdits.length){"}],"pattern":"S4.2 R2 REFUSE edited RESTRAINT with mixed-case node/NODE aliases"},
  {"name":"S40_POSTEDIT_ACTIVITY_GATE","old":"const patchedBlocks=s40ActiveOwnedBlocks(final,tag,owner);","replacement":"const patchedBlocks=originalBlocks.map(()=>newBlock);","pattern":"S4.2 R2 REFUSE external block that becomes inactive after value edit"},
  {"name":"LITERAL_GREATER_THAN_VALUE_GATE","old":"if(after.value.replace(/>/g,'&gt;')!==encoded)","replacement":"if(after.value!==encoded)","pattern":"S4.2 R2 ACCEPT legal literal greater-than in XML attribute value"},
];
for(const mutant of mutants)test('S42_MUTANT_KILL_'+mutant.name,()=>kill(mutant));

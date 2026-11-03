import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const names=[
  'UxmlCategorizedPatchBack.js',
  'UxmlCategorizedPatchBackProvenance.js',
  ...['SourceModel','SourceIntegrity','Slice1','Projection',
      'Carry','Classifier','Preflight','Writer'].map(x=>
        'UxmlCategorizedPatchBack'+x+'.js'),
];
const hash=b=>createHash('sha256').update(b).digest('hex');
test('B8 leftovers all split files <=299 lines and source/docs mirrors byte identical',()=>{
  const report=[];
  for(const name of names){
    const source=readFileSync(new URL('../uxml/'+name,import.meta.url));
    const docs=readFileSync(new URL('../docs/uxml/'+name,import.meta.url));
    assert.deepEqual(source,docs,'public docs/src mirror mismatch: '+name);
    const lines=source.toString('utf8').split(/\r?\n/).length;
    assert(lines<300,'oversized source module: '+name+' lines='+lines);
    report.push({name,lines,sha256:hash(source)});
  }
  const root=report.find(x=>x.name==='UxmlCategorizedPatchBack.js');
  assert(root.lines<150,'public entry should be a compact composition');
  assert(report.some(x=>x.name==='UxmlCategorizedPatchBackPreflight.js'));
  assert(report.some(x=>x.name==='UxmlCategorizedPatchBackWriter.js'));
  console.log('B8_LEFTOVERS_SPLIT_MIRRORS '+JSON.stringify(report));
});

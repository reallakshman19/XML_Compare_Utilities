# Real Chromium DOM interaction probe for G1 R1; no served navigation or real Method C qualification.
# Uses a synthetic/stubbed SHA and Method C candidate fixture to isolate keyboard/selection/UI semantics.
# Run: python tests/cii-fnr-vnext-g1-r1-dom-browser.py (requires Python Playwright and /usr/bin/chromium).
from playwright.sync_api import sync_playwright
from pathlib import Path
import json,re
root=Path(__file__).resolve().parents[1]
ui=(root/'tabs/cii-workspace/cii-fnr-vnext/geometry/ui.js').read_text()
scene=(root/'tabs/cii-workspace/cii-fnr-vnext/geometry/scene.js').read_text()
ui=re.sub(r'^import .*?;\n','',ui,flags=re.M).replace('export function mountGeometry(', 'function mountGeometry(')
scene=scene.replace('export function','function')
fixtures=r'''
const digest = async bytes => bytes[0]===1 ? 'a'.repeat(64) : 'b'.repeat(64);
async function buildOriginalGraphFromBytes({bytes,member,expectedSha256}) {
 const sha256=await digest(bytes);
 if(expectedSha256&&sha256!==expectedSha256)throw new Error('ORIGINAL_SHA256_MISMATCH');
 return {member,sha256,byteAuthority:'ORIGINAL_BYTES',nodes:[],edges:[],components:[['3910','4970']]};
}
function registerMethodC(s,t,anchors) {return {rotation:[[1,0,0],[0,1,0],[0,0,1]],status:'TRANSLATION_ONLY_EXPLORATION / ORIENTATION_UNDETERMINED',sourceComponent:0,targetComponent:0};}
function findMethodCCandidates() {return {nearSourceCount:1,rows:[
 {source:'3910',nodeName:'N-S',originalElements:['SOURCE:OriginalWitness'],alternatives:[{target:'875',distance:0.25,originalElements:['TARGET:OriginalWitness']}],
  status:'COORDINATE_NEAR_CANDIDATE',explanation:'Only a review candidate',contestedTargets:[],nearest:{target:'875'},residual:[0.1,0.2,0.3],distance:0.4},
 {source:'4970',nodeName:'N-4970',originalElements:['SOURCE:Element2'],alternatives:[],
  status:'MISSING_TARGET_NODE_BUT_ALIGNED_SEGMENT',explanation:'TARGET segment-only',contestedTargets:[],nearest:{target:'1065'},segment:{between:['900','905'],t:0.76,witness:'TARGET:Segment'},residual:[0,0,-300.57],distance:300.57}
]};}
function methodCSvgScene() {return {svg:'<svg xmlns="http://www.w3.org/2000/svg" data-metric="true" viewBox="0 0 100 100">'+
 '<g data-kind="SOURCE" data-node="3910" tabindex="0"><circle cx="10" cy="10" r="4"/></g>'+
 '<g data-kind="SOURCE" data-node="4970" tabindex="0"><circle cx="70" cy="10" r="4"/></g>'+
 '<g data-kind="TARGET" data-node="875" tabindex="0"><circle cx="10" cy="40" r="4"/></g>'+
 '<g data-kind="TARGET" data-node="1065" tabindex="0"><circle cx="70" cy="40" r="4"/></g></svg>',viewBox:{x:0,y:0,width:100,height:100}};}
function methodCEvidence() { return {writerEligible:false}; }
function methodCJsonExport(){return '{"writerEligible":false}';}
function methodCCsvExport(){return 'review-only';}
function methodCSvgExport(ctx){return ctx.scene.svg;}
'''
bundle=fixtures+'\n'+scene+'\n'+ui+'\nwindow.__geometry = mountGeometry(document.getElementById("g1"));'
checks=[]
def check(label,flag):
 checks.append((label,bool(flag))); print(('PASS' if flag else 'FAIL'),label)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 pg=b.new_page();errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
 pg.set_content('<main id="g1"></main>')
 pg.add_script_tag(content=bundle)
 pg.evaluate("window.__geometry.setFiles({name:'SOURCE.CII',bytes:new Uint8Array([1,2,3])},{name:'TARGET.CII',bytes:new Uint8Array([4,5,6])})")
 pg.locator('[data-geom-action="run"]').click()
 pg.wait_for_timeout(800)
 pg.wait_for_selector('[data-geom-svg="source"] svg [data-node="4970"]',timeout=5000)
 source=pg.locator('[data-geom-svg="source"] svg')
 target=pg.locator('[data-geom-svg="target"] svg')
 check('exactly two separate SVGs',source.count()==1 and target.count()==1)
 check('same mm-scale viewBox',source.get_attribute('viewBox')==target.get_attribute('viewBox'))
 check('untrusted upload status is SHA_COMPUTED',pg.locator('[data-geom-custody]').inner_text().count('SHA_COMPUTED')==2)
 pg.locator('[data-geom-svg="source"] [data-node="4970"]').focus()
 pg.keyboard.press('Enter')
 check('SOURCE <g> keyboard Enter selects physical NODE 4970',pg.locator('[data-geom-selected]').inner_text().startswith('SOURCE 4970:'))
 pg.locator('[data-geom-svg="target"] [data-node="875"]').focus()
 pg.keyboard.press('Space')
 check('TARGET <g> keyboard Space selects candidate row',pg.locator('[data-geom-selected]').inner_text().startswith('SOURCE 3910:'))
 pg.locator('[data-geom-rows] tr[data-source="4970"]').focus()
 pg.keyboard.press('Enter')
 check('table row Enter selects physical NODE',pg.locator('[data-geom-selected]').inner_text().startswith('SOURCE 4970:'))
 before=source.get_attribute('viewBox')
 pg.locator('[data-geom-action="zoom-in"]').click()
 check('shared zoom preserved',source.get_attribute('viewBox')==target.get_attribute('viewBox') and before!=source.get_attribute('viewBox'))
 pg.evaluate("window.__geometry.setFiles({name:'SOURCE_CHANGED.CII',bytes:new Uint8Array([7])},{name:'TARGET.CII',bytes:new Uint8Array([4,5,6])})")
 check('file change clears SVGs and revokes exports',source.count()==0 and pg.locator('[data-geom-action="json"]').is_disabled())
 pg.evaluate("window.__geometry.setFiles({name:'SOURCE.CII',bytes:new Uint8Array([1,2,3]),expectedSha256:'f'.repeat(64)},{name:'TARGET.CII',bytes:new Uint8Array([4,5,6])})")
 pg.locator('[data-geom-action="run"]').click()
 pg.wait_for_function("document.querySelector('[data-geom-status]').textContent.includes('ORIGINAL_SHA256_MISMATCH')",timeout=5000)
 check('trusted expected-SHA mismatch rejects input and export',pg.locator('[data-geom-action="json"]').is_disabled() and 'ORIGINAL_SHA256_MISMATCH' in pg.locator('[data-geom-status]').inner_text())
 print('PAGEERRORS',errors)
 b.close()
print('RESULT',sum(ok for _,ok in checks),'/',len(checks));raise SystemExit(0 if all(ok for _,ok in checks) and not errors else 1)

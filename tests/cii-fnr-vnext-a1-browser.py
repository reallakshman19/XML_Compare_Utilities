from pathlib import Path
from hashlib import sha256
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
import tempfile
fixture_dir = tempfile.TemporaryDirectory()
input_file = Path(fixture_dir.name)/'SYNTHETIC-TEST-TARGET0.CII'
def row(v): return ''.join(str(x).rjust(15 if i==0 else 13) for i,x in enumerate(v))
def block(a,b,ptr): return [row([f'{a}.0',f'{b}.0',120,0,0,0]) if i==0 else row([0,0,0,0,0,ptr]) if i==13 else row([0,0,0,0,0,0]) for i in range(15)]
lines=['#$ VERSION',row([5,14,1252]),'#$ CONTROL',row([2,0,0,2,0,0]),'#$ ELEMENTS',*block(100,110,1),*block(110,120,2),'#$ NODENAME','  '+'OLD-A'.ljust(26)+'OLD-B'.ljust(25),'  '+'OLD-C'.ljust(26)+'OLD-D'.ljust(25)]
original = ('\r\n'.join(lines)+'\r\n').encode('ascii')
input_file.write_bytes(original)
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    page = browser.new_page(accept_downloads=True)
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto('http://127.0.0.1:8765/cii-fnr-vnext.html', wait_until='networkidle')
    assert page.get_by_role('heading', name='↔ CII Find & Replace').count() == 1
    assert page.get_by_role('tab').count() == 3
    page.get_by_role('tab',name='Geometry').click()
    assert 'not been delivered' in page.locator('[data-unavailable]').inner_text()
    page.get_by_role('tab', name='Line Number + Node Name').click()
    assert page.locator('[data-run]').is_disabled()
    page.get_by_role('tab', name='Normal Find & Replace').click()
    page.locator('[data-file="target"]').set_input_files(str(input_file))
    page.wait_for_function("document.querySelector('[data-meta=target]').textContent.includes('SHA-256')")
    assert sha256(original).hexdigest() in page.locator('[data-meta="target"]').inner_text()
    page.locator('[data-row-index="0"] [data-field="find"]').fill('OLD')
    page.locator('[data-row-index="0"] [data-field="replace"]').fill('NEW')
    page.locator('[data-run]').click()
    page.get_by_text('4 claims').wait_for()
    assert page.locator('[data-proposals] tr').count() == 4
    page.locator('[data-decision]').nth(0).select_option('APPROVED')
    page.locator('[data-decision]').nth(1).select_option('REJECTED')
    page.locator('[data-validate]').click()
    page.get_by_text('TARGET1 validated in memory').wait_for()
    assert page.locator('[data-apply]').is_enabled()
    assert page.locator('[data-export]').is_disabled()
    page.locator('[data-apply]').click()
    assert page.locator('[data-export]').is_enabled()
    with page.expect_download() as info:
        page.locator('[data-export]').click()
    download = info.value
    output = Path(download.path()).read_bytes()
    assert len(output) == len(original)
    assert original == input_file.read_bytes(), 'immutable TARGET0'
    changes = [i for i,(a,b) in enumerate(zip(original,output)) if a != b]
    assert len(changes) > 0
    assert b'NEW-A' in output and b'OLD-B' in output, 'only approved names changed'
    assert original.split(b'#$ NODENAME')[0] == output.split(b'#$ NODENAME')[0], 'numeric/sections unchanged'
    assert sha256(output).hexdigest() in page.locator('[data-hash1]').inner_text()
    assert download.suggested_filename.endswith('TARGET1.CII')
    with page.expect_download() as info:
        page.locator('[data-audit]').click()
    audit = Path(info.value.path()).read_text()
    assert 'CiiFnrVnext.Audit.v1' in audit and 'NODENAME.FROM' in audit
    # Changes in rule invalidate all approvals and downloads.
    page.locator('[data-row-index="0"] [data-field="replace"]').fill('Z')
    assert page.locator('[data-export]').is_disabled()
    assert page.locator('[data-apply]').is_disabled()
    assert page.locator('[data-proposals] tr').count() == 0
    # Invalid regex remains blocked with visible diagnostics.
    page.locator('[data-row-index="0"] [data-field="find"]').fill('([')
    page.locator('[data-row-index="0"] [data-field="mode"]').select_option('REGEX')
    page.locator('[data-run]').click()
    assert 'ERROR' in page.locator('[data-diagnostics]').inner_text()
    assert page.locator('[data-validate]').is_disabled()
    # Excel paste creates two rows with exact cell values.
    page.locator('[data-clear]').click()
    page.locator('[data-row-index="0"] [data-field="find"]').focus()
    page.evaluate("""() => { const el=document.activeElement; const dt=new DataTransfer();dt.setData('text/plain', 'OLD-A\\tNEW-A\\nOLD-B\\tNEW-B');el.dispatchEvent(new ClipboardEvent('paste',{bubbles:true,cancelable:true,clipboardData:dt})); }""")
    assert page.locator('[data-row-index="0"] [data-field="find"]').input_value() == 'OLD-A'
    assert page.locator('[data-row-index="1"] [data-field="replace"]').input_value() == 'NEW-B'
    # CSV import, quoted comma value.
    page.locator('[data-file="csv"]').set_input_files({'name': 'rules.csv', 'mimeType':'text/csv', 'buffer': b'Find,Replace\n"OLD-A","CSV-A"\n"OLD-B","CSV-B"\n'})
    page.wait_for_function("document.querySelector('[data-row-index=0] [data-field=replace]').value === 'CSV-A'")
    assert page.locator('[data-row-index="1"] [data-field="find"]').input_value() == 'OLD-B'
    # Keyboard enter moves to next-row same field.
    page.locator('[data-row-index="0"] [data-field="find"]').focus()
    page.keyboard.press('Enter')
    assert page.evaluate('document.activeElement.dataset.field') == 'find'
    assert page.evaluate("document.activeElement.closest('[data-row-index]').dataset.rowIndex") == '1'
    # Tab switch revokes approval state.
    page.get_by_role('tab', name='Geometry').click()
    page.get_by_role('tab', name='Normal Find & Replace').click()
    assert page.locator('[data-export]').is_disabled()
    assert not errors, errors
    print('PASS [SYNTHETIC served Chromium] 3 tabs, upload, SHA, grid/Excel paste, CSV, keyboard, diagnostic, review, validate/apply/export/audit, stale invalidation, byte diff',len(changes),'bytes')
    browser.close()

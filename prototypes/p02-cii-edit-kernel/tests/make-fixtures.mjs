// Writes the invented 3-element v14 fixture (LF and CRLF copies): node tests/make-fixtures.mjs tests/fixtures
import { writeFileSync } from 'node:fs';
const dir = process.argv[2];
const E = v => v.toExponential(6).replace(/e([+-])(\d)$/, 'E$10$2').replace(/e([+-])(\d\d)$/, 'E$1$2').padStart(13);
const I = n => String(n).padStart(13);
const row = (vals, f = E) => '  ' + vals.map(f).join('');
const L = [];
L.push('#$ VERSION ', '    5.00000      14.0000        1256', '  Source: invented fixture for P0.2 kernel tests', '  Purpose: test only');
L.push('#$ CONTROL ');
L.push(row([3, 0, 0, 2, 0, 0], I), row([0, 2, 0, 0, 0, 0], I), row([0, 0, 0, 0, 0, 0], I), row([0], I));
L.push('#$ ELEMENTS');
const els = [ // from, to, dx, dy, dz, diam, rigidPtr, namePtr
  [10, 20, 1000, 0, 0, 168.3, 0, 0],
  [20, 30, 0, 500, 0, 168.3, 1, 1],
  [30, 40, 0, 0, -750, 114.3, 2, 2],
];
for (const [f, t, dx, dy, dz, d, rp, np] of els) {
  L.push(row([f, t, dx, dy, dz, d]));
  L.push(row([7.11, 50, 1, 120, 105, 3]));
  L.push(row([0, 0, 0, 0, 0, 0]));
  L.push(row([10, 0, 0, 0, 0, 0]));
  for (let i = 0; i < 4; i++) L.push(row([0, 0, 0, 0, 0, 0]));
  L.push(row([0, 0, 0, 0, 0]));
  L.push('           0 ');
  L.push('          12 /DEMO-LINE-01');
  L.push('             -1           -1');
  L.push(row([0, rp, 0, 0, 0, 0], I));
  L.push(row([0, 0, 0, 0, 0, np], I));
  L.push(row([0, 0, 0], I));
}
L.push('#$ AUX_DATA');
L.push('#$ NODENAME');
const nm = (a, b) => ('  ' + a.padEnd(26) + b.padEnd(25));
L.push(nm('', 'V-30'), nm('V-30', 'N-40-END'));
L.push('#$ BEND    ');
L.push('#$ RIGID   ');
L.push(row([1.25e3, 0]), row([3.5e2, 0]));
L.push('#$ RESTRANT');
L.push('#$ UNITS   ');
L.push('   2.540000E+01 4.448220E+00');
L.push('#$ COORDS  ');
L.push(row([0]));
const lf = L.join('\n') + '\n';
writeFileSync(dir + '/tiny-v14-lf.cii', lf);
writeFileSync(dir + '/tiny-v14-crlf.cii', lf.replace(/\n/g, '\r\n'));

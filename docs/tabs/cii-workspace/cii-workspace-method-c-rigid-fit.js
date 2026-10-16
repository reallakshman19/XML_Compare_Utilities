// Least-squares proper rigid 3D registration for trusted non-degenerate anchors.
// Uses Horn's unit-quaternion eigenproblem. No scaling or reflection is possible.
const minus = (a, b) => a.map((v, i) => v - b[i]);
const average = (points) => [0, 1, 2].map((i) => points.reduce((s, p) => s + p[i], 0) / points.length);
const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2]];
const norm = (p) => Math.hypot(...p);
const matPoint = (matrix, point) => matrix.map((row) => dot(row, point));
const sq = (v) => v * v;

function quaternionMatrix(q) {
  const [w, x, y, z] = q;
  return [
    [1 - 2 * (sq(y) + sq(z)), 2 * (x * y - w * z), 2 * (x * z + w * y)],
    [2 * (x * y + w * z), 1 - 2 * (sq(x) + sq(z)), 2 * (y * z - w * x)],
    [2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (sq(x) + sq(y))],
  ];
}
function jacobiMaxEigenvector(symmetric) {
  const a = symmetric.map((row) => [...row]);
  const v = Array.from({ length: 4 }, (_, i) => Array.from({ length: 4 }, (_, j) => Number(i === j)));
  for (let iteration = 0; iteration < 96; iteration++) {
    let p = 0, q = 1, largest = 0;
    for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) {
      const candidate = Math.abs(a[i][j]);
      if (candidate > largest) { p = i; q = j; largest = candidate; }
    }
    if (largest < 1e-12) break;
    const angle = 0.5 * Math.atan2(2 * a[p][q], a[q][q] - a[p][p]);
    const c = Math.cos(angle), s = Math.sin(angle);
    const app = a[p][p], aqq = a[q][q], apq = a[p][q];
    for (let k = 0; k < 4; k++) if (k !== p && k !== q) {
      const akp = a[k][p], akq = a[k][q];
      a[k][p] = a[p][k] = c * akp - s * akq;
      a[k][q] = a[q][k] = s * akp + c * akq;
    }
    a[p][p] = c*c*app - 2*c*s*apq + s*s*aqq;
    a[q][q] = s*s*app + 2*c*s*apq + c*c*aqq;
    a[p][q] = a[q][p] = 0;
    for (let k = 0; k < 4; k++) {
      const vp = v[k][p], vq = v[k][q];
      v[k][p] = c * vp - s * vq;
      v[k][q] = s * vp + c * vq;
    }
  }
  let best = 0;
  for (let i = 1; i < 4; i++) if (a[i][i] > a[best][best]) best = i;
  const q = v.map((row) => row[best]);
  const length = norm(q);
  if (!(length > 1e-12)) throw new Error('RIGID_QUATERNION_DEGENERATE');
  return q.map((value) => value / length);
}
function quaternionProblem(sourceCentered, targetCentered) {
  const covariance = Array.from({ length: 3 }, () => [0, 0, 0]);
  sourceCentered.forEach((source, row) => {
    const target = targetCentered[row];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) covariance[i][j] += source[i] * target[j];
  });
  const [[xx, xy, xz], [yx, yy, yz], [zx, zy, zz]] = covariance;
  return [
    [xx+yy+zz, yz-zy, zx-xz, xy-yx],
    [yz-zy, xx-yy-zz, xy+yx, zx+xz],
    [zx-xz, xy+yx, -xx+yy-zz, yz+zy],
    [xy-yx, zx+xz, yz+zy, -xx-yy+zz],
  ];
}
function hasNoncollinear(points, minSinAngle) {
  let best = 0;
  for (let i = 0; i < points.length - 2; i++) for (let j = i + 1; j < points.length - 1; j++) {
    const a = minus(points[j], points[i]);
    for (let k = j + 1; k < points.length; k++) {
      const b = minus(points[k], points[i]), product = norm(a)*norm(b);
      if (product > 1e-12) best = Math.max(best, norm(cross(a,b))/product);
    }
  }
  return best >= minSinAngle;
}
export function fitProperRigidAnchors(pairs, { minSinAngle = 0.01 } = {}) {
  if (!Array.isArray(pairs) || pairs.length < 3) throw new Error('RIGID_MINIMUM_THREE_ANCHORS');
  if (!Number.isFinite(minSinAngle) || minSinAngle <= 0 || minSinAngle > 1)
    throw new Error('RIGID_MIN_SIN_POLICY_INVALID');
  const source = pairs.map((pair) => pair.source.xyz), target = pairs.map((pair) => pair.target.xyz);
  if ([...source, ...target].some((p) => !Array.isArray(p) || p.length !== 3 || p.some((v) => !Number.isFinite(v))))
    throw new Error('RIGID_NONFINITE_ANCHOR_POSITION');
  if (!hasNoncollinear(source, minSinAngle) || !hasNoncollinear(target, minSinAngle)) return null;
  const cs = average(source), ct = average(target);
  const problem = quaternionProblem(source.map((p) => minus(p, cs)), target.map((p) => minus(p, ct)));
  const rotation = quaternionMatrix(jacobiMaxEigenvector(problem));
  const rotatedCentroid = matPoint(rotation, cs);
  const translation = minus(ct, rotatedCentroid);
  const residuals = source.map((p, i) => norm(minus(target[i], matPoint(rotation,p).map((v,j)=>v+translation[j]))));
  const rmsResidualMm = Math.sqrt(residuals.reduce((sum, v) => sum + v*v, 0) / residuals.length);
  return { rotation, translation, residualsMm: residuals, rmsResidualMm, maxResidualMm: Math.max(...residuals) };
}

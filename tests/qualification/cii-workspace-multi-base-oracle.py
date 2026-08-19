"""Independent numerical reproduction for CII multi-base Method A/B qualification.

No production JavaScript is imported. Expected values are analytical/synthetic.
"""
from math import acos, degrees, hypot, sqrt


def dot(a, b):
    return sum(x * y for x, y in zip(a, b))


def sub(a, b):
    return tuple(x - y for x, y in zip(a, b))


def add(a, b):
    return tuple(x + y for x, y in zip(a, b))


def mul(a, k):
    return tuple(x * k for x in a)


def cross(a, b):
    return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])


def mag(a):
    return sqrt(dot(a, a))


def unit(a):
    return mul(a, 1.0 / mag(a))


def transpose(m):
    return tuple(tuple(m[r][c] for r in range(3)) for c in range(3))


def matmul(a, b):
    bt = transpose(b)
    return tuple(tuple(dot(row, col) for col in bt) for row in a)


def matvec(m, v):
    return tuple(dot(row, v) for row in m)


def basis(p0, p1, p2):
    first = sub(p1, p0)
    second = sub(p2, p0)
    e1 = unit(first)
    e2 = unit(sub(second, mul(e1, dot(second, e1))))
    e3 = unit(cross(e1, e2))
    matrix = transpose((e1, e2, e3))
    sin_angle = mag(cross(first, second)) / (mag(first) * mag(second))
    return p0, matrix, sin_angle


def rigid_from_triplet(source, target, indexes):
    sp = [source[i] for i in indexes]
    tp = [target[i] for i in indexes]
    so, sb, ssin = basis(*sp)
    to, tb, tsin = basis(*tp)
    rotation = matmul(tb, transpose(sb))
    translation = sub(to, matvec(rotation, so))
    return rotation, translation, min(ssin, tsin)


def apply(transform, point):
    rotation, translation = transform
    return add(matvec(rotation, point), translation)


def residuals(transform, source, target):
    return [mag(sub(apply(transform, p), q)) for p, q in zip(source, target)]


def rotation_difference_deg(left, right):
    relative = matmul(right, transpose(left))
    cosine = max(-1.0, min(1.0, (relative[0][0] + relative[1][1] + relative[2][2] - 1.0) / 2.0))
    return degrees(acos(cosine))


# Method A: two independent local regions are OR loops and need not share translation.
a1_source = [(0.0, 0.0, 0.0), (100.0, 0.0, 0.0), (0.0, 100.0, 0.0)]
a1_target = [(0.0, 100.0, 0.0), (100.0, 100.0, 0.0), (0.0, 200.0, 0.0)]
a2_source = [(10000.0, 0.0, 0.0), (10100.0, 0.0, 0.0), (10000.0, 100.0, 0.0)]
a2_target = [(10000.0, -200.0, 0.0), (10100.0, -200.0, 0.0), (10000.0, -100.0, 0.0)]
for source, target, expected_t in ((a1_source, a1_target, (0.0, 100.0, 0.0)), (a2_source, a2_target, (0.0, -200.0, 0.0))):
    r, t, _ = rigid_from_triplet(source, target, (0, 1, 2))
    assert max(residuals((r, t), source, target)) < 1e-9
    assert mag(sub(t, expected_t)) < 1e-9

# Method A fail-closed ambiguity: two admissible 3-point bases fit all four anchors <=2 mm
# while their rotations differ by 90 degrees.
source = [(0.0, 0.0, 0.0), (1000.0, 0.0, 0.0), (2000.0, 1.0, 0.0), (3000.0, 0.0, 1.0)]
target = [(0.0, 0.0, 0.0), (1000.0, 0.0, 0.0), (2000.0, 1.0, 0.0), (3000.0, 1.0, 0.0)]
r1, t1, sin1 = rigid_from_triplet(source, target, (0, 1, 2))
r2, t2, sin2 = rigid_from_triplet(source, target, (0, 1, 3))
e1 = residuals((r1, t1), source, target)
e2 = residuals((r2, t2), source, target)
assert abs(max(e1) - sqrt(2.0)) < 1e-9
assert abs(max(e2) - sqrt(2.0)) < 1e-9
assert sin1 > 1e-4 and sin2 > 1e-4
assert rotation_difference_deg(r1, r2) > 89.999

# Method B: a straight line has one undirected axis even though it has two rays.
left = (-1.0, 0.0, 0.0)
right = (1.0, 0.0, 0.0)
undirected_angle = degrees(acos(abs(dot(left, right))))
assert abs(undirected_angle) < 1e-12

# Method B: source X+Z and target Y+Z both provide a 90-degree rotation-invariant two-axis basis.
def included_angle(a, b):
    return degrees(acos(abs(dot(unit(a), unit(b)))))


assert abs(included_angle((1, 0, 0), (0, 0, 1)) - 90.0) < 1e-12
assert abs(included_angle((0, 1, 0), (0, 0, 1)) - 90.0) < 1e-12
assert hypot(12000 - 12000, 7000 - 7000) == 0

print('Independent CII multi-base Method A/B oracle passed.')

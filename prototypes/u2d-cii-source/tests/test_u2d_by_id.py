"""T2 (Owner 22 Nov 2026, "Yes, build T2"): the transfer by node id with step 10's CII sidecar.

Inputs: fixtures/uxml-v2-transfer/{EF05,BM2}-on = step 10 with "Engine reads UXML" on (3D_Converters main fed7783d,
output "both"): the Enriched XML, the CII and the CII sidecar as the page downloads them. The CAESAR II edits are
scripted on that CII. Expected (T plan, Owner checks):
- the untouched CII gives no edit by id, and none of today's "several records at this point" refusals;
- names changed in CAESAR II at those points go to the record of the node id the engine wrote, and every edit today's
  transfer makes is made the same;
- a node renumbered in CAESAR II lands on the same record;
- a sidecar for another Enriched XML, a CII with another element count, an unclear renumbering, a sidecar without
  places and a wrong place are refused, with nothing transferred.
"""
from __future__ import annotations

import hashlib
import json
import re
import shutil
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
sys.path.insert(0, str(HERE))
from test_u2d_supports import ROOT, match_for  # noqa: E402
from u2d_plan import NAME_LIMIT, parse_cii, plan, read_target  # noqa: E402
from u3b_core import cells, sections_of  # noqa: E402
from u2d_sidecar import number_key, places  # noqa: E402

FIX = ROOT / "fixtures" / "uxml-v2-transfer"
ELEMENT_LINES = 15


def load(model: str):
    d = FIX / f"{model}-on"
    return ((d / "enriched.xml").read_bytes(), (d / "step10.cii").read_text(encoding="utf-8"),
            json.loads((d / "step10.cii.sidecar.json").read_text(encoding="utf-8")))


def section(lines: list, name: str) -> int:
    return next(i for i, line in enumerate(lines) if line.startswith("#$ ") and line[3:].strip() == name) + 1


def set_end_name(text: str, k: int, end: int, name: str) -> str:
    """CII element k's from (end 0) or to (end 1) NODENAME set to name, as an edit in CAESAR II would."""
    lines = text.split("\n")
    el, nn = section(lines, "ELEMENTS"), section(lines, "NODENAME")
    n_names = int(float(lines[section(lines, "CONTROL")][15 + 13 * 2:15 + 13 * 3]))
    per = (next(i for i in range(nn, len(lines)) if lines[i].startswith("#$ ")) - nn) // n_names
    ptr = int(lines[el + k * ELEMENT_LINES + 13][15 + 13 * 4:15 + 13 * 5])
    i = nn + (ptr - 1) * per
    row = lines[i].ljust(28 + NAME_LIMIT)
    lines[i] = (row[:2] + name.ljust(26) + row[28:]) if end == 0 else (row[:28] + name.ljust(NAME_LIMIT) + row[28 + NAME_LIMIT:])
    return "\n".join(lines)


def renumber(text: str, old: str, new: str, only: set | None = None) -> str:
    """Node old renamed new in the ELEMENTS from/to cells (of the elements in `only`, else of all)."""
    lines = text.split("\n")
    el = section(lines, "ELEMENTS")
    for k in range(len(parse_cii(text)["elements"])):
        row = lines[el + k * ELEMENT_LINES]
        cells = [row[:15], row[15:28]]
        for c in (0, 1):
            if number_key(cells[c].strip()) == old and (only is None or k in only):
                cells[c] = f"{float(new):.4f}".rjust(len(cells[c]))
        lines[el + k * ELEMENT_LINES] = cells[0] + cells[1] + row[28:]
    return "\n".join(lines)


def edit_shared_points(cii: str, sidecar: dict, shared: list) -> tuple[str, dict]:
    """Wall thickness (an element's from end) and insulation (its to end) set on every element end at the points in
    `shared`, one value per node id (5.00, 5.01, ...). Returns the CII and (id, field) -> the value's text. This also
    makes the page's sample fixtures/uxml-v2-transfer/EF05-on/shared-points.cii."""
    lines, per_id, want = cii.split("\n"), {}, {}
    el0 = section(lines, "ELEMENTS")
    for k, (el, s) in enumerate(zip(parse_cii(cii)["elements"], sidecar["elements"])):
        row = lines[el0 + k * ELEMENT_LINES + 1]
        cells = [row[:15], row[15:28]]
        for end, key, field in ((0, "fromId", "Node/WallThickness"), (1, "toId", "Node/InsulationThickness")):
            if number_key(el["E"][0][end]) in shared:
                v = per_id.setdefault(s[key], 5 + len(per_id) / 100)
                want[(s[key], field)] = f"{v:g}"
                cells[end] = f"{v:.6f}".rjust(len(cells[end]))
        lines[el0 + k * ELEMENT_LINES + 1] = cells[0] + cells[1] + row[28:]
    return "\n".join(lines), want


def shift_along_run_ef05(cii: str) -> str:
    """EF05-on step 10 CII with elements shifted along one run (T2 review B1, probe p6): element 50 (629-630, a free
    end) deleted, element 53 (660-710) broken at new node 665 (the second half takes element 50's pointer lines), and
    insulation 77 on element 52 (640-660). Node 629's coordinate seed moves to node 630. Same element count."""
    lines = cii.split("\n")
    e0 = section(lines, "ELEMENTS")
    blk = lambda k: lines[e0 + k * ELEMENT_LINES:e0 + (k + 1) * ELEMENT_LINES]  # noqa: E731

    def nums(b, frm=None, to=None, half=False):
        b = list(b)
        r = b[0]
        c = [r[:15], r[15:28], r[28:41], r[41:54], r[54:67]]
        if frm is not None:
            c[0] = f"{frm:.4f}".rjust(15)
        if to is not None:
            c[1] = f"{to:.4f}".rjust(13)
        if half:
            for i in (2, 3, 4):
                c[i] = f"{float(c[i]) / 2:.6f}".rjust(13)
        b[0] = "".join(c) + r[67:]
        return b

    first = nums(blk(52), to=665.0, half=True)
    second = nums(blk(52), frm=665.0, half=True)[:11] + blk(49)[11:]
    e51 = list(blk(51))
    e51[1] = e51[1][:15] + "77.0000".rjust(13) + e51[1][28:]
    out = lines[:e0 + 49 * ELEMENT_LINES] + [x for b in (blk(50), e51, first, second) for x in b] + lines[e0 + 53 * ELEMENT_LINES:]
    r49 = blk(49)[0]
    dx, dy, dz = float(r49[28:41]), float(r49[41:54]), float(r49[54:67])
    text = "\n".join(out)
    old = "            629  441665.1500  100607.1500 1460905.0200"
    assert old in text
    return text.replace(old, f"{630:>15d}{441665.15 + dx:13.4f}{100607.15 + dy:13.4f}{1460905.02 + dz:13.4f}")


def edit_key(e: dict) -> tuple:
    return (e["ref"]["branchOrdinal"], e["ref"]["nodeOrdinal"], e["field"], e["before"], e["after"])


@unittest.skipUnless(shutil.which("node"), "node missing: NOT_RUN")
class TransferById(unittest.TestCase):
    MODEL = "EF05"

    @classmethod
    def setUpClass(cls):
        cls.xml, cls.cii, cls.sidecar = load(cls.MODEL)
        cls.match = match_for(FIX / f"{cls.MODEL}-on" / "enriched.xml", cls.cii)
        cls.nodes = read_target(cls.xml)[0]
        cls.at = places(cls.sidecar, cls.nodes)
        cls.today = plan(cls.xml, cls.cii, cls.match, 10.0)
        cls.shared = sorted({r["ciiNode"] for r in cls.today["refused"] if r["code"] == "U2D_NODE_AMBIGUOUS"}, key=float)

    def by_id(self, cii: str, **kw) -> dict:
        return plan(self.xml, cii, self.match_of(cii), 10.0, sidecar=kw.get("sidecar", self.sidecar))

    def match_of(self, cii: str) -> dict:
        return self.match if cii == self.cii else match_for(FIX / f"{self.MODEL}-on" / "enriched.xml", cii)

    def point_only_elements_name(self) -> str:
        """A point today refuses that is no coordinate seed (COORDS) and has no support (RESTRANT): renumbering those
        is a CAESAR II edit of its own, outside this check."""
        sec = sections_of(self.cii)
        named = {number_key(cells(l)[0]) for l in sec.get("COORDS", [])[1:] if cells(l)}
        named |= {number_key(c[0]) for c in map(cells, sec.get("RESTRANT", [])) if c and re.fullmatch(r"-?\d+\.\d+", c[0])}
        return next(p for p in self.shared if p not in named)

    def renamed_at_shared_points(self) -> tuple[str, dict]:
        """Every element end at a point today refuses gets the name "T2-<its id>" (ids all of whose ends have a NODENAME
        entry); returns the CII and id -> name."""
        ends = {}
        for k, (el, s) in enumerate(zip(parse_cii(self.cii)["elements"], self.sidecar["elements"])):
            for end, key in ((0, "fromId"), (1, "toId")):
                if number_key(el["E"][0][end]) in self.shared:
                    ends.setdefault(s[key], []).append((k, end, int(el["ptr"][1][5]) > 0))
        cii, want = self.cii, {}
        for i, where in ends.items():
            if all(named for _, _, named in where):
                want[i] = "T2-" + i[2:]
                for k, end, _ in where:
                    cii = set_end_name(cii, k, end, want[i])
        return cii, want

    def test_the_sidecar_names_the_delivered_enriched_xml(self):
        # T1 review N1: the sha256 is checked against the downloaded Enriched XML text, not the run record.
        self.assertEqual(self.sidecar["enriched"]["sha256"], hashlib.sha256(self.xml).hexdigest())

    def test_each_cii_end_name_is_the_name_of_its_id(self):
        # T1 review N2: the engine's id at each element end is the record whose (first) name the CII holds.
        for el, s in zip(parse_cii(self.cii)["elements"], self.sidecar["elements"]):
            for end, key in ((0, "fromId"), (1, "toId")):
                name = (self.nodes[self.at[s[key]]]["values"]["Node/NodeName"] or "").split("|")[0][:NAME_LIMIT]
                self.assertEqual(el["name"][end], name, s[key])

    def test_the_step10_cii_gives_no_edit_and_no_shared_point_refusal(self):
        self.assertTrue(self.shared, "today's transfer refuses points with several records")
        r = self.by_id(self.cii)
        self.assertEqual(r["edits"], [])
        self.assertNotIn("U2D_NODE_AMBIGUOUS", r["summary"]["refused"])
        self.assertEqual(r["byId"]["renumbered"], [])

    def test_names_at_shared_points_go_to_the_engines_id(self):
        cii, want = self.renamed_at_shared_points()
        r = self.by_id(cii)
        got = {(e["ref"]["branchOrdinal"], e["ref"]["nodeOrdinal"]): e["after"] for e in r["edits"] if e["field"] == "Node/NodeName"}
        expect = {self.at[i]: n for i, n in want.items()}
        self.assertEqual(got, expect)
        today = plan(self.xml, cii, self.match_of(cii), 10.0)
        self.assertLessEqual({edit_key(e) for e in today["edits"]}, {edit_key(e) for e in r["edits"]})
        print(f"\n{self.MODEL}: {len(self.shared)} points today refuses; by id {len(expect)} names on "
              f"{len(want)} ids; today {sum(e['field'] == 'Node/NodeName' for e in today['edits'])} name edits")

    def test_every_point_today_refuses_is_transferred_to_the_engines_ids(self):
        # Wall thickness (an element's from end) and insulation (its to end) changed on every element end at those
        # points, one value per node id: each id's record gets its own value; today's transfer refuses them all.
        cii, values = edit_shared_points(self.cii, self.sidecar, self.shared)
        want = {(self.at[i], field): v for (i, field), v in values.items()}
        r, today = self.by_id(cii), plan(self.xml, cii, self.match_of(cii), 10.0)
        got = {((e["ref"]["branchOrdinal"], e["ref"]["nodeOrdinal"]), e["field"]): e["after"] for e in r["edits"]}
        self.assertEqual({k: v for k, v in got.items() if k in want}, want)
        self.assertEqual(sorted(k for k in got if k not in want), [], "no other record changed")
        self.assertEqual({(edit_key(e)[:2], e["field"]) for e in today["edits"]} & {(k[0], k[1]) for k in want}, set())
        points = {number_key(el["E"][0][e]) for el in parse_cii(cii)["elements"] for e in (0, 1)} & set(self.shared)
        self.assertEqual(len(points), len(self.shared))
        print(f"\n{self.MODEL}: {len(self.shared)} points today refuses -> {len({i for i, _ in values})} node ids, {len(want)} values by id; "
              f"today {len(today['edits'])} edits, U2D_NODE_AMBIGUOUS {today['summary']['refused'].get('U2D_NODE_AMBIGUOUS')}")

    def test_the_page_sample_is_this_edit(self):
        # Section 5's "EF-05 by node id" sample is exactly the edit above (made from today's refusals and the sidecar).
        if self.MODEL == "EF05":
            got = (FIX / "EF05-on" / "shared-points.cii").read_text(encoding="utf-8")
            self.assertEqual(got, edit_shared_points(self.cii, self.sidecar, self.shared)[0])

    def test_the_command_line_transfers_by_id_with_sidecar(self):
        import tempfile
        import u2d
        from cii_v11_v14 import convert_bytes
        cii, values = edit_shared_points(self.cii, self.sidecar, self.shared)
        with tempfile.TemporaryDirectory(prefix="u2d-t2-") as t:
            t = Path(t)
            (t / "e.cii").write_text(cii, encoding="utf-8", newline="")
            (t / "v14.cii").write_bytes(convert_bytes(cii.encode("utf-8"), 14).data)
            (t / "m.json").write_text(json.dumps(self.match_of(cii)), encoding="utf-8")
            side = FIX / f"{self.MODEL}-on" / "step10.cii.sidecar.json"
            argv = ["--target", str(FIX / f"{self.MODEL}-on" / "enriched.xml"), "--cii", str(t / "e.cii"), "--cii-v14", str(t / "v14.cii"),
                    "--match", str(t / "m.json"), "--out", str(t / "out.xml"), "--changes", str(t / "r.json"), "--weight-scale", "10",
                    "--sidecar", str(side)]
            self.assertEqual(u2d.main(argv), 0)
            receipt = json.loads((t / "r.json").read_text(encoding="utf-8"))
        self.assertEqual(len(receipt["changes"]), len(values))
        self.assertEqual(receipt["byId"]["sidecarFileName"], side.name)
        self.assertEqual(receipt["byId"]["sidecarSha256"], hashlib.sha256(side.read_bytes()).hexdigest())

    def test_every_edit_of_todays_transfer_is_made_the_same(self):
        # Temperature 1 raised by 10 on every element, the edit of EF05/source.cii.
        lines = self.cii.split("\n")
        el = section(lines, "ELEMENTS")
        for k in range(len(self.sidecar["elements"])):
            row = lines[el + k * ELEMENT_LINES + 1]
            t1 = float(row[15 + 13 * 2:15 + 13 * 3])
            lines[el + k * ELEMENT_LINES + 1] = row[:15 + 13 * 2] + f"{t1 + 10:.3f}".rjust(13) + row[15 + 13 * 3:]
        cii = "\n".join(lines)
        today = plan(self.xml, cii, self.match_of(cii), 10.0)
        r = self.by_id(cii)
        self.assertTrue(today["edits"])
        a, b = {edit_key(e) for e in today["edits"]}, {edit_key(e) for e in r["edits"]}
        self.assertLessEqual(a, b)
        unpaired = {x["branch"] for x in today["refused"] if x["code"] == "U2D_BRANCH_NOT_PAIRED"}
        brs = read_target(self.xml)[1]
        self.assertLessEqual({brs[e[0]]["name"] for e in b - a}, unpaired, "new edits only on branches today could not pair")
        print(f"\n{self.MODEL}: today {len(a)} edits; by id {len(b)} ({len(b - a)} on {len(unpaired)} branches today could not pair)")

    def test_a_renumbered_node_lands_on_the_same_record(self):
        cii, want = self.renamed_at_shared_points()
        point = self.point_only_elements_name()
        r0, r1 = self.by_id(cii), self.by_id(renumber(cii, point, "99001"))
        self.assertEqual(r1["byId"]["renumbered"], [["99001", point]])
        self.assertEqual(sorted(map(edit_key, r1["edits"])), sorted(map(edit_key, r0["edits"])))

    def test_an_unclear_renumbering_is_refused(self):
        point = self.point_only_elements_name()
        first = next(k for k, s in enumerate(self.sidecar["elements"]) if number_key(s["from"]) == point or number_key(s["to"]) == point)
        with self.assertRaisesRegex(ValueError, "U2D_SIDECAR_RENUMBER_UNCLEAR"):
            self.by_id(renumber(self.cii, point, "99002", only={first}))

    def test_a_sidecar_for_another_enriched_xml_is_refused(self):
        other = self.xml.replace(b"</", b" </", 1)
        with self.assertRaisesRegex(ValueError, "U2D_SIDECAR_OTHER_XML"):
            plan(other, self.cii, self.match, 10.0, sidecar=self.sidecar)

    def test_a_sidecar_without_places_or_with_a_wrong_place_is_refused(self):
        with self.assertRaisesRegex(ValueError, "U2D_SIDECAR_NO_PLACES"):
            self.by_id(self.cii, sidecar={**self.sidecar, "enriched": None})
        with self.assertRaisesRegex(ValueError, "U2D_SIDECAR_INVALID"):
            self.by_id(self.cii, sidecar={**self.sidecar, "format": "something-else"})
        moved = json.loads(json.dumps(self.sidecar))
        a, b = moved["nodes"][0]["ids"][0], moved["nodes"][1]["ids"][0]
        a["at"], b["at"] = b["at"], a["at"]
        with self.assertRaisesRegex(ValueError, "U2D_SIDECAR_PLACE_MISMATCH"):
            self.by_id(self.cii, sidecar=moved)

    def test_a_cii_with_another_element_count_is_refused(self):
        trimmed = json.loads(json.dumps(self.sidecar))
        trimmed["elements"].pop()
        with self.assertRaisesRegex(ValueError, "U2D_SIDECAR_ELEMENT_COUNT"):
            self.by_id(self.cii, sidecar=trimmed)

    def test_a_malformed_sidecar_is_refused_not_a_crash(self):
        # T2 review N1: a place or number that is not one is U2D_SIDECAR_INVALID, never a Python TypeError.
        bad_at = json.loads(json.dumps(self.sidecar))
        bad_at["nodes"][0]["ids"][0]["at"] = [None, 0]
        bad_no = json.loads(json.dumps(self.sidecar))
        bad_no["elements"][0]["from"] = None
        for side in (bad_at, bad_no):
            with self.assertRaisesRegex(ValueError, "U2D_SIDECAR_INVALID"):
                self.by_id(self.cii, sidecar=side)

    def test_elements_shifted_along_a_run_are_refused(self):
        # T2 review B1 (EF-05): CAESAR II deletes the free-end element 629-630 and breaks 660-710 at a new node 665; the
        # element count stays 616 and the moved numbers map one to one (630->629, 640->630, 660->640, 665->660), so the
        # ids would land one node along. Insulation 77 on 640-660 must not reach record 640: refused, nothing transferred.
        if self.MODEL != "EF05":
            self.skipTest("the EF-05 run 629-710 is the recorded case")
        cii = shift_along_run_ef05(self.cii)
        self.assertEqual(len(parse_cii(cii)["elements"]), len(self.sidecar["elements"]))
        with self.assertRaisesRegex(ValueError, "U2D_SIDECAR_RENUMBER_UNCLEAR"):
            self.by_id(cii)
        today = plan(self.xml, cii, self.match_of(cii), 10.0)
        ins = [(e["ref"]["nodeNumber"], e["after"]) for e in today["edits"] if e["field"] == "Node/InsulationThickness"]
        self.assertEqual(ins, [("660", "77")], "by position the edit is on node 660")

    def test_a_bare_branch_layout_gives_the_same_places(self):
        # T1 review N3: read_target and step 10 count branches the same way when they sit under the root.
        text = self.xml.decode("utf-8-sig")
        bare = re.sub(r"</?Pipe>|<Pipe\s[^>]*>", "", text).encode("utf-8")
        self.assertEqual(places(self.sidecar, read_target(bare)[0]), self.at)


class TransferByIdBm2(TransferById):
    MODEL = "BM2"


if __name__ == "__main__":
    unittest.main()

from pathlib import Path
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
SCRIPT_DIR = ROOT / "converters" / "scripts"
sys.path.insert(0, str(SCRIPT_DIR))

import inputxml_to_cii2019 as conv


def defaults(diameter=0.0):
    return conv.ConverterDefaults(
        diameter=diameter,
        wall_thickness=0.01,
        insulation_thickness=0.0,
        corrosion_allowance=0.0,
        temperature1=0.0,
        temperature2=0.0,
        temperature3=0.0,
        pressure1=0.0,
        pressure2=0.0,
        pressure3=0.0,
        reducer_angle=0.0,
    )


def inputxml(elements):
    return (
        '<CAESARII xmlns="COADE" VERSION="14.00" XML_TYPE="Input">\n'
        '<PIPINGMODEL xmlns="" NUMELT="%d">\n%s\n</PIPINGMODEL>\n</CAESARII>\n'
        % (len(elements), "\n".join(elements))
    )


def element(from_node, to_node, diameter):
    return (
        f'<PIPINGELEMENT FROM_NODE="{from_node}" TO_NODE="{to_node}" '
        f'DELTA_X="100" DELTA_Y="0" DELTA_Z="0" DIAMETER="{diameter}" '
        'WALL_THICK="1" INSUL_THICK="0" CORR_ALLOW="0" '
        'TEMP_EXP_C1="0" TEMP_EXP_C2="0" TEMP_EXP_C3="0"/>'
    )


class DiameterPolicyTests(unittest.TestCase):
    def parse(self, text, fallback=0.0):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "input.xml"
            path.write_text(text, encoding="utf-8")
            return conv._parse_model(path, defaults(fallback))

    def test_missing_first_diameter_fails_without_explicit_fallback(self):
        text = inputxml([element(10, 20, "-1.010100")])
        with self.assertRaisesRegex(ValueError, "--default-diameter"):
            self.parse(text)

    def test_explicit_fallback_resolves_missing_first_diameter(self):
        text = inputxml([element(10, 20, "-1.010100")])
        model = self.parse(text, 114.3)
        self.assertAlmostEqual(model.elements[0].diameter, 114.3)

    def test_real_diameter_carries_forward_over_later_sentinel(self):
        text = inputxml([
            element(10, 20, "114.3"),
            element(20, 30, "-1.010100"),
        ])
        model = self.parse(text)
        self.assertEqual([round(row.diameter, 3) for row in model.elements], [114.3, 114.3])

    def test_sub_parser_threshold_diameter_fails_closed(self):
        text = inputxml([element(10, 20, "5.0")])
        with self.assertRaisesRegex(ValueError, "OD"):
            self.parse(text)


if __name__ == "__main__":
    unittest.main()

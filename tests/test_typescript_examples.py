import sys
import tempfile
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO / "scripts"))
from check_typescript_examples import CheckError, END, START, extract_duration_example, require_tool


class DurationExtractionTests(unittest.TestCase):
    def setUp(self):
        self.example = f"{START}\n\n```ts\nconst duration = 1;\n```\n\n{END}"

    def test_extracts_only_the_marked_fence(self):
        markdown = "```ts\nconst other = 0;\n```\n" + self.example + "\nUnrelated prose."
        self.assertEqual(extract_duration_example(markdown), "const duration = 1;\n")

    def test_missing_or_duplicate_markers_fail(self):
        for markdown in ("", self.example.replace(START, ""), self.example.replace(END, ""), self.example * 2):
            with self.subTest(markdown=markdown):
                with self.assertRaisesRegex(CheckError, "exactly one validated-duration marker pair"):
                    extract_duration_example(markdown)

    def test_malformed_or_multiple_fences_fail(self):
        for body in (
            "const duration = 1;",
            "```js\nconst duration = 1;\n```",
            "```ts\nconst duration = 1;",
            "```ts\nconst first = 1;\n```\n```ts\nconst second = 2;\n```",
        ):
            with self.subTest(body=body):
                with self.assertRaisesRegex(CheckError, "exactly one complete ts fence"):
                    extract_duration_example(f"{START}\n{body}\n{END}")

    def test_reversed_markers_fail(self):
        with self.assertRaisesRegex(CheckError, "exactly one complete ts fence"):
            extract_duration_example(f"{END}\n```ts\nconst duration = 1;\n```\n{START}")

    def test_missing_tool_names_the_prerequisite_and_option(self):
        with tempfile.TemporaryDirectory() as temp:
            missing = str(Path(temp) / "not-installed")
            for label, option in (("TypeScript", "--tsc"), ("Node", "--node")):
                with self.subTest(label=label):
                    with self.assertRaises(CheckError) as failure:
                        require_tool(missing, label, option)
                    self.assertIn(f"{label} executable not found", str(failure.exception))
                    self.assertIn(f"Install {label} or pass {option} PATH", str(failure.exception))


if __name__ == "__main__":
    unittest.main()

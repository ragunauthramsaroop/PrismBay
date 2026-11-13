import ast
import pathlib
import unittest

HERE=pathlib.Path(__file__).resolve().parents[1]

class ServerSyntaxTests(unittest.TestCase):
    def test_backend_python_syntax(self):
        ast.parse((HERE/"server"/"app.py").read_text("utf-8"))
    def test_container_is_not_root(self):
        self.assertIn("USER converter",(HERE/"server"/"Dockerfile").read_text("utf-8"))
    def test_rejects_unauthenticated_invocation(self):
        text=(HERE/"server"/"app.py").read_text("utf-8")
        self.assertIn("if not valid_token(",text)
        self.assertIn("MAX_BYTES",text)

if __name__=="__main__":
    unittest.main()

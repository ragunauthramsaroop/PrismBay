"""Regression tests for the zero-cost PrismBay subtitle preflight."""
import unittest
from validate_shorts_srt import check

GOOD = '''1
00:00:00,000 --> 00:00:02,000
Hello world.

2
00:00:02,100 --> 00:00:04,000
This is a test.
'''

class SubtitleChecks(unittest.TestCase):
    def test_valid(self):
        self.assertEqual(check(GOOD,4.1)['status'],'PASS')
    def test_overlap(self):
        self.assertEqual(check(GOOD.replace('00:00:02,100','00:00:01,900'),4.1)['status'],'FAIL')
    def test_overflow(self):
        self.assertEqual(check(GOOD,3.0)['status'],'FAIL')
    def test_long_line(self):
        self.assertEqual(check(GOOD.replace('Hello world.','A'*39),4.1)['status'],'FAIL')
    def test_excess_lines(self):
        self.assertEqual(check(GOOD.replace('Hello world.','Hello\nworld\nagain'),4.1)['status'],'FAIL')
    def test_fast_cue(self):
        self.assertEqual(check(GOOD.replace('00:00:02,000','00:00:00,100'),4.1)['status'],'FAIL')
    def test_bad_sequence(self):
        self.assertEqual(check(GOOD.replace('\n2\n00:00:02,100','\n3\n00:00:02,100'),4.1)['status'],'FAIL')

if __name__ == '__main__':
    unittest.main()

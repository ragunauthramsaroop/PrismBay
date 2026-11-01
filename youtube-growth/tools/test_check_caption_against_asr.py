"""Unit tests for transcript integrity and coarse ASR-caption timing."""
import unittest
from check_caption_against_asr import check, parse_srt

ASR = '''1
00:00:00,000 --> 00:00:02,000
Alpha beta gamma.

2
00:00:02,100 --> 00:00:04,000
Delta epsilon zeta.
'''

class AsrCaptionChecks(unittest.TestCase):
    def test_identical(self):
        self.assertEqual(check(ASR, ASR)['status'], 'PASS')
    def test_reflow_and_case(self):
        self.assertEqual(check(ASR.replace('Alpha beta gamma.', 'ALPHA\nbeta gamma!'), ASR)['status'], 'PASS')
    def test_merged_cues(self):
        merged = '1\n00:00:00,000 --> 00:00:04,000\nAlpha beta gamma. Delta epsilon zeta.\n'
        self.assertEqual(check(merged, ASR)['status'], 'PASS')
    def test_missing_word(self):
        self.assertEqual(check(ASR.replace('beta ', ''), ASR)['status'], 'FAIL')
    def test_extra_word(self):
        self.assertEqual(check(ASR.replace('beta ', 'beta new '), ASR)['status'], 'FAIL')
    def test_reordered_word(self):
        self.assertEqual(check(ASR.replace('Alpha beta', 'beta Alpha'), ASR)['status'], 'FAIL')
    def test_time_shift(self):
        late = ASR.replace('00:00:00,000 --> 00:00:02,000', '00:00:01,800 --> 00:00:02,000')
        self.assertEqual(check(late, ASR)['status'], 'FAIL')
    def test_bad_timestamp(self):
        with self.assertRaises(ValueError):
            parse_srt(ASR.replace('00:00:02,000', '00:00:XX,000'))

if __name__ == '__main__':
    unittest.main()

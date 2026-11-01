#!/usr/bin/env python3
"""Unit tests for the read-only source/ASR discrepancy gate."""
import unittest
from check_source_against_asr import assess, CHANNEL


class SourceAgainstASRTests(unittest.TestCase):
    def setUp(self):
        self.request = {'targetChannelId': CHANNEL, 'format': 'short', 'segments': [
            {'spoken': 'One AI agent. Why? Exceptions.'},
            {'spoken': 'Follow Prism Bay AI for practical business systems.'},
        ]}

    def test_exact_match_passes(self):
        srt = '1\n00:00:00,000 --> 00:00:04,000\nOne AI agent. Why? Exceptions.\n\n2\n00:00:04,000 --> 00:00:08,000\nFollow Prism Bay AI for practical business systems.\n'
        result = assess(self.request, srt)
        self.assertEqual(result['status'], 'PASS')
        self.assertFalse(result['publicUploadPermittedByThisCheck'])

    def test_two_misheard_phrases_need_review(self):
        srt = '1\n00:00:00,000 --> 00:00:04,000\nOne AI agent. Uh, exceptions.\n\n2\n00:00:04,000 --> 00:00:08,000\nFollow Prism Bay AI for practical business assistance.\n'
        result = assess(self.request, srt)
        self.assertEqual(result['status'], 'REVIEW')
        self.assertEqual(len(result['differences']), 2)
        self.assertTrue(result['independentASRIsNotAudioProof'])

    def test_wrong_channel_blocks(self):
        self.request['targetChannelId'] = 'different-channel'
        self.assertEqual(assess(self.request, '1\n00:00:00,000 --> 00:00:04,000\nOne AI agent\n')['status'], 'BLOCK')

    def test_missing_segments_blocks(self):
        self.request['segments'] = []
        self.assertEqual(assess(self.request, '1\n00:00:00,000 --> 00:00:04,000\nOne AI agent\n')['status'], 'BLOCK')

    def test_missing_asr_blocks(self):
        self.assertEqual(assess(self.request, '')['status'], 'BLOCK')

    def test_hyphen_and_punctuation_normalize(self):
        self.request['segments'] = [{'spoken': 'Straight-through completion: 90 percent.'}]
        srt = '1\n00:00:00,000 --> 00:00:02,000\nStraight through completion 90 percent.\n'
        self.assertEqual(assess(self.request, srt)['status'], 'PASS')


if __name__ == '__main__':
    unittest.main()

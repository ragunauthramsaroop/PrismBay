import hashlib
import importlib.util
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / 'scripts' / 'youtube_scheduled_asset_match.py'
spec = importlib.util.spec_from_file_location('youtube_scheduled_asset_match', SCRIPT)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ScheduledAssetMatchTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.approved = Path(self.tmp.name) / 'approved.mp4'
        self.scheduled = Path(self.tmp.name) / 'scheduled.mp4'
        self.approved.write_bytes(b'original-private-review-export')
        self.scheduled.write_bytes(self.approved.read_bytes())
        self.manifest = {
            'channelId': module.CHANNEL, 'brandId': int(module.BRAND),
            'published': False, 'publicationApproved': False,
            'uploadPermitted': False, 'paidSpendUSD': 0,
            'videoSha256': hashlib.sha256(self.approved.read_bytes()).hexdigest()
        }

    def test_exact_match_never_approves_publication(self):
        result = module.assess(self.scheduled, self.approved, self.manifest)
        self.assertTrue(result['exactByteMatch'])
        self.assertFalse(result['publicationApproved'])
        self.assertFalse(result['uploadPermitted'])

    def test_different_bytes_hold(self):
        self.scheduled.write_bytes(b'other-export')
        result = module.assess(self.scheduled, self.approved, self.manifest)
        self.assertEqual(result['status'], 'HOLD_DIFFERENT_BYTES')

    def test_wrong_channel_rejected(self):
        self.manifest['channelId'] = 'another-channel'
        with self.assertRaisesRegex(ValueError, 'incorrect target'):
            module.assess(self.scheduled, self.approved, self.manifest)

    def test_wrong_brand_rejected(self):
        self.manifest['brandId'] = '1'
        with self.assertRaisesRegex(ValueError, 'incorrect target'):
            module.assess(self.scheduled, self.approved, self.manifest)

    def test_publication_flag_rejected(self):
        self.manifest['uploadPermitted'] = True
        with self.assertRaisesRegex(ValueError, 'prohibit publication'):
            module.assess(self.scheduled, self.approved, self.manifest)

    def test_missing_spend_rejected(self):
        del self.manifest['paidSpendUSD']
        with self.assertRaisesRegex(ValueError, 'paid spend'):
            module.assess(self.scheduled, self.approved, self.manifest)

    def test_manifest_sha_mismatch_rejected(self):
        self.manifest['videoSha256'] = '0' * 64
        with self.assertRaisesRegex(ValueError, 'does not match'):
            module.assess(self.scheduled, self.approved, self.manifest)

    def test_conflicting_hashes_rejected(self):
        self.manifest['sha256'] = 'a' * 64
        with self.assertRaisesRegex(ValueError, 'conflicting'):
            module.assess(self.scheduled, self.approved, self.manifest)


if __name__ == '__main__':
    unittest.main()

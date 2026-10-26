"""Regression tests for the existing PrismBay retail short renderer.

No live supplier, Stripe, media or customer requests are made.
"""
import importlib.util
import unittest
from pathlib import Path
from datetime import datetime, timezone

SCRIPT = Path(__file__).resolve().with_name('render-retail-shorts.py')
spec = importlib.util.spec_from_file_location('prismbay_retail_renderer', SCRIPT)
renderer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(renderer)

VALID = {
    'sku': 'approved-test-001',
    'legacyLive': False,
    'supplierEvidenceStatus': 'verified-sale-ready',
    'supplierIdentityVerified': True,
    'exactVariantVerified': True,
    'variantStockVerified': True,
    'finalDestinationFreightVerified': True,
    'landedCostVerified': True,
    'checkoutVerified': True,
    'fulfillmentVerified': True,
    'mediaRightsVerified': True,
    'ownerPromotionApproved': True,
    'mediaSourceType': 'original',
    'supplierEvidenceRef': 'approved-record-1',
    'mediaRightsEvidenceRef': 'original-asset-receipt-1',
    'ownerApprovalRef': 'owner-approval-1',
}


class RetailMediaGateTests(unittest.TestCase):
    def test_legacy_never_qualifies_even_with_spoofed_flags(self):
        candidate = {**VALID, 'legacyLive': True}
        self.assertFalse(renderer.product_media_release_ready(candidate))
        self.assertIsNone(renderer.active_promotion(candidate, [], datetime.now(timezone.utc)))

    def test_missing_evidence_and_each_commercial_gate_fail_closed(self):
        for key in (
            'supplierIdentityVerified', 'exactVariantVerified', 'variantStockVerified',
            'finalDestinationFreightVerified', 'landedCostVerified', 'checkoutVerified',
            'fulfillmentVerified', 'mediaRightsVerified', 'ownerPromotionApproved',
        ):
            with self.subTest(key=key):
                candidate = {**VALID, key: False}
                self.assertFalse(renderer.product_media_release_ready(candidate))
        for key in ('supplierEvidenceRef', 'mediaRightsEvidenceRef', 'ownerApprovalRef'):
            with self.subTest(key=key):
                self.assertFalse(renderer.product_media_release_ready({**VALID, key: ''}))

    def test_missing_media_provenance_or_approval_fails_closed(self):
        for candidate in (None, {}, {**VALID, 'legacyLive': None},
                          {**VALID, 'supplierEvidenceStatus': 'not-migrated'},
                          {**VALID, 'mediaSourceType': 'supplier-unlicensed'}):
            self.assertFalse(renderer.product_media_release_ready(candidate))

    def test_complete_explicit_nonlegacy_record_is_only_eligible_for_review(self):
        self.assertTrue(renderer.product_media_release_ready(VALID))
        # Eligibility for rendering is not owner approval to publish.
        self.assertIsNone(renderer.active_promotion(VALID, [], datetime.now(timezone.utc)))


if __name__ == '__main__':
    unittest.main()

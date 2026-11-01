"""Regression tests for the existing live storefront QA checkout guard."""
import unittest
from scripts.prismbay_live_storefront_audit import unapproved_home_checkout_links

BUNDLE='https://buy.stripe.com/eVqfZi5Lo7pV31Ea4MgnK0t'
CASHFLOW='https://buy.stripe.com/eVqaEYddQ6lRgSu1yggnK0v'

class VerifiedDigitalCheckoutGuardTests(unittest.TestCase):
  def test_known_digital_offers_and_tracking_query_are_allowed(self):
    links=[BUNDLE,CASHFLOW,CASHFLOW+'?client_reference_id=organic_cashflow_guide']
    self.assertEqual(unapproved_home_checkout_links(links),[])

  def test_unknown_physical_and_modified_links_fail_closed(self):
    unknown=[
      'https://buy.stripe.com/UNVERIFIED_PHYSICAL',
      CASHFLOW+'-lookalike',
      CASHFLOW.replace('https:','http:'),
      CASHFLOW.replace('buy.stripe.com','checkout.stripe.com'),
      'https://buy.stripe.com/eVqaEYddQ6lRgSu1yggnK0u',
    ]
    self.assertEqual(unapproved_home_checkout_links(unknown),unknown)

  def test_mixed_links_flag_only_unapproved(self):
    unknown='https://buy.stripe.com/unapproved'
    self.assertEqual(unapproved_home_checkout_links([BUNDLE,unknown,CASHFLOW]),[unknown])

if __name__=='__main__':
  unittest.main()

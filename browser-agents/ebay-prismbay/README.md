# PrismBay eBay Local Agent

Zero-cost local CJ-to-eBay authorization helper and verified eBay draft assistant for PrismBay.

## What it does

- Runs only on CJdropshipping and eBay pages required for the PrismBay workflow.
- Uses the expected eBay User ID `StudysmartzLLC`.
- Verifies the signed-in eBay account before opening CJ authorization.
- Navigates the CJ authorization flow, chooses eBay, fills the store User ID and launches the eBay permission step.
- Leaves the final eBay permission consent visible for the account owner to review and click.
- Verifies CJ shows the eBay store connected after consent.
- Reads the public PrismBay eBay control-plane and verified listing manifest from `clean.prismbayai.com`.
- Fills supported eBay draft fields in the seller's own signed-in browser.
- Uses the CJ-verified dispatch location only when `dispatchLocationVerified` is true.
- Keeps payment inside eBay.
- Never clicks eBay's final List/Submit button.
- Never places a CJ supplier order or payment.

## Install in Chrome / Edge / Opera

1. Download `prismbay-ebay-agent.zip` from the PrismBay eBay launch console.
2. Unzip it to a permanent folder on your computer.
3. Open your browser's Extensions page.
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
   - Opera: `opera://extensions`
4. Turn on **Developer mode**.
5. Choose **Load unpacked** and select the unzipped `ebay-prismbay` folder containing `manifest.json`.
6. Pin **PrismBay eBay Agent** to the browser toolbar.

## Connect eBay to CJ

1. Sign in to eBay as `StudysmartzLLC` and sign in to CJdropshipping.
2. Click the PrismBay eBay Agent icon.
3. Click **Connect StudysmartzLLC to CJ**.
4. The agent verifies the eBay account and drives the CJ flow.
5. If CJ displays a Store Authorization Agreement checkbox, review and tick it.
6. On eBay's permission screen, review the permissions and click **I agree**.
7. The agent then verifies the CJ connection.

The authorization run expires after 15 minutes and can be stopped from the popup.

## Fill the verified draft

1. Open the eBay selling/listing page.
2. Click the PrismBay eBay Agent icon.
3. Review the live gates.
4. Click **Fill verified draft**.
5. Review every field in eBay, especially category, shipping service, item location, returns, seller payment/account setup and any fields eBay marks as required.
6. Use eBay's own final List button only after the listing is accurate.

## Security

The extension has no password storage, no eBay password, no CJ API key, no Stripe link, no supplier-order function, no supplier payment, no payout/banking modification and no final-listing click. The final eBay permission consent remains a visible account-owner action.

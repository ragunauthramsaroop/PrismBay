# PrismBay eBay Local Agent

Zero-cost local draft assistant for the verified PrismBay garment-steamer offer.

## What it does

- Runs only on ebay.com listing pages.
- Reads the public PrismBay eBay control-plane and verified listing manifest from clean.prismbayai.com.
- Fills supported draft fields in the seller's own signed-in browser.
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

## Use

1. Sign in to eBay normally.
2. Open the eBay selling/listing page.
3. Click the PrismBay eBay Agent icon.
4. Review the live gates.
5. Click **Fill verified draft**.
6. Review every field in eBay, especially category, shipping service, item location, returns, seller payment/account setup and any fields eBay marks as required.
7. Use eBay's own final List button only after the listing is accurate.

## Security

The extension has no password storage, no eBay credentials, no CJ API key, no Stripe link, no supplier-order function and no final-listing click. It operates on the active eBay tab and public PrismBay control files only.

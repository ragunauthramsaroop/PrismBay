/** Pure, dependency-free Walmart WFS candidate underwriting. USD figures are user-supplied estimates. */
const REQUIRED_GATES = [
  ['accountApproved', 'Walmart Marketplace seller account approved for this legal entity'],
  ['wfsEnabled', 'WFS approved and enabled for the seller account'],
  ['skuExactMatch', 'UPC/GTIN, model, color, pack size and condition match exactly'],
  ['resaleRights', 'Lawful resale and any required brand privileges documented'],
  ['supplierVerified', 'Supplier identity, invoice, stock, and terms independently verified'],
  ['wfsInboundConfirmed', 'WFS inbound, labeling, freight and receiving requirements confirmed'],
  ['returnsPlanConfirmed', 'Returns and product compliance obligations reviewed'],
  ['priceAndDemandVerified', 'Saleable competitive price and demand validated with current evidence']
];

const assertMoney = (x, label) => {
  if (typeof x !== 'number' || !Number.isFinite(x) || x < 0) throw new Error(`${label} must be a nonnegative number`);
  return x;
};
const dollars = x => Math.round((x + Number.EPSILON) * 100) / 100;

export function evaluateCandidate(input) {
  if (!input || typeof input !== 'object') throw new Error('Candidate input required');
  const moneyFields = [
    'salePrice', 'wholesaleUnitCost', 'wfsFeePerSale', 'freightPerUnit', 'prepPerUnit',
    'storagePerUnit', 'returnReservePerSale', 'adsPerSale', 'otherFeesPerSale', 'cashBudget'
  ];
  for (const field of moneyFields) assertMoney(input[field], field);
  if (input.salePrice <= 0) throw new Error('salePrice must exceed zero');
  if (!Number.isInteger(input.minimumOrderQty) || input.minimumOrderQty < 1) throw new Error('minimumOrderQty must be a positive integer');
  const referralRate = input.referralRatePercent;
  const targetMargin = input.targetMarginPercent;
  for (const [k, v] of [['referralRatePercent', referralRate], ['targetMarginPercent', targetMargin]]) {
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v >= 100) throw new Error(`${k} must be from 0 to below 100`);
  }
  const qty = input.minimumOrderQty;
  const initialPerUnit = input.wholesaleUnitCost + input.freightPerUnit + input.prepPerUnit + input.storagePerUnit;
  const initialCashOutlay = initialPerUnit * qty;
  const saleVariableCost = input.wfsFeePerSale + input.returnReservePerSale + input.adsPerSale + input.otherFeesPerSale;
  const referralPerSale = input.salePrice * referralRate / 100;
  const unitContribution = input.salePrice - referralPerSale - saleVariableCost - initialPerUnit;
  const unitMargin = unitContribution / input.salePrice * 100;
  const netProceedsPerSale = input.salePrice - referralPerSale - saleVariableCost;
  const cashBreakEvenUnits = netProceedsPerSale > 0 ? Math.ceil((initialCashOutlay - 1e-9) / netProceedsPerSale) : null;
  const denom = 1 - referralRate / 100 - targetMargin / 100;
  const minimumSalePriceForTargetMargin = denom > 0 ? (initialPerUnit + saleVariableCost) / denom : null;
  const missingGates = REQUIRED_GATES.filter(([key]) => input.gates?.[key] !== true).map(([, label]) => label);
  const budgetSufficient = initialCashOutlay <= input.cashBudget;
  const passesMargin = unitMargin >= targetMargin;
  const cashRecoverableOnSellout = cashBreakEvenUnits !== null && cashBreakEvenUnits <= qty;
  const scenarios = [0.25, 0.5, 0.75, 1].map(rate => {
    const sold = Math.floor(qty * rate);
    const netCashFlow = sold * netProceedsPerSale - initialCashOutlay;
    return {
      sellThroughPercent: Math.round(rate * 100), sold, unsold: qty - sold,
      netCashFlow: dollars(netCashFlow), unsoldStockCostBasis: dollars((qty - sold) * input.wholesaleUnitCost)
    };
  });
  return {
    initialCashOutlay: dollars(initialCashOutlay), inventoryPurchaseCost: dollars(input.wholesaleUnitCost * qty),
    referralPerSale: dollars(referralPerSale), netProceedsPerSale: dollars(netProceedsPerSale),
    unitContribution: dollars(unitContribution), unitMarginPercent: dollars(unitMargin),
    profitAtSellout: dollars(unitContribution * qty),
    minimumSalePriceForTargetMargin: minimumSalePriceForTargetMargin === null ? null : dollars(minimumSalePriceForTargetMargin),
    cashBreakEvenUnits, missingGates, budgetSufficient, passesMargin, cashRecoverableOnSellout,
    decision: missingGates.length === 0 && budgetSufficient && passesMargin && cashRecoverableOnSellout
      ? 'UNDERWRITING PASSED, STILL REQUIRES HUMAN DOCUMENT REVIEW' : 'DO NOT PURCHASE',
    scenarios
  };
}

export const requiredGates = REQUIRED_GATES;

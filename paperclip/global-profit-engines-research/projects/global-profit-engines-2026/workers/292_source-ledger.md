# Worker 292 — Source ledger and infographic forensic audit

Status: manuscript input. Command #291. Worker #292.

## Verdict

The original infographic is numerically close to official reported profit figures but is not a synchronized TTM ranking. It mixes at least four fiscal windows and several accounting contexts. The correct treatment is therefore: headline figures verified where support exists, plus an explicit period-and-basis warning.

## Ten-company source ledger

| Company | Graphic | Verified figure | Period | Basis | Verdict | Primary source |
|---|---:|---:|---|---|---|---|
| Microsoft | $133.7B | $133.749B net income | FY ended Jun. 30, 2026 | US GAAP, Form 10-K | VERIFIED APPROXIMATE; different fiscal window | https://www.sec.gov/Archives/edgar/data/789019/000119312526323660/msft-20260630.htm |
| Alphabet | $132.2B | $132.170B net income | YE Dec. 31, 2025 | US GAAP, Form 10-K | VERIFIED APPROXIMATE | https://www.sec.gov/Archives/edgar/data/1652044/000165204426000018/goog-20251231.htm |
| NVIDIA | $120.1B | $120.067B net income | FY ended Jan. 25, 2026 | US GAAP, Form 10-K | VERIFIED APPROXIMATE; different fiscal window | https://www.sec.gov/Archives/edgar/data/1045810/000104581026000021/nvda-20260125.htm |
| Apple | $112.0B | $112.010B net income | FY ended Sep. 27, 2025 | US GAAP, Form 10-K | VERIFIED APPROXIMATE; different fiscal window | https://www.sec.gov/Archives/edgar/data/320193/000032019325000079/aapl-20250927.htm |
| Saudi Aramco | $92.8B | $92.811B attributable net income; $93.389B group net income | YE Dec. 31, 2025 | IFRS, audited annual report | VERIFIED APPROXIMATE on shareholder-attributable basis; ownership basis required | https://www.aramco.com/-/media/publications/corporate-reports/reports-and-presentations/2025/fy/saudi-aramco-ara-2025-english.pdf |
| Amazon | $77.7B | $77.670B net income | YE Dec. 31, 2025 | US GAAP, Form 10-K | VERIFIED APPROXIMATE | https://www.sec.gov/Archives/edgar/data/1018724/000101872426000004/amzn-20251231.htm |
| Berkshire Hathaway | $67.0B | $67.0B net earnings attributable | YE Dec. 31, 2025 | US GAAP, annual report/10-K | VERIFIED EXACT with investment-gain basis risk | https://berkshirehathaway.com/2025ar/2025ar.pdf |
| Meta | $60.5B | $60.458B net income | YE Dec. 31, 2025 | US GAAP, Form 10-K | VERIFIED APPROXIMATE | https://www.sec.gov/Archives/edgar/data/1326801/000162828026003942/meta-20251231.htm |
| JPMorgan Chase | $57.0B | $57.0B net income | YE Dec. 31, 2025 | US GAAP, annual report | VERIFIED EXACT; bank-specific treatment required | https://www.jpmorganchase.com/ir/annual-report/2025/ar-ceo-letters |
| TSMC | $55.2B | US$55.21B / NT$1,717.88B net income attributable to parent | YE Dec. 31, 2025 | IFRS, annual report | VERIFIED APPROXIMATE | https://investor.tsmc.com/static/annualReports/2025/english/index.html |

## Forensic findings

1. The graphic mixes Microsoft Jun-2026, NVIDIA Jan-2026, Apple Sep-2025, and Dec-2025 year ends. It is a latest-reported-fiscal-year list, not one common trailing-twelve-month window.
2. Aramco's $92.8B reconciles to shareholder-attributable profit, not total group net income. Both figures should be shown in the accounting note.
3. Berkshire's $67.0B contains large investment-market effects. The annual report reports about $30.7B of after-tax investment gains and $8.3B of after-tax impairment losses in 2025.
4. JPMorgan is a bank. Industrial operating-margin and conventional FCF comparisons are not appropriate.
5. TSMC reports in NT$ under IFRS and also provides US-dollar performance figures. Preserve the company's translation basis rather than reconstructing USD values without disclosure.
6. Microsoft reports GAAP and adjusted non-GAAP results. OpenAI-related adjustments belong only in the non-GAAP reconciliation and must not be mixed into the GAAP ranking.
7. Alphabet's 2025 other income, net, of $29.787B is material to the jump from operating income to net income.
8. Meta's 2025 tax provision rose sharply, so after-tax profit moved differently from operating income.
9. Amazon's 2025 non-operating income was material and cash capex accelerated sharply, so net income alone overstates the improvement in discretionary cash generation.
10. NVIDIA and TSMC have different capital structures: fabless product economics versus foundry manufacturing economics.

## Assurance rule

Every material number in the manuscript must carry one of: AUDITED VERIFIED, OFFICIAL UNAUDITED VERIFIED, INDEPENDENTLY CALCULATED, ESTIMATED, NOT VERIFIABLE.

## Release note

No title, chart or caption should describe the infographic as a synchronized TTM list unless a new TTM model is built from reconciled interim data.
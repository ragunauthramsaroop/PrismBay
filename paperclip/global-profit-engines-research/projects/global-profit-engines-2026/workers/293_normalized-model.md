# Worker 293 — Normalized profitability model

Status: manuscript input. Command: #291. Worker: #293.

## Core rule

The infographic is not a synchronized TTM ranking. It mixes at least four fiscal windows: Microsoft FY ended Jun. 30, 2026; NVIDIA FY ended Jan. 25, 2026; Apple FY ended Sep. 27, 2025; and Dec. 31, 2025 for Alphabet, Aramco, Amazon, Berkshire, Meta, JPMorgan and TSMC.

Primary presentation should therefore show two separate views:

1. Latest audited or officially reported fiscal-year profit, with the exact period printed next to every company.
2. A synchronized LTM view only after interim periods are reconciled. Every LTM result must be labelled INDEPENDENTLY CALCULATED and never audited.

## LTM formula

TTM(item) = last audited annual(item) + current YTD(item) - same-length prior-year YTD(item).

Compute this separately for revenue, operating income, net income, operating cash flow and capex. Do not average reported margins.

## Cross-company formulas

Revenue growth = (Revenue_t - Revenue_t-1) / Revenue_t-1.

Operating margin = Operating income / Revenue. Do not apply as a cross-sector leaderboard to JPMorgan. Berkshire requires an operating-earnings lane separate from GAAP net earnings.

Net margin = attributable net income / revenue, only where revenue is economically comparable.

Free cash flow = operating cash flow - cash capex. For Amazon and Meta, preserve company definitions and disclose lease-principal treatment.

Capital intensity = cash capex / revenue.

Cash conversion = operating cash flow / net income, with sector caveats.

Concentration share = company metric / sum of the same metric for the ten-company set, using one period and one currency basis only.

## Assurance taxonomy

AUDITED VERIFIED
OFFICIAL UNAUDITED VERIFIED
INDEPENDENTLY CALCULATED
ESTIMATED
NOT VERIFIABLE

## Sector comparability rules

JPMorgan: use NII, noninterest revenue, credit costs, CET1, ROTCE, efficiency ratio, deposits and distributions. Conventional industrial operating margin and FCF are not valid comparators.

Berkshire: show GAAP net earnings beside the firm's operating-earnings reconciliation. Investment gains and impairments must remain visible.

Aramco: retain IFRS group net income, shareholder-attributable net income, adjusted net income and non-IFRS FCF as separate lanes. State the sovereign tax/royalty and production-policy context.

NVIDIA vs TSMC: pair margin data with capital intensity and business model. NVIDIA is fabless. TSMC is a capital-intensive foundry.

Amazon: consolidated margin masks AWS, North America and International economics. Segment presentation is mandatory.

Meta: Family of Apps and Reality Labs must be separated.

Apple: Products and Services mix must be separated where disclosure supports it.

## Rounding and audit trail

Calculate using full precision. Round only for display. Ratios to one decimal place unless a filed ratio is quoted directly. Every published table row must carry company, metric, exact period, unit, accounting basis, source, assurance status and calculation note where relevant.

## Release gate

No synchronized league table is release-ready until all ten companies have reconciled interim periods. Until then the latest-fiscal-year table must retain the mixed-period warning.
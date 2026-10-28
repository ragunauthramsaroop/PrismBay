// Original PrismBay editorial companion to the verified public 27 October 2026 Short.
// Figures in the worked example are explicitly fictional, not bank results.
export const bodyHtml = `
<p><strong>Decision speed is not the same as financial return.</strong> On 26 October 2026, Reuters reported that Deutsche Bank had shortened decisions for some smaller corporate loans from weeks to minutes using AI. The report described selected lending processes, not a measured bank-wide profit increase. For an operator, the useful question is which costs, risks and customer outcomes change after a faster decision.</p>

<h2>Watch the original PrismBay AI explainer</h2>
<div style="position:relative;width:100%;max-width:360px;aspect-ratio:9/16;overflow:hidden;border-radius:12px;background:#101827;margin:0 auto">
<iframe src="https://www.youtube-nocookie.com/embed/i7v6wfwd5-I" title="AI Loan Decisions in Minutes: Is That Real ROI? | PrismBay AI" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen style="position:absolute;inset:0;width:100%;height:100%;border:0"></iframe>
</div>
<p><a href="https://www.youtube.com/shorts/i7v6wfwd5-I" target="_blank" rel="noopener noreferrer">Watch the public Short on PrismBay AI's original YouTube channel</a>. This article expands the measurement method and provides a worked illustration.</p>

<h2>What the October 26 report establishes</h2>
<p>Reuters reported the faster turnaround for <em>some</em> smaller corporate lending decisions and a separate improvement for certain complex multinational decisions. The article also described the bank's internal AI platform for developing, monitoring and controlling agents. It did not supply a controlled comparison of total operating costs, underwriting error rates, loss rates or incremental profit attributable to the change. Those missing measures matter before anyone declares an ROI result.</p>
<p>Source: <a href="https://www.reuters.com/business/finance/ai-cuts-some-deutsche-bank-corporate-loan-decisions-minutes-2026-10-26/" target="_blank" rel="noopener noreferrer">Reuters, 26 October 2026</a>. No PrismBay access to Deutsche Bank's internal metrics is claimed.</p>

<h2>The measurement unit: one accepted, compliant decision</h2>
<p>Do not divide a model subscription by the number of prompts and call the result cost per loan. Count the complete workflow. Include staff review, escalations, model and integration fees, quality assurance, security, data processing and rework. Use the same acceptance standard before and after automation. A decision that arrives faster but requires correction or creates additional risk is not equivalent to an accepted decision.</p>
<p><strong>Cost per accepted decision = total end-to-end workflow cost / number of accepted decisions.</strong> Track the numerator and denominator separately. Keep exceptional cases and rejected outputs visible.</p>

<h2>Fictional 200-case pilot: the difference between capacity and cash</h2>
<p>The following figures are invented solely to show the arithmetic. They are not Deutsche Bank results, forecasts or evidence of any product's performance.</p>
<ul>
<li><strong>Manual baseline:</strong> 200 cases at 50 staff minutes each, with a loaded labor rate of $40 per hour. Imputed labor cost: $6,666.67.</li>
<li><strong>AI-assisted pilot review:</strong> 200 cases at 20 staff minutes each. Imputed labor cost: $2,666.67.</li>
<li><strong>Additional exceptions:</strong> 25 cases require another 30 staff minutes. Imputed cost: $500.</li>
<li><strong>Processing:</strong> 200 cases at $0.25 per case. Cost: $50.</li>
<li><strong>Pilot integration and quality assurance:</strong> $750 allocated to this sample.</li>
<li><strong>Total pilot cost:</strong> $3,966.67. Difference against the manual baseline: $2,700 of modeled capacity-equivalent value.</li>
</ul>
<p><strong>$2,700 is not automatically cash saved.</strong> If the same staff remain on payroll and no additional profitable work is completed, the benefit is released capacity, not a verified reduction in cash expense. Cash ROI requires observed cost reductions, additional contribution margin or another defensible financial outcome. Also confirm whether both groups meet the same credit, compliance and service standards. The example does not include loan losses, which require a separate risk analysis.</p>

<h2>A seven-measure operating scorecard</h2>
<ol>
<li><strong>Median and 90th-percentile decision time:</strong> distinguish typical cases from difficult cases.</li>
<li><strong>Accepted decisions:</strong> define acceptance and independent quality checks before the trial.</li>
<li><strong>Exception and rework rates:</strong> include cases sent back to humans and corrected after release.</li>
<li><strong>Cost per accepted decision:</strong> capture all workflow costs, not inference alone.</li>
<li><strong>Risk and compliance:</strong> review policy exceptions, adverse outcomes, audit trails and human authorization.</li>
<li><strong>Customer outcomes:</strong> measure completion, abandonment and complaints without assuming speed improves approval quality.</li>
<li><strong>Cash realization:</strong> separate staff time released from actual payroll savings and incremental gross margin.</li>
</ol>

<h2>Run the pilot without weakening controls</h2>
<p>Choose one bounded workflow and record at least four weeks of baseline data, or enough cases to represent normal and exceptional demand. Define exclusion criteria and route high-risk cases to a named reviewer. Run a shadow period where AI proposes decisions but humans retain final authority. Record time, error, override and cost for every case. Then compare matched cohorts and review any adverse outcomes before expanding autonomy.</p>
<p>For lending and other regulated decisions, legal requirements, fairness, explainability, records retention and human accountability need specialist review. This page offers a business measurement framework, not legal, credit or regulatory advice.</p>

<h2>Executive decision rule</h2>
<p>Approve expansion only when the pilot demonstrates an acceptable decision-quality level, traceable human control and a credible improvement in the complete economics of an accepted result. Speed is a service metric. Verified financial benefit is a separate result.</p>
<p>PrismBay AI publishes original practical guidance for founders, operators and executives implementing AI business systems. <a href="https://www.youtube.com/@PrismBayAI" target="_blank" rel="noopener noreferrer">Visit the original channel</a> for further evidence-led lessons. This article contains no paid endorsement and does not represent a commercial relationship with Deutsche Bank or Reuters.</p>
`;

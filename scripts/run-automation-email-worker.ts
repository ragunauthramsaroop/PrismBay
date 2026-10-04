import { runProductionAutomationEmailWorkerBatch } from "../src/lib/automation-email-worker";

function safeSummary(result: Awaited<ReturnType<typeof runProductionAutomationEmailWorkerBatch>>) {
  const states: Record<string, number> = {};
  for (const item of result.results || []) {
    const state = String(item?.status || "unknown");
    states[state] = (states[state] || 0) + 1;
  }
  return {
    enabled: result.enabled === true,
    leased: Number(result.leased || 0),
    recoveredExpiredLeases: Number(result.recoveredExpiredLeases || 0),
    states,
  };
}

try {
  const result = await runProductionAutomationEmailWorkerBatch();
  console.log(JSON.stringify({ worker: "prismbay-automation-email", ...safeSummary(result) }));
} catch {
  console.error(JSON.stringify({ worker: "prismbay-automation-email", status: "failed", detail: "review worker configuration and provider logs" }));
  process.exitCode = 1;
}

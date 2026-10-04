# Clean storefront observations for the existing commerce controller

The repository already has Paperclip company configurations, CEO recovery planning,
specialist allocation and scheduled GitHub workflows. Do not add another scheduler
or agent framework until a verified execution requirement warrants one.

The existing AppDeploy watchdog monitors the backend origin. The customer-facing
catalog now also lives at https://clean.prismbayai.com. These are distinct surfaces;
success on one does not prove the other works.

## Change

The existing Paperclip Commerce Group workflow runs `clean-storefront-observer.mjs`
before allocation. It records homepage and three catalog asset delivery checks,
following the exact versioned URLs in the page. It only requests the known origin,
rejects redirects and never executes downloaded JavaScript. Network failures become
observations so allocation can continue.

The allocator assigns failed checks to `storefront-conversion` with priority one,
stable task IDs, evidence and a completion criterion. Missing, incomplete, wrong-origin,
future or older-than-30-minute observations create an evidence-restoration task.
The workflow retains the observation with the existing taskboard artifact and reports
its scope in the Actions summary. No new permissions, dependencies or services.

## Verification and limits

Run the observer and allocator test files with `node --test`. The complete existing
Commerce Group regression command also includes the observer tests.

This detects asset delivery failures, not visual rendering, image resolution, remote
catalog overrides, successful checkout, private AppDeploy worker heartbeats or revenue.
An allocated task is not proof that an LLM worker executed it. Existing downstream
execution and production approval controls remain responsible for changes.

This PR must be merged before the existing cloud schedule uses the new observer.
It does not launch a local background worker, deploy a new backend or enable a model.
Next, verify private runtime heartbeats and task completion receipts before claiming
end-to-end autonomous execution. Use the existing controller and model routing first;
LangGraph, CrewAI and OpenHands are not required for this repair.

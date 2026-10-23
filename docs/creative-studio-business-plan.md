# Creative Studio: sellable product plan

## Built on the feature branch

The /creative-studio route offers three headline options, a social caption, a four-shot 30-second ad storyboard, a six-slide executive deck outline, a seven-day work plan, an HTML landing-page download and a Markdown campaign-plan download. The planning engine runs inside the browser. No vendor API calls or payment occur.

Existing navigation and sitemap entries link to the new route. This remains a proposed feature until the PR is reviewed, checked and released.

## Verified original projects (23 October 2026)

| Source | GitHub | Licence | Future function |
| --- | --- | --- | --- |
| OpenHands Agent Canvas | https://github.com/OpenHands/OpenHands | MIT | Protected developer/worker control plane |
| screenshot-to-code | https://github.com/abi/screenshot-to-code | MIT | Screenshot-to-frontend conversion service |
| CrewAI | https://github.com/crewAIInc/crewAI | MIT | Supervised planning and QA pipeline |
| PPTAgent | https://github.com/icip-cas/PPTAgent | MIT | Editable presentation rendering |
| Open AI UGC | https://github.com/Anil-matcha/Open-AI-UGC | MIT | Video rendering with paid MUAPI credentials |

The screenshot's OpenHands/agent-canvas repository is archived and directs users to OpenHands/OpenHands. No upstream code is copied into this release. Future adaptations require applicable copyright notices, dependency audits, model-provider terms and secure deployment.

## Business model

A free campaign-pack generator can attract business clients with a useful first result. The first paid pathway links to existing PrismBay professional digital toolkits, using their established checkout and fulfillment links. The second pathway is a manually quoted done-for-you project.

Quote-based packages may cover brand messaging, advertising copy, presentation design, landing pages and optional licensed video. Do not advertise fixed deliverables, prices or turnaround until operations can fulfill them. Each quote must confirm media rights, claims evidence, timeline, revision policy, payment terms and production cost.

Measure real landing visits, mail inquiries, approved quotes, Stripe-confirmed payments, deliveries and refunds separately. A generated template is not a paying customer.

## Future adapter plan

1. CrewAI supervises research, copy and quality-assurance tasks with manual approvals.
2. screenshot-to-code receives authorized screenshots in a sandboxed, authenticated server workflow.
3. PPTAgent produces editable PPTX after a budget, technical and rights preflight.
4. Open AI UGC connects to MUAPI only with approved server-held keys and cost ceilings; provider model calls are billable.
5. OpenHands Agent Canvas displays operator-only activity on protected infrastructure, not publicly accessible account controls.

No paid video, real agents, screenshot inference, automatic publishing, PPTX generation or checkout are enabled in this initial branch. Quote links launch the customer's mail client only. No lead is stored or sent from a background API.

## Test and release

Test command: node --experimental-strip-types --test scripts/test-creative-offer.mjs

GitHub Actions uses a read-only workflow to execute these tests on relevant changes. Prior to merge, verify CI, run the complete production build, inspect mobile and desktop display, test downloaded files, validate support-mail delivery and approve all public offer claims. Only actual payment records establish sales.

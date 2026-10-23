# GitHub integration and automated checks

The connected GitHub app returned HTTP 403 (resource not accessible by integration) for branch creation, file creation, and issue creation in `ragunauthramsaroop/Nexus-Network`. No write to that repository was completed.

## Recommended clean repository

Create a dedicated GitHub repository named `nexus-messenger` in the owner's GitHub account. Upload the contents of the source archive at the repository root, including the `.github` folder. Do not upload the ZIP as a single tracked file. No secrets or configuration credentials belong in the repository. Select a code license only after reviewing IP and distribution plans. The third-party Matrix SDK remains Apache-2.0.

After the first push, GitHub Actions runs unit tests and the TypeScript/Vite build. Dependabot prepares dependency update pull requests weekly. Changes must be reviewed before merge. No workflow automatically deploys, merges, or spends money.

## Alternative monorepo integration

To keep Nexus Messenger under `Nexus-Network`, copy its source into `apps/nexus-messenger/`, and move its `.github/workflows/ci.yml` into the parent repository's `.github/workflows/messenger-ci.yml`. Add `defaults: { run: { working-directory: apps/nexus-messenger } }` under the workflow, and run `npm install` within the app directory. Set branch policy and Vercel/Railway root directory to `apps/nexus-messenger`; do not reuse the production Nexus Network server or its database.

## How to fix connected GitHub writes

Review GitHub app installation permissions and repository selections. The GitHub connector needs Contents: Read and write, Pull requests: Read and write, and Issues: Read and write for the target repository, then reconnect if the installation permissions change. An apparent repository `push: true` listing does not supersede an integration-specific HTTP 403 error.

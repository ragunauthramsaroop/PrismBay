#!/usr/bin/env bash
set -euo pipefail
# Opt-in checkout of upstream source for inspection, local installation and licenses.
# IMPORTANT: Running this script clones code only. It does not deploy/start any service.
mkdir -p .vendor
REPOS=(
 'https://github.com/OpenCut-app/OpenCut.git'
 'https://github.com/debpalash/VoiceStudio.git'
 'https://github.com/AppFlowy-IO/AppFlowy.git'
 'https://github.com/makeplane/plane.git'
 'https://github.com/calcom/cal.diy.git'
 'https://github.com/chatwoot/chatwoot.git'
 'https://github.com/every-app/open-seo.git'
 'https://github.com/CapSoftware/Cap.git'
 'https://github.com/dyad-sh/dyad.git'
 'https://github.com/OpenWhispr/openwhispr.git'
)
for repo in "${REPOS[@]}"; do
  name=$(basename "$repo" .git)
  if [ -d ".vendor/$name/.git" ]; then printf 'Existing: %s\n' "$name";continue;fi
  git clone --depth=1 "$repo" ".vendor/$name"
done
printf '\n10 upstream repositories checked out into .vendor. Review licenses before running services.\n'

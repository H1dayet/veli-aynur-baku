#!/usr/bin/env sh
# Deploy the invitation + RSVP Worker to huselabs.az/veli-aynur-baku. Run from anywhere: sh cloudflare/deploy.sh
set -e
cd "$(dirname "$0")"
rm -rf site && mkdir -p site/veli-aynur-baku
cp -r ../index.html ../style.css ../script.js ../assets site/veli-aynur-baku/
npx --yes wrangler@latest deploy

#!/bin/bash
set -e

echo "Creating codespace..."
gh codespace create --repo neilbmclaughlin/wa-location

echo "Getting codespace name..."
CODESPACE_NAME=$(gh codespace list --json name --jq '.[0].name')
echo "Codespace: $CODESPACE_NAME"

echo "App will be available at:"
echo "https://${CODESPACE_NAME}-3000.app.github.dev/"

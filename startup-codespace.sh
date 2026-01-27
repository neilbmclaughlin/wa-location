#!/bin/bash
set -e

echo "Cleaning up existing codespaces..."
EXISTING=$(gh codespace list --json name --jq '.[].name' 2>/dev/null || echo "")
if [ ! -z "$EXISTING" ]; then
  echo "Stopping and deleting existing codespace: $EXISTING"
  gh codespace stop --codespace "$EXISTING" 2>/dev/null || echo "Codespace already stopped"
  gh codespace delete --codespace "$EXISTING" --force
fi

echo "Creating fresh codespace..."
gh codespace create --repo neilbmclaughlin/wa-location

echo "Getting codespace name..."
CODESPACE_NAME=$(gh codespace list --json name --jq '.[0].name')
echo "Codespace: $CODESPACE_NAME"

echo "Waiting for codespace setup to complete..."
while true; do
  STATE=$(gh codespace list --json name,state --jq ".[] | select(.name==\"$CODESPACE_NAME\") | .state")
  if [ "$STATE" = "Available" ]; then
    echo "Codespace is available!"
    break
  fi
  echo "Current state: $STATE - waiting..."
  sleep 10
done

echo "Checking port forwarding..."
gh codespace ports --codespace "$CODESPACE_NAME"

echo "Ensuring port 3000 is public..."
gh codespace ports visibility 3000:public --codespace "$CODESPACE_NAME"

echo "Waiting for port forwarding to be set up and public..."
for i in {1..30}; do
  APP_URL=$(gh codespace ports --codespace "$CODESPACE_NAME" --json browseUrl,visibility --jq '.[] | select(.visibility=="public") | .browseUrl' 2>/dev/null)
  if [ ! -z "$APP_URL" ]; then
    echo "Port forwarding is ready and public!"
    break
  fi
  echo "Waiting for port forwarding... ($i/30)"
  sleep 10
done

if [ -z "$APP_URL" ]; then
  echo "Error: Port forwarding not ready"
  gh codespace ports --codespace "$CODESPACE_NAME"
else
  open "${APP_URL}"
fi

#!/usr/bin/env bash
set -e

cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)/frontend" || cd ./frontend
npm run dev

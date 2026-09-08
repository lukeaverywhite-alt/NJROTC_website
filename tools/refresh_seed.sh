#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
node tools/export_static_data.js . > data/seed.json.tmp
python3 -m json.tool data/seed.json.tmp >/dev/null
mv data/seed.json.tmp data/seed.json

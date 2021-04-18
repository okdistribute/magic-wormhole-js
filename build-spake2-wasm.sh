#!/bin/bash

set -e

cd spake2-wasm
wasm-pack build --target=nodejs --out-dir=pkg
rm pkg/.gitignore pkg/package.json pkg/README.md

wasm-pack build --target=web --out-dir=web
rm web/.gitignore web/package.json web/README.md

cd ..

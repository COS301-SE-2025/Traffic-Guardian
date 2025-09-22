#!/bin/bash
# Script to generate JSDoc documentation

# Navigate to Documentation directory if not already there
cd "$(dirname "$0")"

# Install docdash template if not already installed
npm install docdash --no-save

# Run JSDoc
echo "Generating JSDoc documentation..."
npx jsdoc -c jsdoc.json

echo "Documentation generated in ./output directory"
#!/bin/bash
# Script to generate JSDoc documentation

# Navigate to Documentation directory if not already there
cd "$(dirname "$0")"

# Install required templates and plugins
echo "Installing documentation dependencies..."
npm install docdash jsdoc-summarize --no-save

# Run JSDoc with enhanced configuration
echo "Generating JSDoc documentation..."
npx jsdoc -c jsdoc.json

# Create index.html redirect in output root if it doesn't exist
echo "Creating index redirect..."
if [ ! -f "output/index.html" ]; then
  echo '<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=./index.html"></head><body></body></html>' > output/index.html
fi

echo "Documentation generated in ./output directory"
echo "Open ./output/index.html in your browser to view"
#!/bin/sh -eu
REPO_ROOT=$(git rev-parse --show-toplevel) && cd $REPO_ROOT

echo "=== Running coverage analysis for plgg library ==="
echo "Target: 100% coverage (C1 and C2 branch coverage)"
echo "Provider: v8 (native Node.js coverage)"
echo ""

cd $REPO_ROOT/src/plgg

echo "=== Running tests with coverage ==="
npm run coverage

echo ""
echo "=== Coverage analysis complete ==="
echo "Report generated at: coverage/index.html"
echo "Text summary displayed above"
echo ""

# Check if coverage thresholds were met
if [ $? -eq 0 ]; then
  echo "✅ Coverage thresholds met"
else
  echo "❌ Coverage thresholds not met - see report for details"
  echo "Run 'npm run coverage' to re-run coverage analysis"
  exit 1
fi

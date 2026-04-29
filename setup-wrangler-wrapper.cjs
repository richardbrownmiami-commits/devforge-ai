const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

if (!process.env.GITHUB_PATH) {
  console.log('Not in GitHub Actions, skipping wrangler wrapper setup');
  process.exit(0);
}

const binDir = path.resolve('./node_modules/.bin');
fs.mkdirSync(binDir, { recursive: true });

const wranglerWrapper = '#!/bin/bash\nif [[ "$*" == *"d1"* ]]; then\n  echo "INFO: D1 migration skipped (worker handles table creation on first use)"\n  exit 0\nfi\nexec wrangler-global "$@"\n';

fs.writeFileSync(path.join(binDir, 'wrangler'), wranglerWrapper);
fs.chmodSync(path.join(binDir, 'wrangler'), '755');

try {
  const globalWrangler = execSync('which wrangler', { encoding: 'utf8' }).trim();
  fs.writeFileSync(path.join(binDir, 'wrangler-global'), '#!/bin/bash\nexec ' + globalWrangler + ' "$@"\n');
  fs.chmodSync(path.join(binDir, 'wrangler-global'), '755');
  console.log('Wrangler wrapper installed. Global wrangler:', globalWrangler);
} catch(e) {
  fs.writeFileSync(path.join(binDir, 'wrangler-global'), '#!/bin/bash\nexec /usr/local/bin/wrangler "$@"\n');
  fs.chmodSync(path.join(binDir, 'wrangler-global'), '755');
}

const githubPath = process.env.GITHUB_PATH;
fs.appendFileSync(githubPath, binDir + '\n');
console.log('Added to GITHUB_PATH:', binDir);

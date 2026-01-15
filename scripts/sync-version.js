#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Read package.json version
const packageJson = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8'));
const version = packageJson.version;

// Read sw.js
const swPath = join(rootDir, 'sw.js');
let swContent = readFileSync(swPath, 'utf8');

// Update CACHE_VERSION line
const versionRegex = /const CACHE_VERSION = ['"`][^'"`]+['"`];/;
const newVersionLine = `const CACHE_VERSION = '${version}';`;

if (versionRegex.test(swContent)) {
    swContent = swContent.replace(versionRegex, newVersionLine);
    writeFileSync(swPath, swContent, 'utf8');
    console.log(`✓ Updated sw.js CACHE_VERSION to ${version}`);
} else {
    console.error('✗ Could not find CACHE_VERSION in sw.js');
    process.exit(1);
}

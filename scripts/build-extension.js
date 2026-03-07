#!/usr/bin/env node
/**
 * Builds chrome-extension.zip with APP_URL injected.
 * Usage: APP_URL=https://your-app.run.app node scripts/build-extension.js
 * Or: npm run build:extension (uses APP_URL from env, defaults to http://localhost:3000)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const extDir = path.join(root, 'chrome-extension');
const distDir = path.join(root, 'dist');
const buildDir = path.join(root, 'dist', 'chrome-extension-build');

const APP_URL = process.env.APP_URL || process.env.VITE_APP_URL || 'http://localhost:3000';

const FILES_TO_INJECT = [
  'content.js',
  'popup.js',
  'options.js',
  'shared.js',
  'background.js',
];

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function copyRecursive(src, dest, inject) {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      ensureDir(destPath);
      copyRecursive(srcPath, destPath, inject);
    } else {
      if (inject && FILES_TO_INJECT.includes(entry.name)) {
        let content = fs.readFileSync(srcPath, 'utf8');
        content = content.replace(/__APP_URL__/g, APP_URL);
        fs.writeFileSync(destPath, content);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
}

function buildExtension() {
  ensureDir(buildDir);
  copyRecursive(extDir, buildDir, true);
  ensureDir(distDir);
  const zipPath = path.join(distDir, 'chrome-extension.zip');
  if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

  try {
    const absZipPath = path.resolve(root, 'dist', 'chrome-extension.zip');
    execSync(`cd "${buildDir}" && zip -r "${absZipPath}" . -x "*.DS_Store"`, {
      stdio: 'inherit',
    });
  } catch (e) {
    console.error('zip command failed. On Windows, install 7-Zip or use WSL.');
    process.exit(1);
  }

  fs.rmSync(buildDir, { recursive: true, force: true });
  console.log(`Built chrome-extension.zip with APP_URL=${APP_URL}`);
  console.log(`Output: ${zipPath}`);
}

buildExtension();

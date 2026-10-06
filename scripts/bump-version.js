import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const pkgPath = path.join(rootDir, 'package.json');
const appVersionPath = path.join(rootDir, 'src', 'config', 'appVersion.ts');

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

// Get current semantic version (from appVersion.ts or package.json)
let currentVersion = '2.4.0';
if (fs.existsSync(appVersionPath)) {
  const content = fs.readFileSync(appVersionPath, 'utf-8');
  const match = content.match(/APP_VERSION\s*=\s*["']([^"']+)["']/);
  if (match) currentVersion = match[1];
}

const type = process.argv[2] || 'patch'; // 'major', 'minor', 'patch', 'sync'

let [major, minor, patch] = currentVersion.split('.').map(Number);
if (isNaN(major)) major = 2;
if (isNaN(minor)) minor = 4;
if (isNaN(patch)) patch = 0;

if (type === 'major') {
  major += 1;
  minor = 0;
  patch = 0;
} else if (type === 'minor') {
  minor += 1;
  patch = 0;
} else if (type === 'patch') {
  patch += 1;
}

const newVersion = `${major}.${minor}.${patch}`;

// Get current Month Year and Git Commit
const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const now = new Date();
const buildDate = `${months[now.getMonth()]} ${now.getFullYear()}`;
const buildTimestamp = now.toISOString();

let gitCommit = 'local';
try {
  gitCommit = execSync('git rev-parse --short HEAD', { cwd: rootDir }).toString().trim();
} catch (_) {}

// Update package.json
pkg.version = newVersion;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');

// Update src/config/appVersion.ts
const appVersionContent = `export const APP_VERSION = "${newVersion}";
export const APP_BUILD_DATE = "${buildDate}";
export const APP_BUILD_TIMESTAMP = "${buildTimestamp}";
export const APP_GIT_COMMIT = "${gitCommit}";
export const APP_NAME = "RestaurantsOS";
`;

fs.writeFileSync(appVersionPath, appVersionContent, 'utf-8');

console.log(`[Version Tracker] Updated application version to v${newVersion} (${type})`);
console.log(`[Version Tracker] Build: ${buildDate} | Commit: ${gitCommit}`);

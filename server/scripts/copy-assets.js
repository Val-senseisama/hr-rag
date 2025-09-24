import fs from 'fs';
import path from 'path';

const projectRoot = process.cwd();

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function copyDir(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return;
  ensureDir(destDir);
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Copy templates → dist/templates
const templatesSrc = path.join(projectRoot, 'templates');
const templatesDest = path.join(projectRoot, 'dist', 'templates');
copyDir(templatesSrc, templatesDest);

console.log('Assets copied to dist.');



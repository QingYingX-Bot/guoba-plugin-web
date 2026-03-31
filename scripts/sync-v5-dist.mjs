import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(scriptDir, '..');
const sourceDir = path.resolve(webRoot, 'apps/web-antd/dist');
const targetDir = path.resolve(webRoot, '../server/static');

const KEEP_TARGET_ENTRIES = new Set(['resource']);

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function removeTargetEntries(targetPath) {
  if (!(await pathExists(targetPath))) {
    return;
  }

  const targetEntries = await fs.readdir(targetPath);
  await Promise.all(
    targetEntries.map(async (entry) => {
      if (KEEP_TARGET_ENTRIES.has(entry)) {
        return;
      }
      const fullPath = path.join(targetPath, entry);
      await fs.rm(fullPath, { force: true, recursive: true });
    }),
  );
}

async function copyDistToTarget(sourcePath, targetPath) {
  const sourceEntries = await fs.readdir(sourcePath);
  await Promise.all(
    sourceEntries.map(async (entry) => {
      const from = path.join(sourcePath, entry);
      const to = path.join(targetPath, entry);
      await fs.cp(from, to, { force: true, recursive: true });
    }),
  );
}

async function run() {
  const sourceIndex = path.join(sourceDir, 'index.html');
  if (!(await pathExists(sourceIndex))) {
    throw new Error(
      `Cannot find ${sourceIndex}. Run "pnpm run build:v5:app" first.`,
    );
  }

  await fs.mkdir(targetDir, { recursive: true });
  await removeTargetEntries(targetDir);
  await copyDistToTarget(sourceDir, targetDir);

  console.log(`[sync-v5-dist] copied ${sourceDir} -> ${targetDir}`);
}

run().catch((error) => {
  console.error('[sync-v5-dist] failed:', error.message);
  process.exit(1);
});

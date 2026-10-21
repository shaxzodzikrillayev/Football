import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

function findProjectRoot(start: string): string {
  let dir = start;
  for (let i = 0; i < 10; i += 1) {
    if (fs.existsSync(path.join(dir, 'package.json'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return start;
}

export const projectRoot = findProjectRoot(here);
export const serverRoot = path.join(projectRoot, 'server');
export const clientRoot = path.join(projectRoot, 'client');
export const distRoot = path.join(projectRoot, 'dist');

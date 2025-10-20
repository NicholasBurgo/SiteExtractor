import { promises as fs } from 'fs';
import { join } from 'path';

export interface RunFolder {
  id: string;
  path: string;
  truthPath: string;
  imagesPath: string;
  textPath: string;
  navbarPath: string;
  miscPath: string;
  packedPath: string;
  generatedPath: string;
  renderPath: string;
  logsPath: string;
}

export function getRunFolder(dataDir: string, runId: string): RunFolder {
  const runPath = join(dataDir, runId);
  
  return {
    id: runId,
    path: runPath,
    truthPath: join(runPath, 'truth.json'),
    imagesPath: join(runPath, 'images'),
    textPath: join(runPath, 'text'),
    navbarPath: join(runPath, 'navbar'),
    miscPath: join(runPath, 'misc'),
    packedPath: join(runPath, 'packed'),
    generatedPath: join(runPath, 'generated'),
    renderPath: join(runPath, 'render'),
    logsPath: join(runPath, 'logs'),
  };
}

export async function ensureDir(path: string): Promise<void> {
  try {
    await fs.access(path);
  } catch {
    await fs.mkdir(path, { recursive: true });
  }
}

export async function writeJsonFile(path: string, data: any): Promise<void> {
  await ensureDir(path.substring(0, path.lastIndexOf('/')));
  await fs.writeFile(path, JSON.stringify(data, null, 2));
}

export async function readJsonFile<T>(path: string): Promise<T> {
  const content = await fs.readFile(path, 'utf-8');
  return JSON.parse(content);
}

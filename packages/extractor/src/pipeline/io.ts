import fs from 'fs';
import path from 'path';
import type { ExtractedPage, PackBundle, Image } from '../types.js';

/**
 * Write extracted page to JSON file with enhanced structure
 */
export async function writePageJson(page: ExtractedPage, outDir: string): Promise<string> {
  const dir = path.resolve(outDir);
  
  // Ensure directory exists
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  const filename = `${page.slug}.page.json`;
  const filepath = path.join(dir, filename);
  
  // Write JSON with pretty formatting
  fs.writeFileSync(filepath, JSON.stringify(page, null, 2), 'utf8');
  
  return filepath;
}

/**
 * Write structured artifacts for confirmation phase
 */
export async function writeStructuredArtifacts(
  page: ExtractedPage, 
  html: string, 
  outDir: string
): Promise<{ pageJson: string; htmlFile: string; imageMap?: string }> {
  const baseDir = path.resolve(outDir);
  const pagesDir = path.join(baseDir, 'pages');
  const htmlDir = path.join(baseDir, 'html');
  const imageMapDir = path.join(baseDir, 'image_map');
  
  // Ensure directories exist
  [pagesDir, htmlDir, imageMapDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
  
  // Write page JSON
  const pageJsonPath = path.join(pagesDir, `${page.slug}.page.json`);
  fs.writeFileSync(pageJsonPath, JSON.stringify(page, null, 2), 'utf8');
  
  // Write HTML snapshot
  const htmlPath = path.join(htmlDir, `${page.slug}.html`);
  fs.writeFileSync(htmlPath, html, 'utf8');
  
  // Write image map if images exist
  let imageMapPath: string | undefined;
  if (page.images?.value && page.images.value.length > 0) {
    const imageMap: Record<string, Image> = {};
    for (const img of page.images.value) {
      imageMap[img.id] = img;
    }
    
    imageMapPath = path.join(imageMapDir, `${page.slug}.images.json`);
    fs.writeFileSync(imageMapPath, JSON.stringify(imageMap, null, 2), 'utf8');
  }
  
  return {
    pageJson: pageJsonPath,
    htmlFile: htmlPath,
    imageMap: imageMapPath
  };
}

/**
 * Read extracted page from JSON file
 */
export async function readPageJson(filePath: string): Promise<ExtractedPage> {
  const content = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(content);
}

/**
 * Read all page JSON files from directory
 */
export async function readAllPageJson(dirPath: string): Promise<ExtractedPage[]> {
  const dir = path.resolve(dirPath);
  
  if (!fs.existsSync(dir)) {
    return [];
  }
  
  const files = fs.readdirSync(dir)
    .filter(file => file.endsWith('.page.json'))
    .map(file => path.join(dir, file));
  
  const pages: ExtractedPage[] = [];
  
  for (const file of files) {
    try {
      const page = await readPageJson(file);
      pages.push(page);
    } catch (error) {
      console.warn(`Failed to read ${file}:`, error);
    }
  }
  
  return pages;
}

/**
 * Write pack bundle to JSON file
 */
export async function writePackBundle(bundle: PackBundle, outDir: string): Promise<string> {
  const dir = path.resolve(outDir);
  
  // Ensure directory exists
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const domain = bundle.site.domain.replace(/[^a-zA-Z0-9]/g, '-');
  const filename = `${domain}-${timestamp}.bundle.json`;
  const filepath = path.join(dir, filename);
  
  // Write JSON with pretty formatting
  fs.writeFileSync(filepath, JSON.stringify(bundle, null, 2), 'utf8');
  
  return filepath;
}

/**
 * Read pack bundle from JSON file
 */
export async function readPackBundle(filePath: string): Promise<PackBundle> {
  const content = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(content);
}

/**
 * Create a ZIP archive with bundle and assets
 */
export async function createPackArchive(
  bundle: PackBundle,
  outDir: string,
  assetsDir?: string
): Promise<string> {
  // This would require a ZIP library like 'archiver' or 'yazl'
  // For now, we'll just write the JSON file
  const bundlePath = await writePackBundle(bundle, outDir);
  
  // TODO: Implement ZIP creation with assets
  // const archiver = require('archiver');
  // const archive = archiver('zip', { zlib: { level: 9 } });
  // const output = fs.createWriteStream(bundlePath.replace('.json', '.zip'));
  // archive.pipe(output);
  // archive.file(bundlePath, { name: 'bundle.json' });
  // 
  // if (assetsDir && fs.existsSync(assetsDir)) {
  //   archive.directory(assetsDir, 'assets');
  // }
  // 
  // await archive.finalize();
  // 
  // return bundlePath.replace('.json', '.zip');
  
  return bundlePath;
}

/**
 * Get file stats for debugging
 */
export function getFileStats(filePath: string): any {
  try {
    const stats = fs.statSync(filePath);
    return {
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory()
    };
  } catch (error) {
    return null;
  }
}

/**
 * List all files in directory with stats
 */
export function listDirectory(dirPath: string, pattern?: RegExp): any[] {
  try {
    const files = fs.readdirSync(dirPath);
    
    return files
      .filter(file => !pattern || pattern.test(file))
      .map(file => {
        const filePath = path.join(dirPath, file);
        const stats = getFileStats(filePath);
        
        return {
          name: file,
          path: filePath,
          ...stats
        };
      });
  } catch (error) {
    return [];
  }
}

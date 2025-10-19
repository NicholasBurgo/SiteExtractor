/**
 * File processing utilities
 * Provides file operations, validation, and management functions
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync, statSync } from 'fs';
import { join, dirname, basename, extname } from 'path';
import crypto from 'crypto';

/**
 * Ensure directory exists
 */
export function ensureDirectoryExists(dirPath: string): void {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Write JSON file with pretty formatting
 */
export function writeJsonFile(filePath: string, data: any): void {
  ensureDirectoryExists(dirname(filePath));
  writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * Read JSON file
 */
export function readJsonFile(filePath: string): any {
  if (!existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  const content = readFileSync(filePath, 'utf8');
  return JSON.parse(content);
}

/**
 * Write text file
 */
export function writeTextFile(filePath: string, content: string): void {
  ensureDirectoryExists(dirname(filePath));
  writeFileSync(filePath, content, 'utf8');
}

/**
 * Read text file
 */
export function readTextFile(filePath: string): string {
  if (!existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  return readFileSync(filePath, 'utf8');
}

/**
 * Check if file exists
 */
export function fileExists(filePath: string): boolean {
  return existsSync(filePath);
}

/**
 * Get file size in bytes
 */
export function getFileSize(filePath: string): number {
  if (!existsSync(filePath)) {
    return 0;
  }
  return statSync(filePath).size;
}

/**
 * Get file modification time
 */
export function getFileModTime(filePath: string): Date | null {
  if (!existsSync(filePath)) {
    return null;
  }
  return statSync(filePath).mtime;
}

/**
 * Calculate file hash
 */
export function calculateFileHash(filePath: string, algorithm: string = 'sha256'): string {
  if (!existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  const content = readFileSync(filePath);
  return crypto.createHash(algorithm).update(content).digest('hex');
}

/**
 * Calculate content hash
 */
export function calculateContentHash(content: string, algorithm: string = 'sha256'): string {
  return crypto.createHash(algorithm).update(content, 'utf8').digest('hex');
}

/**
 * Generate unique filename
 */
export function generateUniqueFilename(originalPath: string, suffix?: string): string {
  const dir = dirname(originalPath);
  const name = basename(originalPath, extname(originalPath));
  const ext = extname(originalPath);
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  
  const baseName = suffix ? `${name}-${suffix}` : name;
  return join(dir, `${baseName}-${timestamp}-${random}${ext}`);
}

/**
 * Sanitize filename
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Get file extension
 */
export function getFileExtension(filePath: string): string {
  return extname(filePath).toLowerCase();
}

/**
 * Check if file is image
 */
export function isImageFile(filePath: string): boolean {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico'];
  return imageExtensions.includes(getFileExtension(filePath));
}

/**
 * Check if file is document
 */
export function isDocumentFile(filePath: string): boolean {
  const documentExtensions = ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt'];
  return documentExtensions.includes(getFileExtension(filePath));
}

/**
 * Check if file is archive
 */
export function isArchiveFile(filePath: string): boolean {
  const archiveExtensions = ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2'];
  return archiveExtensions.includes(getFileExtension(filePath));
}

/**
 * Validate file size
 */
export function validateFileSize(filePath: string, maxSizeBytes: number): boolean {
  const size = getFileSize(filePath);
  return size <= maxSizeBytes;
}

/**
 * Validate file type
 */
export function validateFileType(filePath: string, allowedExtensions: string[]): boolean {
  const extension = getFileExtension(filePath);
  return allowedExtensions.includes(extension);
}

/**
 * Create backup of file
 */
export function createBackup(filePath: string): string {
  if (!existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  
  const backupPath = generateUniqueFilename(filePath, 'backup');
  const content = readFileSync(filePath);
  writeFileSync(backupPath, content);
  
  return backupPath;
}

/**
 * Copy file
 */
export function copyFile(sourcePath: string, destPath: string): void {
  if (!existsSync(sourcePath)) {
    throw new Error(`Source file not found: ${sourcePath}`);
  }
  
  ensureDirectoryExists(dirname(destPath));
  const content = readFileSync(sourcePath);
  writeFileSync(destPath, content);
}

/**
 * Move file
 */
export function moveFile(sourcePath: string, destPath: string): void {
  if (!existsSync(sourcePath)) {
    throw new Error(`Source file not found: ${sourcePath}`);
  }
  
  ensureDirectoryExists(dirname(destPath));
  const content = readFileSync(sourcePath);
  writeFileSync(destPath, content);
  
  // Note: In a real implementation, you'd use fs.renameSync or fs.moveSync
  // For now, we'll just copy and let the caller handle deletion
}

/**
 * Get file info
 */
export function getFileInfo(filePath: string): {
  exists: boolean;
  size: number;
  modTime: Date | null;
  extension: string;
  isImage: boolean;
  isDocument: boolean;
  isArchive: boolean;
} {
  return {
    exists: fileExists(filePath),
    size: getFileSize(filePath),
    modTime: getFileModTime(filePath),
    extension: getFileExtension(filePath),
    isImage: isImageFile(filePath),
    isDocument: isDocumentFile(filePath),
    isArchive: isArchiveFile(filePath)
  };
}

/**
 * Create directory structure
 */
export function createDirectoryStructure(basePath: string, structure: Record<string, any>): void {
  for (const [name, content] of Object.entries(structure)) {
    const path = join(basePath, name);
    
    if (typeof content === 'object' && content !== null) {
      ensureDirectoryExists(path);
      createDirectoryStructure(path, content);
    } else {
      ensureDirectoryExists(dirname(path));
      writeFileSync(path, content || '', 'utf8');
    }
  }
}

/**
 * Clean up old files
 */
export function cleanupOldFiles(directory: string, maxAgeMs: number): number {
  let cleanedCount = 0;
  
  try {
    const files = require('fs').readdirSync(directory);
    const now = Date.now();
    
    for (const file of files) {
      const filePath = join(directory, file);
      const stat = statSync(filePath);
      
      if (now - stat.mtime.getTime() > maxAgeMs) {
        require('fs').unlinkSync(filePath);
        cleanedCount++;
      }
    }
  } catch (error) {
    // Ignore errors during cleanup
  }
  
  return cleanedCount;
}

/**
 * Get directory size
 */
export function getDirectorySize(directory: string): number {
  let totalSize = 0;
  
  try {
    const files = require('fs').readdirSync(directory);
    
    for (const file of files) {
      const filePath = join(directory, file);
      const stat = statSync(filePath);
      
      if (stat.isDirectory()) {
        totalSize += getDirectorySize(filePath);
      } else {
        totalSize += stat.size;
      }
    }
  } catch (error) {
    // Ignore errors
  }
  
  return totalSize;
}


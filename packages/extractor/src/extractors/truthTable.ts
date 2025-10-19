/**
 * Truth table extractor
 * Extracts structured data using the existing Python truth_extractor module
 */

import type { CheerioAPI } from 'cheerio';
import { TruthTableData } from '../core/schema.js';
import { spawn } from 'child_process';
import { writeFileSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

export interface TruthTableExtractionOptions {
  pythonModule?: string;
  fallbackToHtml?: boolean;
  timeout?: number;
  tempDir?: string;
}

/**
 * Extract truth table data using Python module
 */
export async function extractTruthTable(
  $: CheerioAPI,
  baseUrl: string,
  options: TruthTableExtractionOptions = {}
): Promise<TruthTableData> {
  const {
    pythonModule = 'truth_extractor.cli',
    fallbackToHtml = true,
    timeout = 30000,
    tempDir = tmpdir()
  } = options;

  try {
    // Try Python extraction first
    const pythonResult = await extractWithPython($, baseUrl, pythonModule, timeout, tempDir);
    if (pythonResult && Object.keys(pythonResult.table).length > 0) {
      return pythonResult;
    }
  } catch (error) {
    console.warn('Python truth extraction failed:', error);
  }

  // Fallback to HTML-based extraction
  if (fallbackToHtml) {
    return extractTruthTableFromHtml($, baseUrl);
  }

  return { table: {} };
}

/**
 * Extract truth table using Python module
 */
async function extractWithPython(
  $: CheerioAPI,
  baseUrl: string,
  pythonModule: string,
  timeout: number,
  tempDir: string
): Promise<TruthTableData> {
  return new Promise((resolve, reject) => {
    // Create temporary HTML file
    const tempHtmlFile = join(tempDir, `temp_${Date.now()}.html`);
    writeFileSync(tempHtmlFile, $.html());

    // Spawn Python process
    const pythonProcess = spawn('python', ['-m', pythonModule, '--file', tempHtmlFile, '--url', baseUrl], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    pythonProcess.on('close', (code) => {
      // Clean up temporary file
      try {
        unlinkSync(tempHtmlFile);
      } catch (error) {
        // Ignore cleanup errors
      }

      if (code === 0) {
        try {
          // Parse Python output
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (error) {
          reject(new Error(`Failed to parse Python output: ${error}`));
        }
      } else {
        reject(new Error(`Python process failed with code ${code}: ${stderr}`));
      }
    });
    
    pythonProcess.on('error', (error) => {
      reject(new Error(`Failed to spawn Python process: ${error}`));
    });

    // Set timeout
    setTimeout(() => {
      pythonProcess.kill();
      reject(new Error('Python extraction timeout'));
    }, timeout);
  });
}

/**
 * Extract truth table from HTML (fallback method)
 */
export function extractTruthTableFromHtml($: CheerioAPI, baseUrl: string): TruthTableData {
  const table: TruthTableData['table'] = {};

  // Extract brand name
  const brandName = extractBrandName($);
  if (brandName) {
    table.brand_name = {
      value: brandName,
      confidence: 0.8,
      provenance: [{ url: baseUrl, method: 'html.title' }]
    };
  }

  // Extract contact information
  const contactInfo = extractContactInfo($);
  if (contactInfo.email) {
    table.email = {
      value: contactInfo.email,
      confidence: 0.7,
      provenance: [{ url: baseUrl, method: 'html.email' }]
    };
  }

  if (contactInfo.phone) {
    table.phone = {
      value: contactInfo.phone,
      confidence: 0.7,
      provenance: [{ url: baseUrl, method: 'html.phone' }]
    };
  }

  // Extract social links
  const socialLinks = extractSocialLinks($);
  if (socialLinks.length > 0) {
    table.social_links = {
      value: socialLinks,
      confidence: 0.6,
      provenance: [{ url: baseUrl, method: 'html.social' }]
    };
  }

  // Extract services
  const services = extractServices($);
  if (services.length > 0) {
    table.services = {
      value: services,
      confidence: 0.6,
      provenance: [{ url: baseUrl, method: 'html.services' }]
    };
  }

  // Extract colors
  const colors = extractColors($);
  if (colors.length > 0) {
    table.colors = {
      value: colors,
      confidence: 0.5,
      provenance: [{ url: baseUrl, method: 'html.colors' }]
    };
  }

  return { table };
}

/**
 * Extract brand name from HTML
 */
function extractBrandName($: CheerioAPI): string | null {
  // Try title tag first
  const title = $('title').text().trim();
  if (title) {
    // Extract company name from title (before common separators)
    const brandMatch = title.match(/^([^|•-]+)/);
    if (brandMatch) {
      return brandMatch[1].trim();
    }
  }

  // Try h1 tag
  const h1 = $('h1').first().text().trim();
  if (h1) {
    return h1;
  }

  // Try logo alt text
  const logoAlt = $('img[alt*="logo"], img[class*="logo"]').attr('alt');
  if (logoAlt) {
    return logoAlt;
  }

  return null;
}

/**
 * Extract contact information from HTML
 */
function extractContactInfo($: CheerioAPI): { email?: string; phone?: string } {
  const contact: { email?: string; phone?: string } = {};

  // Extract email
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const text = $('body').text();
  const emailMatch = text.match(emailRegex);
  if (emailMatch) {
    contact.email = emailMatch[0];
  }

  // Extract phone
  const phoneRegex = /(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g;
  const phoneMatch = text.match(phoneRegex);
  if (phoneMatch) {
    contact.phone = phoneMatch[0];
  }

  return contact;
}

/**
 * Extract social links from HTML
 */
function extractSocialLinks($: CheerioAPI): string[] {
  const socialLinks: string[] = [];
  const socialDomains = ['facebook.com', 'twitter.com', 'instagram.com', 'linkedin.com', 'youtube.com'];

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (href) {
      try {
        const url = new URL(href);
        if (socialDomains.some(domain => url.hostname.includes(domain))) {
          socialLinks.push(href);
        }
      } catch (error) {
        // Skip invalid URLs
      }
    }
  });

  return [...new Set(socialLinks)]; // Remove duplicates
}

/**
 * Extract services from HTML
 */
function extractServices($: CheerioAPI): string[] {
  const services: string[] = [];
  const serviceKeywords = ['service', 'services', 'offering', 'offerings', 'solution', 'solutions'];

  // Look for service-related headings
  $('h1, h2, h3, h4, h5, h6').each((_, el) => {
    const text = $(el).text().toLowerCase();
    if (serviceKeywords.some(keyword => text.includes(keyword))) {
      const serviceText = $(el).text().trim();
      if (serviceText && !services.includes(serviceText)) {
        services.push(serviceText);
      }
    }
  });

  // Look for service lists
  $('ul, ol').each((_, el) => {
    const $list = $(el);
    const listText = $list.text().toLowerCase();
    if (serviceKeywords.some(keyword => listText.includes(keyword))) {
      $list.find('li').each((_, liEl) => {
        const serviceText = $(liEl).text().trim();
        if (serviceText && !services.includes(serviceText)) {
          services.push(serviceText);
        }
      });
    }
  });

  return services;
}

/**
 * Extract colors from HTML
 */
function extractColors($: CheerioAPI): string[] {
  const colors: string[] = [];
  const colorRegex = /#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}/g;

  // Extract from style attributes
  $('[style]').each((_, el) => {
    const style = $(el).attr('style');
    if (style) {
      const matches = style.match(colorRegex);
      if (matches) {
        colors.push(...matches);
      }
    }
  });

  // Extract from CSS classes (common color names)
  const colorClasses = $('[class]').map((_, el) => $(el).attr('class')).get();
  const colorNames = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'black', 'white', 'gray'];
  
  for (const className of colorClasses) {
    if (className) {
      const classWords = className.split(/\s+/);
      for (const word of classWords) {
        if (colorNames.includes(word.toLowerCase())) {
          colors.push(word);
        }
      }
    }
  }

  return [...new Set(colors)]; // Remove duplicates
}

/**
 * Validate truth table data
 */
export function validateTruthTableData(data: TruthTableData): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required fields
  const requiredFields = ['brand_name'];
  for (const field of requiredFields) {
    if (!data.table[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Validate confidence scores
  for (const [field, value] of Object.entries(data.table)) {
    if (value.confidence < 0 || value.confidence > 1) {
      errors.push(`Invalid confidence score for ${field}: ${value.confidence}`);
    }
    
    if (value.confidence < 0.5) {
      warnings.push(`Low confidence for ${field}: ${value.confidence}`);
    }
  }

  // Validate email format
  if (data.table.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.table.email.value)) {
      errors.push(`Invalid email format: ${data.table.email.value}`);
    }
  }

  // Validate phone format
  if (data.table.phone) {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (!phoneRegex.test(data.table.phone.value.replace(/[\s\-\(\)]/g, ''))) {
      warnings.push(`Potentially invalid phone format: ${data.table.phone.value}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}
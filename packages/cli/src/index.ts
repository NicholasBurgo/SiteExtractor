#!/usr/bin/env node

import { Command } from 'commander';
import { spawn } from 'node:child_process';
import path from 'node:path';

const program = new Command();

program
  .name('pipeline')
  .description('Site Generator Pipeline CLI')
  .version('0.1.0');

program
  .command('run')
  .description('Run the complete site generation pipeline')
  .option('--url <url>', 'Website URL to process')
  .option('--out <dir>', 'Output directory', './build/site')
  .option('--base <path>', 'Base path for links/CSS', '.')
  .option('--max-pages <number>', 'Maximum pages to crawl', '20')
  .option('--no-llm', 'Use deterministic extraction (no LLM)')
  .action(async (options) => {
    const { url, out, base, maxPages, noLlm } = options;
    
    if (!url) {
      console.error('Error: --url is required');
      process.exit(1);
    }

    console.log(`Starting pipeline for: ${url}`);
    console.log(`Output directory: ${out}`);
    console.log(`Max pages: ${maxPages}`);
    console.log(`Deterministic mode: ${noLlm ? 'Yes' : 'No'}`);

    // Build Python command
    const pythonCmd = process.platform === 'win32' ? 'py' : 'python3';
    const args = [
      '-m', 'truth_extractor',
      url,
      '--out', out,
      '--max-pages', maxPages
    ];

    // Add additional options if needed
    if (noLlm) {
      console.log('Note: Deterministic mode requested (no LLM)');
      // The current truth-extractor doesn't have --no-llm flag
      // but we can add it later or handle it differently
    }

    // Spawn the Python process
    const child = spawn(pythonCmd, args, {
      cwd: path.join(process.cwd()),
      stdio: 'inherit'
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log('\n✅ Pipeline completed successfully!');
        console.log(`Output available at: ${out}`);
      } else {
        console.error(`\n❌ Pipeline failed with exit code: ${code}`);
        process.exit(code || 1);
      }
    });

    child.on('error', (error) => {
      console.error('Failed to start pipeline:', error);
      process.exit(1);
    });
  });

program.parse();

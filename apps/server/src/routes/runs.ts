import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { readdir, stat, unlink, rmdir } from 'fs/promises';
import { join } from 'path';

interface RunInfo {
  id: string;
  url: string;
  timestamp: string;
  status: 'extracted' | 'confirmed' | 'generated';
  files: {
    truth: boolean;
    images: boolean;
    navbar: boolean;
    paragraphs: boolean;
    misc: boolean;
  };
}

export async function runsRoute(fastify: FastifyInstance) {
  // List all runs
  fastify.get('/api/runs/list', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Try multiple possible paths for the runs directory
      const possiblePaths = [
        join(process.cwd(), '..', '..', 'runs'),
        join(process.cwd(), '..', '..', '..', 'runs'),
        join(__dirname, '..', '..', '..', '..', 'runs'),
        join(__dirname, '..', '..', '..', '..', '..', 'runs')
      ];
      
      let runsDir = '';
      for (const path of possiblePaths) {
        try {
          await stat(path);
          runsDir = path;
          break;
        } catch (error) {
          // Path doesn't exist, try next one
          continue;
        }
      }
      
      if (!runsDir) {
        fastify.log.error(`Runs directory not found. Tried paths: ${possiblePaths.join(', ')}`);
        return reply.status(500).send({ error: 'Runs directory not found' });
      }
      const entries = await readdir(runsDir);
      
      const runs: RunInfo[] = [];
      
      for (const entry of entries) {
        const entryPath = join(runsDir, entry);
        const stats = await stat(entryPath);
        
        if (stats.isDirectory()) {
          // Parse run ID to extract URL and timestamp
          const runId = entry;
          const url = parseUrlFromRunId(runId);
          const timestamp = parseTimestampFromRunId(runId);
          
          // Check which files exist
          const files = await checkFilesExist(entryPath);
          
          runs.push({
            id: runId,
            url,
            timestamp,
            status: 'extracted', // Default status
            files
          });
        }
      }
      
      // Sort by timestamp (newest first)
      runs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      return { runs };
    } catch (error) {
      fastify.log.error('Failed to list runs:', error);
      return reply.status(500).send({ error: 'Failed to list runs' });
    }
  });

  // Delete a run
  fastify.delete('/api/runs/:runId', async (request: FastifyRequest<{ Params: { runId: string } }>, reply: FastifyReply) => {
    try {
      const { runId } = request.params;
      
      // Try multiple possible paths for the runs directory
      const possiblePaths = [
        join(process.cwd(), '..', '..', 'runs', runId),
        join(process.cwd(), '..', '..', '..', 'runs', runId),
        join(__dirname, '..', '..', '..', '..', 'runs', runId),
        join(__dirname, '..', '..', '..', '..', '..', 'runs', runId)
      ];
      
      let runPath = '';
      for (const path of possiblePaths) {
        try {
          await stat(path);
          runPath = path;
          break;
        } catch (error) {
          // Path doesn't exist, try next one
          continue;
        }
      }
      
      if (!runPath) {
        return reply.status(404).send({ error: 'Run not found' });
      }
      
      // Delete the entire run directory
      await deleteDirectory(runPath);
      
      return { success: true };
    } catch (error) {
      fastify.log.error('Failed to delete run:', error);
      return reply.status(500).send({ error: 'Failed to delete run' });
    }
  });
}

function parseUrlFromRunId(runId: string): string {
  // Extract domain from run ID (e.g., "www-northshoreexteriorupkeep-com" -> "https://www.northshoreexteriorupkeep.com")
  const domainPart = runId.split('-')[0];
  if (domainPart === 'react-template-com') {
    return 'https://react-template.com';
  }
  // Convert dashes back to dots and add https://
  const domain = domainPart.replace(/-/g, '.');
  return `https://${domain}`;
}

function parseTimestampFromRunId(runId: string): string {
  // Extract timestamp from run ID (e.g., "2025-10-20T10-25-42" -> "2025-10-20T10:25:42")
  const parts = runId.split('-');
  if (parts.length >= 4) {
    const timestampPart = parts.slice(-3).join('-');
    return timestampPart.replace(/-/g, ':');
  }
  return new Date().toISOString();
}

async function checkFilesExist(runPath: string) {
  const files = {
    truth: false,
    images: false,
    navbar: false,
    paragraphs: false,
    misc: false,
  };

  try {
    // Check for truth.json
    try {
      await stat(join(runPath, 'truth.json'));
      files.truth = true;
    } catch {}

    // Check for images directory and manifest
    try {
      await stat(join(runPath, 'images', 'manifest.json'));
      files.images = true;
    } catch {}

    // Check for navbar directory and navbar.json
    try {
      await stat(join(runPath, 'navbar', 'navbar.json'));
      files.navbar = true;
    } catch {}

    // Check for text directory and text.json (paragraphs)
    try {
      await stat(join(runPath, 'text', 'text.json'));
      files.paragraphs = true;
    } catch {}

    // Check for misc directory
    try {
      await stat(join(runPath, 'misc'));
      files.misc = true;
    } catch {}
  } catch (error) {
    // If we can't check files, assume none exist
  }

  return files;
}

async function deleteDirectory(dirPath: string): Promise<void> {
  try {
    const entries = await readdir(dirPath);
    
    for (const entry of entries) {
      const entryPath = join(dirPath, entry);
      const stats = await stat(entryPath);
      
      if (stats.isDirectory()) {
        await deleteDirectory(entryPath);
      } else {
        await unlink(entryPath);
      }
    }
    
    await rmdir(dirPath);
  } catch (error) {
    throw new Error(`Failed to delete directory: ${error}`);
  }
}

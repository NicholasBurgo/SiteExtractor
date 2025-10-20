import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { writeFileSync, existsSync, mkdirSync } from 'fs';

const execFileAsync = promisify(execFile);

interface MetaRequest {
  Body: {
    url: string;
    runId: string;
  };
}

export async function metaRoute(fastify: FastifyInstance) {
  fastify.post<MetaRequest>('/meta', async (request, reply) => {
    const { url, runId } = request.body;
    
    try {
      // Create run directory if it doesn't exist
      const runDir = join(process.cwd(), '..', '..', 'runs', runId);
      if (!existsSync(runDir)) {
        mkdirSync(runDir, { recursive: true });
      }
      
      // Path to the Python script
      const scriptPath = join(process.cwd(), '..', 'web', 'meta_extractor.py');
      
      fastify.log.info(`Running meta extraction for ${url} with runId ${runId}`);
      
      // Execute the Python script
      const { stdout, stderr } = await execFileAsync('python', [scriptPath, url]);
      
      if (stderr) {
        fastify.log.warn(`Meta extraction stderr: ${stderr}`);
      }
      
      // Parse the JSON output
      const metaData = JSON.parse(stdout);
      
      // Save to run directory
      const metaFilePath = join(runDir, 'meta.json');
      writeFileSync(metaFilePath, JSON.stringify(metaData, null, 2));
      
      fastify.log.info(`Meta extraction completed for ${runId}`);
      
      return {
        status: 'success',
        message: 'Meta extraction completed',
        runId,
        result: metaData
      };
    } catch (error) {
      fastify.log.error(`Meta extraction failed for ${runId}:`, error);
      reply.code(500);
      return {
        status: 'error',
        message: 'Meta extraction failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        runId
      };
    }
  });
}

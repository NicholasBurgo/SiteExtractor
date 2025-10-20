import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { writeFileSync, existsSync, mkdirSync } from 'fs';

const execFileAsync = promisify(execFile);

interface ServicesRequest {
  Body: {
    url: string;
    runId: string;
  };
}

export async function servicesRoute(fastify: FastifyInstance) {
  fastify.post<ServicesRequest>('/services', async (request, reply) => {
    const { url, runId } = request.body;
    
    try {
      // Create run directory if it doesn't exist
      const runDir = join(process.cwd(), '..', '..', 'runs', runId);
      if (!existsSync(runDir)) {
        mkdirSync(runDir, { recursive: true });
      }
      
      // Path to the Python script
      const scriptPath = join(process.cwd(), '..', 'web', 'services_extractor.py');
      
      fastify.log.info(`Running services extraction for ${url} with runId ${runId}`);
      
      // Execute the Python script
      const { stdout, stderr } = await execFileAsync('python', [scriptPath, url]);
      
      if (stderr) {
        fastify.log.warn(`Services extraction stderr: ${stderr}`);
      }
      
      // Parse the JSON output
      const servicesData = JSON.parse(stdout);
      
      // Save to run directory
      const servicesFilePath = join(runDir, 'services.json');
      writeFileSync(servicesFilePath, JSON.stringify(servicesData, null, 2));
      
      fastify.log.info(`Services extraction completed for ${runId}`);
      
      return {
        status: 'success',
        message: 'Services extraction completed',
        runId,
        result: servicesData
      };
    } catch (error) {
      fastify.log.error(`Services extraction failed for ${runId}:`, error);
      reply.code(500);
      return {
        status: 'error',
        message: 'Services extraction failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        runId
      };
    }
  });
}

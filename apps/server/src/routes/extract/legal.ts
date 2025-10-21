import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { execFile } from 'child_process';
import { join } from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

interface LegalRequest {
  Body: {
    url: string;
    runId: string;
  };
}

export async function legalRoute(fastify: FastifyInstance) {
  fastify.post<LegalRequest>('/legal', async (request, reply) => {
    const { url, runId } = request.body;
    
    try {
      const scriptPath = join(process.cwd(), '..', '..', 'extractors', 'legal_extractor.py');
      
      fastify.log.info(`Running legal extraction for ${url} with runId ${runId}`);
      
      const { stdout, stderr } = await execFileAsync('python', [scriptPath, url]);
      
      if (stderr) {
        fastify.log.warn(`Legal extraction stderr: ${stderr}`);
      }
      
      const result = JSON.parse(stdout);
      
      return {
        status: 'success',
        message: 'Legal extraction completed',
        runId,
        result
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return {
        status: 'error',
        message: 'Legal extraction failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        runId
      };
    }
  });
}


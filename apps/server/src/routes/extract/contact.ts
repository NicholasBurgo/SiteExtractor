import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { execFile } from 'child_process';
import { join } from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

interface ContactRequest {
  Body: {
    url: string;
    runId: string;
  };
}

export async function contactRoute(fastify: FastifyInstance) {
  fastify.post<ContactRequest>('/contact', async (request, reply) => {
    const { url, runId } = request.body;
    
    try {
      const scriptPath = join(process.cwd(), '..', 'web', 'contact_extractor.py');
      
      fastify.log.info(`Running contact extraction for ${url} with runId ${runId}`);
      
      const { stdout, stderr } = await execFileAsync('python', [scriptPath, url]);
      
      if (stderr) {
        fastify.log.warn(`Contact extraction stderr: ${stderr}`);
      }
      
      const result = JSON.parse(stdout);
      
      return {
        status: 'success',
        message: 'Contact extraction completed',
        runId,
        result
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return {
        status: 'error',
        message: 'Contact extraction failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        runId
      };
    }
  });
}

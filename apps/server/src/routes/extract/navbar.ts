import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface NavbarRequest {
  Body: {
    runId: string;
  };
}

export async function navbarRoute(fastify: FastifyInstance) {
  fastify.post<NavbarRequest>('/navbar', async (request, reply) => {
    const { runId } = request.body;
    
    try {
      // Read the extracted navbar data from the run directory
      const navbarFilePath = join(process.cwd(), '..', '..', 'runs', runId, 'navbar', 'navbar.json');
      
      fastify.log.info(`Looking for navbar file at: ${navbarFilePath}`);
      
      if (!existsSync(navbarFilePath)) {
        fastify.log.warn(`Navbar file not found: ${navbarFilePath}`);
        reply.code(404);
        return {
          status: 'error',
          message: 'No navbar data found for this run',
          runId,
          debug: {
            navbarFilePath,
            cwd: process.cwd()
          }
        };
      }
      
      const navbarData = JSON.parse(readFileSync(navbarFilePath, 'utf8'));
      
      return {
        status: 'success',
        message: 'Navbar extraction completed',
        runId,
        navbar: navbarData
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return {
        status: 'error',
        message: 'Navbar extraction failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });
}

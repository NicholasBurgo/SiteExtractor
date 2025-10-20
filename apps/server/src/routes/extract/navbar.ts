import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

interface NavbarRequest {
  Body: {
    runId: string;
  };
}

export async function navbarRoute(fastify: FastifyInstance) {
  fastify.post<NavbarRequest>('/navbar', async (request, reply) => {
    const { runId } = request.body;
    
    try {
      // TODO: Implement navbar extraction
      return {
        status: 'success',
        message: 'Navbar extraction completed',
        runId,
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

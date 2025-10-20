import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

interface ImagesRequest {
  Body: {
    runId: string;
  };
}

export async function imagesRoute(fastify: FastifyInstance) {
  fastify.post<ImagesRequest>('/images', async (request, reply) => {
    const { runId } = request.body;
    
    try {
      // TODO: Implement image extraction
      return {
        status: 'success',
        message: 'Image extraction completed',
        runId,
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return {
        status: 'error',
        message: 'Image extraction failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });
}

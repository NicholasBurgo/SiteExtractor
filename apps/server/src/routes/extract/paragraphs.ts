import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface ParagraphsRequest {
  Body: {
    runId: string;
  };
}

interface Paragraph {
  id: string;
  type: 'title' | 'paragraph';
  content: string;
  page: string;
  status: 'keep' | 'remove' | 'edit';
  confidence: number;
  order: number;
  dom_selector: string;
  text_hash: string;
  entity_links: string[];
  labels: string[];
  created_at: string;
  updated_at: string;
}

export async function paragraphsRoute(fastify: FastifyInstance) {
  fastify.post<ParagraphsRequest>('/paragraphs', async (request, reply) => {
    const { runId } = request.body;
    
    try {
      // Read the extracted paragraph data from the run directory
      const textFilePath = join(process.cwd(), 'runs', runId, 'text', 'text.json');
      
      if (!existsSync(textFilePath)) {
        reply.code(404);
        return {
          status: 'error',
          message: 'No paragraph data found for this run',
          runId,
        };
      }
      
      const textData = JSON.parse(readFileSync(textFilePath, 'utf8'));
      
      // Convert the extracted data to the format expected by the frontend
      const paragraphs: Paragraph[] = textData.map((item: any, index: number) => ({
        id: item.id || `paragraph_${index}`,
        type: item.type === 'title' ? 'title' : 'paragraph',
        content: item.content,
        page: item.page || 'Home',
        status: 'keep' as const,
        confidence: item.confidence || 0.5,
        order: item.order || index,
        dom_selector: item.dom_selector || 'p',
        text_hash: item.text_hash || '',
        entity_links: item.entity_links || [],
        labels: item.labels || [],
        created_at: item.created_at || new Date().toISOString(),
        updated_at: item.updated_at || new Date().toISOString(),
      }));
      
      return {
        status: 'success',
        message: 'Paragraph extraction completed',
        runId,
        paragraphs,
        count: paragraphs.length,
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return {
        status: 'error',
        message: 'Paragraph extraction failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });
}

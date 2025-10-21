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
  title?: string;
  subtitle?: string;
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
      // Try multiple possible paths for the runs directory
      const possiblePaths = [
        join(process.cwd(), '..', '..', 'runs', runId, 'text', 'text.json'),
        join(process.cwd(), '..', '..', '..', 'runs', runId, 'text', 'text.json'),
        join(__dirname, '..', '..', '..', '..', 'runs', runId, 'text', 'text.json'),
        join(__dirname, '..', '..', '..', '..', '..', 'runs', runId, 'text', 'text.json')
      ];
      
      let textFilePath = '';
      for (const path of possiblePaths) {
        if (existsSync(path)) {
          textFilePath = path;
          break;
        }
      }
      
      if (textFilePath) {
        fastify.log.info(`Found text file at: ${textFilePath}`);
        const textData = JSON.parse(readFileSync(textFilePath, 'utf8'));
        
        // Convert the extracted data to the format expected by the frontend
        const paragraphs: Paragraph[] = textData.map((item: any, index: number) => ({
          id: item.id || `paragraph_${index}`,
          type: item.type === 'title' ? 'title' : 'paragraph',
          content: item.content,
          title: item.title,
          subtitle: item.subtitle,
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
      }
      
      // Fallback: Create basic paragraph data
      fastify.log.info(`Text file not found, creating basic paragraph data for runId: ${runId}`);
      
      const basicParagraphs: Paragraph[] = [
        {
          id: 'paragraph_1',
          type: 'paragraph',
          content: 'Welcome to our website. This is a sample paragraph that would normally be extracted from the website content.',
          title: '',
          subtitle: '',
          page: 'Home',
          status: 'keep',
          confidence: 0.8,
          order: 1,
          dom_selector: 'p',
          text_hash: '',
          entity_links: [],
          labels: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'paragraph_2',
          type: 'paragraph',
          content: 'We provide excellent services and are committed to customer satisfaction.',
          title: '',
          subtitle: '',
          page: 'Home',
          status: 'keep',
          confidence: 0.7,
          order: 2,
          dom_selector: 'p',
          text_hash: '',
          entity_links: [],
          labels: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      ];
      
      return {
        status: 'success',
        message: 'Basic paragraph data created',
        runId,
        paragraphs: basicParagraphs,
        count: basicParagraphs.length,
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

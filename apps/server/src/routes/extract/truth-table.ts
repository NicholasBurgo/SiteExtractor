import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { config } from '../../config/env';
import { getRunFolder, ensureDir, writeJsonFile } from '@sg/utils';
import { generateRunId } from '@sg/utils';

interface TruthTableRequest {
  Body: {
    url: string;
    maxPages?: number;
    timeout?: number;
    usePlaywright?: boolean;
  };
}

export async function truthTableRoute(fastify: FastifyInstance) {
  fastify.post<TruthTableRequest>('/truth-table', async (request, reply) => {
    const { url, maxPages = 20, timeout = 10, usePlaywright = true } = request.body;
    
    try {
      // Generate run ID
      const runId = generateRunId(new URL(url).hostname);
      const runFolder = getRunFolder(config.DATA_DIR, runId);
      
      // Ensure directories exist
      await ensureDir(runFolder.path);
      await ensureDir(runFolder.logsPath);
      
      // TODO: Integrate with existing Python truth extractor
      // For now, create a placeholder response
      const truthRecord = {
        business_id: runId,
        domain: new URL(url).hostname,
        crawled_at: new Date().toISOString(),
        pages_visited: 0,
        fields: {
          brand_name: { value: null, confidence: 0.0, provenance: [], notes: 'not implemented' },
          location: { value: null, confidence: 0.0, provenance: [], notes: 'not implemented' },
          email: { value: null, confidence: 0.0, provenance: [], notes: 'not implemented' },
          phone: { value: null, confidence: 0.0, provenance: [], notes: 'not implemented' },
          socials: { value: null, confidence: 0.0, provenance: [], notes: 'not implemented' },
          services: { value: null, confidence: 0.0, provenance: [], notes: 'not implemented' },
          brand_colors: { value: null, confidence: 0.0, provenance: [], notes: 'not implemented' },
          logo: { value: null, confidence: 0.0, provenance: [], notes: 'not implemented' },
          background: { value: null, confidence: 0.0, provenance: [], notes: 'not implemented' },
          slogan: { value: null, confidence: 0.0, provenance: [], notes: 'not implemented' },
        },
        candidates: {
          brand_name: [],
          location: [],
          email: [],
          phone: [],
          socials: [],
          services: [],
          brand_colors: [],
          logo: [],
          background: [],
          slogan: [],
        },
      };
      
      // Write truth record
      await writeJsonFile(runFolder.truthPath, truthRecord);
      
      return {
        runId,
        status: 'success',
        message: 'Truth table extraction completed',
        truthRecord,
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return {
        status: 'error',
        message: 'Truth table extraction failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });
}

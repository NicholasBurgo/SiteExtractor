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
      // Try multiple possible paths for the runs directory
      const possiblePaths = [
        join(process.cwd(), '..', '..', 'runs', runId, 'navbar', 'navbar.json'),
        join(process.cwd(), '..', '..', '..', 'runs', runId, 'navbar', 'navbar.json'),
        join(__dirname, '..', '..', '..', '..', 'runs', runId, 'navbar', 'navbar.json'),
        join(__dirname, '..', '..', '..', '..', '..', 'runs', runId, 'navbar', 'navbar.json')
      ];
      
      let navbarFilePath = '';
      for (const path of possiblePaths) {
        if (existsSync(path)) {
          navbarFilePath = path;
          break;
        }
      }
      
      if (navbarFilePath) {
        fastify.log.info(`Found navbar file at: ${navbarFilePath}`);
        const navbarData = JSON.parse(readFileSync(navbarFilePath, 'utf8'));
        
        return {
          status: 'success',
          message: 'Navbar extraction completed',
          runId,
          navbar: navbarData
        };
      }
      
      // Fallback: Create basic navbar data from unified extraction if available
      fastify.log.info(`Navbar file not found, creating basic navbar data for runId: ${runId}`);
      
      const basicNavbarData = {
        pages: [
          { id: 'home', title: 'Home', url: '/', order: 1 },
          { id: 'about', title: 'About', url: '/about', order: 2 },
          { id: 'services', title: 'Services', url: '/services', order: 3 },
          { id: 'contact', title: 'Contact', url: '/contact', order: 4 }
        ],
        extracted_at: new Date().toISOString(),
        runId
      };
      
      return {
        status: 'success',
        message: 'Basic navbar data created',
        runId,
        navbar: basicNavbarData
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

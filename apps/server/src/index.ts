import Fastify from 'fastify';
import cors from '@fastify/cors';
import staticFiles from '@fastify/static';
import multipart from '@fastify/multipart';
import { join } from 'path';
import { existsSync } from 'fs';
import { config } from './config/env';
import { registerRoutes } from './routes';

const fastify = Fastify({
  logger: {
    level: config.NODE_ENV === 'development' ? 'debug' : 'info',
    transport: config.NODE_ENV === 'development' ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
      },
    } : undefined,
  },
});

async function start() {
  try {
    // Register plugins
    await fastify.register(cors, {
      origin: true,
      credentials: true,
    });

    await fastify.register(multipart);

    // Find the runs directory
    const possibleRunsPaths = [
      join(process.cwd(), '..', '..', 'runs'),
      join(process.cwd(), '..', '..', '..', 'runs'),
      join(__dirname, '..', '..', '..', '..', 'runs'),
      join(__dirname, '..', '..', '..', '..', '..', 'runs')
    ];
    
    let runsDir = '';
    for (const path of possibleRunsPaths) {
      if (existsSync(path)) {
        runsDir = path;
        break;
      }
    }
    
    if (runsDir) {
      await fastify.register(staticFiles, {
        root: runsDir,
        prefix: '/runs/',
      });
      fastify.log.info(`Static files served from: ${runsDir}`);
    } else {
      fastify.log.warn('Runs directory not found, static file serving disabled');
    }

    // Register routes
    await registerRoutes(fastify);

    // Health check
    fastify.get('/health', async () => {
      return { status: 'ok', timestamp: new Date().toISOString() };
    });

    // Start server
    await fastify.listen({ port: config.PORT, host: '0.0.0.0' });
    fastify.log.info(`Server listening on port ${config.PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();

import { FastifyInstance } from 'fastify';
import { truthTableRoute } from './extract/truth-table';
import { imagesRoute } from './extract/images';
import { navbarRoute } from './extract/navbar';
import { paragraphsRoute } from './extract/paragraphs';
import { miscRoute } from './extract/misc';
import { contactRoute } from './extract/contact';
import { assetsRoute } from './extract/assets';
import { legalRoute } from './extract/legal';
import { metaRoute } from './extract/meta';
import { servicesRoute } from './extract/services';
import { runsRoute } from './runs';

export async function registerRoutes(fastify: FastifyInstance) {
  // Extraction routes
  await fastify.register(truthTableRoute, { prefix: '/api/extract' });
  await fastify.register(imagesRoute, { prefix: '/api/extract' });
  await fastify.register(navbarRoute, { prefix: '/api/extract' });
  await fastify.register(paragraphsRoute, { prefix: '/api/extract' });
  await fastify.register(miscRoute, { prefix: '/api/extract' });
  await fastify.register(contactRoute, { prefix: '/api/extract' });
  await fastify.register(assetsRoute, { prefix: '/api/extract' });
  await fastify.register(legalRoute, { prefix: '/api/extract' });
  await fastify.register(metaRoute, { prefix: '/api/extract' });
  await fastify.register(servicesRoute, { prefix: '/api/extract' });

  // Runs management routes
  await fastify.register(runsRoute);

  // Confirmation routes
  // TODO: Add confirmation routes

  // Packer/Generator routes
  // TODO: Add packer/generator routes
}

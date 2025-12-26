import 'dotenv/config';
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyCookie from '@fastify/cookie';
import fastifyFormbody from '@fastify/formbody';
import fastifyMultipart from '@fastify/multipart';
import path from 'path';
import { fileURLToPath } from 'url';

import { authPlugin } from './plugins/auth.js';
import { authRoutes } from './routes/auth.js';
import { transcribeRoutes } from './routes/transcribe.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fastify = Fastify({
  logger: true,
});

const PORT = parseInt(process.env.PORT || '3520', 10);
const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB

async function start() {
  // Register plugins
  await fastify.register(fastifyCookie, {
    secret: process.env.SESSION_SECRET || 'default-secret-change-in-production',
  });

  await fastify.register(fastifyFormbody);

  await fastify.register(fastifyMultipart, {
    limits: {
      fileSize: MAX_FILE_SIZE,
      files: 20,
    },
  });

  await fastify.register(fastifyStatic, {
    root: path.join(__dirname, '../public'),
    prefix: '/',
  });

  // Register auth plugin
  await fastify.register(authPlugin);

  // Register routes
  await fastify.register(authRoutes);
  await fastify.register(transcribeRoutes);

  // Serve upload page (protected)
  fastify.get('/upload', {
    preHandler: fastify.authenticate,
    handler: async (request, reply) => {
      return reply.sendFile('upload.html');
    },
  });

  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`Server running at http://localhost:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();

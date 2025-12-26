import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import crypto from 'crypto';

const sessions = new Map<string, { username: string; expiresAt: number }>();

function generateSessionId(): string {
  return crypto.randomBytes(32).toString('hex');
}

async function authPluginFn(fastify: FastifyInstance) {
  fastify.decorate('authenticate', async function (request: FastifyRequest, reply: FastifyReply) {
    const sessionId = request.cookies.sessionId;
    const isApiRequest = request.url.startsWith('/api/');

    const sendUnauthorized = () => {
      if (isApiRequest) {
        reply.status(401);
        return reply.send({ success: false, error: 'Unauthorized' });
      }
      return reply.redirect('/');
    };

    if (!sessionId) {
      return sendUnauthorized();
    }

    const session = sessions.get(sessionId);
    if (!session || session.expiresAt < Date.now()) {
      sessions.delete(sessionId || '');
      return sendUnauthorized();
    }
  });

  fastify.decorate('sessions', sessions);
  fastify.decorate('generateSessionId', generateSessionId);
}

export const authPlugin = fp(authPluginFn);

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    sessions: Map<string, { username: string; expiresAt: number }>;
    generateSessionId: () => string;
  }
}

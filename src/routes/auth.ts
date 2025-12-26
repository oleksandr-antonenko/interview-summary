import { FastifyInstance } from 'fastify';

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post<{
    Body: { username: string; password: string };
  }>('/api/login', async (request, reply) => {
    const { username, password } = request.body;

    const validUsername = process.env.AUTH_USERNAME;
    const validPassword = process.env.AUTH_PASSWORD;

    if (username === validUsername && password === validPassword) {
      const sessionId = fastify.generateSessionId();
      const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 1 week

      fastify.sessions.set(sessionId, { username, expiresAt });

      reply.setCookie('sessionId', sessionId, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60,
      });

      return { success: true };
    }

    reply.status(401);
    return { success: false, error: 'Invalid credentials' };
  });

  fastify.post('/api/logout', async (request, reply) => {
    const sessionId = request.cookies.sessionId;

    if (sessionId) {
      fastify.sessions.delete(sessionId);
      reply.clearCookie('sessionId', { path: '/' });
    }

    return { success: true };
  });

  fastify.get('/api/check-auth', async (request, reply) => {
    const sessionId = request.cookies.sessionId;

    if (!sessionId) {
      return { authenticated: false };
    }

    const session = fastify.sessions.get(sessionId);
    if (!session || session.expiresAt < Date.now()) {
      fastify.sessions.delete(sessionId);
      return { authenticated: false };
    }

    return { authenticated: true, username: session.username };
  });
}

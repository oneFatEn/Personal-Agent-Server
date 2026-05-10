import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { config } from '../../config.js';
import type { UserScope } from '../../domain/types/auth.js';
import { AppCode } from '../utils/errors.js';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  interface FastifyRequest {
    userScope: UserScope;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { userId: string; email: string; username: string };
    user: { userId: string; email: string; username: string };
  }
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.register(fastifyJwt, {
    secret: config.JWT_SECRET,
  });

  fastify.decorate(
    'authenticate',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify();
        request.userScope = {
          userId: request.user.userId,
          email: request.user.email,
          username: request.user.username,
        };
      } catch (err: unknown) {
        const isExpired =
          err instanceof Error && 'code' in err && (err as { code: string }).code === 'FST_JWT_AUTHORIZATION_TOKEN_EXPIRED';
        if (isExpired) {
          reply.code(401).send({ code: AppCode.TOKEN_EXPIRED, message: 'Token expired', data: null });
        } else {
          reply.code(401).send({ code: AppCode.UNAUTHORIZED, message: 'Unauthorized', data: null });
        }
      }
    },
  );
};

export default fp(authPlugin);

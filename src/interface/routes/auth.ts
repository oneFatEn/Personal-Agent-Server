import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import type { IUserRepository } from '../../domain/repositories/IUserRepository.js';
import { config } from '../../config.js';
import { Errors } from '../utils/errors.js';
import { ok, fail } from '../utils/response.js';

const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

interface AuthRoutesOptions {
  userRepository: IUserRepository;
}

const authRoutes: FastifyPluginAsync<AuthRoutesOptions> = async (fastify, opts) => {
  const { userRepository } = opts;

  // POST /api/auth/login
  fastify.post('/api/auth/login', async (request, reply) => {
    const parseResult = loginBodySchema.safeParse(request.body);
    if (!parseResult.success) {
      const err = Errors.validationError(parseResult.error.issues[0]?.message);
      return fail(reply, err.httpStatus, err.appCode, err.message);
    }

    const { email, password } = parseResult.data;
    const user = await userRepository.findByEmail(email);

    // 始终执行 bcrypt，防止时序攻击推断邮箱是否存在
    const hashToCompare = user?.passwordHash ?? '$2b$12$invalidhashpaddingtomakeitconstant';
    const match = await bcrypt.compare(password, hashToCompare);

    if (!user || !match) {
      const err = Errors.invalidCredentials();
      return fail(reply, err.httpStatus, err.appCode, err.message);
    }

    const token = fastify.jwt.sign(
      { userId: user.id, email: user.email, username: user.username },
      { expiresIn: config.JWT_EXPIRES_IN },
    );

    const decoded = fastify.jwt.decode<{ exp: number }>(token);
    const expiresAt = decoded ? new Date(decoded.exp * 1000).toISOString() : null;

    return ok(reply, {
      token,
      expiresAt,
      user: { id: user.id, email: user.email, username: user.username },
    });
  });

  // GET /api/auth/me
  fastify.get('/api/auth/me', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { userId, email, username } = request.userScope;
    return ok(reply, { id: userId, email, username });
  });
};

export default authRoutes;

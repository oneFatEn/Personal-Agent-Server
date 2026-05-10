import type { FastifyReply } from 'fastify';
import { AppCode } from './errors.js';

interface ApiResponse<T> {
  code: number;
  message: string;
  data: T | null;
}

export function ok<T>(reply: FastifyReply, data: T, message = 'ok'): void {
  reply.code(200).send({ code: AppCode.OK, message, data } satisfies ApiResponse<T>);
}

export function fail(
  reply: FastifyReply,
  httpStatus: number,
  appCode: number,
  message: string,
): void {
  reply.code(httpStatus).send({ code: appCode, message, data: null } satisfies ApiResponse<null>);
}

import { config } from './config.js';
import { buildServer } from './server.js';

const server = await buildServer();

process.on('SIGTERM', async () => {
  server.log.info('SIGTERM received, shutting down gracefully...');
  await server.close();
  process.exit(0);
});

try {
  await server.listen({ port: config.PORT, host: '0.0.0.0' });
} catch (err) {
  server.log.error(err);
  process.exit(1);
}

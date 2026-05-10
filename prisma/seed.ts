import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { PrismaClient } from '../src/generated/prisma/client.js';

const email = process.env.SEED_ADMIN_EMAIL;
const username = process.env.SEED_ADMIN_USERNAME;
const password = process.env.SEED_ADMIN_PASSWORD;
const databaseUrl = process.env.DATABASE_URL;

if (!email || !username || !password || !databaseUrl) {
  console.error(
    'Missing required env vars: SEED_ADMIN_EMAIL, SEED_ADMIN_USERNAME, SEED_ADMIN_PASSWORD, DATABASE_URL',
  );
  process.exit(1);
}

const adapter = new PrismaLibSql({ url: databaseUrl });
const prisma = new PrismaClient({ adapter });

const passwordHash = await bcrypt.hash(password, 12);

const user = await prisma.user.upsert({
  where: { email },
  update: {},
  create: { email, username, passwordHash },
});

console.log(`Admin user ready: ${user.email} (id: ${user.id})`);

await prisma.$disconnect();

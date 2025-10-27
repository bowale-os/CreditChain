// server/src/services/prisma.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'], // Optional: for debugging
});

export default prisma;
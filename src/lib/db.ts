import { PrismaClient } from '@prisma/client'

// Force fresh client in development to pick up schema changes
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

export const db = prisma
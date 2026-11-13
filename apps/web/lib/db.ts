import { PrismaClient } from "@prisma/client";

// 개발 서버는 파일이 바뀔 때마다 모듈을 다시 읽어서, 그때마다 새 연결이 생기지 않게 하나만 둠
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

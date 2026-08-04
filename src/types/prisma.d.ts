/**
 * Prisma 7 的类型导出与 NodeNext 模块解析的兼容性适配。
 *
 * Prisma 7 的 package.json 只提供 CJS 导出条件，
 * 而项目的 tsconfig 使用 moduleResolution: "nodenext"，
 * 导致 import { PrismaClient } from '@prisma/client' 无法解析。
 *
 * 此声明文件桥接两者，允许所有模块以 ESM import 方式使用 PrismaClient。
 */
declare module '@prisma/client' {
  export * from '.prisma/client/client';
}

import type { Prisma } from "@prisma/client";
import { prisma } from "../utils/prisma";

const userSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  licenseNo: true,
  avatarUrl: true,
  primaryRole: true,
  roles: { include: { role: true } }
} as const;

export type UserWithRoles = Prisma.PromiseReturnType<typeof listUsers>;

export async function listUsers(): Promise<Prisma.UserGetPayload<{ select: typeof userSelect }>[]> {
  return prisma.user.findMany({
    orderBy: { name: "asc" },
    select: userSelect
  });
}


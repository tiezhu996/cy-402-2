import type { Prisma } from "@prisma/client";
import { prisma } from "../utils/prisma";

const clientWithCasesInclude = {
  cases: {
    include: {
      mainLawyer: { select: { id: true, name: true } },
      client: true,
      documents: true,
      billings: true
    },
    orderBy: { acceptedAt: "desc" as const }
  },
  billings: true
} as const;

const clientListInclude = {
  cases: {
    include: {
      mainLawyer: { select: { id: true, name: true } },
      client: true
    },
    orderBy: { acceptedAt: "desc" as const }
  }
} as const;

export type ClientWithRelations = Prisma.ClientGetPayload<{ include: typeof clientWithCasesInclude }>;
export type ClientWithCases = Prisma.ClientGetPayload<{ include: typeof clientListInclude }>;

export async function listClients(search?: string): Promise<ClientWithCases[]> {
  return prisma.client.findMany({
    where: search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { identityNo: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } }
          ]
        }
      : undefined,
    include: clientListInclude,
    orderBy: { updatedAt: "desc" }
  });
}

export async function getClient(id: string): Promise<ClientWithRelations | null> {
  return prisma.client.findUnique({
    where: { id },
    include: clientWithCasesInclude
  });
}

export async function createClient(data: Prisma.ClientCreateInput): Promise<Prisma.ClientGetPayload<{}>> {
  return prisma.client.create({ data });
}

export async function updateClient(
  id: string,
  data: Prisma.ClientUpdateInput
): Promise<Prisma.ClientGetPayload<{}>> {
  return prisma.client.update({ where: { id }, data });
}


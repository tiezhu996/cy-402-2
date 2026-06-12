import type { DocumentType, Prisma } from "@prisma/client";
import { prisma } from "../utils/prisma";

export type DocumentFilters = {
  caseId?: string;
  fileType?: DocumentType;
  q?: string;
};

export type CreateDocumentInput = {
  title: string;
  fileType: DocumentType;
  fileUrl: string;
  caseId: string;
  uploaderId: string;
};

const documentInclude = {
  case: { select: { id: true, caseNo: true, title: true } },
  uploader: { select: { id: true, name: true } }
} as const;

export type DocumentWithRelations = Prisma.DocumentGetPayload<{ include: typeof documentInclude }>;

export async function listDocuments(filters: DocumentFilters): Promise<DocumentWithRelations[]> {
  return prisma.document.findMany({
    where: {
      caseId: filters.caseId,
      fileType: filters.fileType,
      title: filters.q ? { contains: filters.q, mode: "insensitive" } : undefined
    },
    include: documentInclude,
    orderBy: { uploadedAt: "desc" }
  });
}

export async function createDocument(input: CreateDocumentInput): Promise<DocumentWithRelations> {
  return prisma.document.create({
    data: input,
    include: documentInclude
  });
}

export async function deleteDocument(id: string): Promise<Prisma.DocumentGetPayload<{}>> {
  return prisma.document.delete({ where: { id } });
}


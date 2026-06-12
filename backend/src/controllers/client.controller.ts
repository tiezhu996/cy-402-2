import type { Request, Response } from "express";
import { z } from "zod";
import * as clientService from "../services/client.service";
import { HttpError } from "../utils/http-error";

const clientSchema = z.object({
  name: z.string().min(2),
  identityNo: z.string().min(6),
  phone: z.string().min(5),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  note: z.string().optional()
});

export async function list(req: Request, res: Response): Promise<void> {
  const search = typeof req.query.q === "string" ? req.query.q : undefined;
  const data: Awaited<ReturnType<typeof clientService.listClients>> = await clientService.listClients(search);
  res.json({ data });
}

export async function detail(req: Request, res: Response): Promise<void> {
  const data: Awaited<ReturnType<typeof clientService.getClient>> = await clientService.getClient(req.params.id);
  if (!data) {
    throw new HttpError(404, "Client not found");
  }
  res.json({ data });
}

export async function create(req: Request, res: Response): Promise<void> {
  const input = clientSchema.parse(req.body);
  const data: Awaited<ReturnType<typeof clientService.createClient>> = await clientService.createClient({
    ...input,
    email: input.email || null
  });
  res.status(201).json({ data });
}

export async function update(req: Request, res: Response): Promise<void> {
  const input = clientSchema.partial().parse(req.body);
  const data: Awaited<ReturnType<typeof clientService.updateClient>> = await clientService.updateClient(
    req.params.id,
    { ...input, email: input.email || null }
  );
  res.json({ data });
}


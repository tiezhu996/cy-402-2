import type { Request, Response } from "express";
import * as userService from "../services/user.service";

export async function list(req: Request, res: Response): Promise<void> {
  const data: Awaited<ReturnType<typeof userService.listUsers>> = await userService.listUsers();
  res.json({ data });
}


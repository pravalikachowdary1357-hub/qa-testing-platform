import 'reflect-metadata';
import 'dotenv/config';
import type { Request, Response } from 'express';
import { createApp } from '../src/create-app';

let handlerPromise: Promise<(req: Request, res: Response) => void> | null = null;

async function buildHandler() {
  const app = await createApp();
  await app.init();
  return app.getHttpAdapter().getInstance();
}

export default async function handler(req: Request, res: Response) {
  if (!handlerPromise) handlerPromise = buildHandler();
  const expressHandler = await handlerPromise;
  expressHandler(req, res);
}

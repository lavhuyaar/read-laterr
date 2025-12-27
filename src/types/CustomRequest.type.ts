import { Request } from 'express';
import { User } from 'prisma/generated/client';

export type CustomRequest = Request & {
  token?: string;
  user?: User;
};

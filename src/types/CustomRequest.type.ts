import { User } from '@prisma/client';
import { Request } from 'express';

export type CustomRequest = Request & {
  token?: string;
  user?: User;
};

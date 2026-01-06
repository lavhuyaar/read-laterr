import { Request } from 'express';

export type CustomRequest = Request & {
  token?: string;
  user?: {
    id: string;
    email: string;
    name: string;
    avatarUrl?: string;
  };
};

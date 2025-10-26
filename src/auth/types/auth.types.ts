import { User, Session } from '@prisma/client';
import { Request } from 'express';

export interface SessionWithUser extends Session {
  user: User;
}

export interface CreateSessionOptions {
  userId: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  status: string;
}

export interface RequestWithUser extends Request {
  user: AuthUser;
  sessionId: string;
}

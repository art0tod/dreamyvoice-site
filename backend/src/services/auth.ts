import bcrypt from 'bcryptjs';
import { prisma } from '../prisma';
import type { User } from '@prisma/client';
import { HttpError } from '../utils/http-error';

const SALT_ROUNDS = 12;

export async function registerUser(input: { username: string; password: string }) {
  const username = input.username.trim();

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    throw new HttpError(409, 'Username is already taken');
  }

  const totalUsers = await prisma.user.count();
  const role = totalUsers === 0 ? 'ADMIN' : 'USER';

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      username,
      passwordHash,
      role,
    },
  });

  return user;
}

export async function authenticateUser(input: { username: string; password: string }) {
  const username = input.username.trim();
  const user = await prisma.user.findUnique({ where: { username } });

  if (!user) {
    return null;
  }

  const isValid = await bcrypt.compare(input.password, user.passwordHash);
  if (!isValid) {
    return null;
  }

  return user;
}

export function toPublicUser(user: User) {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    avatarKey: user.avatarKey,
    createdAt: user.createdAt,
  };
}

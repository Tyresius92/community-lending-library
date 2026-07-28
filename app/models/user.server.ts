import { prisma } from "~/db.server";
import type { User } from "~/generated/prisma/client";

export type { User } from "~/generated/prisma/client";

export async function getUserById(id: User["id"]) {
  return prisma.user.findUnique({ where: { id } });
}

export async function getUserByEmail(email: User["email"]) {
  return prisma.user.findUnique({ where: { email } });
}

export async function createUser(email: User["email"]) {
  return prisma.user.create({ data: { email } });
}

export async function deleteUserByEmail(email: User["email"]) {
  return prisma.user.delete({ where: { email } });
}

export async function findOrCreateUserByEmail(email: User["email"]) {
  return (await getUserByEmail(email)) ?? (await createUser(email));
}

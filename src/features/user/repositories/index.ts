import { MockUserRepository } from "@/features/user/repositories/mock-user.repository";
import type { UserRepository } from "@/features/user/repositories/user.repository";

let userRepository: UserRepository | null = null;

export function getUserRepository(): UserRepository {
  userRepository ??= new MockUserRepository();
  return userRepository;
}

export type { UserRepository } from "@/features/user/repositories/user.repository";

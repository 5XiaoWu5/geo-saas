import type { User } from "@/features/user/models/user.types";

export interface UserRepository {
  getCurrentUser(): Promise<User>;
}

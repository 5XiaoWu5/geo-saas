import type { User } from "@/features/user/models/user.types";
import type { UserRepository } from "@/features/user/repositories/user.repository";

const mockUser: User = {
  id: "usr_global_pilot",
  name: "Global Pilot",
  email: "admin@geopilot.ai",
  role: "owner",
};

export class MockUserRepository implements UserRepository {
  async getCurrentUser(): Promise<User> {
    return mockUser;
  }
}

import { getUserRepository } from "@/features/user/repositories";

export function getCurrentUser() {
  return getUserRepository().getCurrentUser();
}

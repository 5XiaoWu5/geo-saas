export type UserRole = "owner" | "admin" | "member";

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

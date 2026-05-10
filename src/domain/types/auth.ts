export interface UserScope {
  userId: string;
  email: string;
  username: string;
}

export type AuthContext = UserScope;

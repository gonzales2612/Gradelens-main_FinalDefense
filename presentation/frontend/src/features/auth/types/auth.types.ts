export type LoginRequest = {
  email: string;
  password: string;
};

export type AuthUser = {
  id: string;
  email: string;
  role: "teacher" | "admin";
};

export type LoginResponse = {
  user: AuthUser;
  accessToken: string;
};

// Django session auth — login/logout + current-user probe.
import { api } from "./client";

export interface Me {
  email: string;
  username: string;
  name: string | null;
}

export const authApi = {
  login: (email: string, password: string) =>
    api.post<Me>("auth/login/", { email, password }),
  logout: () => api.post<{ loggedOut: boolean }>("auth/logout/"),
  me: () => api.get<Me>("auth/me/"),
};

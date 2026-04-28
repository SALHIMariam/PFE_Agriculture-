import api from "../api/client";

export type AdminUser = {
  id: number;
  name: string;
  email: string;
  roles: string[];
  farm?: string | null;
  farm_profile?: string | null;
  crops?: string[] | null;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

export type GetUsersParams = {
  page?: number;
  per_page?: number;
  search?: string;
  role?: string;
  is_active?: boolean;
};

export type GetUsersResponse = {
  users: AdminUser[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
};

export async function getUsers(params?: GetUsersParams): Promise<GetUsersResponse> {
  const response = await api.get("/api/admin/users", { params });
  console.log("GET /api/admin/users →", response.status, response.data);
  // users can be a direct array or wrapped in .data (paginated resource)
  const raw = response.data;
  const users: AdminUser[] = Array.isArray(raw.users)
    ? raw.users
    : Array.isArray(raw.users?.data)
    ? raw.users.data
    : [];
  return { users, meta: raw.meta };
}

export async function updateUserRole(id: number, role: string): Promise<AdminUser> {
  const response = await api.patch(`/api/admin/users/${id}/role`, { role });
  return response.data.user;
}

export async function deleteUser(id: number): Promise<void> {
  await api.delete(`/api/admin/users/${id}`);
}

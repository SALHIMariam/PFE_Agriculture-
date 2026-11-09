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
  /** "1" | "0" côté requête (le backend caste via FILTER_VALIDATE_BOOLEAN). */
  is_active?: boolean | string;
  governorate?: string;
};

/** Filtres de la recherche avancée « Liste des utilisateurs ». */
export type UserFilters = {
  search?: string;
  role?: string;
  is_active?: string;
  governorate?: string;
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
  // N'envoie que les filtres réellement renseignés (évite ?search=&role=).
  const cleaned: Record<string, string | number> = {};
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      cleaned[key] = value as string | number;
    }
  });
  const response = await api.get("/api/admin/users", { params: cleaned });
  // users can be a direct array or wrapped in .data (paginated resource)
  const raw = response.data;
  const users: AdminUser[] = Array.isArray(raw.users)
    ? raw.users
    : Array.isArray(raw.users?.data)
    ? raw.users.data
    : [];
  return { users, meta: raw.meta };
}

/**
 * Récupère la totalité des comptes en enchaînant les pages côté client —
 * le backend plafonne per_page à 50 par requête (garde-fou anti-abus), donc
 * une seule page ne suffit plus dès que le nombre de comptes dépasse 50.
 */
export async function getAllUsers(
  params?: Omit<GetUsersParams, "page" | "per_page">
): Promise<AdminUser[]> {
  const first = await getUsers({ ...params, page: 1, per_page: 50 });
  const users = [...first.users];

  for (let page = 2; page <= first.meta.last_page; page++) {
    const next = await getUsers({ ...params, page, per_page: 50 });
    users.push(...next.users);
  }

  return users;
}

export async function deleteUser(id: number): Promise<void> {
  await api.delete(`/api/admin/users/${id}`);
}

export async function setUserStatus(
  id: number,
  isActive: boolean
): Promise<{ message: string; user: AdminUser }> {
  const response = await api.patch(`/api/admin/users/${id}/status`, {
    is_active: isActive,
  });
  return response.data;
}

export type CreateExpertPayload = {
  name: string;
  email: string;
};

export type CreateExpertResponse = {
  message: string;
  user: AdminUser;
  email_sent: boolean;
};

export async function createExpertUser(
  payload: CreateExpertPayload
): Promise<CreateExpertResponse> {
  const response = await api.post("/api/admin/users", payload);
  return response.data;
}

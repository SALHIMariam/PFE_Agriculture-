import i18n from "../../../../i18n";

type AxiosLikeError = {
  response?: { data?: { message?: string; errors?: Record<string, string[]> } };
  request?: unknown;
  message?: string;
};

/**
 * Turn an axios error into a user-facing string:
 *  - a Laravel validation error → the first field message
 *  - any JSON `message` (419 CSRF, 403, 500 in debug, …) → that message
 *  - no response at all (CORS blocked, server down, network) → a clear hint
 *  - otherwise → the provided fallback
 */
export function apiErrorMessage(error: unknown, fallback?: string): string {
  const e = error as AxiosLikeError;
  const fb = fallback ?? i18n.t("profile.toast.error");

  const errors = e?.response?.data?.errors;
  if (errors) {
    const first = Object.values(errors)[0]?.[0];
    if (first) return first;
  }

  const message = e?.response?.data?.message;
  if (typeof message === "string" && message.length > 0) return message;

  // Request was made but no response → almost always CORS / server unreachable.
  if (e && "request" in e && !e.response) {
    return i18n.t("profile.toast.network");
  }

  return fb;
}

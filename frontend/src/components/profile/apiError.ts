type AxiosLikeError = {
  response?: { data?: { message?: string; errors?: Record<string, string[]> } };
  request?: unknown;
  message?: string;
};

/**
 * Transforme une erreur axios en message affichable :
 *  - erreur de validation Laravel → premier message de champ
 *  - `message` JSON (419, 403, 500…) → ce message
 *  - pas de réponse (réseau / serveur injoignable) → indice explicite
 *  - sinon → le fallback fourni
 */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  const e = error as AxiosLikeError;

  const errors = e?.response?.data?.errors;
  if (errors) {
    const first = Object.values(errors)[0]?.[0];
    if (first) return first;
  }

  const message = e?.response?.data?.message;
  if (typeof message === "string" && message.length > 0) return message;

  if (e && "request" in e && !e.response) {
    return "Serveur injoignable. Vérifiez votre connexion.";
  }

  return fallback;
}

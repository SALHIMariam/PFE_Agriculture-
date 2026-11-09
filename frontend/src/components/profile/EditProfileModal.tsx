import { useState } from "react";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import type { User } from "../../services/authService";
import { updateProfile, type ProfileUpdatePayload } from "../../services/profileService";
import { getApiErrorMessage } from "./apiError";
import { useProfileToast } from "./Toast";
import {
  FARM_PROFILE_OPTIONS,
  IRRIGATION_OPTIONS,
  LANGUAGE_OPTIONS,
  SEASON_OPTIONS,
  TUNISIAN_GOVERNORATES,
  type AppLanguage,
  type FarmProfile,
} from "./constants";

const selectClass =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FormState = {
  first_name: string;
  last_name: string;
  email: string;
  governorate: string;
  language: AppLanguage;
  farm: string;
  farm_profile: string;
  crops: string;
  irrigation_system: string;
  main_season: string;
  surface_ha: string;
};

function initialState(user: User): FormState {
  return {
    first_name: user.first_name ?? "",
    last_name: user.last_name ?? "",
    email: user.email ?? "",
    governorate: user.governorate ?? "",
    language: (user.language as AppLanguage) ?? "fr",
    farm: user.farm ?? "",
    farm_profile: user.farm_profile ?? "",
    crops: (user.crops ?? []).join(", "),
    irrigation_system: user.irrigation_system ?? "",
    main_season: user.main_season ?? "",
    surface_ha: user.surface_ha != null ? String(user.surface_ha) : "",
  };
}

export default function EditProfileModal({
  user,
  onClose,
  onSaved,
}: {
  user: User;
  onClose: () => void;
  onSaved: (user: User) => void;
}) {
  const toast = useProfileToast();
  const isAdmin = (user.roles?.[0] ?? "") === "admin";
  const [form, setForm] = useState<FormState>(() => initialState(user));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async () => {
    setError(null);

    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError("Le prénom et le nom sont obligatoires.");
      return;
    }
    if (!EMAIL_RE.test(form.email.trim())) {
      setError("Adresse email invalide.");
      return;
    }

    let surface: number | null = null;
    if (form.surface_ha.trim() !== "") {
      surface = Number(form.surface_ha);
      if (Number.isNaN(surface) || surface <= 0) {
        setError("La superficie doit être un nombre positif.");
        return;
      }
    }

    const first = form.first_name.trim();
    const last = form.last_name.trim();
    const payload: ProfileUpdatePayload = {
      first_name: first,
      last_name: last,
      name: `${first} ${last}`.trim(),
      email: form.email.trim(),
      governorate: form.governorate || null,
      language: form.language,
    };

    if (!isAdmin) {
      payload.farm = form.farm.trim() || null;
      payload.farm_profile = (form.farm_profile || null) as FarmProfile | null;
      payload.crops = form.crops
        .split(/[,\n]/)
        .map((c) => c.trim())
        .filter(Boolean);
      payload.irrigation_system = form.irrigation_system || null;
      payload.main_season = form.main_season || null;
      payload.surface_ha = surface;
    }

    setBusy(true);
    try {
      const updated = await updateProfile(payload);
      onSaved(updated);
      toast.success("Profil mis à jour");
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, "Impossible d'enregistrer le profil."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} className="m-4 max-w-[640px]">
      <div className="w-full rounded-3xl bg-white p-6 dark:bg-gray-900 lg:p-8">
        <h4 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">
          Modifier le profil
        </h4>
        <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
          Mettez à jour vos informations personnelles{isAdmin ? "" : " et agricoles"}.
        </p>

        <div className="custom-scrollbar max-h-[60vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="first_name">Prénom</Label>
              <Input
                id="first_name"
                value={form.first_name}
                onChange={(e) => set("first_name", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="last_name">Nom</Label>
              <Input
                id="last_name"
                value={form.last_name}
                onChange={(e) => set("last_name", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                type="email"
                id="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="governorate">Gouvernorat</Label>
              <select
                id="governorate"
                className={selectClass}
                value={form.governorate}
                onChange={(e) => set("governorate", e.target.value)}
              >
                <option value="">Non renseigné</option>
                {TUNISIAN_GOVERNORATES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="language">Langue</Label>
              <select
                id="language"
                className={selectClass}
                value={form.language}
                onChange={(e) => set("language", e.target.value as AppLanguage)}
              >
                {LANGUAGE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {!isAdmin && (
              <>
                <div>
                  <Label htmlFor="farm">Ferme</Label>
                  <Input
                    id="farm"
                    value={form.farm}
                    onChange={(e) => set("farm", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="farm_profile">Profil de l'exploitation</Label>
                  <select
                    id="farm_profile"
                    className={selectClass}
                    value={form.farm_profile}
                    onChange={(e) => set("farm_profile", e.target.value)}
                  >
                    <option value="">—</option>
                    {FARM_PROFILE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="irrigation_system">Système d'irrigation</Label>
                  <select
                    id="irrigation_system"
                    className={selectClass}
                    value={form.irrigation_system}
                    onChange={(e) => set("irrigation_system", e.target.value)}
                  >
                    <option value="">—</option>
                    {IRRIGATION_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="main_season">Saison principale</Label>
                  <select
                    id="main_season"
                    className={selectClass}
                    value={form.main_season}
                    onChange={(e) => set("main_season", e.target.value)}
                  >
                    <option value="">—</option>
                    {SEASON_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="surface_ha">Superficie (ha)</Label>
                  <Input
                    type="number"
                    id="surface_ha"
                    min="0"
                    step={0.1}
                    value={form.surface_ha}
                    onChange={(e) => set("surface_ha", e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="crops">Cultures</Label>
                  <textarea
                    id="crops"
                    rows={2}
                    className={`${selectClass} h-auto`}
                    placeholder="Séparez les cultures par des virgules"
                    value={form.crops}
                    onChange={(e) => set("crops", e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-lg bg-error-50 px-3 py-2 text-sm text-error-600 dark:bg-error-500/15 dark:text-error-400">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <Button size="sm" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button size="sm" disabled={busy} onClick={submit}>
            {busy ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

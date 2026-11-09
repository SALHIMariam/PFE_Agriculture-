import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { User } from "../../../../services/authService";
import { updateProfile, type ProfileUpdatePayload } from "../../../../services/profileService";
import {
  FARM_TYPE_OPTIONS,
  GOVERNORATE_NAMES,
  IRRIGATION_OPTIONS,
  SEASON_OPTIONS,
} from "./options";
import { apiErrorMessage } from "./apiError";
import { Modal, useToast } from "./ui";
import styles from "./profile.module.css";

/** "7,5" / "7.5" / " " → 7.5 / null. Tolerates a comma decimal separator. */
function parseSurface(raw: string): number | null {
  const cleaned = raw.trim().replace(",", ".");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
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
  const { t } = useTranslation();
  const { notify } = useToast();

  const [name, setName] = useState(user.full_name?.trim() || user.name || "");
  const [farm, setFarm] = useState(user.farm ?? "");
  const [email, setEmail] = useState(user.email);
  const [governorate, setGovernorate] = useState(user.governorate ?? "");
  const [crops, setCrops] = useState((user.crops ?? []).join(", "));
  const [farmProfile, setFarmProfile] = useState(user.farm_profile ?? "");
  const [surface, setSurface] = useState(user.surface_ha != null ? String(user.surface_ha) : "");
  const [irrigation, setIrrigation] = useState(user.irrigation_system ?? "");
  const [season, setSeason] = useState(user.main_season ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setError(null);
    const payload: ProfileUpdatePayload = {
      name: name.trim(),
      farm: farm.trim() || null,
      email: email.trim(),
      governorate: governorate || null,
      crops: crops
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean),
      farm_profile: (farmProfile || null) as ProfileUpdatePayload["farm_profile"],
      irrigation_system: irrigation || null,
      main_season: season || null,
      surface_ha: parseSurface(surface),
    };
    try {
      const updated = await updateProfile(payload);
      notify(t("profile.toast.profileSaved"));
      onSaved(updated);
      onClose();
    } catch (e: unknown) {
      setError(apiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={t("profile.editModal.title")} onClose={onClose}>
      <div className={styles.formGrid}>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>{t("profile.editModal.name")}</span>
          <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>{t("profile.editModal.farm")}</span>
          <input className={styles.input} value={farm} onChange={(e) => setFarm(e.target.value)} />
        </div>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>{t("profile.editModal.email")}</span>
          <input
            className={styles.input}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>{t("profile.editModal.governorate")}</span>
          <select
            className={styles.select}
            value={governorate}
            onChange={(e) => setGovernorate(e.target.value)}
          >
            <option value="">—</option>
            {GOVERNORATE_NAMES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>{t("profile.editModal.farmType")}</span>
          <select
            className={styles.select}
            value={farmProfile}
            onChange={(e) => setFarmProfile(e.target.value)}
          >
            <option value="">—</option>
            {FARM_TYPE_OPTIONS.map((f) => (
              <option key={f} value={f}>
                {t(`profile.farmType.${f}`)}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>{t("profile.editModal.surface")}</span>
          <input
            className={styles.input}
            type="text"
            inputMode="decimal"
            value={surface}
            onChange={(e) => setSurface(e.target.value.replace(/[^\d.,]/g, ""))}
          />
        </div>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>{t("profile.editModal.irrigation")}</span>
          <select
            className={styles.select}
            value={irrigation}
            onChange={(e) => setIrrigation(e.target.value)}
          >
            <option value="">—</option>
            {IRRIGATION_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {t(`profile.irrigation.${o}`)}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>{t("profile.editModal.season")}</span>
          <select className={styles.select} value={season} onChange={(e) => setSeason(e.target.value)}>
            <option value="">—</option>
            {SEASON_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {t(`profile.season.${o}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.field}>
        <span className={styles.fieldLabel}>{t("profile.editModal.crops")}</span>
        <input className={styles.input} value={crops} onChange={(e) => setCrops(e.target.value)} />
        <span className={styles.fieldHint}>{t("profile.editModal.cropsHint")}</span>
      </div>

      {error && (
        <p className={styles.fieldHint} style={{ color: "#c2410c" }}>
          {error}
        </p>
      )}

      <div className={styles.formActions}>
        <button type="button" className={styles.btn} onClick={onClose} disabled={saving}>
          {t("common.cancel")}
        </button>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnPrimary}`}
          onClick={save}
          disabled={saving}
        >
          {saving ? t("common.loading") : t("common.save")}
        </button>
      </div>
    </Modal>
  );
}

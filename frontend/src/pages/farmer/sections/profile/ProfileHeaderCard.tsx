import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { User } from "../../../../services/authService";
import { uploadAvatar } from "../../../../services/profileService";
import { cropEmoji } from "./options";
import { monthYear } from "./format";
import { useToast } from "./ui";
import styles from "./profile.module.css";

export default function ProfileHeaderCard({
  user,
  onEdit,
  onAvatarSaved,
}: {
  user: User;
  onEdit: () => void;
  onAvatarSaved: (url: string) => void;
}) {
  const { t } = useTranslation();
  const { notify } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const displayName =
    user.full_name?.trim() ||
    [user.first_name, user.last_name].filter(Boolean).join(" ") ||
    user.name ||
    t("profile.role.farmer");

  const initial = (displayName[0] ?? "F").toUpperCase();
  const role = user.roles?.[0] ?? "farmer";
  const roleLabel = t(`profile.role.${role}`, { defaultValue: role });
  const member = monthYear(user.created_at);
  const farmType = user.farm_profile
    ? t(`profile.farmType.${user.farm_profile}`, { defaultValue: user.farm_profile })
    : null;
  const crops = user.crops ?? [];

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadAvatar(file);
      onAvatarSaved(url);
      notify(t("profile.toast.profileSaved"));
    } catch {
      notify(t("profile.toast.error"), "err");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.avatarWrap}>
          <div className={styles.avatar}>
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="" className={styles.avatarImg} />
            ) : (
              <span className={styles.avatarInitials}>{initial}</span>
            )}
          </div>
          <button
            type="button"
            className={styles.avatarCam}
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            aria-label={t("profile.header.changePhoto")}
            title={t("profile.header.changePhoto")}
          >
            {uploading ? "…" : "📷"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={onPick}
          />
        </div>

        <div className={styles.headerBody}>
          <div className={styles.cardHead} style={{ marginBottom: 4 }}>
            <div className={styles.nameRow}>
              <span className={styles.name}>{displayName}</span>
              <span className={styles.roleBadge}>{roleLabel}</span>
            </div>
            <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={onEdit}>
              {t("profile.header.editProfile")}
            </button>
          </div>

          <div className={styles.meta}>
            <span>✉️ {user.email}</span>
            {user.governorate && <span>📍 {user.governorate}</span>}
            {farmType && <span>🚜 {farmType}</span>}
            {member && <span>📅 {t("profile.header.memberSince", { date: member })}</span>}
          </div>

          {crops.length > 0 && (
            <div className={styles.chips}>
              {crops.map((c) => (
                <span key={c} className={styles.chip}>
                  {cropEmoji(c)} {c}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

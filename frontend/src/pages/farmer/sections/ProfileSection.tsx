import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../context/AuthContext";
import type { NotificationPreferences, User } from "../../../services/authService";
import {
  getProfile,
  updateNotificationPreferences,
} from "../../../services/profileService";
import dashStyles from "../FarmerDashboard.module.css";
import styles from "./profile/profile.module.css";
import { ToastProvider } from "./profile/ui";
import ProfileHeaderCard from "./profile/ProfileHeaderCard";
import ProfileCompletionCard from "./profile/ProfileCompletionCard";
import FarmCard from "./profile/FarmCard";
import CropsCard from "./profile/CropsCard";
import NotificationsCard from "./profile/NotificationsCard";
import SecurityCard from "./profile/SecurityCard";
import EditProfileModal from "./profile/EditProfileModal";
import ChangePasswordModal from "./profile/ChangePasswordModal";

function ProfileSectionInner() {
  const { t } = useTranslation();
  const { user: authUser, updateUser } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    let cancelled = false;
    getProfile()
      .then((u) => {
        if (cancelled) return;
        setProfile(u);
        updateUser(u);
      })
      .catch(() => {
        if (!cancelled && authUser) setProfile(authUser);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyUser = useCallback(
    (u: User) => {
      setProfile(u);
      updateUser(u);
    },
    [updateUser],
  );

  const persistNotifications = useCallback(
    async (patch: Partial<NotificationPreferences>) => {
      const next = await updateNotificationPreferences(patch);
      setProfile((p) => (p ? { ...p, notification_preferences: next } : p));
      updateUser({ notification_preferences: next });
    },
    [updateUser],
  );

  const onAvatarSaved = useCallback(
    (url: string) => {
      setProfile((p) => (p ? { ...p, avatar_url: url } : p));
      updateUser({ avatar_url: url });
    },
    [updateUser],
  );

  if (!profile) {
    return (
      <div className={dashStyles.page}>
        <div className={dashStyles["section-eye"]}>{t("profile.eyebrow")}</div>
        <h2 className={dashStyles["section-title"]}>
          {t("profile.title")} <em>{t("profile.titleAccent")}</em>
        </h2>
        <div className={styles.stack}>
          {[0, 1, 2].map((i) => (
            <div key={i} className={styles.card}>
              <div className={dashStyles.skeletonBlock} style={{ height: 120 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={dashStyles.page}>
      <div className={dashStyles["section-eye"]}>{t("profile.eyebrow")}</div>
      <h2 className={dashStyles["section-title"]}>
        {t("profile.title")} <em>{t("profile.titleAccent")}</em>
      </h2>

      <div className={styles.stack}>
        <ProfileHeaderCard
          user={profile}
          onEdit={() => setEditOpen(true)}
          onAvatarSaved={onAvatarSaved}
        />
        <ProfileCompletionCard user={profile} />
        <FarmCard user={profile} onEdit={() => setEditOpen(true)} />
        <CropsCard user={profile} onAddCrop={() => setEditOpen(true)} />
        <NotificationsCard
          prefs={profile.notification_preferences as NotificationPreferences}
          onPersist={persistNotifications}
        />
        <SecurityCard
          user={profile}
          onChangePassword={() => setPasswordOpen(true)}
        />
      </div>

      {editOpen && (
        <EditProfileModal
          user={profile}
          onClose={() => setEditOpen(false)}
          onSaved={applyUser}
        />
      )}
      {passwordOpen && <ChangePasswordModal onClose={() => setPasswordOpen(false)} />}
    </div>
  );
}

export default function ProfileSection() {
  return (
    <ToastProvider>
      <ProfileSectionInner />
    </ToastProvider>
  );
}

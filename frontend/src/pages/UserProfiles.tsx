import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import { useAuth } from "../context/AuthContext";
import type { NotificationPreferences, User } from "../services/authService";
import { getProfile } from "../services/profileService";
import AvatarUploader from "../components/profile/AvatarUploader";
import EditProfileModal from "../components/profile/EditProfileModal";
import PasswordModal from "../components/profile/PasswordModal";
import NotificationPreferencesCard from "../components/profile/NotificationPreferencesCard";
import { getApiErrorMessage } from "../components/profile/apiError";
import { ProfileToastProvider } from "../components/profile/Toast";
import { Card, InfoGrid, InfoItem, StatusBadge } from "../components/profile/parts";
import {
  FARM_PROFILE_LABELS,
  LANGUAGE_LABELS,
  formatDate,
  formatDateTime,
  irrigationLabel,
  roleLabel,
  seasonLabel,
  type AppLanguage,
} from "../components/profile/constants";

const EMPTY = "—";

function fullNameOf(u: User): string {
  if (u.full_name && u.full_name.trim()) return u.full_name;
  const joined = [u.first_name, u.last_name].filter(Boolean).join(" ").trim();
  return joined || u.name || u.email;
}

function roleTone(role?: string): "green" | "blue" | "gray" {
  if (role === "admin") return "green";
  if (role === "expert") return "blue";
  return "gray";
}

function showAgriculturalCard(u: User): boolean {
  if ((u.roles?.[0] ?? "") !== "admin") return true;
  return Boolean(u.farm || u.farm_profile || (u.crops && u.crops.length > 0));
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-40 animate-pulse rounded-2xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-white/[0.03]"
        />
      ))}
    </div>
  );
}

function UserProfilesInner() {
  const { user: authUser, loading: authLoading, updateUser } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getProfile()
      .then((u) => {
        if (cancelled) return;
        setProfile(u);
        updateUser(u);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(getApiErrorMessage(err, "Impossible de charger le profil."));
        if (authUser) setProfile(authUser);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyUser = (u: User) => {
    setProfile(u);
    updateUser(u);
  };

  const onNotificationsChange = (next: NotificationPreferences) => {
    setProfile((p) => (p ? { ...p, notification_preferences: next } : p));
    updateUser({ notification_preferences: next });
  };

  const content = () => {
    if (!profile) {
      if (authLoading || !error) return <ProfileSkeleton />;
      return (
        <p className="rounded-2xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
          {error}
        </p>
      );
    }

    const u = profile;
    const role = u.roles?.includes("admin")
      ? "admin"
      : u.roles?.includes("expert")
      ? "expert"
      : u.roles?.[0];
    const fullName = fullNameOf(u);
    const language = (u.language as AppLanguage) ?? "fr";

    return (
      <div className="space-y-6">
        {error && (
          <p className="rounded-xl border border-warning-200 bg-warning-50 px-4 py-2.5 text-sm text-warning-700 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-orange-400">
            {error}
          </p>
        )}

        {/* 1. En-tête */}
        <Card>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <AvatarUploader
                avatarUrl={u.avatar_url ?? null}
                fullName={fullName}
                onUploaded={(url) => applyUser({ ...u, avatar_url: url })}
              />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                    {fullName}
                  </h3>
                  {role && <StatusBadge tone={roleTone(role)}>{roleLabel(role)}</StatusBadge>}
                </div>
                {u.governorate && (
                  <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                    {u.governorate}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {(u.roles?.includes("expert") || u.roles?.includes("admin")) && (
                <button
                  type="button"
                  onClick={() => navigate("/farmer/dashboard")}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-green-700"
                >
                  🌿 Passer en mode Farmer
                </button>
              )}
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600"
              >
                Modifier le profil
              </button>
            </div>
          </div>
        </Card>

        {/* 2. Informations personnelles */}
        <Card title="Informations personnelles">
          <InfoGrid>
            <InfoItem label="Prénom">{u.first_name || EMPTY}</InfoItem>
            <InfoItem label="Nom">{u.last_name || EMPTY}</InfoItem>
            <InfoItem label="Email">{u.email}</InfoItem>
            <InfoItem label="Langue">{LANGUAGE_LABELS[language]}</InfoItem>
            <InfoItem label="Gouvernorat">{u.governorate ?? "Non renseigné"}</InfoItem>
            {u.climate_zone && (
              <InfoItem label="Zone climatique">{u.climate_zone.label}</InfoItem>
            )}
          </InfoGrid>
        </Card>

        {/* 3. Profil agricole */}
        {showAgriculturalCard(u) && (
          <Card title="Profil agricole">
            <InfoGrid>
              <InfoItem label="Ferme">{u.farm ?? EMPTY}</InfoItem>
              <InfoItem label="Profil">
                {u.farm_profile ? FARM_PROFILE_LABELS[u.farm_profile] ?? u.farm_profile : EMPTY}
              </InfoItem>
              <InfoItem label="Cultures">
                {u.crops && u.crops.length > 0 ? u.crops.join(", ") : EMPTY}
              </InfoItem>
              <InfoItem label="Système d'irrigation">
                {irrigationLabel(u.irrigation_system)}
              </InfoItem>
              <InfoItem label="Saison principale">{seasonLabel(u.main_season)}</InfoItem>
              <InfoItem label="Superficie">
                {u.surface_ha != null ? `${u.surface_ha} ha` : EMPTY}
              </InfoItem>
            </InfoGrid>
          </Card>
        )}

        {/* 4. Sécurité */}
        <Card title="Sécurité">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Double authentification
              </p>
              <div className="mt-1">
                {u.two_factor_enabled ? (
                  <StatusBadge tone="green">Activée</StatusBadge>
                ) : (
                  <StatusBadge tone="gray">Désactivée</StatusBadge>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPasswordOpen(true)}
              className="inline-flex items-center justify-center rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-gray-700 ring-1 ring-inset ring-gray-300 transition hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-white/[0.03]"
            >
              Changer le mot de passe
            </button>
          </div>
        </Card>

        {/* 5. Informations du compte */}
        <Card title="Informations du compte">
          <InfoGrid>
            <InfoItem label="Statut">
              {u.is_active ? (
                <StatusBadge tone="green">Actif</StatusBadge>
              ) : (
                <StatusBadge tone="red">Inactif</StatusBadge>
              )}
            </InfoItem>
            <InfoItem label="Rôle">{roleLabel(role)}</InfoItem>
            <InfoItem label="Membre depuis">{formatDate(u.created_at)}</InfoItem>
            <InfoItem label="Dernière connexion">{formatDateTime(u.last_login_at)}</InfoItem>
          </InfoGrid>
        </Card>

        {/* 6. Préférences de notifications */}
        {u.notification_preferences && (
          <NotificationPreferencesCard
            preferences={u.notification_preferences}
            onChange={onNotificationsChange}
          />
        )}

        {editOpen && (
          <EditProfileModal
            user={u}
            onClose={() => setEditOpen(false)}
            onSaved={applyUser}
          />
        )}
        {passwordOpen && <PasswordModal onClose={() => setPasswordOpen(false)} />}
      </div>
    );
  };

  return (
    <>
      <PageMeta title="Mon profil | AgriNova" description="Profil de l'utilisateur connecté" />
      <PageBreadcrumb pageTitle="Profil" />
      {content()}
    </>
  );
}

export default function UserProfiles() {
  return (
    <ProfileToastProvider>
      <UserProfilesInner />
    </ProfileToastProvider>
  );
}

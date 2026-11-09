import { useAuth } from "../../../context/AuthContext";
import styles from "../FarmerDashboard.module.css";

const CROP_EMOJIS: Record<string, string> = {
  Apple: "🍎",
  Bean: "🫘",
  Corn: "🌽",
  Cucumber: "🥒",
  Grape: "🍇",
  Groundnut: "🥜",
  Potato: "🥔",
  Tomato: "🍅",
  Wheat: "🌾",
};

const ROLE_LABELS: Record<string, string> = {
  farmer: "Agriculteur",
  expert: "Expert",
  admin: "Admin",
};

const FARM_PROFILE_LABELS: Record<string, string> = {
  Small: "Petite exploitation",
  Medium: "Exploitation moyenne",
  Large: "Grande exploitation",
};

function formatMemberSince(isoDate?: string): string | null {
  if (!isoDate) return null;
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return null;
  const formatted = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

type ProfileOverviewCardProps = {
  onEditProfile?: () => void;
};

export default function ProfileOverviewCard({ onEditProfile }: ProfileOverviewCardProps) {
  const { user } = useAuth();

  const firstName = user?.first_name ?? user?.name?.split(" ")[0] ?? "";
  const lastName = user?.last_name ?? "";
  const displayName = user?.full_name || [firstName, lastName].filter(Boolean).join(" ") || user?.name || "Agriculteur";
  const initials = `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase() || (user?.name?.[0]?.toUpperCase() ?? "F");

  const role = user?.roles?.[0] ?? "farmer";
  const roleLabel = ROLE_LABELS[role] ?? role;

  const memberSince = formatMemberSince(user?.created_at);
  const farmProfileLabel = user?.farm_profile ? FARM_PROFILE_LABELS[user.farm_profile] ?? user.farm_profile : null;
  const crops = user?.crops ?? [];

  return (
    <div className={styles["profile-overview"]}>
      <div className={styles["po-avatar"]}>{initials}</div>

      <div className={styles["po-body"]}>
        <div className={styles["po-top"]}>
          <div className={styles["po-name-row"]}>
            <span className={styles["po-name"]}>{displayName}</span>
            <span className={`${styles["po-role"]} ${styles[role] ?? ""}`}>{roleLabel}</span>
          </div>
          <button type="button" className={styles["po-edit-btn"]} onClick={onEditProfile}>
            Modifier le profil
          </button>
        </div>

        <div className={styles["po-meta"]}>
          <span>✉️ {user?.email ?? "--"}</span>
          {user?.governorate && <span>📍 {user.governorate}</span>}
          {user?.farm && <span>🏡 {user.farm}</span>}
          {farmProfileLabel && <span>🚜 {farmProfileLabel}</span>}
          {memberSince && <span>📅 Membre depuis {memberSince}</span>}
        </div>

        {crops.length > 0 && (
          <div className={styles["po-crops"]}>
            {crops.map((crop) => (
              <span key={crop} className={styles["po-crop-chip"]}>
                {CROP_EMOJIS[crop] ?? "🌱"} {crop}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

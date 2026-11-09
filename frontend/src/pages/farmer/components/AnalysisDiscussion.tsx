import { useEffect, useState } from "react";
import styles from "../FarmerDashboard.module.css";
import { useAuth } from "../../../context/AuthContext";
import {
  getAnalysisMessages,
  postAnalysisMessage,
  updateAnalysisMessage,
  deleteAnalysisMessage,
  type AnalysisMessage,
} from "../../../services/analysisService";

const ROLE_LABELS: Record<string, string> = {
  farmer: "Farmer",
  expert: "Expert",
  admin: "Admin",
};

const POLL_INTERVAL_MS = 30000;

function formatDateTime(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function formatShort(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${dd}/${mm} ${hh}:${min}`;
}

type Props = {
  analysisId: number;
};

export default function AnalysisDiscussion({ analysisId }: Props) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<AnalysisMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [actionPending, setActionPending] = useState(false);

  useEffect(() => {
    let cancelled = false;

    function load(showLoading: boolean) {
      if (showLoading) setLoading(true);
      getAnalysisMessages(analysisId)
        .then((result) => {
          if (!cancelled) {
            setMessages(result);
            setError(null);
          }
        })
        .catch(() => {
          if (!cancelled && showLoading) setError("Impossible de charger la discussion.");
        })
        .finally(() => {
          if (!cancelled && showLoading) setLoading(false);
        });
    }

    load(true);
    const interval = window.setInterval(() => load(false), POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [analysisId]);

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed) return;

    setSending(true);
    try {
      const message = await postAnalysisMessage(analysisId, trimmed);
      setMessages((prev) => [...prev, message]);
      setText("");
      setError(null);
    } catch {
      setError("Impossible d'envoyer le message. Réessayez.");
    } finally {
      setSending(false);
    }
  }

  function startEdit(msg: AnalysisMessage) {
    setEditingId(msg.id);
    setEditText(msg.message ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditText("");
  }

  async function saveEdit(msg: AnalysisMessage) {
    const trimmed = editText.trim();
    if (!trimmed) return;

    setActionPending(true);
    try {
      const updated = await updateAnalysisMessage(analysisId, msg.id, trimmed);
      setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      setEditingId(null);
      setEditText("");
      setError(null);
    } catch {
      setError("Impossible de modifier ce message. Réessayez.");
    } finally {
      setActionPending(false);
    }
  }

  async function handleDelete(msg: AnalysisMessage) {
    if (!window.confirm("Voulez-vous supprimer ce message ?")) return;

    setActionPending(true);
    try {
      const updated = await deleteAnalysisMessage(analysisId, msg.id);
      setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      setError(null);
    } catch {
      setError("Impossible de supprimer ce message. Réessayez.");
    } finally {
      setActionPending(false);
    }
  }

  return (
    <div>
      {loading && <div className={styles["discussion-empty"]}>Chargement de la discussion…</div>}

      {!loading && messages.length === 0 && (
        <div className={styles["discussion-empty"]}>
          Aucun message pour l'instant. Démarrez la discussion.
        </div>
      )}

      {!loading && messages.length > 0 && (
        <div className={styles["discussion-list"]}>
          {messages.map((msg) => {
            const isMine = user?.id === msg.user_id;
            const initial = (msg.user_name || "?").trim().charAt(0).toUpperCase() || "?";
            const roleKey = ["farmer", "expert", "admin"].includes(msg.user_role) ? msg.user_role : "farmer";

            return (
              <div key={msg.id} className={`${styles["discussion-row"]} ${isMine ? styles.mine : ""}`}>
                <div className={`${styles["discussion-avatar"]} ${styles[`avatar-${roleKey}`] ?? ""}`}>
                  {initial}
                </div>

                <div className={`${styles["discussion-bubble"]} ${styles[`role-${roleKey}`] ?? ""}`}>
                  <div className={styles["discussion-message-head"]}>
                    <span className={styles["discussion-author"]}>{msg.user_name}</span>
                    <span className={`${styles["discussion-role"]} ${styles[roleKey] ?? ""}`}>
                      {ROLE_LABELS[msg.user_role] ?? msg.user_role}
                    </span>
                    <span className={styles["discussion-time"]}>{formatDateTime(msg.created_at)}</span>
                  </div>

                  {msg.is_deleted ? (
                    <div className={styles["discussion-deleted"]}>Message supprimé</div>
                  ) : editingId === msg.id ? (
                    <div className={styles["discussion-edit-box"]}>
                      <textarea value={editText} onChange={(e) => setEditText(e.target.value)} autoFocus />
                      <div className={styles["discussion-edit-actions"]}>
                        <button
                          type="button"
                          className={`${styles.btn} ${styles["btn-validate"]}`}
                          onClick={() => saveEdit(msg)}
                          disabled={actionPending || !editText.trim()}
                        >
                          Sauvegarder
                        </button>
                        <button
                          type="button"
                          className={`${styles.btn} ${styles["btn-ghost"]}`}
                          onClick={cancelEdit}
                          disabled={actionPending}
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className={styles["discussion-text"]}>{msg.message}</div>
                      {msg.is_edited && (
                        <div className={styles["discussion-edited"]}>
                          (modifié le {formatShort(msg.updated_at)})
                        </div>
                      )}
                    </>
                  )}

                  {isMine && !msg.is_deleted && editingId !== msg.id && (
                    <div className={styles["discussion-actions"]}>
                      <button type="button" title="Modifier" onClick={() => startEdit(msg)}>
                        ✏
                      </button>
                      <button type="button" title="Supprimer" onClick={() => handleDelete(msg)}>
                        🗑
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {error && <div className={styles["error-banner"]}>{error}</div>}

      <div className={styles["discussion-form"]}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Écrivez un message…"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <button
          type="button"
          className={`${styles.btn} ${styles["btn-primary"]}`}
          onClick={handleSend}
          disabled={sending || !text.trim()}
        >
          Envoyer
        </button>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import styles from "../FarmerDashboard.module.css";
import { createAnalysis, type Analysis } from "../../../services/analysisService";
import { getProfile } from "../../../services/profileService";
import { getDiseaseLabel } from "../../../data/diseaseLabels";
import { useAuth } from "../../../context/AuthContext";

const MAX_SIZE_BYTES = 8 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png"];

type Step = "upload" | "loading" | "result" | "error";

function CameraCapture({
  onCapture,
  onClose,
}: {
  onCapture: (file: File) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  function stopStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  async function startStream() {
    setError(null);
    setReady(false);

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("La caméra n'est pas disponible sur ce navigateur.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setReady(true);
    } catch (err: any) {
      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        setError("Veuillez autoriser l'accès à la caméra dans votre navigateur.");
      } else if (err?.name === "NotFoundError" || err?.name === "DevicesNotFoundError") {
        setError("Aucune caméra disponible sur cet appareil.");
      } else {
        setError("Impossible d'accéder à la caméra.");
      }
    }
  }

  useEffect(() => {
    startStream();
    return () => {
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    };
  }, [capturedUrl]);

  function handleCapture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        setCapturedBlob(blob);
        setCapturedUrl(URL.createObjectURL(blob));
        stopStream();
      },
      "image/jpeg",
      0.92
    );
  }

  function handleRetake() {
    if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    setCapturedUrl(null);
    setCapturedBlob(null);
    startStream();
  }

  function handleUse() {
    if (!capturedBlob) return;
    const file = new File([capturedBlob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" });
    onCapture(file);
  }

  function handleClose() {
    stopStream();
    onClose();
  }

  return (
    <div className={styles["camera-overlay"]}>
      {error && (
        <>
          <div className={styles["camera-error"]}>{error}</div>
          <div className={styles["camera-controls"]}>
            <button type="button" className={styles.btn + " " + styles["btn-ghost"]} onClick={handleClose}>
              ✕ Fermer
            </button>
          </div>
        </>
      )}

      {!error && !capturedUrl && (
        <>
          <video ref={videoRef} autoPlay playsInline muted className={styles["camera-video"]} />
          <div className={styles["camera-controls"]}>
            <button
              type="button"
              className={styles.btn + " " + styles["btn-primary"]}
              onClick={handleCapture}
              disabled={!ready}
            >
              📸 Capturer
            </button>
            <button type="button" className={styles.btn + " " + styles["btn-ghost"]} onClick={handleClose}>
              ✕ Fermer
            </button>
          </div>
        </>
      )}

      {!error && capturedUrl && (
        <>
          <img src={capturedUrl} alt="Photo capturée" className={styles["camera-video"]} />
          <div className={styles["camera-controls"]}>
            <button type="button" className={styles.btn + " " + styles["btn-primary"]} onClick={handleUse}>
              ✓ Utiliser cette photo
            </button>
            <button type="button" className={styles.btn + " " + styles["btn-ghost"]} onClick={handleRetake}>
              ↩ Reprendre
            </button>
            <button type="button" className={styles.btn + " " + styles["btn-ghost"]} onClick={handleClose}>
              ✕ Fermer
            </button>
          </div>
        </>
      )}

      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}

export default function AnalysisSection() {
  const { user, updateUser } = useAuth();
  const [step, setStep] = useState<Step>("upload");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [result, setResult] = useState<Analysis | null>(null);
  const [showTopK, setShowTopK] = useState(false);
  const [showGradcam, setShowGradcam] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [mapNotification, setMapNotification] = useState<string | null>(null);
  const [cropNotification, setCropNotification] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mapNotificationTimeoutRef = useRef<number | null>(null);
  const cropNotificationTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      if (mapNotificationTimeoutRef.current) window.clearTimeout(mapNotificationTimeoutRef.current);
      if (cropNotificationTimeoutRef.current) window.clearTimeout(cropNotificationTimeoutRef.current);
    };
  }, []);

  // Le backend ajoute automatiquement la culture détectée au profil du farmer.
  // On rafraîchit le user en cache pour que « Mes cultures » se mette à jour,
  // et on signale discrètement l'ajout d'une nouvelle culture.
  async function refreshUserCrops() {
    const previousCrops = user?.crops ?? [];
    try {
      const freshUser = await getProfile();
      const freshCrops = freshUser.crops ?? [];
      updateUser({ crops: freshCrops });

      const added = freshCrops.find((c) => !previousCrops.includes(c));
      if (added) {
        setCropNotification(`🌱 ${added} ajouté à vos cultures !`);
        if (cropNotificationTimeoutRef.current) window.clearTimeout(cropNotificationTimeoutRef.current);
        cropNotificationTimeoutRef.current = window.setTimeout(() => setCropNotification(null), 5000);
      }
    } catch {
      // silencieux — pas critique
    }
  }

  function validateFile(file: File): string | null {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return "Format non supporté. Utilisez une image JPG ou PNG.";
    }
    if (file.size > MAX_SIZE_BYTES) {
      return "Image trop volumineuse (8 Mo maximum).";
    }
    return null;
  }

  async function handleFile(file: File) {
    const validationError = validateFile(file);
    if (validationError) {
      setClientError(validationError);
      return;
    }

    setClientError(null);
    setShowTopK(false);
    setShowGradcam(false);
    setPreviewUrl(URL.createObjectURL(file));
    setStep("loading");

    try {
      const analysis = await createAnalysis(file);
      setResult(analysis);
      setStep("result");

      void refreshUserCrops();

      if (analysis.predicted_class && !analysis.predicted_class.toLowerCase().includes("healthy")) {
        setMapNotification(
          `Votre analyse a été ajoutée à la carte des maladies dans ${user?.governorate ?? "votre région"}.`
        );
        if (mapNotificationTimeoutRef.current) window.clearTimeout(mapNotificationTimeoutRef.current);
        mapNotificationTimeoutRef.current = window.setTimeout(() => setMapNotification(null), 5000);
      }
    } catch (error: any) {
      if (error.response?.status === 503) {
        setServerError("Service d'analyse temporairement indisponible, réessayez.");
      } else if (error.response?.status === 422) {
        setServerError("Image invalide. Veuillez réessayer avec une autre photo.");
      } else {
        setServerError("Une erreur est survenue lors de l'analyse. Réessayez.");
      }
      setStep("error");
    }
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  function onFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  function handleCameraCapture(file: File) {
    setShowCamera(false);
    handleFile(file);
  }

  function reset() {
    setStep("upload");
    setResult(null);
    setServerError(null);
    setClientError(null);
    setPreviewUrl(null);
    setShowGradcam(false);
    setMapNotification(null);
    if (mapNotificationTimeoutRef.current) window.clearTimeout(mapNotificationTimeoutRef.current);
  }

  const label = getDiseaseLabel(result?.predicted_class);
  const isHealthy = (result?.predicted_class ?? "").toLowerCase().endsWith("healthy");
  const confidencePercent = result?.confidence != null ? Math.round(result.confidence * 100) : 0;

  return (
    <div className={styles.page}>
      <div className={styles["section-eye"]}>Diagnostic instantané</div>
      <h2 className={styles["section-title"]}>Analyser une <em>nouvelle photo</em></h2>

      {(step === "upload" || step === "error") && (
        <>
          {step === "error" && serverError && (
            <div className={styles["error-banner"]}>{serverError}</div>
          )}
          <div
            className={`${styles["upload-zone"]} ${dragging ? styles.dragging : ""}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              style={{ display: "none" }}
              onChange={onFileInputChange}
            />
            <div className={styles["upload-ico"]}>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 0115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div className={styles["upload-title"]}>Glissez une photo de votre plante ici</div>
            <div className={styles["upload-sub"]}>JPG, PNG · Prenez la photo à la lumière du jour pour un meilleur résultat</div>
            <div className={styles["upload-actions"]}>
              <button
                type="button"
                className={styles.btn + " " + styles["btn-primary"]}
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                Choisir une image
              </button>
              <button
                type="button"
                className={styles.btn + " " + styles["btn-ghost"]}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCamera(true);
                }}
              >
                📷 Prendre une photo
              </button>
            </div>
            {clientError && <div className={styles["upload-error"]}>{clientError}</div>}
          </div>
        </>
      )}

      {step === "loading" && (
        <div className={styles["result-grid"]}>
          <div className={styles["result-img"]} style={{ position: "relative" }}>
            {previewUrl && <img src={previewUrl} alt="Photo analysée" className={styles["preview-image"]} />}
            <div className={styles["loading-overlay"]}>Analyse en cours…</div>
          </div>
          <div className={styles.diagnosis}>
            <div className={styles["upload-title"]} style={{ fontSize: 16 }}>Analyse de votre photo…</div>
            <div className={styles["upload-sub"]}>Le modèle examine la feuille, cela prend quelques secondes.</div>
          </div>
        </div>
      )}

      {step === "result" && result && (
        <div className={styles["result-grid"]}>
          <div className={styles["result-img"]}>
            {result.gradcam_url && (
              <div className={styles["gradcam-toggle"]}>
                <button
                  type="button"
                  className={!showGradcam ? styles["gc-active"] : ""}
                  onClick={() => setShowGradcam(false)}
                >
                  Original
                </button>
                <button
                  type="button"
                  className={showGradcam ? styles["gc-active"] : ""}
                  onClick={() => setShowGradcam(true)}
                >
                  Grad-CAM
                </button>
              </div>
            )}
            {showGradcam && result.gradcam_url ? (
              <img
                src={result.gradcam_url}
                alt="Zones d'attention du modèle (Grad-CAM)"
                className={styles["preview-image"]}
              />
            ) : (
              previewUrl && <img src={previewUrl} alt="Photo analysée" className={styles["preview-image"]} />
            )}
          </div>
          <div className={styles.diagnosis}>
            {result.low_confidence ? (
              <>
                <div className={`${styles["diag-tag"]} ${styles.warning}`}>⚠ Résultat incertain</div>
                <div className={styles["reco-box"]}>
                  <div className={styles["reco-eye"]}>Photo peu concluante</div>
                  <div className={styles["reco-txt"]}>
                    Reprenez la photo en pleine lumière, feuille bien à plat, pour un diagnostic fiable.
                  </div>
                </div>
              </>
            ) : (
              <div className={`${styles["diag-tag"]} ${isHealthy ? styles.success : styles.danger}`}>
                {isHealthy ? "✓" : "⚠"} {label.crop} {label.disease}
              </div>
            )}

            <div className={styles["diag-conf"]}>
              Niveau de confiance : <b>{confidencePercent}%</b>
            </div>
            <div className={styles["confidence-bar"]}>
              <div className={styles["confidence-bar-fill"]} style={{ width: `${confidencePercent}%` }} />
            </div>

            {result.top_k && result.top_k.length > 0 && (
              <>
                <button type="button" className={styles["topk-toggle"]} onClick={() => setShowTopK((v) => !v)}>
                  {showTopK ? "Masquer" : "Voir"} les 3 diagnostics les plus probables
                </button>
                {showTopK && (
                  <div className={styles["topk-list"]}>
                    {result.top_k.map((entry) => {
                      const entryLabel = getDiseaseLabel(entry.class);
                      return (
                        <div key={entry.class} className={styles["topk-row"]}>
                          <span>{entryLabel.crop} {entryLabel.disease}</span>
                          <span>{Math.round(entry.confidence * 100)}%</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            <button
              type="button"
              className={styles.btn + " " + styles["btn-ghost"]}
              style={{ width: "100%", justifyContent: "center", marginTop: 10 }}
              onClick={reset}
            >
              ← Analyser une autre photo
            </button>
          </div>
        </div>
      )}

      {step === "result" && mapNotification && (
        <div className={styles["map-banner"]}>
          🗺️ {mapNotification}
        </div>
      )}

      {step === "result" && cropNotification && (
        <div className={styles["map-banner"]}>
          {cropNotification}
        </div>
      )}

      {showCamera && (
        <CameraCapture onCapture={handleCameraCapture} onClose={() => setShowCamera(false)} />
      )}
    </div>
  );
}

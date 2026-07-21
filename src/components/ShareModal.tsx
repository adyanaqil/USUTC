import { useRef, useState, useEffect } from "react";
import type { LeaderboardEntry } from "../types";
import { formatPace } from "../utils/geo";
import { X, Download, Copy, Check, Flame, Timer, Milestone } from "lucide-react";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: LeaderboardEntry | null;
  monthLabel: string;
}

export default function ShareModal({ isOpen, onClose, entry, monthLabel }: ShareModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [imageGenerated, setImageGenerated] = useState<boolean>(false);
  const [canvasError, setCanvasError] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && entry) {
      setCopied(false);
      setImageGenerated(false);
      setCanvasError(false);
      // Wait for modal to render, then generate the card
      const timer = setTimeout(() => {
        generateShareCard();
      }, 100);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, entry, monthLabel]);

  if (!isOpen || !entry) return null;

  const captionText = `Halo semuanya! Saya baru saja berlari di area USU Loop! 🏃‍♂️💨\n\nPrestasi saya di bulan ${monthLabel}:\n🔥 Total Lari: ${entry.totalRuns} kali\n📍 Jarak Tempuh: ${entry.totalDistanceKm} km\n⚡ Rata-rata Pace: ${formatPace(entry.avgPaceMinPerKm)} /km\n\nYuk ikutan gabung klasemen pelari USU Loop! Selengkapnya di usutc.com! 💚 #USUTC #USULoop #RunningMedan`;

  const handleCopyCaption = async () => {
    try {
      await navigator.clipboard.writeText(captionText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Gagal menyalin caption", err);
    }
  };

  const generateShareCard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set high-resolution dimensions for Instagram Story (1080 x 1920)
    canvas.width = 1080;
    canvas.height = 1920;

    // Narrow type to satisfy TypeScript
    const activeEntry = entry;
    const activeCtx = ctx;

    // 1. Draw Background Gradient
    const gradient = activeCtx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "#065f46"); // Deep emerald green
    gradient.addColorStop(0.5, "#0f172a"); // Slate 900
    gradient.addColorStop(1, "#1e1b4b"); // Deep indigo/violet
    activeCtx.fillStyle = gradient;
    activeCtx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Draw Decorative Glowing Orbs
    activeCtx.fillStyle = "rgba(16, 185, 129, 0.15)"; // Green glow top left
    activeCtx.beginPath();
    activeCtx.arc(100, 200, 400, 0, Math.PI * 2);
    activeCtx.fill();

    activeCtx.fillStyle = "rgba(14, 165, 233, 0.12)"; // Blue glow bottom right
    activeCtx.beginPath();
    activeCtx.arc(900, 1600, 500, 0, Math.PI * 2);
    activeCtx.fill();

    // 3. Draw Header Title: USU TC
    activeCtx.textAlign = "center";
    activeCtx.textBaseline = "middle";
    
    // Draw Logo Icon (Flame style outline)
    activeCtx.strokeStyle = "#10b981";
    activeCtx.lineWidth = 8;
    activeCtx.beginPath();
    activeCtx.moveTo(canvas.width / 2, 180);
    activeCtx.bezierCurveTo(canvas.width / 2 - 40, 230, canvas.width / 2 - 60, 270, canvas.width / 2, 320);
    activeCtx.bezierCurveTo(canvas.width / 2 + 50, 270, canvas.width / 2 + 30, 230, canvas.width / 2, 180);
    activeCtx.stroke();

    activeCtx.fillStyle = "rgba(16, 185, 129, 0.2)";
    activeCtx.fill();

    // Header Text
    activeCtx.fillStyle = "#ffffff";
    activeCtx.font = "bold 90px Outfit, sans-serif";
    activeCtx.fillText("USU TC", canvas.width / 2, 420);

    activeCtx.fillStyle = "#10b981";
    activeCtx.font = "500 40px 'Plus Jakarta Sans', sans-serif";
    activeCtx.fillText("USU LOOP LEADERBOARD", canvas.width / 2, 510);

    // Month Subtitle
    activeCtx.fillStyle = "#94a3b8";
    activeCtx.font = "normal 36px 'Plus Jakarta Sans', sans-serif";
    activeCtx.fillText(`Prestasi Bulan: ${monthLabel.toUpperCase()}`, canvas.width / 2, 600);

    // 4. Draw Avatar & User Name
    const drawRunnerProfile = (drawCtx: CanvasRenderingContext2D, runner: LeaderboardEntry) => {
      const avatarSize = 180;
      const avatarX = canvas.width / 2;
      const avatarY = 790;

      // Draw avatar background border circle
      drawCtx.beginPath();
      drawCtx.arc(avatarX, avatarY, avatarSize / 2 + 10, 0, Math.PI * 2);
      drawCtx.strokeStyle = "#10b981";
      drawCtx.lineWidth = 6;
      drawCtx.stroke();

      // Attempt to load and draw Dicebear avatar
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          drawCtx.save();
          drawCtx.beginPath();
          drawCtx.arc(avatarX, avatarY, avatarSize / 2, 0, Math.PI * 2);
          drawCtx.clip();
          drawCtx.drawImage(img, avatarX - avatarSize / 2, avatarY - avatarSize / 2, avatarSize, avatarSize);
          drawCtx.restore();
          
          // Draw Name after avatar loads
          drawNameAndStats(drawCtx, runner);
        } catch {
          // Fallback to initials if draw fails due to CORS
          drawAvatarFallback(drawCtx, runner);
        }
      };
      img.onerror = () => {
        drawAvatarFallback(drawCtx, runner);
      };
      // Trigger load
      if (runner.avatarUrl) {
        img.src = runner.avatarUrl;
      } else {
        drawAvatarFallback(drawCtx, runner);
      }
    };

    const drawAvatarFallback = (drawCtx: CanvasRenderingContext2D, runner: LeaderboardEntry) => {
      const avatarSize = 180;
      const avatarX = canvas.width / 2;
      const avatarY = 790;

      drawCtx.beginPath();
      drawCtx.arc(avatarX, avatarY, avatarSize / 2, 0, Math.PI * 2);
      drawCtx.fillStyle = "#1e293b";
      drawCtx.fill();

      drawCtx.fillStyle = "#10b981";
      drawCtx.font = "bold 70px Outfit, sans-serif";
      const initials = runner.userName.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
      drawCtx.fillText(initials, avatarX, avatarY);
      drawNameAndStats(drawCtx, runner);
    };

    const drawNameAndStats = (drawCtx: CanvasRenderingContext2D, runner: LeaderboardEntry) => {
      // Runner Name
      drawCtx.fillStyle = "#ffffff";
      drawCtx.font = "bold 65px Outfit, sans-serif";
      drawCtx.fillText(runner.userName, canvas.width / 2, 940);

      // Rank Tag
      drawCtx.fillStyle = "rgba(16, 185, 129, 0.15)";
      const rankText = `RANK #${runner.rank}`;
      const textMetrics = drawCtx.measureText(rankText);
      const paddingX = 40;
      
      // Draw rounded rank badge background
      drawCtx.beginPath();
      const rectW = textMetrics.width + paddingX * 2;
      const rectH = 60;
      const rectX = canvas.width / 2 - rectW / 2;
      const rectY = 985;
      const radius = 30;
      drawCtx.roundRect(rectX, rectY, rectW, rectH, radius);
      drawCtx.fill();

      drawCtx.fillStyle = "#10b981";
      drawCtx.font = "bold 34px Outfit, sans-serif";
      drawCtx.fillText(rankText, canvas.width / 2, rectY + rectH / 2);

      // 5. Draw Stats Cards Box (Glassmorphic)
      const boxW = 860;
      const boxH = 460;
      const boxX = (canvas.width - boxW) / 2;
      const boxY = 1120;
      
      drawCtx.fillStyle = "rgba(255, 255, 255, 0.05)";
      drawCtx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      drawCtx.lineWidth = 3;
      
      drawCtx.beginPath();
      drawCtx.roundRect(boxX, boxY, boxW, boxH, 40);
      drawCtx.fill();
      drawCtx.stroke();

      // Stats row inside card box
      const statItems = [
        { label: "TOTAL JARAK", value: `${runner.totalDistanceKm.toFixed(2)}`, unit: "KM", yOffset: 1210 },
        { label: "RATA-RATA PACE", value: `${formatPace(runner.avgPaceMinPerKm)}`, unit: "/KM", yOffset: 1340 },
        { label: "JUMLAH LARI", value: `${runner.totalRuns}`, unit: "KALI", yOffset: 1470 }
      ];

      for (const item of statItems) {
        // Label left aligned
        drawCtx.textAlign = "left";
        drawCtx.fillStyle = "#94a3b8";
        drawCtx.font = "bold 30px 'Plus Jakarta Sans', sans-serif";
        drawCtx.fillText(item.label, boxX + 60, item.yOffset);

        // Value right aligned
        drawCtx.textAlign = "right";
        drawCtx.fillStyle = "#ffffff";
        drawCtx.font = "bold 44px Outfit, sans-serif";
        drawCtx.fillText(item.value, boxX + boxW - 60 - 70, item.yOffset);
        
        drawCtx.fillStyle = "#10b981";
        drawCtx.textAlign = "right";
        drawCtx.font = "bold 26px Outfit, sans-serif";
        drawCtx.fillText(item.unit, boxX + boxW - 60, item.yOffset + 4);
      }

      // 6. Draw Footer Text and Watermark
      drawCtx.textAlign = "center";
      drawCtx.fillStyle = "#475569";
      drawCtx.font = "500 28px 'Plus Jakarta Sans', sans-serif";
      drawCtx.fillText("Klasemen Lari Komunitas USU", canvas.width / 2, 1720);

      drawCtx.fillStyle = "#10b981";
      drawCtx.font = "bold 32px Outfit, sans-serif";
      drawCtx.fillText("usutc.com", canvas.width / 2, 1775);

      setImageGenerated(true);
    };

    // Run drawing sequence
    try {
      drawRunnerProfile(activeCtx, activeEntry);
    } catch (err) {
      console.error("Canvas drawing error", err);
      setCanvasError(true);
    }
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas || !imageGenerated || !entry) return;

    try {
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `USUTC_Story_${entry.userName.replace(/\s+/g, "_")}_${monthLabel.replace(/\s+/g, "_")}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Download failed", err);
      alert("Gagal mengunduh gambar karena masalah keamanan browser (CORS). Anda masih bisa menyalin teks caption!");
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass" style={{ maxWidth: "780px" }}>
        <div className="modal-header">
          <h2>Bagikan Prestasi ke Instagram Story</h2>
          <button className="btn-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ flexDirection: "row", gap: "28px" }}>
          {/* Left Column: Image Preview (9:16 aspect ratio preview) */}
          <div className="share-preview-column" style={{ flex: "1", maxWidth: "260px" }}>
            <span className="form-label" style={{ marginBottom: "8px", display: "block" }}>Pratinjau Story Card</span>
            <div 
              className="story-card-preview-wrapper"
              style={{
                position: "relative",
                width: "100%",
                paddingBottom: "177.7%", // 9:16 ratio
                borderRadius: "14px",
                overflow: "hidden",
                border: "1px solid var(--border-glass)",
                boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)"
              }}
            >
              {/* Visible Canvas styled to fit container */}
              <canvas
                ref={canvasRef}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  backgroundColor: "#0f172a",
                  display: canvasError ? "none" : "block"
                }}
              />
              {canvasError && (
                <div style={{
                  position: "absolute",
                  top: 0, left: 0, right: 0, bottom: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  padding: "16px", textAlign: "center", color: "var(--text-muted)",
                  fontSize: "12px", backgroundColor: "#0f172a"
                }}>
                  Gagal memuat pratinjau visual. Namun Anda tetap dapat menggunakan tombol download di samping.
                </div>
              )}
              
              {!imageGenerated && !canvasError && (
                <div style={{
                  position: "absolute",
                  top: 0, left: 0, right: 0, bottom: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  backgroundColor: "rgba(15, 23, 42, 0.6)", color: "#ffffff",
                  fontSize: "12px"
                }}>
                  Menyiapkan visual...
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Instructions and Copy Paste */}
          <div className="share-info-column" style={{ flex: "1.5", display: "flex", flexDirection: "column", gap: "20px" }}>
            
            {/* Steps to share */}
            <div className="form-group">
              <span className="form-label">Langkah Berbagi</span>
              <div className="share-steps" style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px", color: "var(--text-muted)", marginTop: "6px" }}>
                <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                  <span style={{ background: "var(--primary-glow)", color: "var(--secondary)", fontWeight: "bold", width: "20px", height: "20px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "11px", textAlign: "center", lineHeight: "20px" }}>1</span>
                  <span>Klik tombol **Unduh Gambar** di bawah untuk menyimpan visual story berkualitas tinggi.</span>
                </div>
                <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                  <span style={{ background: "var(--primary-glow)", color: "var(--secondary)", fontWeight: "bold", width: "20px", height: "20px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "11px", textAlign: "center", lineHeight: "20px" }}>2</span>
                  <span>Klik **Salin Caption** untuk menyalin info prestasi lari Anda.</span>
                </div>
                <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                  <span style={{ background: "var(--primary-glow)", color: "var(--secondary)", fontWeight: "bold", width: "20px", height: "20px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "11px", textAlign: "center", lineHeight: "20px" }}>3</span>
                  <span>Buka **Instagram Story**, pilih gambar yang diunduh, tempel (*paste*) teks caption, dan bagikan!</span>
                </div>
              </div>
            </div>

            {/* Quick stats stats cards display */}
            <div className="form-group">
              <span className="form-label">Info Prestasi Pelari</span>
              <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                <div style={{ flex: 1, padding: "8px 12px", background: "var(--bg-darker)", borderRadius: "8px", border: "1px solid var(--border-glass)", display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: "600" }}>
                  <Flame size={12} className="text-accent" />
                  <span>{entry.totalRuns} Lari</span>
                </div>
                <div style={{ flex: 1, padding: "8px 12px", background: "var(--bg-darker)", borderRadius: "8px", border: "1px solid var(--border-glass)", display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: "600" }}>
                  <Milestone size={12} className="text-accent" />
                  <span>{entry.totalDistanceKm.toFixed(1)} km</span>
                </div>
                <div style={{ flex: 1, padding: "8px 12px", background: "var(--bg-darker)", borderRadius: "8px", border: "1px solid var(--border-glass)", display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: "600" }}>
                  <Timer size={12} className="text-accent" />
                  <span>{formatPace(entry.avgPaceMinPerKm)}</span>
                </div>
              </div>
            </div>

            {/* Copy Caption text box */}
            <div className="form-group">
              <span className="form-label">Teks Caption Story</span>
              <textarea
                className="form-input"
                style={{ height: "120px", fontSize: "12px", resize: "none", marginTop: "4px", backgroundColor: "var(--bg-darker)", lineHeight: "140%" }}
                readOnly
                value={captionText}
              />
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
              <button
                className="btn-primary-glow"
                style={{ flex: 1.2, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                onClick={handleDownload}
                disabled={!imageGenerated}
              >
                <Download size={16} />
                Unduh Gambar
              </button>
              
              <button
                className="btn-secondary"
                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                onClick={handleCopyCaption}
              >
                {copied ? <Check size={16} style={{ color: "var(--primary)" }} /> : <Copy size={16} />}
                {copied ? "Tersalin!" : "Salin Caption"}
              </button>
            </div>

            <div style={{ display: "flex", gap: "6px", alignItems: "center", justifyContent: "center", fontSize: "11px", color: "var(--text-dim)", fontWeight: "500" }}>
              <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
              <span>Simulasi Berbagi ke Instagram Story</span>
            </div>

          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

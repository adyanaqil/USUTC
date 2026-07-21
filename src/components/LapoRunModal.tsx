import React, { useState, useEffect } from "react";
import type { User, Activity, GPSPoint } from "../types";
import { parseGPX, formatPace, formatDuration, USU_BOUNDARY } from "../utils/geo";
import { generateUSUTack, generateOutsideTrack, generateCrossBorderTrack, pointsToGPXString } from "../utils/mockData";
import MapComponent from "./MapComponent";
import { X, UploadCloud, CheckCircle2, AlertTriangle, UserPlus, Milestone, Clock, Eye } from "lucide-react";
import { createUser } from "../services/db";

interface LapoRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  onAddActivity: (activity: Omit<Activity, "id">) => Promise<void>;
  onRefreshUsers: () => void;
  activeMonth: string;
}

export default function LapoRunModal({
  isOpen,
  onClose,
  users,
  onAddActivity,
  onRefreshUsers,
  activeMonth
}: LapoRunModalProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [newUserName, setNewUserName] = useState<string>("");
  const [showAddUser, setShowAddUser] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [parsedData, setParsedData] = useState<{
    points: GPSPoint[];
    distanceKm: number;
    durationMin: number;
    avgPaceMinPerKm: number;
    pointsInBoundaryPct: number;
    isValidLocation: boolean;
    usuDistanceKm: number;
  } | null>(null);
  const [gpxFileName, setGpxFileName] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (users.length > 0 && !selectedUserId) {
      setSelectedUserId(users[0].id);
    }
  }, [users, selectedUserId]);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    if (!file.name.endsWith(".gpx")) {
      setError("Format file harus berupa .gpx");
      return;
    }
    setError("");
    setGpxFileName(file.name);
    setLoading(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const result = parseGPX(text);
        if (result.points.length === 0) {
          setError("File GPX tidak valid atau tidak memiliki trackpoint.");
          setParsedData(null);
        } else {
          setParsedData(result);
        }
      } catch {
        setError("Gagal mem-parsing file GPX.");
        setParsedData(null);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsText(file);
  };

  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim()) return;

    try {
      const newUser = await createUser(newUserName.trim());
      onRefreshUsers();
      setSelectedUserId(newUser.id);
      setNewUserName("");
      setShowAddUser(false);
    } catch {
      setError("Gagal membuat pelari baru.");
    }
  };

  const handleSimulate = (type: "valid" | "invalid" | "cross") => {
    setLoading(true);
    setError("");
    
    setTimeout(() => {
      let points: GPSPoint[] = [];
      let name = "";
      
      // Determine simulation date matching the active month tab
      // Default to 15th of the month at 07:30 AM
      const [year, month] = activeMonth.split("-");
      const simulateDate = new Date(parseInt(year), parseInt(month) - 1, 15, 7, 30, 0);
      
      if (type === "valid") {
        points = generateUSUTack(3.5613, 98.6568, 0.0024 + Math.random() * 0.0006, 3, 25, simulateDate);
        name = `Simulasi_Rute_USU_Valid_${activeMonth}.gpx`;
      } else if (type === "invalid") {
        points = generateOutsideTrack(3.5885, 98.6755, 0.0012, 35, simulateDate);
        name = `Simulasi_Rute_Luar_USU_${activeMonth}.gpx`;
      } else {
        points = generateCrossBorderTrack(simulateDate);
        name = `Simulasi_Rute_Silang_${activeMonth}.gpx`;
      }
      
      const gpxStr = pointsToGPXString(name.replace(".gpx", ""), points);
      const result = parseGPX(gpxStr);
      
      setGpxFileName(name);
      setParsedData(result);
      setLoading(false);
    }, 400);
  };

  const handleSave = async () => {
    if (!selectedUserId || !parsedData) return;
    
    // Activity date: use timestamp of first GPX point or today's date
    const firstPointTime = parsedData.points[0]?.time;
    const activityDate = firstPointTime 
      ? firstPointTime.substring(0, 10) 
      : new Date().toISOString().substring(0, 10);

    const newActivity: Omit<Activity, "id"> = {
      userId: selectedUserId,
      date: activityDate,
      rawPoints: parsedData.points,
      calculatedDistanceKm: parsedData.distanceKm,
      calculatedDurationMin: parsedData.durationMin,
      avgPaceMinPerKm: parsedData.avgPaceMinPerKm,
      pointsInBoundaryPct: parsedData.pointsInBoundaryPct,
      isValidLocation: parsedData.isValidLocation,
      usuDistanceKm: parsedData.usuDistanceKm
    };

    setLoading(true);
    try {
      await onAddActivity(newActivity);
      setParsedData(null);
      setGpxFileName("");
      onClose();
    } catch {
      setError("Gagal menyimpan aktivitas.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass">
        <div className="modal-header">
          <h2>LapoRUN! — Upload GPX</h2>
          <button className="btn-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {error && <div className="alert alert-error">{error}</div>}

          {/* User selector */}
          <div className="form-group">
            <label className="form-label">Siapa yang Berlari?</label>
            {!showAddUser ? (
              <div className="flex-row">
                <select
                  className="form-select"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowAddUser(true)}
                  title="Tambah pelari baru"
                >
                  <UserPlus size={16} />
                </button>
              </div>
            ) : (
              <form onSubmit={handleAddUserSubmit} className="flex-row">
                <input
                  type="text"
                  className="form-input"
                  placeholder="Nama pelari baru..."
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  autoFocus
                />
                <button type="submit" className="btn-primary">
                  Tambah
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowAddUser(false)}
                >
                  Batal
                </button>
              </form>
            )}
          </div>

          {/* Dropzone or Preview */}
          {!parsedData ? (
            <div className="upload-container">
              <div
                className={`drop-zone ${dragActive ? "active" : ""}`}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  id="file-gpx-upload"
                  className="file-input-hidden"
                  accept=".gpx"
                  onChange={handleFileChange}
                />
                <label htmlFor="file-gpx-upload" className="drop-zone-label">
                  <UploadCloud size={48} className="upload-icon" />
                  <span className="upload-text">
                    Seret & lepas file GPX, atau <strong>pilih dari perangkat</strong>
                  </span>
                  <span className="upload-subtext">Hanya menerima file .gpx</span>
                </label>
              </div>

              {/* Simulation Shortcuts */}
              <div className="simulation-box">
                <p className="simulation-title">Belum punya file GPX? Coba simulasi:</p>
                <div className="simulation-buttons">
                  <button
                    className="btn-simulate valid"
                    onClick={() => handleSimulate("valid")}
                    disabled={loading}
                  >
                    <CheckCircle2 size={14} /> USU Valid (100% Inside)
                  </button>
                  <button
                    className="btn-simulate cross"
                    onClick={() => handleSimulate("cross")}
                    disabled={loading}
                  >
                    <Eye size={14} /> Silang (Sebagian USU)
                  </button>
                  <button
                    className="btn-simulate invalid"
                    onClick={() => handleSimulate("invalid")}
                    disabled={loading}
                  >
                    <AlertTriangle size={14} /> Luar USU (Medan Kota)
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="preview-container">
              <div className="preview-header-meta">
                <span className="preview-filename">{gpxFileName}</span>
                <button
                  className="btn-text"
                  onClick={() => setParsedData(null)}
                >
                  Ganti File
                </button>
              </div>

              {/* Parsed Stats Cards */}
              <div className="preview-stats-grid">
                <div className="preview-stat-card">
                  <span className="stat-label">
                    <Milestone size={14} /> Total Jarak
                  </span>
                  <span className="stat-val">{parsedData.distanceKm} km</span>
                </div>
                <div className="preview-stat-card">
                  <span className="stat-label">
                    <Clock size={14} /> Durasi
                  </span>
                  <span className="stat-val">{formatDuration(parsedData.durationMin)}</span>
                </div>
                <div className="preview-stat-card">
                  <span className="stat-label">Pace</span>
                  <span className="stat-val">{formatPace(parsedData.avgPaceMinPerKm)} /km</span>
                </div>
              </div>

              {/* Validation Alert Box */}
              {parsedData.isValidLocation ? (
                <div className="validation-alert alert-success">
                  <CheckCircle2 className="alert-icon" />
                  <div>
                    <h4>Aktivitas Valid (Terdeteksi di USU)</h4>
                    <p>
                      <strong>{parsedData.pointsInBoundaryPct}%</strong> dari titik rute berada di dalam area Kampus USU. 
                      Jarak yang dihitung untuk leaderboard: <strong>{parsedData.usuDistanceKm} km</strong>.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="validation-alert alert-warning">
                  <AlertTriangle className="alert-icon" />
                  <div>
                    <h4>Aktivitas Tidak Valid (Di Luar USU)</h4>
                    <p>
                      Hanya <strong>{parsedData.pointsInBoundaryPct}%</strong> dari titik rute berada di dalam area Kampus USU (di bawah threshold 50%). 
                      Aktivitas ini dapat disimpan, namun <strong>0 km</strong> akan ditambahkan ke leaderboard USU.
                    </p>
                  </div>
                </div>
              )}

              {/* Map Preview */}
              <div className="map-preview-box">
                <h4 className="preview-title-map">Pratinjau Rute Aktivitas</h4>
                <MapComponent
                  points={parsedData.points}
                  boundary={USU_BOUNDARY}
                  height="220px"
                />
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose} disabled={loading}>
            Batal
          </button>
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={!parsedData || !selectedUserId || loading}
          >
            {loading ? "Memproses..." : "Simpan Aktivitas"}
          </button>
        </div>
      </div>
    </div>
  );
}

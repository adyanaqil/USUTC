import { useState, useEffect } from "react";
import type { User, Activity, LeaderboardEntry } from "./types";
import { getUsers, getActivities, addActivity, getMonthlyLeaderboard } from "./services/db";
import { USU_BOUNDARY } from "./utils/geo";
import MapComponent from "./components/MapComponent";
import LeaderboardTable from "./components/LeaderboardTable";
import LapoRunModal from "./components/LapoRunModal";
import ShareModal from "./components/ShareModal";
import { Flame, RefreshCw, Milestone, Calendar, HelpCircle } from "lucide-react";

export default function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>("2026-07");
  const [selectedUserForMap, setSelectedUserForMap] = useState<string | null>(null);
  
  // Modals & Loaders
  const [isLapoOpen, setIsLapoOpen] = useState<boolean>(false);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState<boolean>(false);
  const [loadingGlobal, setLoadingGlobal] = useState<boolean>(true);
  
  // Share Modal states
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [activeShareEntry, setActiveShareEntry] = useState<LeaderboardEntry | null>(null);

  // Available months in our calendar
  const months = [
    { value: "2026-07", label: "Juli 2026" },
    { value: "2026-08", label: "Agustus 2026" },
    { value: "2026-09", label: "September 2026" },
    { value: "2026-10", label: "Oktober 2026" },
    { value: "2026-11", label: "November 2026" },
    { value: "2026-12", label: "Desember 2026" }
  ];

  const fetchInitialData = async () => {
    setLoadingGlobal(true);
    try {
      const u = await getUsers();
      const a = await getActivities();
      setUsers(u);
      setActivities(a);
    } catch (e) {
      console.error("Error fetching initial data", e);
    } finally {
      setLoadingGlobal(false);
    }
  };

  // Run on mount
  useEffect(() => {
    fetchInitialData();
  }, []);

  // Update leaderboard when activities or month changes
  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoadingLeaderboard(true);
      try {
        const entries = await getMonthlyLeaderboard(selectedMonth);
        setLeaderboard(entries);
      } catch (e) {
        console.error("Error compiling leaderboard", e);
      } finally {
        setLoadingLeaderboard(false);
      }
    };

    if (!loadingGlobal) {
      fetchLeaderboard();
      // Clear highlighted map user when switching months
      setSelectedUserForMap(null);
    }
  }, [selectedMonth, activities, loadingGlobal]);

  const handleAddActivity = async (newAct: Omit<Activity, "id">) => {
    try {
      const savedAct = await addActivity(newAct);
      setActivities(prev => [savedAct, ...prev]);
      
      // Auto-switch tab to the month of the uploaded run
      const runMonth = newAct.date.substring(0, 7);
      setSelectedMonth(runMonth);
    } catch (e) {
      console.error("Error adding activity", e);
    }
  };



  // Filter activities of selected month
  const selectedMonthActivities = activities.filter(a => {
    const m = a.date.substring(0, 7);
    return m === selectedMonth;
  });

  // Calculate stats for header cards
  const totalMonthDistance = selectedMonthActivities
    .filter(a => a.isValidLocation)
    .reduce((sum, a) => sum + a.usuDistanceKm, 0);

  const totalMonthRuns = selectedMonthActivities
    .filter(a => a.isValidLocation).length;

  // Compile active route coordinates to draw on main dashboard map
  const getActiveMapRoute = () => {
    const validMonthRuns = selectedMonthActivities.filter(a => a.isValidLocation);
    
    if (selectedUserForMap) {
      // Find latest valid run of selected user
      const userRuns = validMonthRuns
        .filter(a => a.userId === selectedUserForMap)
        .sort((a, b) => b.date.localeCompare(a.date));
      return userRuns[0]?.rawPoints || [];
    }
    
    // Default: find latest valid run overall in this month
    const sortedRuns = [...validMonthRuns].sort((a, b) => b.date.localeCompare(a.date));
    return sortedRuns[0]?.rawPoints || [];
  };

  const activePointsForMap = getActiveMapRoute();
  
  // Get details of whose run is currently displayed on the map
  const getMapRouteOwnerName = () => {
    if (selectedUserForMap) {
      const u = users.find(usr => usr.id === selectedUserForMap);
      return u ? `${u.name} (Sorot)` : "Tidak diketahui";
    }
    
    const validMonthRuns = selectedMonthActivities.filter(a => a.isValidLocation);
    const latestRun = [...validMonthRuns].sort((a, b) => b.date.localeCompare(a.date))[0];
    if (latestRun) {
      const u = users.find(usr => usr.id === latestRun.userId);
      return u ? `${u.name} (Terbaru)` : "Terbaru";
    }
    return null;
  };

  const routeOwner = getMapRouteOwnerName();

  const handleRowClick = (userId: string) => {
    setSelectedUserForMap(userId === selectedUserForMap ? null : userId);
  };

  return (
    <div className="app-container">
      {/* Top Navigation / Header */}
      <header className="main-header glass">
        <div className="header-brand">
          <div className="logo-glow">
            <Flame className="logo-icon animate-pulse" size={28} />
          </div>
          <div>
            <h1>USU TC</h1>
            <p className="subtitle">Running Leaderboard USU Loop</p>
          </div>
        </div>
        <div className="header-actions">
          <button 
            className="btn-primary-glow btn-large"
            onClick={() => setIsLapoOpen(true)}
          >
            LapoRUN!
          </button>
        </div>
      </header>

      {loadingGlobal ? (
        <div className="loading-screen">
          <RefreshCw className="animate-spin" size={48} />
          <p>Memuat dashboard USU TC...</p>
        </div>
      ) : (
        <main className="dashboard-content">
          {/* Month Tab Navigation */}
          <nav className="month-tabs-container">
            <div className="month-tabs">
              {months.map((m) => (
                <button
                  key={m.value}
                  className={`month-tab ${selectedMonth === m.value ? "active" : ""}`}
                  onClick={() => setSelectedMonth(m.value)}
                >
                  <Calendar size={16} />
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
            <div className="active-indicator-bar" />
          </nav>

          {/* Key Aggregated Stats Grid */}
          <div className="stats-row">
            <div className="stat-card glass">
              <div className="stat-card-icon">
                <Milestone size={24} />
              </div>
              <div className="stat-card-info">
                <h3>{totalMonthDistance.toFixed(1)} km</h3>
                <p>Jarak Kolektif USU Bulan Ini</p>
              </div>
            </div>
            <div className="stat-card glass">
              <div className="stat-card-icon">
                <Flame size={24} />
              </div>
              <div className="stat-card-info">
                <h3>{totalMonthRuns} Aktivitas</h3>
                <p>Total Lari Valid di Area USU</p>
              </div>
            </div>
            <div className="stat-card glass explanation-card">
              <div className="stat-card-icon text-info">
                <HelpCircle size={24} />
              </div>
              <div className="stat-card-info">
                <h3>Validasi Geofence USU</h3>
                <p>Minimal 50% rute berada di dalam Kampus USU Padang Bulan agar aktivitas valid.</p>
              </div>
            </div>
          </div>

          {/* Main Dashboard Layout */}
          <div className="dashboard-grid">
            {/* Left Column: Map and track visualization */}
            <div className="grid-right">
              <div className="section-header">
                <h2>Peta Kampus USU</h2>
                {routeOwner && (
                  <span className="route-owner-tag">
                    Rute: <strong>{routeOwner}</strong>
                    {selectedUserForMap && (
                      <button 
                        className="btn-clear-selection" 
                        onClick={() => setSelectedUserForMap(null)}
                      >
                        Batal Sorot
                      </button>
                    )}
                  </span>
                )}
              </div>
              
              <div className="main-map-card glass">
                <MapComponent
                  points={activePointsForMap}
                  boundary={USU_BOUNDARY}
                  height="450px"
                />
              </div>
            </div>

            {/* Right Column: Leaderboard rankings */}
            <div className="grid-left">
              <div className="section-header">
                <h2>Klasemen Pelari</h2>
                <span className="info-tip">Pilih baris pelari untuk menyorot rute larinya di peta</span>
              </div>
              
              <div 
                className="leaderboard-table-container"
                style={{ cursor: "pointer" }}
              >
                <div className="clickable-rows-wrapper">
                   <LeaderboardTable 
                    entries={leaderboard} 
                    loading={loadingLeaderboard} 
                    selectedUserId={selectedUserForMap}
                    onUserClick={handleRowClick}
                    onShareClick={(entry) => {
                      setActiveShareEntry(entry);
                      setIsShareModalOpen(true);
                    }}
                  />
                </div>
              </div>
              
              {/* Click instruction listener */}
              <div style={{ display: "none" }}>
                {/* For accessibility / backend sync reference */}
                {leaderboard.map(e => (
                  <button key={e.userId} onClick={() => handleRowClick(e.userId)}>Row listener</button>
                ))}
              </div>
            </div>
          </div>
        </main>
      )}

      {/* Modal for GPX Upload */}
      <LapoRunModal
        isOpen={isLapoOpen}
        onClose={() => setIsLapoOpen(false)}
        users={users}
        onAddActivity={handleAddActivity}
        onRefreshUsers={async () => {
          const u = await getUsers();
          setUsers(u);
        }}
        activeMonth={selectedMonth}
      />

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        entry={activeShareEntry}
        monthLabel={months.find((m) => m.value === selectedMonth)?.label || selectedMonth}
      />
    </div>
  );
}

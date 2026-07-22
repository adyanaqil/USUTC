import type { LeaderboardEntry } from "../types";
import { formatPace } from "../utils/geo";
import { Trophy, Flame, Timer, Milestone, Share2 } from "lucide-react";

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  loading: boolean;
  selectedUserId?: string | null;
  onUserClick?: (userId: string) => void;
  onShareClick?: (entry: LeaderboardEntry) => void;
}

export default function LeaderboardTable({ 
  entries, 
  loading,
  selectedUserId,
  onUserClick,
  onShareClick
}: LeaderboardTableProps) {
  if (loading) {
    return (
      <div className="leaderboard-skeleton">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton-row">
            <div className="skeleton-cell rank"></div>
            <div className="skeleton-cell name"></div>
            <div className="skeleton-cell pace"></div>
            <div className="skeleton-cell runs"></div>
            <div className="skeleton-cell dist"></div>
          </div>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="leaderboard-empty">
        <Flame size={48} className="empty-icon text-muted" />
        <h3>Belum ada lari bulan ini</h3>
        <p>Jadilah yang pertama mengunggah aktivitas lari Anda di area USU!</p>
      </div>
    );
  }

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy size={20} className="rank-trophy gold" />;
      case 2:
        return <Trophy size={20} className="rank-trophy silver" />;
      case 3:
        return <Trophy size={20} className="rank-trophy bronze" />;
      default:
        return <span className="rank-number">{rank}</span>;
    }
  };

  return (
    <div className="leaderboard-card">
      <div className="table-responsive">
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th className="th-rank">Rank</th>
              <th className="th-runner">Pelari</th>
              <th className="th-pace">Rata-rata Pace</th>
              <th className="th-runs">Jumlah Lari</th>
              <th className="th-dist">Jarak Total (USU)</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr 
                key={entry.userId} 
                className={`leaderboard-row rank-${entry.rank} ${selectedUserId === entry.userId ? "highlighted" : ""}`}
                onClick={() => onUserClick?.(entry.userId)}
              >
                <td className="td-rank">
                  <div className="rank-badge-container">
                    {getRankBadge(entry.rank)}
                  </div>
                </td>
                <td className="td-runner">
                  <div 
                    className="runner-profile clickable"
                    onClick={(e) => {
                      e.stopPropagation();
                      onShareClick?.(entry);
                    }}
                    title="Bagikan ke Instagram Story"
                    style={{ display: "flex", alignItems: "center", gap: "12px" }}
                  >
                    <img 
                      src={entry.avatarUrl || `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="#0f172a"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="#10b981" font-size="38" font-family="sans-serif" font-weight="bold">${entry.userName.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()}</text></svg>`)}`} 
                      alt={entry.userName} 
                      className="runner-avatar"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="#0f172a"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="#10b981" font-size="38" font-family="sans-serif" font-weight="bold">${entry.userName.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()}</text></svg>`)}`;
                      }}
                    />
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                      <span className="runner-name-link" style={{ fontWeight: "600", textDecoration: "underline", color: "var(--secondary)" }}>{entry.userName}</span>
                      <span style={{ fontSize: "10px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "3px", marginTop: "2px", fontWeight: "600" }}>
                        <Share2 size={9} /> Story IG
                      </span>
                    </div>
                  </div>
                </td>
                <td className="td-pace">
                  <div className="stat-cell">
                    <Timer size={14} className="icon-subtle" />
                    <span>{formatPace(entry.avgPaceMinPerKm)} /km</span>
                  </div>
                </td>
                <td className="td-runs">
                  <div className="stat-cell">
                    <Flame size={14} className="icon-subtle" />
                    <span>{entry.totalRuns}x</span>
                  </div>
                </td>
                <td className="td-dist font-semibold">
                  <div className="stat-cell text-accent">
                    <Milestone size={14} className="icon-accent" />
                    <span>{entry.totalDistanceKm.toFixed(2)} km</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

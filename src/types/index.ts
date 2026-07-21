export interface GPSPoint {
  lat: number;
  lon: number;
  ele?: number; // Elevation in meters
  time?: string; // Timestamp ISO string
}

export interface User {
  id: string;
  name: string;
  avatarUrl?: string;
}

export interface Activity {
  id: string;
  userId: string;
  date: string; // ISO Date String YYYY-MM-DD
  rawPoints: GPSPoint[];
  calculatedDistanceKm: number;
  calculatedDurationMin: number;
  avgPaceMinPerKm: number; // in decimal minutes/km, e.g., 5.5 means 5:30
  pointsInBoundaryPct: number; // 0 to 100
  isValidLocation: boolean; // true if pointsInBoundaryPct >= threshold (e.g. 50%)
  usuDistanceKm: number; // Sum of distance of segments within the boundary
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  avatarUrl?: string;
  totalDistanceKm: number;
  avgPaceMinPerKm: number;
  totalRuns: number;
}

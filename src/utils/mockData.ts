import type { User, Activity, GPSPoint } from "../types";
import { parseGPX } from "./geo";

// Function to generate simulated GPS points in a loop inside USU
export function generateUSUTack(
  centerLat = 3.5613,
  centerLon = 98.6568,
  radius = 0.0025,
  loops = 2,
  pointsPerLoop = 30,
  startTime: Date = new Date()
): GPSPoint[] {
  const points: GPSPoint[] = [];
  const numPoints = loops * pointsPerLoop;
  
  for (let i = 0; i < numPoints; i++) {
    const progress = i / pointsPerLoop;
    const angle = progress * 2 * Math.PI;
    
    // Add small random noise to simulate GPS jitter
    const r = radius + (Math.sin(angle * 5) * 0.0001) + ((Math.random() - 0.5) * 0.00005);
    const lat = centerLat + r * Math.sin(angle);
    const lon = centerLon + r * Math.cos(angle);
    
    // Time increases by 10-15 seconds per point
    const timeOffsetMs = i * 12000 + (Math.random() * 3000);
    const pointTime = new Date(startTime.getTime() + timeOffsetMs);
    
    // Elevation around 25-35 meters
    const ele = 28 + Math.sin(i * 0.1) * 3 + (Math.random() * 0.5);
    
    points.push({
      lat,
      lon,
      ele: parseFloat(ele.toFixed(1)),
      time: pointTime.toISOString()
    });
  }
  
  return points;
}

// Generate points completely outside USU (e.g. running in downtown Medan / Lapangan Merdeka)
export function generateOutsideTrack(
  centerLat = 3.5885, // Downtown Medan
  centerLon = 98.6755,
  radius = 0.0015,
  pointsCount = 40,
  startTime: Date = new Date()
): GPSPoint[] {
  const points: GPSPoint[] = [];
  for (let i = 0; i < pointsCount; i++) {
    const angle = (i / pointsCount) * 2 * Math.PI;
    const r = radius + (Math.random() - 0.5) * 0.0001;
    const lat = centerLat + r * Math.sin(angle);
    const lon = centerLon + r * Math.cos(angle);
    
    const timeOffsetMs = i * 15000;
    const pointTime = new Date(startTime.getTime() + timeOffsetMs);
    const ele = 32 + (Math.random() * 2);
    
    points.push({
      lat,
      lon,
      ele: parseFloat(ele.toFixed(1)),
      time: pointTime.toISOString()
    });
  }
  return points;
}

// Generate a track that is half inside, half outside (crosses the border)
export function generateCrossBorderTrack(
  startTime: Date = new Date()
): GPSPoint[] {
  const points: GPSPoint[] = [];
  // Starts inside USU campus, runs north crossing Jl. Dr. Mansyur, then returns
  const startLat = 3.5620;
  const startLon = 98.6568;
  const pointsCount = 40;
  
  for (let i = 0; i < pointsCount; i++) {
    // Moves north, then circles back
    const progress = i / pointsCount;
    let lat = startLat;
    let lon = startLon;
    
    if (progress < 0.25) {
      // Heading north (moving out of campus)
      lat = startLat + (progress / 0.25) * 0.008; // 3.562 -> 3.570
    } else if (progress < 0.75) {
      // Loop outside in residential Padang Bulan
      const angle = ((progress - 0.25) / 0.5) * Math.PI;
      lat = startLat + 0.008 + Math.sin(angle) * 0.002;
      lon = startLon + Math.cos(angle) * 0.003;
    } else {
      // Heading south (returning back to campus)
      const returnProgress = (progress - 0.75) / 0.25;
      lat = (startLat + 0.008) - returnProgress * 0.008;
    }
    
    const timeOffsetMs = i * 14000;
    const pointTime = new Date(startTime.getTime() + timeOffsetMs);
    
    points.push({
      lat: lat + (Math.random() - 0.5) * 0.0001,
      lon: lon + (Math.random() - 0.5) * 0.0001,
      ele: 29,
      time: pointTime.toISOString()
    });
  }
  return points;
}

// Convert GPS Points back to a standard GPX XML string so we can test the parser!
export function pointsToGPXString(name: string, points: GPSPoint[]): string {
  let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="USU TC Simulated GPX Generator" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${name}</name>
  </metadata>
  <trk>
    <name>${name}</name>
    <trkseg>`;
  
  for (const pt of points) {
    gpx += `
      <trkpt lat="${pt.lat.toFixed(6)}" lon="${pt.lon.toFixed(6)}">
        ${pt.ele !== undefined ? `<ele>${pt.ele.toFixed(1)}</ele>` : ''}
        ${pt.time ? `<time>${pt.time}</time>` : ''}
      </trkpt>`;
  }
  
  gpx += `
    </trkseg>
  </trk>
</gpx>`;
  return gpx;
}

export function getInitialMockData(): { users: User[]; activities: Activity[] } {
  const users: User[] = [
    { id: "u1", name: "Rian Utama", avatarUrl: "https://api.dicebear.com/7.x/adventurer/svg?seed=Rian" },
    { id: "u2", name: "Siti Aminah", avatarUrl: "https://api.dicebear.com/7.x/adventurer/svg?seed=Siti" },
    { id: "u3", name: "Budi Santoso", avatarUrl: "https://api.dicebear.com/7.x/adventurer/svg?seed=Budi" },
    { id: "u4", name: "Ahmad Fauzi", avatarUrl: "https://api.dicebear.com/7.x/adventurer/svg?seed=Ahmad" },
    { id: "u5", name: "Grace Siahaan", avatarUrl: "https://api.dicebear.com/7.x/adventurer/svg?seed=Grace" }
  ];

  const activities: Activity[] = [];

  // Helper to compile activity object
  const createSimulatedActivity = (
    userId: string,
    trackName: string,
    points: GPSPoint[],
    dateStr: string
  ): Activity => {
    // Parse using our own GPX parser (which recalculates distance, pace and checks boundaries)
    const gpxString = pointsToGPXString(trackName, points);
    const parsed = parseGPX(gpxString);
    
    return {
      id: Math.random().toString(36).substring(2, 9),
      userId,
      date: dateStr,
      rawPoints: points,
      calculatedDistanceKm: parsed.distanceKm,
      calculatedDurationMin: parsed.durationMin,
      avgPaceMinPerKm: parsed.avgPaceMinPerKm,
      pointsInBoundaryPct: parsed.pointsInBoundaryPct,
      isValidLocation: parsed.isValidLocation,
      usuDistanceKm: parsed.usuDistanceKm
    };
  };

  // Seed runs in July 2026
  activities.push(
    createSimulatedActivity("u1", "Morning Jog USU", generateUSUTack(3.5613, 98.6568, 0.0028, 3, 25, new Date("2026-07-02T06:30:00Z")), "2026-07-02"),
    createSimulatedActivity("u2", "USU Loop", generateUSUTack(3.5611, 98.6565, 0.0025, 4, 30, new Date("2026-07-03T16:45:00Z")), "2026-07-03"),
    createSimulatedActivity("u3", "Speed Run", generateUSUTack(3.5614, 98.6570, 0.0022, 5, 20, new Date("2026-07-05T06:00:00Z")), "2026-07-05"),
    createSimulatedActivity("u4", "Sore Santai", generateUSUTack(3.5610, 98.6560, 0.0024, 2, 28, new Date("2026-07-08T17:00:00Z")), "2026-07-08"),
    // A run that is invalid (downtown Medan) - should not count towards leaderboard
    createSimulatedActivity("u1", "Medan Mall Run", generateOutsideTrack(3.5885, 98.6755, 0.0012, 35, new Date("2026-07-10T06:15:00Z")), "2026-07-10"),
    // A run that crosses borders (partially valid) - 62% inside, so it's valid, but only a portion counts
    createSimulatedActivity("u5", "Cross Padang Bulan", generateCrossBorderTrack(new Date("2026-07-12T07:00:00Z")), "2026-07-12")
  );

  // Seed runs in August 2026
  activities.push(
    createSimulatedActivity("u1", "USU Interval", generateUSUTack(3.5613, 98.6568, 0.0025, 4, 30, new Date("2026-08-01T06:30:00Z")), "2026-08-01"),
    createSimulatedActivity("u2", "Agustus Ceria", generateUSUTack(3.5611, 98.6565, 0.0030, 3, 30, new Date("2026-08-02T16:00:00Z")), "2026-08-02"),
    createSimulatedActivity("u3", "Babat Lintasan", generateUSUTack(3.5614, 98.6570, 0.0026, 6, 25, new Date("2026-08-04T05:45:00Z")), "2026-08-04"),
    createSimulatedActivity("u4", "Long Run Kampus", generateUSUTack(3.5610, 98.6560, 0.0024, 5, 25, new Date("2026-08-05T06:15:00Z")), "2026-08-05"),
    createSimulatedActivity("u5", "Run around FIB", generateUSUTack(3.5615, 98.6558, 0.0018, 3, 20, new Date("2026-08-07T16:30:00Z")), "2026-08-07")
  );

  // Seed runs in September 2026
  activities.push(
    createSimulatedActivity("u2", "USU Lari Pagi", generateUSUTack(3.5611, 98.6565, 0.0026, 5, 28, new Date("2026-09-01T06:00:00Z")), "2026-09-01"),
    createSimulatedActivity("u3", "September Pace", generateUSUTack(3.5614, 98.6570, 0.0024, 7, 24, new Date("2026-09-02T05:30:00Z")), "2026-09-02"),
    createSimulatedActivity("u1", "Weekly Run", generateUSUTack(3.5613, 98.6568, 0.0028, 4, 30, new Date("2026-09-05T06:30:00Z")), "2026-09-05"),
    createSimulatedActivity("u4", "USU Santai", generateUSUTack(3.5610, 98.6560, 0.0020, 3, 20, new Date("2026-09-06T17:15:00Z")), "2026-09-06")
  );

  return { users, activities };
}

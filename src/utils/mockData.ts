import type { User, Activity, GPSPoint } from "../types";

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
    { id: "u1", name: "Rian Utama", avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80" },
    { id: "u2", name: "Siti Aminah", avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80" },
    { id: "u3", name: "Budi Santoso", avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80" },
    { id: "u4", name: "Ahmad Fauzi", avatarUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80" },
    { id: "u5", name: "Grace Siahaan", avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80" }
  ];

  const activities: Activity[] = [];

  // Start with empty activities so every month begins clean
  return { users, activities };
}

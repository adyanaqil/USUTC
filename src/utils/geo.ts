import type { GPSPoint } from "../types";

// Polygon coordinates of Universitas Sumatera Utara (USU) Padang Bulan campus
// Retrieved from OpenStreetMap Nominatim: Way ID 428002227
// Format: [latitude, longitude]
export const USU_BOUNDARY: [number, number][] = [
  [3.5559856, 98.6522303],
  [3.5559382, 98.6611647],
  [3.5559417, 98.6611708],
  [3.5559469, 98.6611733],
  [3.5590462, 98.6609513],
  [3.5593869, 98.6609294],
  [3.5593962, 98.6611305],
  [3.5603453, 98.6611252],
  [3.5622982, 98.6610165],
  [3.565718, 98.660804],
  [3.5666115, 98.6607342],
  [3.5666189, 98.6606504],
  [3.5669461, 98.6605666],
  [3.5668999, 98.6602742],
  [3.5672406, 98.6602682],
  [3.5672417, 98.6601639],
  [3.567333, 98.6600798],
  [3.5673048, 98.659912],
  [3.5673396, 98.6584781],
  [3.5673417, 98.657673],
  [3.5673448, 98.6575469],
  [3.5673524, 98.6559203],
  [3.5673825, 98.6534877],
  [3.5673865, 98.6533005],
  [3.5672035, 98.6532934],
  [3.5672075, 98.653212],
  [3.5672111, 98.6531382],
  [3.5669789, 98.6531235],
  [3.5669936, 98.6528056],
  [3.5590569, 98.6524281],
  [3.5590566, 98.652404],
  [3.5577405, 98.6523637],
  [3.5564241, 98.6522732],
  [3.5559856, 98.6522303]
];

// Ray casting algorithm (point-in-polygon)
export function isPointInPolygon(point: { lat: number; lon: number }, polygon: [number, number][]): boolean {
  const x = point.lat;
  const y = point.lon;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    
    const intersect = ((yi > y) !== (yj > y))
        && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Haversine distance formula in kilometers
export function getHaversineDistance(p1: { lat: number; lon: number }, p2: { lat: number; lon: number }): number {
  const R = 6371; // Earth's radius in km
  const dLat = (p2.lat - p1.lat) * Math.PI / 180;
  const dLon = (p2.lon - p1.lon) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Parse GPX file content to extract points, distance, duration, pace and geofence stats
export function parseGPX(gpxContent: string): {
  points: GPSPoint[];
  distanceKm: number;
  durationMin: number;
  avgPaceMinPerKm: number;
  pointsInBoundaryPct: number;
  isValidLocation: boolean;
  usuDistanceKm: number;
} {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(gpxContent, "text/xml");
  const trkpts = xmlDoc.getElementsByTagName("trkpt");
  const points: GPSPoint[] = [];

  for (let i = 0; i < trkpts.length; i++) {
    const trkpt = trkpts[i];
    const latAttr = trkpt.getAttribute("lat");
    const lonAttr = trkpt.getAttribute("lon");
    if (!latAttr || !lonAttr) continue;

    const lat = parseFloat(latAttr);
    const lon = parseFloat(lonAttr);

    const eleEl = trkpt.getElementsByTagName("ele")[0];
    const ele = eleEl && eleEl.textContent ? parseFloat(eleEl.textContent) : undefined;

    const timeEl = trkpt.getElementsByTagName("time")[0];
    const time = timeEl && timeEl.textContent ? timeEl.textContent : undefined;

    points.push({ lat, lon, ele, time });
  }

  let totalDistance = 0;
  let usuDistance = 0;
  let pointsInside = 0;

  for (let i = 0; i < points.length; i++) {
    const pt = points[i];
    const isInside = isPointInPolygon(pt, USU_BOUNDARY);
    if (isInside) {
      pointsInside++;
    }

    if (i > 0) {
      const prevPt = points[i - 1];
      const dist = getHaversineDistance(prevPt, pt);
      totalDistance += dist;

      // Segment counts towards USU distance if both points are inside
      if (isInside && isPointInPolygon(prevPt, USU_BOUNDARY)) {
        usuDistance += dist;
      }
    }
  }

  const pointsInBoundaryPct = points.length > 0 ? (pointsInside / points.length) * 100 : 0;
  const isValidLocation = pointsInBoundaryPct >= 50.0; // 50% threshold for run validation

  // Duration calculations
  let durationMin = 0;
  if (points.length > 1) {
    const startTimeStr = points[0].time;
    const endTimeStr = points[points.length - 1].time;
    if (startTimeStr && endTimeStr) {
      try {
        const startTime = new Date(startTimeStr).getTime();
        const endTime = new Date(endTimeStr).getTime();
        if (!isNaN(startTime) && !isNaN(endTime)) {
          durationMin = (endTime - startTime) / (1000 * 60);
        }
      } catch (e) {
        console.error("Error parsing times in GPX", e);
      }
    }
  }

  // Fallback if timestamps are missing or invalid
  if (durationMin <= 0 && totalDistance > 0) {
    durationMin = totalDistance * 6.0; // Default running pace of 6 min/km
  }

  const avgPaceMinPerKm = totalDistance > 0 ? durationMin / totalDistance : 0;

  return {
    points,
    distanceKm: parseFloat(totalDistance.toFixed(2)),
    durationMin: parseFloat(durationMin.toFixed(1)),
    avgPaceMinPerKm: parseFloat(avgPaceMinPerKm.toFixed(2)),
    pointsInBoundaryPct: parseFloat(pointsInBoundaryPct.toFixed(1)),
    isValidLocation,
    usuDistanceKm: parseFloat((isValidLocation ? usuDistance : 0).toFixed(2))
  };
}

// Format decimal pace (e.g. 5.5) to "MM:SS" format
export function formatPace(paceMinPerKm: number): string {
  if (!paceMinPerKm || isNaN(paceMinPerKm) || !isFinite(paceMinPerKm)) return "00:00";
  const mins = Math.floor(paceMinPerKm);
  const secs = Math.round((paceMinPerKm - mins) * 60);
  const displayMins = secs === 60 ? mins + 1 : mins;
  const displaySecs = secs === 60 ? 0 : secs;
  return `${displayMins}:${displaySecs.toString().padStart(2, "0")}`;
}

// Format duration in minutes to Indonesian readable format (e.g. "45m" or "1j 15m")
export function formatDuration(durationMin: number): string {
  if (durationMin < 60) {
    return `${Math.round(durationMin)}m`;
  }
  const hrs = Math.floor(durationMin / 60);
  const mins = Math.round(durationMin % 60);
  return `${hrs}j ${mins}m`;
}

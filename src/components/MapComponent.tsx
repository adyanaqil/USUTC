import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { GPSPoint } from "../types";
import { isPointInPolygon } from "../utils/geo";

interface MapComponentProps {
  points?: GPSPoint[];
  boundary: [number, number][];
  height?: string;
  className?: string;
}

export default function MapComponent({
  points = [],
  boundary,
  height = "350px",
  className = ""
}: MapComponentProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const boundaryLayerRef = useRef<L.Polygon | null>(null);
  const pathLayersRef = useRef<L.Polyline[]>([]);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize map if it doesn't exist
    if (!mapRef.current) {
      // Center around USU campus
      mapRef.current = L.map(mapContainerRef.current, {
        center: [3.5613, 98.6568],
        zoom: 15,
        zoomControl: true,
        scrollWheelZoom: true
      });

      // Add clean, light tile layer (CartoDB Positron fits our light aesthetic perfectly!)
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 20
      }).addTo(mapRef.current);
    }

    const map = mapRef.current;

    // Clear previous dynamic layers/markers
    pathLayersRef.current.forEach(layer => map.removeLayer(layer));
    pathLayersRef.current = [];
    
    markersRef.current.forEach(marker => map.removeLayer(marker));
    markersRef.current = [];

    // Draw/update USU Boundary
    if (boundaryLayerRef.current) {
      map.removeLayer(boundaryLayerRef.current);
    }

    boundaryLayerRef.current = L.polygon(boundary, {
      color: "#00f2fe", // Glowing cyan boundary
      fillColor: "#00f2fe",
      fillOpacity: 0.1,
      weight: 2,
      dashArray: "5, 5"
    }).addTo(map);
    boundaryLayerRef.current.bindPopup("Area Kampus USU (Geofence)");

    // Draw run path if we have points
    if (points && points.length > 0) {
      const latlngs = points.map(p => [p.lat, p.lon] as [number, number]);

      // Break path into segments to color code: Green inside, Red/Orange outside
      let currentSegment: [number, number][] = [];
      let currentInside: boolean | null = null;

      for (let i = 0; i < points.length; i++) {
        const pt = points[i];
        const isInside = isPointInPolygon(pt, boundary);

        if (currentInside === null) {
          currentInside = isInside;
          currentSegment.push([pt.lat, pt.lon]);
        } else if (isInside === currentInside) {
          currentSegment.push([pt.lat, pt.lon]);
        } else {
          // Inside state changed: finish old segment, start new one
          currentSegment.push([pt.lat, pt.lon]); // overlap point so line is connected
          
          const polyline = L.polyline(currentSegment, {
            color: currentInside ? "#10b981" : "#ef4444", // Emerald green for inside, Crimson red for outside
            weight: 4,
            opacity: 0.85
          }).addTo(map);
          pathLayersRef.current.push(polyline);

          // Start new segment
          currentSegment = [[pt.lat, pt.lon]];
          currentInside = isInside;
        }
      }

      // Draw final segment
      if (currentSegment.length > 1) {
        const polyline = L.polyline(currentSegment, {
          color: currentInside ? "#10b981" : "#ef4444",
          weight: 4,
          opacity: 0.85
        }).addTo(map);
        pathLayersRef.current.push(polyline);
      }

      // Add Start and End markers using custom modern HTML divIcon
      const startPt = points[0];
      const endPt = points[points.length - 1];

      const startIcon = L.divIcon({
        html: `<div style="
          width: 12px;
          height: 12px;
          background-color: #10b981;
          border: 2px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 0 10px #10b981;
        "></div>`,
        className: "custom-marker-start",
        iconSize: [12, 12],
        iconAnchor: [6, 6]
      });

      const endIcon = L.divIcon({
        html: `<div style="
          width: 14px;
          height: 14px;
          background-color: #ef4444;
          border: 2px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 0 10px #ef4444;
        "></div>`,
        className: "custom-marker-end",
        iconSize: [14, 14],
        iconAnchor: [7, 7]
      });

      const startMarker = L.marker([startPt.lat, startPt.lon], { icon: startIcon })
        .addTo(map)
        .bindPopup("Titik Mulai");
      
      const endMarker = L.marker([endPt.lat, endPt.lon], { icon: endIcon })
        .addTo(map)
        .bindPopup("Titik Selesai");

      markersRef.current.push(startMarker, endMarker);

      // Fit map bounds to show the entire run path
      const bounds = L.latLngBounds(latlngs);
      map.fitBounds(bounds, { padding: [30, 30] });
    } else {
      // Fit map to show the entire USU boundary
      const bounds = L.polygon(boundary).getBounds();
      map.fitBounds(bounds, { padding: [10, 10] });
    }

  }, [points, boundary]);

  // Clean up Leaflet map instance on unmount
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <div className={`map-wrapper ${className}`} style={{ position: "relative" }}>
      <div 
        ref={mapContainerRef} 
        style={{ 
          height, 
          width: "100%", 
          borderRadius: "16px",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow: "inset 0 0 20px rgba(0, 0, 0, 0.6)"
        }} 
      />
      <div className="map-legend">
        <div className="legend-item">
          <span className="legend-dot" style={{ backgroundColor: "#00f2fe", borderStyle: "dashed" }}></span>
          <span>Batas USU</span>
        </div>
        {points && points.length > 0 && (
          <>
            <div className="legend-item">
              <span className="legend-line" style={{ backgroundColor: "#10b981" }}></span>
              <span>Valid (Dalam USU)</span>
            </div>
            <div className="legend-item">
              <span className="legend-line" style={{ backgroundColor: "#ef4444" }}></span>
              <span>Invalid (Luar USU)</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

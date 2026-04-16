'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Job, Customer, Pet } from '@/lib/db/schema';
import { JobState } from '@/lib/db/schema';
import { format } from 'date-fns';
import { geocodeAddress } from '@/lib/geocoder';

// Fix Leaflet's default icon path issues with Next.js/Webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png'
});

interface RouteMapProps {
    jobs: Job[];
    customers: Record<string, Customer>;
    pets: Record<string, Pet>;
}

interface GeoJob {
    job: Job;
    customerName: string;
    petNames: string;
    coords: [number, number];
}

// Component to dynamically fit bounds of all markers
function MapBounds({ geoJobs, currentLocation }: { geoJobs: GeoJob[], currentLocation: [number, number] | null }) {
    const map = useMap();
    useEffect(() => {
        if (geoJobs.length === 0 && !currentLocation) return;
        
        const allCoords = geoJobs.map(j => j.coords);
        if (currentLocation) {
            allCoords.push(currentLocation);
        }
        
        const bounds = L.latLngBounds(allCoords);
        // Delay slightly to prevent colliding with initial map load animations
        setTimeout(() => {
            if (map && map.flyToBounds) {
                map.flyToBounds(bounds, { padding: [60, 60], maxZoom: 14, duration: 1.5 });
            }
        }, 100);
    }, [geoJobs, currentLocation, map]);
    return null;
}

export default function RouteMap({ jobs, customers, pets }: RouteMapProps) {
    const [geoJobs, setGeoJobs] = useState<GeoJob[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null);

    useEffect(() => {
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                pos => setCurrentLocation([pos.coords.latitude, pos.coords.longitude]),
                err => console.warn('Location access denied or failed:', err),
                { enableHighAccuracy: true }
            );
        }
    }, []);

    useEffect(() => {
        let mounted = true;
        
        async function loadCoords() {
            setLoading(true);
            const resolved: GeoJob[] = [];
            
            // Only map jobs with actual addresses
            for (const job of jobs) {
                if (!job.address) continue;
                
                const cname = customers[job.customerId]?.name || 'Unknown';
                // Add an artificial delay to respect Nominatim free terms (max 1 req/sec) 
                // We actually only want to delay if it wasn't cached, but geocodeAddress is fast if cached.
                const start = Date.now();
                const coords = await geocodeAddress(job.address);
                const elapsed = Date.now() - start;
                
                // if it took > 100ms, assume it was a real network request, so throttle next loop
                if (elapsed > 100) {
                    await new Promise(r => setTimeout(r, 1100));
                }

                if (coords) {
                    const petNames = job.petIds.map(pid => pets[pid]?.name || 'Unknown Pet').join(', ');
                    resolved.push({ job, customerName: cname, petNames, coords });
                }
            }

            if (mounted) {
                setGeoJobs(resolved);
                setLoading(false);
            }
        }
        
        loadCoords();
        
        return () => { mounted = false; };
    }, [jobs, customers]);

    if (loading) {
        return <div className="card" style={{ height: 350, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', background: 'var(--bg-card)' }}>Loading Map...</div>;
    }

    if (geoJobs.length === 0) {
        return <div className="card" style={{ height: 350, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-lg)' }}>No mappable locations today.</div>;
    }

    return (
        <div style={{ height: 350, width: '100%', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border-color)', isolation: 'isolate', zIndex: 1, position: 'relative', marginTop: 'var(--space-4)' }}>
            <MapContainer center={geoJobs[0]?.coords || currentLocation || [39.828, -98.579]} zoom={12} style={{ height: '100%', width: '100%' }}>
                <MapBounds geoJobs={geoJobs} currentLocation={currentLocation} />
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap contributors'
                />
                
                {currentLocation && (
                    <Marker 
                        position={currentLocation} 
                        icon={L.divIcon({
                            html: `<div style="display:flex; justify-content:center; align-items:center;">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ef4444" stroke="#7f1d1d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 32px; height: 32px; filter: drop-shadow(0px 3px 6px rgba(0,0,0,0.4));">
                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                </svg>
                            </div>`,
                            className: 'current-location-star',
                            iconSize: [32,32],
                            iconAnchor: [16,16]
                        })}
                    >
                        <Popup>
                            <div style={{ fontWeight: 600 }}>Your Location</div>
                        </Popup>
                    </Marker>
                )}

                {geoJobs.map(({ job, customerName, petNames, coords }, index) => {
                    const numberIcon = L.divIcon({
                        html: `<div style="background:var(--brand-primary); color:white; border-radius:50%; width:28px; height:28px; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:14px; border:2px solid white; box-shadow:0 2px 4px rgba(0,0,0,0.3);">${index + 1}</div>`,
                        className: 'numbered-pin',
                        iconSize: [28, 28],
                        iconAnchor: [14, 14]
                    });
                    
                    return (
                        <Marker key={job.id} position={coords} icon={numberIcon} opacity={job.state === JobState.Cancelled || job.state === JobState.NoShow ? 0.4 : 1.0}>
                            <Popup>
                                <div style={{ fontWeight: 600 }}>{index + 1}. {customerName}</div>
                                <div style={{ fontSize: '13px', marginTop: 4, color: 'var(--brand-primary)', fontWeight: 600 }}>
                                    {format(new Date(`2000-01-01T${job.scheduledTime}`), 'h:mm a')}
                                </div>
                                <div style={{ fontSize: '12px', marginTop: 2, color: 'var(--text-secondary)' }}>
                                    🐶 {petNames}
                                </div>
                                <div style={{ fontSize: '11px', color: 'gray', marginTop: 2 }}>{job.address}</div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>
        </div>
    );
}

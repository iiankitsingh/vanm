import time
import math
from datetime import datetime, timezone
from typing import Dict, List, Tuple, Optional
from aeroparse.models.canonical import Notam

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Computes the great-circle distance between two points in Nautical Miles.
    """
    R_NM = 3440.065 # Earth radius in NM
    
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    
    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2))
         
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R_NM * c

class NotamSpatialCache:
    """
    In-memory LRU & TTL cache for NOTAMs with spatial indexing capabilities.
    """
    def __init__(self):
        # Maps notam_id -> (notam_object, expiry_timestamp_float)
        self._cache: Dict[str, Tuple[Notam, float]] = {}
        
    def add(self, notam: Notam) -> None:
        """
        Adds a NOTAM to the cache. Expiry is computed from the NOTAM's valid_to field.
        """
        now = time.time()
        expiry = now + 3600.0 # Default TTL: 1 hour
        
        if notam.valid_to:
            if notam.valid_to in ["PERM", "UFN"]:
                expiry = now + 315360000.0 # 10 years for permanent
            else:
                try:
                    # Parse ISO format (e.g. 2026-05-21T22:00:00Z)
                    dt_str = notam.valid_to.replace("Z", "+00:00")
                    dt = datetime.fromisoformat(dt_str)
                    expiry = dt.timestamp()
                except ValueError:
                    pass
                    
        self._cache[notam.id] = (notam, expiry)
        
    def get(self, notam_id: str) -> Optional[Notam]:
        """
        Retrieves a NOTAM from the cache if it hasn't expired.
        """
        entry = self._cache.get(notam_id)
        if not entry:
            return None
            
        notam, expiry = entry
        if time.time() > expiry:
            # Lazy deletion
            del self._cache[notam_id]
            return None
            
        return notam

    def clear_expired(self) -> None:
        """
        Clears all expired entries.
        """
        now = time.time()
        expired_keys = [k for k, (_, exp) in self._cache.items() if now > exp]
        for k in expired_keys:
            del self._cache[k]

    def query_spatial(self, lat: float, lon: float, radius_nm: float) -> List[Notam]:
        """
        Queries all active cached NOTAMs within a specified coordinate and radius.
        """
        self.clear_expired()
        results = []
        
        for notam, _ in self._cache.values():
            if not notam.geometry:
                continue
                
            geom = notam.geometry
            if geom.type == "Point":
                pt_lon, pt_lat = geom.coordinates
                dist = haversine_distance(lat, lon, pt_lat, pt_lon)
                if dist <= radius_nm:
                    results.append(notam)
            elif geom.type == "Polygon":
                # Find centroid of polygon to estimate distance
                coords = geom.coordinates[0]
                if not coords:
                    continue
                # Simple average centroid
                lons = [c[0] for c in coords[:-1]]
                lats = [c[1] for c in coords[:-1]]
                centroid_lat = sum(lats) / len(lats)
                centroid_lon = sum(lons) / len(lons)
                
                # Approximate radius of the polygon circle (distance from centroid to first vertex)
                poly_radius = haversine_distance(centroid_lat, centroid_lon, coords[0][1], coords[0][0])
                
                dist = haversine_distance(lat, lon, centroid_lat, centroid_lon)
                # Overlap check
                if dist <= (radius_nm + poly_radius):
                    results.append(notam)
                    
        return results

    def get_all(self) -> List[Notam]:
        """
        Returns all non-expired cached NOTAMs.
        """
        self.clear_expired()
        return [notam for notam, _ in self._cache.values()]

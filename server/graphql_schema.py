import strawberry
import json
import asyncio
from typing import List, Optional, AsyncGenerator
from aeroparse import parse_notam, get_aircraft_limitations, NotamSpatialCache, Notam

# Initialize global spatial cache for the server
spatial_cache = NotamSpatialCache()

# Seed cache with standard "museum of horrors" samples for demonstration
SEED_NOTAMS = [
    (
        "A0123/26 NOTAMR A0110/26\n"
        "Q) KZNY/QMRLC/IV/NBO/A/000/999/4063N07377W005\n"
        "A) KJFK B) 2605212200 C) 2605220600\n"
        "E) RWY 04L/22R CLSD FOR MAINT."
    ),
    (
        "A0124/26 NOTAMN\n"
        "Q) KZNY/QMXLC/IV/M/A/000/999/4064N07378W002\n"
        "A) KJFK B) 2605211800 C) 2605212359\n"
        "E) TWY ALPHA CLSD FOR WIP."
    ),
    (
        "!FDC 3/9412 ZNY NY.. TEMPORARY FLIGHT RESTRICTIONS "
        "EFFECTIVE 2605212200 UTC UNTIL 2605220600 UTC. "
        "CIRCLE RADIUS 5NM OF 4075N07399W. PURSUANT TO 14 CFR SECTION 91.141."
    )
]

for item in SEED_NOTAMS:
    spatial_cache.add(parse_notam(item))

# Real-time WebSocket subscriptions queue list
_subscribers: List[asyncio.Queue] = []

@strawberry.type
class GraphQLGeoJSONGeometry:
    type: str
    coordinates_json: str # Serialized GeoJSON coordinates array

@strawberry.type
class GraphQLNotam:
    id: str
    q_code: Optional[str]
    raw_text: str
    location: Optional[str]
    valid_from: Optional[str]
    valid_to: Optional[str]
    plain_text: str
    affected_aerodromes: List[str]
    geometry: Optional[GraphQLGeoJSONGeometry]
    priority: str

@strawberry.type
class GraphQLAircraftLimitation:
    aircraft_model: str
    engine_type: Optional[str]
    weight_variant: Optional[str]
    max_altitude_ft: Optional[float]
    runway_takeoff_length_m: Optional[float]
    runway_landing_length_m: Optional[float]
    climb_limit_rate_fpm: Optional[float]
    temp_restriction_c: Optional[float]

def map_to_graphql_notam(n: Notam) -> GraphQLNotam:
    geom = None
    if n.geometry:
        geom = GraphQLGeoJSONGeometry(
            type=n.geometry.type,
            coordinates_json=json.dumps(n.geometry.coordinates)
        )
    return GraphQLNotam(
        id=n.id,
        q_code=n.q_code,
        raw_text=n.raw_text,
        location=n.location,
        valid_from=n.valid_from,
        valid_to=n.valid_to,
        plain_text=n.plain_text,
        affected_aerodromes=n.affected_aerodromes,
        geometry=geom,
        priority=n.priority
    )

@strawberry.type
class Query:
    @strawberry.field
    def notams(self, lat: float, lon: float, radius_nm: float) -> List[GraphQLNotam]:
        """
        Query cached NOTAMs that overlap a spatial circle centered at (lat, lon) with radius_nm.
        """
        matches = spatial_cache.query_spatial(lat, lon, radius_nm)
        return [map_to_graphql_notam(m) for m in matches]
        
    @strawberry.field
    def all_notams(self) -> List[GraphQLNotam]:
        """
        Get all active parsed NOTAMs stored in the cache.
        """
        all_items = spatial_cache.get_all()
        return [map_to_graphql_notam(m) for m in all_items]
        
    @strawberry.field
    def aircraft_limitations(self, model: str) -> Optional[GraphQLAircraftLimitation]:
        """
        Lookup aircraft specifications and structural/runway limitations.
        """
        lim = get_aircraft_limitations(model)
        if not lim:
            return None
        return GraphQLAircraftLimitation(
            aircraft_model=lim.aircraft_model,
            engine_type=lim.engine_type,
            weight_variant=lim.weight_variant,
            max_altitude_ft=lim.max_altitude_ft,
            runway_takeoff_length_m=lim.runway_takeoff_length_m,
            runway_landing_length_m=lim.runway_landing_length_m,
            climb_limit_rate_fpm=lim.climb_limit_rate_fpm,
            temp_restriction_c=lim.temp_restriction_c
        )

@strawberry.type
class Mutation:
    @strawberry.mutation
    def parse_raw_notam(self, raw_text: str) -> GraphQLNotam:
        """
        Parses a raw NOTAM string in real-time, adds it to the spatial database, and broadcasts it.
        """
        parsed = parse_notam(raw_text)
        spatial_cache.add(parsed)
        
        gql_notam = map_to_graphql_notam(parsed)
        
        # Broadcast to all websocket subscribers
        for queue in _subscribers:
            queue.put_nowait(gql_notam)
            
        return gql_notam

@strawberry.type
class Subscription:
    @strawberry.subscription
    async def notam_added(self) -> AsyncGenerator[GraphQLNotam, None]:
        """
        Subscribes to live broadcasts of newly parsed and ingested NOTAMs.
        """
        queue = asyncio.Queue()
        _subscribers.append(queue)
        try:
            while True:
                item = await queue.get()
                yield item
        finally:
            _subscribers.remove(queue)

schema = strawberry.Schema(query=Query, mutation=Mutation, subscription=Subscription)

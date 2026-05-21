from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from datetime import datetime

class GeoJSONGeometry(BaseModel):
    type: str = Field(..., description="Point, LineString, Polygon, or GeometryCollection")
    coordinates: Any = Field(..., description="Coordinates list depending on geometry type")

class GeoJSONFeature(BaseModel):
    type: str = "Feature"
    geometry: GeoJSONGeometry
    properties: Dict[str, Any] = Field(default_factory=dict)

class GeoJSONFeatureCollection(BaseModel):
    type: str = "FeatureCollection"
    features: List[GeoJSONFeature]

class Notam(BaseModel):
    id: str = Field(..., description="Unique NOTAM identifier, e.g., !DCA-05/123")
    q_code: Optional[str] = Field(None, description="ICAO Q-code, e.g., QMRLC")
    raw_text: str = Field(..., description="Original uppercase NOTAM text")
    location: Optional[str] = Field(None, description="Aerodrome or FIR code")
    valid_from: Optional[str] = Field(None, description="Start date-time in ISO format")
    valid_to: Optional[str] = Field(None, description="End date-time in ISO format")
    plain_text: str = Field(..., description="Translated human-readable English text")
    affected_aerodromes: List[str] = Field(default_factory=list, description="List of affected airport ICAO/IATA codes")
    geometry: Optional[GeoJSONGeometry] = Field(None, description="Spatial representation of the NOTAM")
    priority: str = Field("MEDIUM", description="Urgency: LOW, MEDIUM, HIGH, EMERGENCY")

class AirspaceRestriction(BaseModel):
    id: str = Field(..., description="Unique restriction identifier")
    type: str = Field(..., description="Type: TFR, SUA, Danger Area, Restricted Area, Prohibited Area")
    geometry: GeoJSONGeometry = Field(..., description="Spatial boundary of the restriction")
    valid_from: str = Field(..., description="ISO datetime for activation")
    valid_to: str = Field(..., description="ISO datetime for expiration")
    recurrence_rule: Optional[str] = Field(None, description="RFC 5545 RRULE for time scheduling (e.g. MON-FRI 1400-2200)")
    lower_limit_ft: Optional[float] = Field(None, description="Lower altitude limit in feet")
    upper_limit_ft: Optional[float] = Field(None, description="Upper altitude limit in feet")
    affected_units: List[str] = Field(default_factory=list, description="ATC units affected by the restriction")

class AircraftLimitation(BaseModel):
    aircraft_model: str = Field(..., description="E.g., B738, C172")
    engine_type: Optional[str] = Field(None, description="Engine model or class")
    weight_variant: Optional[str] = Field(None, description="MTOW variant or series")
    max_altitude_ft: Optional[float] = Field(None, description="Maximum certified altitude")
    runway_takeoff_length_m: Optional[float] = Field(None, description="Minimum runway takeoff length at MTOW, ISA, Sea Level")
    runway_landing_length_m: Optional[float] = Field(None, description="Minimum runway landing length")
    climb_limit_rate_fpm: Optional[float] = Field(None, description="Minimum climb rate or limit")
    temp_restriction_c: Optional[float] = Field(None, description="Temperature limits")

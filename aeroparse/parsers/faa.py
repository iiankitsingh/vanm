import re
from datetime import datetime
from typing import Optional, List, Dict, Any
from aeroparse.models.canonical import Notam, GeoJSONGeometry
from aeroparse.parsers.base import BaseParser, register_parser
from aeroparse.parsers.abbreviations import translate_notam_text
from aeroparse.utils.geo import parse_coordinate_string, create_circle_polygon, extract_spatial_info_from_text

class FaaNotamParser(BaseParser):
    """
    Parser for FAA Domestic and FDC NOTAMs (e.g. !DCA 05/123).
    """
    
    def can_parse(self, raw_text: str) -> bool:
        # Matches !DCA 05/123 or similar FAA identifier pattern
        cleaned = raw_text.strip()
        return cleaned.startswith('!') or re.search(r'^![A-Z0-9]{3}\s+\d+/\d+', cleaned) is not None

    def parse(self, raw_text: str) -> Notam:
        normalized = raw_text.replace('\r\n', '\n').strip()
        
        # Extract FAA ID (e.g., !DCA 05/123)
        id_match = re.search(r'^(![A-Z0-9]{3})\s+(\d+/\d+)', normalized)
        if id_match:
            facility = id_match.group(1)
            number = id_match.group(2)
            notam_id = f"{facility}-{number}"
            location_guess = facility.lstrip('!')
        else:
            notam_id = "FAA-UNKNOWN"
            location_guess = None
            
        # Clean header (remove "!DCA 05/123" part to isolate content)
        content_text = normalized
        if id_match:
            content_text = normalized[id_match.end():].strip()
            
        # Parse location / facility code from content (e.g. "DCA AD AP CLSD...")
        # Often the first word after the ID is the affected facility
        first_word_match = re.match(r'^([A-Z0-9]{3,4})\b', content_text)
        if first_word_match:
            location_guess = first_word_match.group(1)
            
        # Look for dates/times inside FAA NOTAM text
        # Format: EFFECTIVE YYMMDDHHMM UTC UNTIL YYMMDDHHMM UTC
        # Or: YYMMDDHHMM - YYMMDDHHMM
        valid_from = None
        valid_to = None
        
        # Pattern 1: EFFECTIVE YYMMDDHHMM [UTC] UNTIL YYMMDDHHMM [UTC]
        date_pattern_1 = r'EFFECTIVE\s+(\d{10})\s*(?:UTC)?\s*UNTIL\s+(\d{10})'
        match_1 = re.search(date_pattern_1, content_text, re.IGNORECASE)
        if match_1:
            valid_from = self._parse_faa_datetime(match_1.group(1))
            valid_to = self._parse_faa_datetime(match_1.group(2))
        else:
            # Pattern 2: FM YYMMDDHHMM TO YYMMDDHHMM
            date_pattern_2 = r'(?:FROM|FM)\s+(\d{10})\s*(?:UTC)?\s*(?:TO|UNTIL)\s+(\d{10})'
            match_2 = re.search(date_pattern_2, content_text, re.IGNORECASE)
            if match_2:
                valid_from = self._parse_faa_datetime(match_2.group(1))
                valid_to = self._parse_faa_datetime(match_2.group(2))
            else:
                # Pattern 3: Simple YYMMDDHHMM-YYMMDDHHMM range
                date_pattern_3 = r'\b(\d{10})\s*-\s*(\d{10})\b'
                match_3 = re.search(date_pattern_3, content_text)
                if match_3:
                    valid_from = self._parse_faa_datetime(match_3.group(1))
                    valid_to = self._parse_faa_datetime(match_3.group(2))
                    
        # In case expiration is UFN or PERM
        if not valid_to:
            if "UFN" in content_text.upper():
                valid_to = "UFN"
            elif "PERM" in content_text.upper():
                valid_to = "PERM"
                
        # Parse spatial coordinates & geometries (especially for FDC TFR circles)
        geometry = extract_spatial_info_from_text(content_text)
        
        # Translate abbreviations
        plain_text = translate_notam_text(content_text)
        
        # Map Priority
        priority = "MEDIUM"
        content_text_upper = content_text.upper()
        if "TFR" in content_text_upper or "TEMPORARY FLIGHT RESTRICTION" in plain_text.upper():
            priority = "HIGH"
        elif "CLSD" in content_text_upper or "CLOSED" in plain_text.upper():
            priority = "HIGH"
        elif "HAZARD" in content_text_upper or "DANGER" in content_text_upper:
            priority = "HIGH"
            
        geojson_geom = None
        if geometry:
            geojson_geom = GeoJSONGeometry(**geometry)
            
        return Notam(
            id=notam_id,
            q_code="FAA_DOM",
            raw_text=raw_text,
            location=location_guess,
            valid_from=valid_from,
            valid_to=valid_to,
            plain_text=plain_text,
            affected_aerodromes=[location_guess] if location_guess else [],
            geometry=geojson_geom,
            priority=priority
        )
        
    def _parse_faa_datetime(self, dt_str: str) -> Optional[str]:
        """
        Parses FAA datetime string YYMMDDHHMM to ISO format.
        """
        if len(dt_str) == 10 and dt_str.isdigit():
            try:
                year = 2000 + int(dt_str[0:2])
                month = int(dt_str[2:4])
                day = int(dt_str[4:6])
                hour = int(dt_str[6:8])
                minute = int(dt_str[8:10])
                dt = datetime(year, month, day, hour, minute)
                return dt.isoformat() + "Z"
            except ValueError:
                return None
        return None

# Register FAA Parser instance
register_parser(FaaNotamParser())

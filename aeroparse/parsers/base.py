from abc import ABC, abstractmethod
from aeroparse.models.canonical import Notam
from typing import List, Type

class BaseParser(ABC):
    """
    Abstract base class for all NOTAM and flight restriction parsers.
    """
    
    @abstractmethod
    def can_parse(self, raw_text: str) -> bool:
        """
        Returns True if this parser is capable of parsing the given raw NOTAM text.
        """
        pass
        
    @abstractmethod
    def parse(self, raw_text: str) -> Notam:
        """
        Parses raw NOTAM text into a canonical Notam Pydantic model.
        """
        pass

# Global registry of available parsers
_registry: List[BaseParser] = []

def register_parser(parser_instance: BaseParser) -> BaseParser:
    """
    Decorator or helper to register a parser instance.
    """
    if parser_instance not in _registry:
        _registry.append(parser_instance)
    return parser_instance

def get_registered_parsers() -> List[BaseParser]:
    """
    Retrieves all registered parser instances.
    """
    return _registry

def parse_notam(raw_text: str) -> Notam:
    """
    Dynamically selects the appropriate parser and parses the raw text.
    Fallback parser is used if no specialized parser matches.
    """
    for parser in _registry:
        if parser.can_parse(raw_text):
            try:
                return parser.parse(raw_text)
            except Exception as e:
                # Log or handle parsing exception; fall back to others
                continue
                
    # Fallback default parser if none matches or succeeds
    from aeroparse.parsers.icao import IcaoNotamParser
    fallback = IcaoNotamParser()
    return fallback.parse(raw_text)

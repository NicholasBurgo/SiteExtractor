"""
Data models for extraction candidates and results.
"""

from dataclasses import dataclass, field
from typing import Any, Optional


@dataclass
class Provenance:
    """Source information for an extracted value."""
    
    url: str
    path: str  # e.g., "jsonld.Organization.name", "meta[og:site_name]", "css_var(--primary)"
    
    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {"url": self.url, "path": self.path}


@dataclass
class Candidate:
    """A candidate value for a field with scoring information."""
    
    value: Any
    source_weight: float  # 0-1, based on where it was found
    method_weight: float  # 0-1, based on extraction method
    validator_bonus: float = 0.0  # Bonus for passing validation
    provenance: list[Provenance] = field(default_factory=list)
    notes: str = ""
    
    @property
    def score(self) -> float:
        """Calculate final score."""
        base = self.source_weight * self.method_weight
        final = min(1.0, base + self.validator_bonus)
        return final


@dataclass
class FieldResult:
    """Result for a single extracted field."""
    
    value: Any
    confidence: float
    provenance: list[dict]  # List of provenance dicts
    notes: str = ""
    
    def to_dict(self) -> dict:
        """Convert to dictionary for JSON output."""
        return {
            "value": self.value,
            "confidence": round(self.confidence, 2),
            "provenance": self.provenance,
            "notes": self.notes,
        }



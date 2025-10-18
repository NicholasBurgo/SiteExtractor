"""
Resolve candidates to final field values with confidence and provenance.
"""

import logging
from typing import Any, Optional

from truth_extractor.extraction.models import Candidate, FieldResult
from truth_extractor.resolve.scoring import deduplicate_candidates, score_candidates
from truth_extractor.resolve.validators import (
    AddressValidator,
    ColorValidator,
    EmailValidator,
    PhoneValidator,
)

logger = logging.getLogger(__name__)


class FieldResolver:
    """
    Resolve field candidates to final values.
    """
    
    def __init__(self, geocode_token: Optional[str] = None):
        """
        Initialize resolver.
        
        Args:
            geocode_token: Optional geocoding API token
        """
        self.geocode_token = geocode_token
    
    def resolve_brand_name(self, candidates: list[Candidate]) -> FieldResult:
        """Resolve brand name candidates."""
        if not candidates:
            return self._null_result()
        
        # Normalize: remove common legal suffixes
        for candidate in candidates:
            if isinstance(candidate.value, str):
                candidate.value = self._normalize_business_name(candidate.value)
        
        # Deduplicate and score
        candidates = deduplicate_candidates(candidates)
        candidates = score_candidates(candidates)
        
        # Pick winner
        winner = candidates[0]
        
        return FieldResult(
            value=winner.value,
            confidence=winner.score,
            provenance=[p.to_dict() for p in winner.provenance],
            notes=winner.notes,
        )
    
    def resolve_email(self, candidates: list[Candidate]) -> FieldResult:
        """Resolve email candidates with validation."""
        if not candidates:
            return self._null_result()
        
        # Validate each candidate
        for candidate in candidates:
            is_valid, bonus, notes = EmailValidator.validate(candidate.value)
            if is_valid:
                candidate.validator_bonus += bonus
                if notes:
                    candidate.notes = notes
            else:
                # Invalid - set score to 0
                candidate.source_weight = 0
        
        # Filter valid only
        candidates = [c for c in candidates if c.source_weight > 0]
        
        if not candidates:
            return self._null_result()
        
        candidates = deduplicate_candidates(candidates)
        candidates = score_candidates(candidates)
        
        winner = candidates[0]
        
        return FieldResult(
            value=winner.value,
            confidence=winner.score,
            provenance=[p.to_dict() for p in winner.provenance],
            notes=winner.notes,
        )
    
    def resolve_phone(self, candidates: list[Candidate]) -> FieldResult:
        """Resolve phone candidates with validation and E.164 formatting."""
        if not candidates:
            return self._null_result()
        
        # Validate and format each candidate
        for candidate in candidates:
            is_valid, e164, bonus, notes = PhoneValidator.validate(candidate.value)
            if is_valid and e164:
                candidate.value = e164  # Replace with E.164 format
                candidate.validator_bonus += bonus
                if notes:
                    candidate.notes = notes
            else:
                # Invalid
                candidate.source_weight = 0
        
        # Filter valid only
        candidates = [c for c in candidates if c.source_weight > 0]
        
        if not candidates:
            return self._null_result()
        
        candidates = deduplicate_candidates(candidates)
        candidates = score_candidates(candidates)
        
        winner = candidates[0]
        
        return FieldResult(
            value=winner.value,
            confidence=winner.score,
            provenance=[p.to_dict() for p in winner.provenance],
            notes=winner.notes,
        )
    
    def resolve_address(self, candidates: list[Candidate]) -> FieldResult:
        """Resolve address candidates with validation."""
        if not candidates:
            return self._null_result()
        
        # Validate each candidate
        for candidate in candidates:
            if isinstance(candidate.value, dict):
                is_valid, bonus, notes = AddressValidator.validate(
                    candidate.value,
                    self.geocode_token
                )
                if is_valid:
                    candidate.validator_bonus += bonus
                    if notes:
                        candidate.notes = notes
                else:
                    candidate.source_weight = 0
        
        # Filter valid only
        candidates = [c for c in candidates if c.source_weight > 0]
        
        if not candidates:
            return self._null_result()
        
        candidates = score_candidates(candidates)
        
        winner = candidates[0]
        
        return FieldResult(
            value=winner.value,
            confidence=winner.score,
            provenance=[p.to_dict() for p in winner.provenance],
            notes=winner.notes,
        )
    
    def resolve_socials(self, social_candidates: dict[str, list[Candidate]]) -> FieldResult:
        """
        Resolve social media links.
        
        Args:
            social_candidates: Dict mapping platform to candidates
            
        Returns:
            FieldResult with dict of platform -> URL
        """
        socials = {}
        all_provenance = []
        
        for platform, candidates in social_candidates.items():
            if candidates:
                candidates = deduplicate_candidates(candidates)
                candidates = score_candidates(candidates)
                winner = candidates[0]
                socials[platform] = winner.value
                all_provenance.extend([p.to_dict() for p in winner.provenance])
            else:
                socials[platform] = None
        
        # Calculate overall confidence (average of found platforms)
        found_count = sum(1 for v in socials.values() if v is not None)
        if found_count > 0:
            confidence = 0.85  # Base confidence for social links
        else:
            confidence = 0.0
        
        return FieldResult(
            value=socials if found_count > 0 else None,
            confidence=confidence,
            provenance=all_provenance[:5],  # Limit entries
            notes=f"found {found_count} platforms",
        )
    
    def resolve_services(self, candidates: list[Candidate]) -> FieldResult:
        """Resolve service list candidates."""
        if not candidates:
            return self._null_result()
        
        candidates = score_candidates(candidates)
        winner = candidates[0]
        
        return FieldResult(
            value=winner.value,
            confidence=winner.score,
            provenance=[p.to_dict() for p in winner.provenance],
            notes=winner.notes,
        )
    
    def resolve_colors(self, candidates: list[Candidate]) -> FieldResult:
        """Resolve brand color candidates with validation."""
        if not candidates:
            return self._null_result()
        
        # Validate each candidate
        for candidate in candidates:
            if isinstance(candidate.value, list):
                is_valid, bonus, notes = ColorValidator.validate(candidate.value)
                if is_valid:
                    candidate.validator_bonus += bonus
                    if notes:
                        candidate.notes = notes
                else:
                    candidate.source_weight = 0
        
        # Filter valid only
        candidates = [c for c in candidates if c.source_weight > 0]
        
        if not candidates:
            return self._null_result()
        
        candidates = score_candidates(candidates)
        winner = candidates[0]
        
        return FieldResult(
            value=winner.value,
            confidence=winner.score,
            provenance=[p.to_dict() for p in winner.provenance],
            notes=winner.notes,
        )
    
    def resolve_logo(self, candidates: list[Candidate]) -> FieldResult:
        """Resolve logo URL candidates."""
        if not candidates:
            return self._null_result()
        
        candidates = deduplicate_candidates(candidates)
        candidates = score_candidates(candidates)
        
        winner = candidates[0]
        
        return FieldResult(
            value=winner.value,
            confidence=winner.score,
            provenance=[p.to_dict() for p in winner.provenance],
            notes=winner.notes,
        )
    
    def resolve_text(self, candidates: list[Candidate]) -> FieldResult:
        """Resolve generic text candidates (background, slogan)."""
        if not candidates:
            return self._null_result()
        
        candidates = deduplicate_candidates(candidates)
        candidates = score_candidates(candidates)
        
        winner = candidates[0]
        
        return FieldResult(
            value=winner.value,
            confidence=winner.score,
            provenance=[p.to_dict() for p in winner.provenance],
            notes=winner.notes,
        )
    
    @staticmethod
    def _null_result() -> FieldResult:
        """Create a null result for missing fields."""
        return FieldResult(
            value=None,
            confidence=0.0,
            provenance=[],
            notes="not found",
        )
    
    @staticmethod
    def _normalize_business_name(name: str) -> str:
        """
        Normalize business name by removing common legal suffixes.
        
        Args:
            name: Raw business name
            
        Returns:
            Normalized name
        """
        # Common legal suffixes to remove
        suffixes = [
            r"\s+LLC$",
            r"\s+L\.L\.C\.$",
            r"\s+Inc\.$",
            r"\s+Incorporated$",
            r"\s+Corp\.$",
            r"\s+Corporation$",
            r"\s+Ltd\.$",
            r"\s+Limited$",
            r"\s+Co\.$",
            r"\s+Company$",
        ]
        
        import re
        normalized = name
        for suffix in suffixes:
            normalized = re.sub(suffix, "", normalized, flags=re.IGNORECASE)
        
        return normalized.strip()



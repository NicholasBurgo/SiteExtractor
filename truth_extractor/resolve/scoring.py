"""
Candidate scoring utilities.
"""

import logging
from typing import Any, Optional

from truth_extractor.extraction.models import Candidate

logger = logging.getLogger(__name__)


def score_candidates(candidates: list[Candidate]) -> list[Candidate]:
    """
    Score a list of candidates and sort by score.
    
    Args:
        candidates: List of candidates
        
    Returns:
        Sorted list (highest score first)
    """
    # Sort by score (already computed in Candidate.score property)
    sorted_candidates = sorted(candidates, key=lambda c: c.score, reverse=True)
    return sorted_candidates


def deduplicate_candidates(candidates: list[Candidate]) -> list[Candidate]:
    """
    Remove duplicate candidates (same value).
    
    Args:
        candidates: List of candidates
        
    Returns:
        Deduplicated list, keeping highest-scored duplicates
    """
    seen_values = {}
    
    for candidate in candidates:
        value_key = _normalize_value_for_comparison(candidate.value)
        
        if value_key not in seen_values:
            seen_values[value_key] = candidate
        else:
            # Keep the one with higher score
            if candidate.score > seen_values[value_key].score:
                seen_values[value_key] = candidate
    
    return list(seen_values.values())


def merge_candidates(candidates: list[Candidate]) -> Optional[Candidate]:
    """
    Merge multiple candidates for the same field.
    
    Combines provenance and averages scores.
    
    Args:
        candidates: List of candidates with same or similar values
        
    Returns:
        Merged candidate or None
    """
    if not candidates:
        return None
    
    if len(candidates) == 1:
        return candidates[0]
    
    # Use the highest-scored value
    best = max(candidates, key=lambda c: c.score)
    
    # Merge provenance from all candidates
    all_provenance = []
    for c in candidates:
        all_provenance.extend(c.provenance)
    
    # Combine notes
    all_notes = [c.notes for c in candidates if c.notes]
    combined_notes = "; ".join(set(all_notes))
    
    # Average bonuses (or take max)
    avg_bonus = sum(c.validator_bonus for c in candidates) / len(candidates)
    
    return Candidate(
        value=best.value,
        source_weight=best.source_weight,
        method_weight=best.method_weight,
        validator_bonus=avg_bonus,
        provenance=all_provenance[:3],  # Limit provenance entries
        notes=combined_notes,
    )


def _normalize_value_for_comparison(value: Any) -> str:
    """
    Normalize a value for deduplication comparison.
    
    Args:
        value: Value of any type
        
    Returns:
        Normalized string for comparison
    """
    if isinstance(value, str):
        # Normalize whitespace and case
        return " ".join(value.lower().split())
    
    elif isinstance(value, dict):
        # For dicts (like addresses), use sorted key-value pairs
        items = sorted(value.items())
        return str(items)
    
    elif isinstance(value, list):
        # For lists, sort and join
        return str(sorted(str(v) for v in value))
    
    else:
        return str(value)



"""
Tests for scoring module.
"""

import pytest

from truth_extractor.extraction.models import Candidate, Provenance
from truth_extractor.resolve.scoring import (
    deduplicate_candidates,
    merge_candidates,
    score_candidates,
)


class TestCandidateScoring:
    """Test candidate scoring."""
    
    def test_score_calculation(self):
        """Test score property calculation."""
        candidate = Candidate(
            value="Test",
            source_weight=0.9,
            method_weight=0.8,
            validator_bonus=0.1,
            provenance=[],
        )
        
        # Score = source * method + bonus = 0.9 * 0.8 + 0.1 = 0.82
        assert candidate.score == pytest.approx(0.82)
    
    def test_score_clamping(self):
        """Test that score is clamped to [0, 1]."""
        candidate = Candidate(
            value="Test",
            source_weight=0.9,
            method_weight=0.9,
            validator_bonus=0.5,  # Would exceed 1.0
            provenance=[],
        )
        
        # Score should be clamped to 1.0
        assert candidate.score <= 1.0
    
    def test_score_sorting(self):
        """Test sorting candidates by score."""
        candidates = [
            Candidate(value="A", source_weight=0.5, method_weight=0.5, provenance=[]),
            Candidate(value="B", source_weight=0.9, method_weight=0.9, provenance=[]),
            Candidate(value="C", source_weight=0.7, method_weight=0.8, provenance=[]),
        ]
        
        sorted_candidates = score_candidates(candidates)
        
        # Should be sorted in descending order
        assert sorted_candidates[0].value == "B"
        assert sorted_candidates[1].value == "C"
        assert sorted_candidates[2].value == "A"


class TestDeduplication:
    """Test candidate deduplication."""
    
    def test_exact_duplicates(self):
        """Test deduplication of exact duplicates."""
        candidates = [
            Candidate(value="test@example.com", source_weight=0.8, method_weight=0.9, provenance=[]),
            Candidate(value="test@example.com", source_weight=0.9, method_weight=0.9, provenance=[]),
        ]
        
        deduped = deduplicate_candidates(candidates)
        
        assert len(deduped) == 1
        # Should keep the higher-scored one
        assert deduped[0].source_weight == 0.9
    
    def test_case_insensitive_duplicates(self):
        """Test deduplication with case differences."""
        candidates = [
            Candidate(value="Test Value", source_weight=0.8, method_weight=0.9, provenance=[]),
            Candidate(value="test value", source_weight=0.9, method_weight=0.9, provenance=[]),
        ]
        
        deduped = deduplicate_candidates(candidates)
        
        assert len(deduped) == 1
    
    def test_no_duplicates(self):
        """Test when there are no duplicates."""
        candidates = [
            Candidate(value="A", source_weight=0.8, method_weight=0.9, provenance=[]),
            Candidate(value="B", source_weight=0.9, method_weight=0.9, provenance=[]),
        ]
        
        deduped = deduplicate_candidates(candidates)
        
        assert len(deduped) == 2


class TestMergeCandidates:
    """Test candidate merging."""
    
    def test_merge_provenance(self):
        """Test that provenance is merged."""
        candidates = [
            Candidate(
                value="Test",
                source_weight=0.9,
                method_weight=0.9,
                provenance=[Provenance(url="http://a.com", path="path1")],
            ),
            Candidate(
                value="Test",
                source_weight=0.8,
                method_weight=0.8,
                provenance=[Provenance(url="http://b.com", path="path2")],
            ),
        ]
        
        merged = merge_candidates(candidates)
        
        assert merged is not None
        assert len(merged.provenance) >= 2
    
    def test_merge_single_candidate(self):
        """Test merging with single candidate."""
        candidates = [
            Candidate(value="Test", source_weight=0.9, method_weight=0.9, provenance=[]),
        ]
        
        merged = merge_candidates(candidates)
        
        assert merged is not None
        assert merged.value == "Test"
    
    def test_merge_empty_list(self):
        """Test merging empty list."""
        merged = merge_candidates([])
        assert merged is None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])



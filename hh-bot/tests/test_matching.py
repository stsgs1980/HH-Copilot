"""Tests for matching engine."""

import pytest
from src.matching.engine import MatchingEngine
from src.hh.models import HHVacancy, HHResume


@pytest.mark.asyncio
async def test_skills_overlap_high(sample_vacancy, sample_resume):
    """Test high skills overlap produces good score."""
    engine = MatchingEngine()
    result = await engine.score(sample_vacancy, sample_resume)

    # Python, Django, PostgreSQL, Docker, Git are shared
    assert result.skills_score >= 60
    assert len(result.matched_skills) >= 4
    assert "python" in result.matched_skills


@pytest.mark.asyncio
async def test_skills_overlap_low():
    """Test low skills overlap produces low score."""
    vacancy = HHVacancy(
        id="1",
        title="Java Developer",
        skills=["Java", "Spring", "Kubernetes"],
    )
    resume = HHResume(
        id="1",
        skills=["Python", "Django", "PostgreSQL"],
    )

    engine = MatchingEngine()
    result = await engine.score(vacancy, resume)

    assert result.skills_score < 30
    assert len(result.matched_skills) == 0


@pytest.mark.asyncio
async def test_experience_match(sample_vacancy, sample_resume):
    """Test experience scoring."""
    engine = MatchingEngine()
    result = await engine.score(sample_vacancy, sample_resume)

    # Resume has ~3+ years, vacancy requires 3-6
    assert result.experience_score >= 60


@pytest.mark.asyncio
async def test_position_match(sample_vacancy, sample_resume):
    """Test position title matching."""
    engine = MatchingEngine()
    result = await engine.score(sample_vacancy, sample_resume)

    # Both have "Python Developer" in title
    assert result.position_score >= 50


@pytest.mark.asyncio
async def test_total_score_above_threshold(sample_vacancy, sample_resume):
    """Test that a good match exceeds the minimum threshold."""
    engine = MatchingEngine()
    result = await engine.score(sample_vacancy, sample_resume)

    assert result.total_score >= 50  # At least 50% for similar profiles


@pytest.mark.asyncio
async def test_batch_scoring(sample_vacancy, sample_resume):
    """Test batch scoring with filtering."""
    bad_vacancy = HHVacancy(
        id="2",
        title="Java Architect",
        skills=["Java", "Spring Boot", "Microservices"],
        experience="Более 6 лет",
    )

    engine = MatchingEngine()
    results = await engine.score_batch([sample_vacancy, bad_vacancy], sample_resume, min_score=40.0)

    # At least the good vacancy should pass
    assert len(results) >= 1
    # Results should be sorted by score descending
    if len(results) > 1:
        assert results[0][1].total_score >= results[1][1].total_score


@pytest.mark.asyncio
async def test_no_skills_neutral_score():
    """Test that missing skills produces neutral score."""
    vacancy = HHVacancy(id="1", title="Developer", skills=[])
    resume = HHResume(id="1", skills=["Python"])

    engine = MatchingEngine()
    result = await engine.score(vacancy, resume)

    assert result.skills_score == 50.0  # Neutral

"""Matching Engine — hybrid scoring for vacancy-resume relevance.

Scoring components:
- Embedding similarity (30%): Semantic similarity between vacancy description and resume
- Skills overlap (25%): Jaccard similarity of skill sets
- Experience match (20%): Required vs actual experience years
- Position title match (15%): TF-IDF similarity of position titles
- Education relevance (10%): Field-of-study overlap

Total score: 0-100. Vacancies with score >= threshold (default 70%) are recommended.
"""

import logging
import math
from dataclasses import dataclass

from src.config import get_settings
from src.hh.models import HHResume, HHVacancy

logger = logging.getLogger(__name__)


@dataclass
class MatchResult:
    """Result of matching a vacancy against a resume."""

    vacancy_id: str
    total_score: float
    embedding_score: float
    skills_score: float
    experience_score: float
    position_score: float
    education_score: float
    matched_skills: list[str]
    missing_skills: list[str]


class MatchingEngine:
    """Hybrid matching engine combining multiple scoring signals."""

    def __init__(self) -> None:
        self.settings = get_settings()
        self.weights = {
            "embedding": self.settings.embedding_weight,
            "skills": self.settings.skills_weight,
            "experience": self.settings.experience_weight,
            "position": self.settings.position_weight,
            "education": self.settings.education_weight,
        }

    def compute_score(
        self,
        resume_skills: list[str],
        resume_title: str,
        resume_experience: list[dict],
        vacancy_skills: list[str],
        vacancy_title: str,
        vacancy_description: str = "",
    ) -> float:
        """Synchronous quick scoring without embeddings.

        Used for fast batch scoring of search results where
        full async scoring would be too slow.
        """
        vac = HHVacancy(
            title=vacancy_title,
            skills=vacancy_skills,
            description=vacancy_description,
        )
        res = HHResume(
            title=resume_title,
            position=resume_title,
            skills=resume_skills,
            experience=resume_experience,
        )

        skills_score, _, _ = self._score_skills(vac, res)
        experience_score = self._score_experience(vac, res)
        position_score = self._score_position(vac, res)
        education_score = self._score_education(vac, res)

        # Simplified embedding score (token overlap instead of real embeddings)
        embedding_score = self._sync_embedding_score(vac, res)

        total = (
            embedding_score * self.weights["embedding"]
            + skills_score * self.weights["skills"]
            + experience_score * self.weights["experience"]
            + position_score * self.weights["position"]
            + education_score * self.weights["education"]
        )
        return round(total, 1)

    def _sync_embedding_score(self, vacancy: HHVacancy, resume: HHResume) -> float:
        """Simplified synchronous embedding score."""
        import math

        vac_text = f"{vacancy.title} {vacancy.description or ''} {' '.join(vacancy.skills)}".lower()
        res_text = (
            f"{resume.position or resume.title} {resume.about or ''} "
            f"{' '.join(resume.skills)} "
            f"{' '.join(e.get('description', '') for e in resume.experience)}"
        ).lower()

        vac_tokens = set(vac_text.split())
        res_tokens = set(res_text.split())

        if not vac_tokens or not res_tokens:
            return 50.0

        intersection = len(vac_tokens & res_tokens)
        denominator = math.sqrt(len(vac_tokens) * len(res_tokens))
        if denominator == 0:
            return 50.0

        similarity = intersection / denominator
        return min(100, similarity * 200)

    async def score(self, vacancy: HHVacancy, resume: HHResume) -> MatchResult:
        """Score a vacancy against a resume.

        Returns a MatchResult with individual and total scores.
        """
        # Calculate individual scores
        skills_score, matched, missing = self._score_skills(vacancy, resume)
        experience_score = self._score_experience(vacancy, resume)
        position_score = self._score_position(vacancy, resume)
        education_score = self._score_education(vacancy, resume)
        embedding_score = await self._score_embedding(vacancy, resume)

        # Weighted total
        total = (
            embedding_score * self.weights["embedding"]
            + skills_score * self.weights["skills"]
            + experience_score * self.weights["experience"]
            + position_score * self.weights["position"]
            + education_score * self.weights["education"]
        )

        return MatchResult(
            vacancy_id=vacancy.id,
            total_score=round(total, 1),
            embedding_score=round(embedding_score, 1),
            skills_score=round(skills_score, 1),
            experience_score=round(experience_score, 1),
            position_score=round(position_score, 1),
            education_score=round(education_score, 1),
            matched_skills=matched,
            missing_skills=missing,
        )

    async def score_batch(
        self, vacancies: list[HHVacancy], resume: HHResume, min_score: float = 70.0
    ) -> list[tuple[HHVacancy, MatchResult]]:
        """Score a batch of vacancies and filter by minimum score."""
        results = []
        for vacancy in vacancies:
            result = await self.score(vacancy, resume)
            if result.total_score >= min_score:
                vacancy.match_score = result.total_score
                results.append((vacancy, result))
        results.sort(key=lambda x: x[1].total_score, reverse=True)
        return results

    def _score_skills(
        self, vacancy: HHVacancy, resume: HHResume
    ) -> tuple[float, list[str], list[str]]:
        """Calculate skills overlap score using Jaccard similarity.

        Returns (score, matched_skills, missing_skills).
        """
        if not vacancy.skills:
            return 50.0, [], []  # Neutral score when no skills listed

        vac_skills = set(s.lower().strip() for s in vacancy.skills if s.strip())
        res_skills = set(s.lower().strip() for s in resume.skills if s.strip())

        matched = list(vac_skills & res_skills)
        missing = list(vac_skills - res_skills)

        if not vac_skills:
            return 50.0, [], []

        # Jaccard similarity with bonus for partial matches
        jaccard = len(matched) / len(vac_skills) if vac_skills else 0

        # Bonus for partial string matches
        partial_matches = 0
        for vs in vac_skills - res_skills:
            for rs in res_skills:
                if vs in rs or rs in vs:
                    partial_matches += 1
                    break

        partial_bonus = partial_matches / len(vac_skills) * 0.3 if vac_skills else 0
        score = min(100, (jaccard + partial_bonus) * 100)

        return score, matched, missing

    def _score_experience(self, vacancy: HHVacancy, resume: HHResume) -> float:
        """Calculate experience match score.

        Compares required experience with candidate's total experience.
        """
        if not vacancy.experience:
            return 80.0  # No requirement = high score

        # Parse experience requirements
        required_years = self._parse_experience_years(vacancy.experience)

        # Calculate candidate's total experience
        candidate_years = self._calculate_experience_years(resume)

        if required_years == 0:
            return 80.0

        if candidate_years >= required_years:
            # Exceeds requirement
            ratio = candidate_years / required_years
            bonus = min(20, (ratio - 1) * 10)  # Bonus up to 20
            return min(100, 80 + bonus)
        else:
            # Below requirement
            ratio = candidate_years / required_years
            return max(0, ratio * 80)

    def _score_position(self, vacancy: HHVacancy, resume: HHResume) -> float:
        """Calculate position/title match score using token overlap."""
        vac_tokens = set(vacancy.title.lower().split())
        res_tokens = set()
        if resume.position:
            res_tokens.update(resume.position.lower().split())

        # Also check experience positions
        for exp in resume.experience:
            pos = exp.get("position", "")
            if pos:
                res_tokens.update(pos.lower().split())

        if not vac_tokens:
            return 50.0
        if not res_tokens:
            return 0.0

        overlap = len(vac_tokens & res_tokens)
        return min(100, (overlap / len(vac_tokens)) * 100)

    def _score_education(self, vacancy: HHVacancy, resume: HHResume) -> float:
        """Calculate education relevance score.

        Simple heuristic based on education presence and field keywords.
        """
        if not resume.education:
            return 30.0  # No education info

        # Basic score for having education
        base_score = 60.0

        # Bonus for multiple degrees
        if len(resume.education) > 1:
            base_score += 10

        # Check if education field matches vacancy domain
        vac_text = f"{vacancy.title} {' '.join(vacancy.skills)}".lower()
        for edu in resume.education:
            edu_name = edu.get("name", "").lower()
            org = edu.get("organization", "").lower()
            # Simple keyword overlap
            edu_tokens = set(edu_name.split()) | set(org.split())
            if edu_tokens & set(vac_text.split()):
                base_score += 15
                break

        return min(100, base_score)

    async def _score_embedding(self, vacancy: HHVacancy, resume: HHResume) -> float:
        """Calculate semantic similarity using embeddings.

        For MVP, uses a simplified TF-IDF-like approach.
        Production version should use OpenAI embeddings + cosine similarity.
        """
        # Simple bag-of-words similarity as placeholder
        vac_text = f"{vacancy.title} {vacancy.description or ''} {' '.join(vacancy.skills)}".lower()
        res_text = (
            f"{resume.position or resume.title} {resume.about or ''} "
            f"{' '.join(resume.skills)} "
            f"{' '.join(e.get('description', '') for e in resume.experience)}"
        ).lower()

        vac_tokens = set(vac_text.split())
        res_tokens = set(res_text.split())

        if not vac_tokens or not res_tokens:
            return 50.0

        # Cosine similarity approximation using token overlap
        intersection = len(vac_tokens & res_tokens)
        denominator = math.sqrt(len(vac_tokens) * len(res_tokens))
        if denominator == 0:
            return 50.0

        similarity = intersection / denominator
        return min(100, similarity * 200)  # Scale to 0-100

    @staticmethod
    def _parse_experience_years(experience: str) -> float:
        """Parse HH.ru experience string to years.

        Examples: '1-3 года', '3-6 лет', 'Более 6 лет', 'Нет опыта'
        """
        import re

        experience = experience.lower()
        if "нет опыта" in experience or "без опыта" in experience:
            return 0.0
        if "более" in experience or "больше" in experience:
            nums = re.findall(r"\d+", experience)
            return float(nums[0]) if nums else 6.0

        nums = re.findall(r"\d+", experience)
        if len(nums) >= 2:
            return (float(nums[0]) + float(nums[1])) / 2
        if len(nums) == 1:
            return float(nums[0])
        return 0.0

    @staticmethod
    def _calculate_experience_years(resume: HHResume) -> float:
        """Calculate total years of experience from resume data."""
        import re
        from datetime import datetime

        total_months = 0
        for exp in resume.experience:
            start_str = exp.get("start_date", "")
            end_str = exp.get("end_date", "")

            if not start_str:
                continue

            try:
                start = datetime.strptime(start_str[:7], "%Y-%m")
                if end_str and end_str not in ("По настоящее время", "Сейчас"):
                    end = datetime.strptime(end_str[:7], "%Y-%m")
                else:
                    end = datetime.now()
                months = (end.year - start.year) * 12 + (end.month - start.month)
                total_months += max(0, months)
            except (ValueError, TypeError):
                continue

        return total_months / 12

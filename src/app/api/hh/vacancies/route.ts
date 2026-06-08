import { NextRequest, NextResponse } from "next/server";
import {
  searchVacancies,
  getResumeForMatching,
  calculateMatchScore,
  hhVacancyToAppVacancy,
} from "@/lib/hh-api";

// In-memory cache for vacancies (refreshed on search)
let cachedVacancies: any[] = [];
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function GET(request: NextRequest) {
  // Return cached vacancies if fresh
  if (cachedVacancies.length > 0 && Date.now() - cacheTime < CACHE_TTL) {
    return NextResponse.json({
      vacancies: cachedVacancies,
      resumeTitle: null,
    });
  }

  // Vacancy search is a PUBLIC HH.ru API — no auth required
  // Try to auto-search using resume data for personalized results
  try {
    const resume = await getResumeForMatching();

    if (!resume) {
      // No resume data — return empty, user needs to search manually
      return NextResponse.json({
        vacancies: cachedVacancies,
        resumeTitle: null,
      });
    }

    // Auto-search using resume data
    const searchResult = await searchVacancies({
      text: resume.title,
      experience: getExperienceFromMonths(resume.experienceMonths),
      area: resume.areaId ? parseInt(resume.areaId) : undefined,
      salaryFrom: resume.salaryFrom > 0 ? resume.salaryFrom : undefined,
      order_by: "relevance",
      per_page: 20,
    });

    // Calculate match scores
    cachedVacancies = searchResult.items.map((v) => {
      const breakdown = calculateMatchScore(resume, v);
      return hhVacancyToAppVacancy(v, breakdown);
    }).sort((a, b) => b.matchScore - a.matchScore);

    cacheTime = Date.now();

    return NextResponse.json({
      vacancies: cachedVacancies,
      resumeTitle: resume.title,
      totalFound: searchResult.found,
    });
  } catch (error: any) {
    console.error("[API] Error fetching vacancies from HH.ru:", error.message);

    // Return cached if available, even if stale
    if (cachedVacancies.length > 0) {
      return NextResponse.json({
        vacancies: cachedVacancies,
        resumeTitle: null,
      });
    }

    return NextResponse.json({
      vacancies: [],
      resumeTitle: null,
      error: error.message,
    });
  }
}

function getExperienceFromMonths(months: number): string | undefined {
  const years = months / 12;
  if (years < 1) return "noExperience";
  if (years < 3) return "between1And3";
  if (years < 6) return "between3And6";
  return "moreThan6";
}

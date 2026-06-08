import { NextRequest, NextResponse } from "next/server";
import {
  searchVacancies,
  getResumeForMatching,
  calculateMatchScore,
  hhVacancyToAppVacancy,
  smartSearchFromResume,
} from "@/lib/hh-api";

// Vacancy search is PUBLIC — no auth required on HH.ru API
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const resume = await getResumeForMatching();

    // If user provided specific search params, use them directly
    const hasSpecificParams = body.text || body.area || body.specialization || body.experience || body.employment || body.schedule;

    if (hasSpecificParams) {
      // Direct search with user-specified params
      const params: Record<string, any> = {
        text: body.text || undefined,
        area: body.area || undefined,
        specialization: body.specialization || undefined,
        experience: body.experience || undefined,
        employment: body.employment || undefined,
        schedule: body.schedule || undefined,
        salaryFrom: body.salaryFrom || undefined,
        salaryTo: body.salaryTo || undefined,
        currency: body.currency || undefined,
        only_with_salary: body.only_with_salary || false,
        order_by: body.order_by || "relevance",
        per_page: Math.min(body.per_page || 50, 100),
        page: body.page || 0,
      };

      // Clean undefined values
      Object.keys(params).forEach((k) => params[k] === undefined && delete params[k]);

      const result = await searchVacancies(params as any);

      // Calculate match scores if we have resume data
      const vacancies = resume
        ? result.items.map((v) => {
            const breakdown = calculateMatchScore(resume, v);
            return hhVacancyToAppVacancy(v, breakdown);
          }).sort((a, b) => b.matchScore - a.matchScore)
        : result.items.map((v) =>
            hhVacancyToAppVacancy(v, { skills: 0, experience: 0, salary: 0, location: 0, total: 0 })
          );

      const matched = resume
        ? vacancies.filter((v) => v.matchScore >= 70).length
        : 0;

      return NextResponse.json({
        vacancies,
        totalFound: result.found,
        matched,
        page: result.page,
        pages: result.pages,
      });
    }

    // Smart search: auto-derive params from resume
    if (resume) {
      const result = await smartSearchFromResume(resume, {
        text: body.text || undefined,
      });

      return NextResponse.json({
        vacancies: result.vacancies,
        totalFound: result.totalFound,
        matched: result.matched,
      });
    }

    // No resume, no specific params — do a default search
    if (body.text) {
      const result = await searchVacancies({ text: body.text, per_page: 20 });
      return NextResponse.json({
        vacancies: result.items.map((v) =>
          hhVacancyToAppVacancy(v, { skills: 0, experience: 0, salary: 0, location: 0, total: 0 })
        ),
        totalFound: result.found,
        matched: 0,
        page: result.page,
        pages: result.pages,
      });
    }

    return NextResponse.json({
      vacancies: [],
      totalFound: 0,
      matched: 0,
      message: "Укажите параметры поиска или загрузите резюме",
    });
  } catch (error: any) {
    console.error("[API] Error searching vacancies:", error.message);
    return NextResponse.json(
      { vacancies: [], totalFound: 0, matched: 0, message: error.message },
      { status: 200 }
    );
  }
}

import type { Resume, Vacancy } from "./types";

/**
 * Hybrid Matching Engine — ported from hh-bot/src/matching/engine.py
 *
 * Scoring weights:
 *   - Skills overlap:     30%
 *   - Experience match:   20%
 *   - Salary alignment:   25%
 *   - Position similarity: 15%
 *   - Location match:     10%
 */

// Normalize text for comparison
function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-zа-яё0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

// Calculate Jaccard similarity between two sets of strings
function jaccardSimilarity(setA: string[], setB: string[]): number {
  if (setA.length === 0 && setB.length === 0) return 1;
  if (setA.length === 0 || setB.length === 0) return 0;

  const normA = setA.map(normalize);
  const normB = setB.map(normalize);

  const setASet = new Set(normA);
  const setBSet = new Set(normB);

  let intersection = 0;
  for (const item of setASet) {
    if (setBSet.has(item)) intersection++;
  }

  const union = setASet.size + setBSet.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// Fuzzy skill match — handles partial matches like "K8s" ↔ "Kubernetes"
function fuzzySkillMatch(resumeSkills: string[], vacancySkills: string[]): number {
  if (vacancySkills.length === 0) return 1;
  if (resumeSkills.length === 0) return 0;

  const skillAliases: Record<string, string[]> = {
    "kubernetes": ["k8s", "kube"],
    "k8s": ["kubernetes", "kube"],
    "postgresql": ["postgres", "pg"],
    "postgres": ["postgresql", "pg"],
    "javascript": ["js", "ecmascript"],
    "typescript": ["ts"],
    "react": ["reactjs", "react.js"],
    "nextjs": ["next.js", "next"],
    "nodejs": ["node.js", "node"],
    "ci/cd": ["cicd", "continuous integration", "continuous delivery"],
    "machine learning": ["ml", "ai"],
    "devops": ["sre", "platform engineering"],
  };

  const normResume = resumeSkills.map(normalize);
  let matched = 0;

  for (const vSkill of vacancySkills) {
    const normV = normalize(vSkill);
    let found = false;

    // Direct match
    if (normResume.some(r => normalize(r) === normV)) {
      found = true;
    }

    // Alias match
    if (!found) {
      for (const [key, aliases] of Object.entries(skillAliases)) {
        const allVariants = [key, ...aliases];
        const vMatch = allVariants.some(a => normalize(a) === normV);
        const rMatch = normResume.some(r =>
          allVariants.some(a => normalize(a) === normalize(r))
        );
        if (vMatch && rMatch) {
          found = true;
          break;
        }
      }
    }

    // Partial match (substring)
    if (!found) {
      found = normResume.some(r =>
        r.includes(normV) || normV.includes(r)
      );
    }

    if (found) matched++;
  }

  return matched / vacancySkills.length;
}

// Parse salary range from text like "250 000 - 350 000 ₽"
function parseSalary(salaryText: string): { from: number; to: number } | null {
  if (!salaryText) return null;
  const cleaned = salaryText.replace(/\s/g, "").replace(/\u00A0/g, "").replace(/[^\d\-]/g, " ").trim();
  const parts = cleaned.split(/[\s\-]+/).filter(Boolean).map(Number);
  if (parts.length >= 2) return { from: parts[0], to: parts[1] };
  if (parts.length === 1) return { from: parts[0], to: parts[0] };
  return null;
}

// Calculate salary match score
function salaryMatch(
  resumeFrom: number, resumeTo: number,
  vacancySalary: string
): number {
  const vSalary = parseSalary(vacancySalary);
  if (!vSalary) return 50; // No salary info = neutral

  const rMin = resumeFrom || 0;
  const rMax = resumeTo || rMin;
  const vMin = vSalary.from;
  const vMax = vSalary.to;

  // Perfect overlap
  if (rMin >= vMin && rMax <= vMax) return 100;
  if (vMin >= rMin && vMax <= rMax) return 90;

  // Partial overlap
  const overlapStart = Math.max(rMin, vMin);
  const overlapEnd = Math.min(rMax, vMax);
  if (overlapEnd > overlapStart) {
    const overlapRange = overlapEnd - overlapStart;
    const resumeRange = rMax - rMin || 1;
    return Math.round((overlapRange / resumeRange) * 80);
  }

  // No overlap — score based on distance
  const distance = rMin > vMax ? rMin - vMax : vMin - rMax;
  const avgSalary = (rMin + rMax + vMin + vMax) / 4;
  const pctDistance = distance / avgSalary;
  return Math.max(0, Math.round(50 - pctDistance * 100));
}

// Experience match
function experienceMatch(resumeYears: number, vacancyExp: string): number {
  if (!vacancyExp) return 70; // No requirement = neutral-good

  const match = vacancyExp.match(/(\d+)/g);
  if (!match) return 70;

  const nums = match.map(Number);
  const minReq = Math.min(...nums);
  const maxReq = Math.max(...nums);
  const isPlus = vacancyExp.includes("+");

  if (isPlus) {
    // "5+ лет" — need at least that many
    if (resumeYears >= minReq) return 100;
    return Math.max(0, Math.round((resumeYears / minReq) * 80));
  }

  if (resumeYears >= minReq && resumeYears <= maxReq) return 100;
  if (resumeYears < minReq) return Math.max(0, Math.round((resumeYears / minReq) * 80));
  // Overqualified
  const overBy = resumeYears - maxReq;
  return Math.max(40, 100 - overBy * 10);
}

// Position/title similarity
function positionMatch(resumePosition: string, vacancyTitle: string): number {
  const normR = normalize(resumePosition);
  const normV = normalize(vacancyTitle);

  const rWords = new Set(normR.split(" "));
  const vWords = new Set(normV.split(" "));

  let overlap = 0;
  for (const w of vWords) {
    if (rWords.has(w)) overlap++;
  }

  if (vWords.size === 0) return 50;
  const base = overlap / vWords.size;

  // Boost for keyword matches
  const keywords = ["python", "developer", "devops", "engineer", "frontend", "backend", "fullstack", "senior", "lead", "data"];
  let keywordMatch = 0;
  for (const kw of keywords) {
    if (normR.includes(kw) && normV.includes(kw)) keywordMatch++;
  }

  return Math.min(100, Math.round(base * 70 + keywordMatch * 10));
}

// Location match
function locationMatch(resumeCity: string, vacancyLocation: string): number {
  const normR = normalize(resumeCity);
  const normV = normalize(vacancyLocation);

  if (normV.includes("удалённ") || normV.includes("remote")) return 90;
  if (normR === normV) return 100;

  // Same region/city
  const rWords = normR.split(" ");
  const vWords = normV.split(" ");
  const overlap = rWords.filter(w => vWords.includes(w)).length;
  if (overlap > 0) return 80;

  return 40;
}

// Main matching function
export function calculateMatchScore(resume: Resume, vacancy: Vacancy): {
  totalScore: number;
  breakdown: { skills: number; experience: number; salary: number; position: number; location: number };
} {
  const skillsScore = Math.round(fuzzySkillMatch(resume.skills, vacancy.skills) * 100);
  const experienceScore = experienceMatch(resume.experienceYears, vacancy.experience);
  const salaryScore = salaryMatch(resume.salaryFrom, resume.salaryTo, vacancy.salary);
  const positionScore = positionMatch(resume.position, vacancy.title);
  const locationScore = locationMatch(resume.city, vacancy.location);

  const totalScore = Math.round(
    skillsScore * 0.30 +
    experienceScore * 0.20 +
    salaryScore * 0.25 +
    positionScore * 0.15 +
    locationScore * 0.10
  );

  return {
    totalScore: Math.min(99, Math.max(1, totalScore)),
    breakdown: {
      skills: skillsScore,
      experience: experienceScore,
      salary: salaryScore,
      position: positionScore,
      location: locationScore,
    },
  };
}

// Find skill gaps — skills that appear in high-match vacancies but not in the resume
export function findSkillGaps(resume: Resume, vacancies: Vacancy[]): string[] {
  const resumeSkillsLower = resume.skills.map(normalize);
  const skillDemand: Record<string, number> = {};

  for (const v of vacancies) {
    if (v.matchScore >= 70) {
      for (const skill of v.skills) {
        const normSkill = normalize(skill);
        if (!resumeSkillsLower.includes(normSkill)) {
          skillDemand[skill] = (skillDemand[skill] || 0) + 1;
        }
      }
    }
  }

  // Sort by demand (most requested first)
  return Object.entries(skillDemand)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([skill]) => skill);
}

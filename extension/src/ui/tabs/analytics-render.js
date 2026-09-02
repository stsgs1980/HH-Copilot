/**
 * UI: ANALYTICS RENDERING
 * Renders market analytics from loaded vacancies.
 * v1.9.85.0
 */

import { esc } from "../html.js";
import { refs } from "../state.js";

export function renderAnalytics(vacancies, _resume) {
  const content = refs.shadowRoot?.getElementById("analytics-content");
  const empty = refs.shadowRoot?.getElementById("analytics-empty");
  if (!content || !empty) return;

  if (!vacancies || vacancies.length === 0) {
    content.style.display = "none";
    empty.style.display = "";
    return;
  }

  content.style.display = "";
  empty.style.display = "none";

  const scores = vacancies.filter((v) => v.matchScore != null).map((v) => v.matchScore);
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  const avgEl = refs.shadowRoot?.getElementById("analytics-avg-score");
  if (avgEl) avgEl.textContent = avgScore + "%";

  const totalEl = refs.shadowRoot?.getElementById("analytics-total");
  if (totalEl) totalEl.textContent = vacancies.length;

  const skillCounts = new Map();
  for (const v of vacancies) {
    const skills = v.keySkills || [];
    for (const s of skills) {
      const name = typeof s === "string" ? s : s.name || "";
      if (name) {
        skillCounts.set(name, (skillCounts.get(name) || 0) + 1);
      }
    }
  }

  const sorted = [...skillCounts.entries()].sort((a, b) => b[1] - a[1]);
  const topSkill = sorted[0];
  const topSkillEl = refs.shadowRoot?.getElementById("analytics-top-skill");
  if (topSkillEl && topSkill) {
    topSkillEl.textContent = topSkill[0];
  }

  const skillsList = refs.shadowRoot?.getElementById("analytics-skills-list");
  if (skillsList) {
    const top10 = sorted.slice(0, 10);
    skillsList.innerHTML = top10
      .map(
        ([name, count]) =>
          '<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;background:#F0FDF4;color:#059669;border:1px solid #BBF7D0;">' +
          esc(name) +
          " (" +
          count +
          ")</span>",
      )
      .join("");
  }
}

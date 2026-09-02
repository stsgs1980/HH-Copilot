/**
 * UI: RESUMES -- Resume Score (HR/ATS quality assessment)
 * ========================================================
 * Extracted from render-resume-panel.js for Rule 12.
 */

import { analyzeResumeQuality } from "../../../lib/resume-quality-analyzer.js";
import { collectDetailVacancySkills } from "../../../lib/vacancy-skills-collector.js";
import { esc } from "../../html.js";
import { ICONS } from "../../html/icons.js";
import { refs } from "../../state.js";

export function updateResumeScore(r) {
  const section = refs.shadowRoot?.getElementById("res-score-section");
  if (!section) return;

  if (!r || !r.id) {
    section.style.display = "none";
    return;
  }
  section.style.display = "";

  const vacancySkills = collectDetailVacancySkills();
  const result = analyzeResumeQuality(r, vacancySkills);
  const pct = result.totalScore;

  const ring = refs.shadowRoot?.getElementById("res-score-ring");
  if (ring) {
    const deg = Math.round(pct * 3.6);
    const color = pct >= 70 ? "#059669" : pct >= 40 ? "#D97706" : "#DC2626";
    ring.style.background = "conic-gradient(" + color + " 0deg " + deg + "deg, #e4e4e7 " + deg + "deg 360deg)";
    const inner = ring.querySelector("div");
    if (inner) {
      inner.textContent = pct + "%";
      inner.style.color = color;
    }
  }

  const subtitle = refs.shadowRoot?.getElementById("res-score-subtitle");
  if (subtitle) {
    if (pct >= 80) subtitle.textContent = "Сильное резюме -- ATS пропустит, HR заметит";
    else if (pct >= 60) subtitle.textContent = "Хорошее резюме -- есть что усилить";
    else if (pct >= 40) subtitle.textContent = "Среднее -- ATS может отсеять, HR не увидит ценности";
    else subtitle.textContent = "Слабое -- высокая вероятность отсева на этапе ATS";
  }

  const atsScoreEl = refs.shadowRoot?.getElementById("res-ats-score");
  const atsBar = refs.shadowRoot?.getElementById("res-ats-bar");
  if (atsScoreEl) {
    const atsColor = result.atsScore >= 70 ? "#059669" : result.atsScore >= 40 ? "#D97706" : "#DC2626";
    atsScoreEl.textContent = result.atsScore + "%";
    atsScoreEl.style.color = atsColor;
  }
  if (atsBar) atsBar.style.width = result.atsScore + "%";

  const expScoreEl = refs.shadowRoot?.getElementById("res-exp-score");
  const expBar = refs.shadowRoot?.getElementById("res-exp-bar");
  if (expScoreEl) {
    const expColor = result.experienceScore >= 70 ? "#2563EB" : result.experienceScore >= 40 ? "#D97706" : "#DC2626";
    expScoreEl.textContent = result.experienceScore + "%";
    expScoreEl.style.color = expColor;
  }
  if (expBar) expBar.style.width = result.experienceScore + "%";

  const redFlagsContainer = refs.shadowRoot?.getElementById("res-red-flags");
  const redFlagsList = refs.shadowRoot?.getElementById("res-red-flags-list");
  if (redFlagsContainer && redFlagsList) {
    if (result.redFlags.length > 0) {
      redFlagsContainer.style.display = "";
      redFlagsList.innerHTML = result.redFlags
        .map(
          (f) =>
            '<div style="display:flex;align-items:flex-start;gap:6px;margin-bottom:4px;padding:5px 8px;background:#FEF2F2;border-radius:6px;">' +
            '<span style="color:#DC2626;flex-shrink:0;margin-top:1px;">' +
            ICONS.alertCircle +
            "</span>" +
            '<span style="color:#991B1B;line-height:1.4;">' +
            esc(f) +
            "</span></div>",
        )
        .join("");
    } else {
      redFlagsContainer.style.display = "none";
    }
  }

  const strengthsContainer = refs.shadowRoot?.getElementById("res-strengths");
  const strengthsList = refs.shadowRoot?.getElementById("res-strengths-list");
  if (strengthsContainer && strengthsList) {
    if (result.strengths.length > 0) {
      strengthsContainer.style.display = "";
      strengthsList.innerHTML = result.strengths
        .map(
          (s) =>
            '<div style="display:flex;align-items:flex-start;gap:6px;margin-bottom:4px;padding:5px 8px;background:#F0FDF4;border-radius:6px;">' +
            '<span style="color:#059669;flex-shrink:0;margin-top:1px;">' +
            ICONS.checkCircle +
            "</span>" +
            '<span style="color:#166534;line-height:1.4;">' +
            esc(s) +
            "</span></div>",
        )
        .join("");
    } else {
      strengthsContainer.style.display = "none";
    }
  }

  const recsContainer = refs.shadowRoot?.getElementById("res-recommendations");
  const recsList = refs.shadowRoot?.getElementById("res-recommendations-list");
  if (recsContainer && recsList) {
    if (result.recommendations.length > 0) {
      recsContainer.style.display = "";
      recsList.innerHTML = result.recommendations
        .map((rec) => {
          const priorityColor =
            rec.priority === "critical" ? "#991B1B" : rec.priority === "high" ? "#92400E" : "#71717a";
          const priorityBg = rec.priority === "critical" ? "#FEF2F2" : rec.priority === "high" ? "#FFFBEB" : "#FAFAFA";
          const priorityBorder =
            rec.priority === "critical"
              ? "1px solid rgba(220,38,38,0.15)"
              : rec.priority === "high"
                ? "1px solid rgba(217,119,6,0.15)"
                : "1px solid #e4e4e7";
          const textSpan = rec.tooltip
            ? '<span title="' +
              esc(rec.tooltip) +
              '" style="cursor:help;border-bottom:1px dashed #a1a1aa;line-height:1.4;">' +
              esc(rec.text) +
              "</span>"
            : '<span style="line-height:1.4;">' + esc(rec.text) + "</span>";
          return (
            '<div style="display:flex;align-items:flex-start;gap:6px;margin-bottom:4px;padding:5px 8px;background:' +
            priorityBg +
            ";border:" +
            priorityBorder +
            ';border-radius:6px;">' +
            '<span style="color:#D97706;flex-shrink:0;margin-top:1px;">' +
            ICONS.lightbulb +
            "</span>" +
            '<span style="color:' +
            priorityColor +
            ';">' +
            textSpan +
            "</span></div>"
          );
        })
        .join("");
    } else {
      recsContainer.style.display = "none";
    }
  }
}

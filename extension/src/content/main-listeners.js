/**
 * MAIN: PAGE LISTENERS
 * =================================================
 * Page-specific event listeners extracted from main.js (AHG Rule 12).
 * - Vacancy diagnostic listeners (manual + auto-run)
 * - Page-logic init listeners (auth event + safety net)
 * - Resume-loaded re-scoring for vacancy detail pages
 *
 * v1.9.43.1
 */

import { createLogger } from "../lib/anti-hallucination.js";
import { computeMatchScore } from "../lib/match-scorer.js";
import { saveVacancyDetail, saveVacancyScore } from "../lib/storage.js";
import { parseVacancyDetail } from "../parsers/vacancy-detail.js";
import { diagnoseVacancyPage } from "../parsers/vacancy-diagnostic.js";
import { initPageLogic } from "./main-page-handlers.js";

const listenersLog = createLogger("Main");

export function setupVacancyDiagnosticListeners() {
  document.addEventListener("HH-AR-RUN-VAC-DIAG", () => {
    try {
      const result = diagnoseVacancyPage();
      listenersLog.info("Manual vac diag: " + (result.vacancyId || "no id"));
    } catch (e) {
      listenersLog.warn("Manual vac diag failed: " + e.message);
    }
  });

  if (/^\/vacancy\/\d+/.test(window.location.pathname)) {
    setTimeout(() => {
      try {
        diagnoseVacancyPage();
      } catch (_e) {}
    }, 2000);
  }
}

export function setupPageLogicListeners() {
  window.addEventListener("hh-ar-init-page-logic", () => {
    listenersLog.info("Received hh-ar-init-page-logic event -> calling initPageLogic()");
    initPageLogic();
  });

  const isDetailPage =
    /^\/vacancy\/\d+/.test(window.location.pathname) ||
    /^\/resume\/[a-f0-9]+/.test(window.location.pathname) ||
    /^\/applicant\/resumes\/view/.test(window.location.pathname);
  if (isDetailPage) {
    setTimeout(() => {
      initPageLogic();
    }, 3000);
  }
}

export function setupRescoreListener() {
  window.addEventListener("hh-ar-resume-loaded", async (e) => {
    const { panelState } = await import("../ui/panel.js");
    const resume = e.detail?.resume || panelState.resume;
    if (!resume) return;
    if (!/^\/vacancy\/\d+/.test(window.location.pathname)) return;
    listenersLog.info("Resume loaded -- re-scoring vacancy detail page");
    try {
      const detail = parseVacancyDetail();
      if (detail) {
        const score = await computeMatchScore(resume, detail);
        detail.matchScore = score.total;
        detail.matchBreakdown = score.breakdown;
        listenersLog.info(
          "Re-score: " +
            score.total +
            "% (skills=" +
            score.breakdown.skills +
            ", title=" +
            score.breakdown.title +
            ", salary=" +
            score.breakdown.salary +
            ", exp=" +
            score.breakdown.experience +
            ")",
        );
        saveVacancyScore(detail.id, score.total, score.breakdown, score.details).catch(() => {});
        saveVacancyDetail(detail).catch(() => {});
        window.__hhVacDetail = detail;
        window.dispatchEvent(
          new CustomEvent("hh-ar-match-updated", {
            detail: { vacancyId: detail.id, score: score.total, breakdown: score.breakdown, details: score.details },
          }),
        );
      }
    } catch (err) {
      listenersLog.warn("Re-score failed: " + err.message);
    }
  });
}

export function setupAllPageListeners() {
  setupVacancyDiagnosticListeners();
  setupPageLogicListeners();
  setupRescoreListener();
}

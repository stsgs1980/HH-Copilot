/**
 * UI: PANEL -- Sidebar Click Handler
 * ====================================
 * Click event delegation for the sidebar panel.
 * Extracted from events.js for anti-monolith compliance.
 */

import { restartTour } from "../../lib/tour-engine.js";
import { getTabTourSteps, getWelcomeTourSteps } from "../../lib/tour-steps.js";
import { diagnoseResumeDOM } from "../../parsers/resume-detail.js";
import { resetAuthCache } from "../auth.js";
import { refs } from "../state.js";
import { clearLog } from "../tabs/stats.js";
import { addBlacklistItem, removeBlacklistItem, selectConversation } from "./helpers.js";
import { toggleSidebar, updateAuthStateAsync } from "./index.js";
import { handleResumeClick } from "./sidebar-resume-handlers.js";

/**
 * Bind sidebar click delegation -- single click handler for all panel actions.
 */
export function bindSidebarClicks(container) {
  /* -- Click delegation -- */
  container.addEventListener("click", (e) => {
    const t = e.target;

    /* Close panel */
    if (t.closest('[data-action="close-panel"]')) {
      toggleSidebar();
      return;
    }

    /* Auth indicator click */
    if (t.closest("#authIndicator")) {
      resetAuthCache();
      updateAuthStateAsync();
      return;
    }

    /* Tour */
    if (t.closest('[data-action="start-tour"]')) {
      const activeTab = refs.shadowRoot?.querySelector(".tab-btn.active");
      const tabId = activeTab?.dataset.tab;
      restartTour(tabId ? getTabTourSteps(tabId) : getWelcomeTourSteps());
      return;
    }

    /* Toggle irrelevant vacancies section */
    const toggleIrr = t.closest('[data-action="toggle-irrelevant"]');
    if (toggleIrr) {
      const irrList = toggleIrr.parentElement?.querySelector(".irrelevant-list");
      const chevron = toggleIrr.querySelector(".irrelevant-chevron");
      if (irrList) {
        const isHidden = irrList.style.display === "none";
        irrList.style.display = isHidden ? "" : "none";
        if (chevron) chevron.style.transform = isHidden ? "rotate(180deg)" : "";
      }
      return;
    }

    /* Vacancy actions */
    const applyBtn = t.closest('[data-action="apply"]');
    if (applyBtn) {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent("hh-ar-apply", { detail: { vacancyId: applyBtn.dataset.id } }));
      return;
    }
    if (t.closest('[data-action="apply-all"]')) {
      window.dispatchEvent(new CustomEvent("hh-ar-apply-all"));
      return;
    }
    if (t.closest('[data-action="pause"]')) {
      window.dispatchEvent(new CustomEvent("hh-ar-toggle-status"));
      return;
    }
    if (t.closest('[data-action="refresh"]')) {
      window.dispatchEvent(new CustomEvent("hh-ar-refresh"));
      return;
    }

    /* Navigate -- close sidebar + full page navigation */
    const navLink = t.closest('[data-action="navigate"]');
    if (navLink) {
      e.preventDefault();
      const href = navLink.getAttribute("href");
      if (href) {
        toggleSidebar(); // close panel
        window.location.href = href;
      }
      return;
    }

    /* Auth -- reset cache to force real async re-check */
    if (t.closest('[data-action="check-auth"]')) {
      resetAuthCache();
      updateAuthStateAsync();
      return;
    }
    if (t.closest("#har-retry-auth")) {
      resetAuthCache();
      updateAuthStateAsync();
      return;
    }

    /* Logout */
    if (t.closest('[data-action="logout"]')) {
      window.location.href = "https://hh.ru/account/logout";
      return;
    }

    /* Resume -- delegated to sidebar-resume-handlers.js */
    if (handleResumeClick(t)) return;

    /* Quick action tab switches */
    const tabSwitch = t.closest("[data-tab-switch]");
    if (tabSwitch) {
      import("./events.js").then((m) => m.switchTabPublic(tabSwitch.dataset.tabSwitch));
      return;
    }

    /* Daily reset */
    if (t.closest('[data-action="reset-daily"]')) {
      window.dispatchEvent(new CustomEvent("hh-ar-reset-daily"));
      return;
    }

    /* Diagnose DOM */
    if (t.closest('[data-action="diagnose-dom"]')) {
      diagnoseResumeDOM();
      return;
    }

    /* Blacklist */
    if (t.closest('[data-action="bl-add"]')) {
      addBlacklistItem();
      return;
    }
    const blRemove = t.closest("[data-bl-remove]");
    if (blRemove) {
      removeBlacklistItem(blRemove.dataset.blRemove);
      return;
    }

    /* Clear log */
    if (t.closest('[data-action="clear-log"]')) {
      clearLog();
      return;
    }

    /* Conversation select */
    const convItem = t.closest("[data-conv-id]");
    if (convItem) {
      selectConversation(convItem.dataset.convId);
      return;
    }
  });

  /* -- Keyboard delegation (WCAG: interactive elements must respond to Enter/Space) -- */
  container.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      /* Auth indicator */
      if (e.target.closest("#authIndicator")) {
        e.preventDefault();
        resetAuthCache();
        updateAuthStateAsync();
        return;
      }
    }
  });
}

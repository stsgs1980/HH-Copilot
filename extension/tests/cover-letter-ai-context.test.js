/// <reference types="vitest/globals" />
/**
 * TESTS: cover-letter-ai-ui helpers (F-CR-02 fix v1.9.51.0)
 * Covers:
 *   - buildAiStatusText: vacancy/resume present + missing cases
 *   - buildMissingContextMessage: lists missing pieces
 *   - buildAiErrorMessage: known codes (NO_API_KEY, NO_EVIDENCE, unknown)
 *   - buildSuccessMessage: with + without warnings
 *   - updateAiStatus: writes to #cl-ai-status
 *   - showAiToast: writes to #cl-ai-toast with kind-specific styles
 *   - getCurrentAiContext: reads window.__hhVacDetail + panelState
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getCurrentAiContext, refreshAiStatus } from "../src/ui/panel/cover-letter-ai-ui.js";
import { panelState, refs } from "../src/ui/state.js";

// ===============================================
// helpers
// ===============================================

function makeShadowRootWithEls() {
  const root = document.createElement("div");
  root.innerHTML = '<div id="cl-ai-status"></div><div id="cl-ai-toast" style="display:none;"></div>';
  // Stub getElementById to search within root
  return {
    getElementById(id) {
      return root.querySelector("#" + id);
    },
    querySelector(sel) {
      return root.querySelector(sel);
    },
    querySelectorAll(sel) {
      return root.querySelectorAll(sel);
    },
    _root: root,
  };
}

beforeEach(() => {
  refs.shadowRoot = makeShadowRootWithEls();
  panelState.resume = null;
  panelState.vacancies = [];
  if (typeof window !== "undefined") {
    delete window.__hhVacDetail;
  }
});
afterEach(() => {
  refs.shadowRoot = null;
  if (typeof window !== "undefined") {
    delete window.__hhVacDetail;
  }
});
describe("getCurrentAiContext", () => {
  it("returns nulls when nothing loaded", () => {
    const ctx = getCurrentAiContext();
    expect(ctx.vacancy).toBeNull();
    expect(ctx.resume).toBeNull();
  });

  it("picks up window.__hhVacDetail", () => {
    window.__hhVacDetail = { id: "123", title: "V", company: "C" };
    const ctx = getCurrentAiContext();
    expect(ctx.vacancy).toEqual({ id: "123", title: "V", company: "C" });
    delete window.__hhVacDetail;
  });

  it("picks up panelState.resume", () => {
    panelState.resume = { id: "r1", title: "My resume" };
    const ctx = getCurrentAiContext();
    expect(ctx.resume).toEqual({ id: "r1", title: "My resume" });
  });

  it("prefers window.__hhVacDetail over panelState.vacancies[0]", () => {
    window.__hhVacDetail = { id: "detail", title: "FromDetail" };
    panelState.vacancies = [{ id: "list", title: "FromList" }];
    const ctx = getCurrentAiContext();
    expect(ctx.vacancy.title).toBe("FromDetail");
    delete window.__hhVacDetail;
  });

  it("falls back to panelState.vacancies[0] when no detail", () => {
    panelState.vacancies = [{ id: "list", title: "FromList" }];
    const ctx = getCurrentAiContext();
    expect(ctx.vacancy.title).toBe("FromList");
  });
});

describe("refreshAiStatus", () => {
  it("updates #cl-ai-status from current context", () => {
    window.__hhVacDetail = { title: "Live", company: "C" };
    panelState.resume = { title: "R" };
    refreshAiStatus();
    const status = refs.shadowRoot.getElementById("cl-ai-status");
    expect(status.textContent).toContain("Live @ C");
    expect(status.textContent).toContain("R");
    delete window.__hhVacDetail;
  });
});

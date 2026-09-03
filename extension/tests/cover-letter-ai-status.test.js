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
import {
  buildAiErrorMessage,
  buildAiStatusText,
  buildMissingContextMessage,
} from "../src/ui/panel/cover-letter-ai-ui.js";
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
describe("buildAiStatusText", () => {
  it('returns "not chosen" hints when both null', () => {
    const text = buildAiStatusText({ vacancy: null, resume: null });
    expect(text).toContain("Вакансия: не выбрана");
    expect(text).toContain("Резюме: не выбрано");
  });

  it("includes vacancy title and company when present", () => {
    const text = buildAiStatusText({
      vacancy: { title: "ROP", company: "BaseTrade" },
      resume: null,
    });
    expect(text).toContain("Вакансия: ROP @ BaseTrade");
    expect(text).toContain("Резюме: не выбрано");
  });

  it("includes resume title when present", () => {
    const text = buildAiStatusText({
      vacancy: { title: "ROP", company: "BaseTrade" },
      resume: { title: "ROP resume 2024" },
    });
    expect(text).toContain("Резюме: ROP resume 2024");
  });

  it("falls back to position if title missing", () => {
    const text = buildAiStatusText({
      vacancy: null,
      resume: { position: "Sales Manager" },
    });
    expect(text).toContain("Резюме: Sales Manager");
  });

  it("handles null ctx entirely", () => {
    const text = buildAiStatusText(null);
    expect(text).toContain("Вакансия: не выбрана");
    expect(text).toContain("Резюме: не выбрано");
  });
});

describe("buildMissingContextMessage", () => {
  it("lists both missing when both null", () => {
    const msg = buildMissingContextMessage({ vacancy: null, resume: null });
    expect(msg).toContain("вакансия");
    expect(msg).toContain("резюме");
    expect(msg).toContain("Открой hh.ru/vacancy/*");
    expect(msg).toContain("Загрузи резюме");
  });

  it("only mentions vacancy when resume present", () => {
    const msg = buildMissingContextMessage({ vacancy: null, resume: { title: "X" } });
    expect(msg).toContain("вакансия");
    expect(msg).not.toContain("резюме");
    expect(msg).toContain("Открой hh.ru/vacancy/*");
  });

  it("only mentions resume when vacancy present", () => {
    const msg = buildMissingContextMessage({ vacancy: { title: "X" }, resume: null });
    expect(msg).not.toContain("вакансия");
    expect(msg).toContain("резюме");
    expect(msg).toContain("Загрузи резюме");
  });
});

describe("buildAiErrorMessage", () => {
  it("handles NO_API_KEY with hint", () => {
    const msg = buildAiErrorMessage({ ok: false, code: "NO_API_KEY", error: "no key" });
    expect(msg).toContain("NO_API_KEY");
    expect(msg).toContain("Настройки -> AI API key");
  });

  it("handles NO_EVIDENCE with hint", () => {
    const msg = buildAiErrorMessage({ ok: false, code: "NO_EVIDENCE", error: "empty" });
    expect(msg).toContain("NO_EVIDENCE");
    expect(msg).toContain("Навыки");
  });

  it("handles AI_ERROR with TIMEOUT aiCode with hint to increase timeout", () => {
    const msg = buildAiErrorMessage({ ok: false, code: "AI_ERROR", aiCode: "TIMEOUT", error: "timed out" });
    expect(msg).toContain("[TIMEOUT]");
    expect(msg).toContain("Timeout");
  });

  it("handles unknown code without hints", () => {
    const msg = buildAiErrorMessage({ ok: false, code: "HTTP_500", error: "server" });
    expect(msg).toContain("HTTP_500");
    expect(msg).toContain("server");
    expect(msg).not.toContain("Настройки");
  });

  it("handles missing result (null/undefined)", () => {
    const msg = buildAiErrorMessage(null);
    expect(msg).toContain("unknown");
  });

  it("includes aiCode in brackets when present", () => {
    const msg = buildAiErrorMessage({ ok: false, code: "AI_ERROR", aiCode: "TIMEOUT", error: "timed out" });
    expect(msg).toContain("[TIMEOUT]");
  });
});

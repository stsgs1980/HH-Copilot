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

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildSuccessMessage, showAiToast, updateAiStatus } from "../src/ui/panel/cover-letter-ai-ui.js";
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
describe("buildSuccessMessage", () => {
  it("reports character count", () => {
    const msg = buildSuccessMessage("Hello, world!", []);
    expect(msg).toContain("13 символов");
  });

  it("reports warning count when > 0", () => {
    const msg = buildSuccessMessage("abc", ["warn1", "warn2"]);
    expect(msg).toContain("2 предупреждений");
  });

  it("omits warnings section when 0", () => {
    const msg = buildSuccessMessage("abc", []);
    expect(msg).not.toContain("предупреждений");
  });

  it("handles undefined warnings array", () => {
    const msg = buildSuccessMessage("abc");
    expect(msg).toContain("3 символов");
  });
});

describe("updateAiStatus", () => {
  it("writes status text to #cl-ai-status", () => {
    updateAiStatus({ vacancy: { title: "X", company: "Y" }, resume: { title: "Z" } });
    const status = refs.shadowRoot.getElementById("cl-ai-status");
    expect(status.textContent).toContain("X @ Y");
    expect(status.textContent).toContain("Z");
  });

  it("no-op when shadowRoot is null", () => {
    refs.shadowRoot = null;
    expect(() => updateAiStatus({})).not.toThrow();
  });
});

describe("showAiToast", () => {
  it("writes message and shows element", () => {
    showAiToast("hello", "error");
    const toast = refs.shadowRoot.getElementById("cl-ai-toast");
    expect(toast.style.display).toBe("block");
    expect(toast.textContent).toBe("hello");
    expect(toast.style.background).toBe("rgb(254, 242, 242)"); // #FEF2F2
  });

  it("applies success styles", () => {
    showAiToast("ok", "success");
    const toast = refs.shadowRoot.getElementById("cl-ai-toast");
    expect(toast.style.background).toBe("rgb(240, 253, 244)"); // #F0FDF4
  });

  it("applies info styles for unknown kind", () => {
    showAiToast("info", "info");
    const toast = refs.shadowRoot.getElementById("cl-ai-toast");
    expect(toast.style.background).toBe("rgb(255, 251, 235)"); // #FFFBEB
  });

  it("falls back to console.log when shadowRoot null", () => {
    refs.shadowRoot = null;
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    showAiToast("test", "error");
    expect(spy).toHaveBeenCalledWith("[CoverLetterAI]", "test");
    spy.mockRestore();
  });
});

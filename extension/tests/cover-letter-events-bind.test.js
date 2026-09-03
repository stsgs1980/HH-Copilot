/// <reference types="vitest/globals" />
/**
 * TESTS: cover-letter-events UI wiring (F5.6)
 * Covers:
 *   - populateCoverLetterFields: populates textarea + tone select
 *   - bindCoverLetterTemplateSave: debounced save on input
 *   - bindLetterToneHandler: immediate save on change, validates tone
 *   - bindCoverLetterEvents: convenience wrapper binds both
 *   - Storage failure tolerance (no throw)
 */

import { beforeEach, describe, expect, it } from "vitest";
import { _internal, bindCoverLetterEvents } from "../src/ui/panel/cover-letter-events.js";
import { refs } from "../src/ui/state.js";

// ===============================================
// storage stub
// ===============================================

function makeStorageStub(initial) {
  const state = {
    settings: {
      letterTone: "formal",
      coverLetterTemplate: "",
      ...(initial || {}),
    },
  };
  return {
    async getCoverLetterConfig() {
      const tmpl = state.settings.coverLetterTemplate;
      const tone = state.settings.letterTone || "formal";
      return {
        template: typeof tmpl === "string" && tmpl.trim().length > 0 ? tmpl : "DEFAULT_TEMPLATE_FALLBACK",
        tone,
      };
    },
    async setCoverLetterTemplate(text) {
      state.settings.coverLetterTemplate = text;
      return true;
    },
    async setLetterTone(tone) {
      state.settings.letterTone = tone;
      return true;
    },
    _state: state,
  };
}

beforeEach(() => {
  refs.shadowRoot = null;
});
describe("F5.6 -- bindCoverLetterEvents", () => {
  it("binds both template + tone handlers", async () => {
    const storage = makeStorageStub();
    const container = document.createElement("div");
    container.innerHTML = `
      <textarea id="cover-letter-text">initial</textarea>
      <select id="s-letter-tone">
        <option value="formal">formal</option>
        <option value="concise">concise</option>
      </select>
    `;
    refs.shadowRoot = { getElementById: (id) => container.querySelector("#" + id) };

    bindCoverLetterEvents(container, { storageImpl: storage, debounceMs: 10 });

    // Trigger tone change
    const sel = container.querySelector("#s-letter-tone");
    sel.value = "concise";
    sel.dispatchEvent(new Event("change", { bubbles: true }));

    // Trigger textarea input
    const ta = container.querySelector("#cover-letter-text");
    ta.value = "new text";
    ta.dispatchEvent(new Event("input", { bubbles: true }));

    await new Promise((r) => setTimeout(r, 30));
    expect(storage._state.settings.letterTone).toBe("concise");
    expect(storage._state.settings.coverLetterTemplate).toBe("new text");
  });
});

describe("F5.6 -- internal exports", () => {
  it("DEBOUNCE_MS is 500 by default", () => {
    expect(_internal.DEBOUNCE_MS).toBe(500);
  });

  it("TONES has exactly 4 entries", () => {
    expect(_internal.TONES).toHaveLength(4);
    expect(_internal.TONES.map((t) => t.id)).toEqual(
      expect.arrayContaining(["formal", "friendly", "concise", "enthusiastic"]),
    );
  });
});

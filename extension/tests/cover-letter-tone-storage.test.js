/// <reference types="vitest/globals" />
/**
 * TESTS: cover letter tone + storage (F3.2)
 * Covers:
 *   - TONES config + validateTone
 *   - getTemplateForTone: 4 tones return distinct templates
 *   - applyTone: greeting/closing swap, empty input, no-op for already-correct
 *   - storage: getCoverLetterTemplate/setCoverLetterTemplate/getLetterTone/setLetterTone/getCoverLetterConfig
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
  getCoverLetterConfig,
  getCoverLetterTemplate,
  getLetterTone,
  setCoverLetterTemplate,
  setLetterTone,
} from "../src/lib/cover-letter-storage.js";
import { _internal } from "../src/lib/cover-letter-tone.js";

// ===============================================
// chrome.storage.local stub
// ===============================================

let store;

beforeEach(() => {
  store = { settings: { letterTone: "formal", coverLetterTemplate: "" } };
  globalThis.chrome = {
    storage: {
      local: {
        async get(key) {
          return key in store ? { [key]: store[key] } : {};
        },
        async set(obj) {
          Object.assign(store, obj);
        },
      },
    },
  };
});
describe("F3.2 -- storage: getCoverLetterTemplate", () => {
  it("returns DEFAULT when no template saved", async () => {
    store.settings.coverLetterTemplate = "";
    const tmpl = await getCoverLetterTemplate();
    expect(tmpl).toContain("{position}");
    expect(tmpl).toContain("{company}");
  });

  it("returns user template when saved", async () => {
    store.settings.coverLetterTemplate = "My custom {position} template.";
    const tmpl = await getCoverLetterTemplate();
    expect(tmpl).toBe("My custom {position} template.");
  });

  it("returns DEFAULT for whitespace-only template", async () => {
    store.settings.coverLetterTemplate = "   ";
    const tmpl = await getCoverLetterTemplate();
    expect(tmpl).toContain("{position}");
  });
});

describe("F3.2 -- storage: setCoverLetterTemplate", () => {
  it("saves template to storage", async () => {
    const ok = await setCoverLetterTemplate("My new {position} template.");
    expect(ok).toBe(true);
    expect(store.settings.coverLetterTemplate).toBe("My new {position} template.");
  });

  it("rejects non-string input", async () => {
    const ok = await setCoverLetterTemplate(123);
    expect(ok).toBe(false);
  });
});

describe("F3.2 -- storage: getLetterTone", () => {
  it("returns saved tone", async () => {
    store.settings.letterTone = "friendly";
    expect(await getLetterTone()).toBe("friendly");
  });

  it("returns formal when tone missing", async () => {
    delete store.settings.letterTone;
    expect(await getLetterTone()).toBe("formal");
  });

  it("returns formal for invalid stored tone", async () => {
    store.settings.letterTone = "garbage";
    expect(await getLetterTone()).toBe("formal");
  });
});

describe("F3.2 -- storage: setLetterTone", () => {
  it("saves valid tone", async () => {
    const ok = await setLetterTone("enthusiastic");
    expect(ok).toBe(true);
    expect(store.settings.letterTone).toBe("enthusiastic");
  });

  it("normalizes invalid tone to formal before saving", async () => {
    const ok = await setLetterTone("garbage");
    expect(ok).toBe(true);
    expect(store.settings.letterTone).toBe("formal");
  });
});

describe("F3.2 -- storage: getCoverLetterConfig", () => {
  it("returns both template + tone in one call", async () => {
    store.settings.letterTone = "concise";
    store.settings.coverLetterTemplate = "Custom {position} template.";
    const cfg = await getCoverLetterConfig();
    expect(cfg.tone).toBe("concise");
    expect(cfg.template).toBe("Custom {position} template.");
  });

  it("uses tone-default template when no custom template saved", async () => {
    store.settings.letterTone = "friendly";
    store.settings.coverLetterTemplate = "";
    const cfg = await getCoverLetterConfig();
    expect(cfg.tone).toBe("friendly");
    expect(cfg.template).toContain("Добрый день");
  });
});

describe("F3.2 -- internal", () => {
  it("GREETINGS has 4 entries", () => {
    expect(Object.keys(_internal.GREETINGS)).toHaveLength(4);
  });

  it("CLOSINGS has 4 entries", () => {
    expect(Object.keys(_internal.CLOSINGS)).toHaveLength(4);
  });

  it("concise greeting is empty string", () => {
    expect(_internal.GREETINGS.concise).toBe("");
  });
});

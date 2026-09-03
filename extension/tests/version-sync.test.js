import { describe, expect, test } from "vitest";
import {
  checkVersions,
  extractHtmlVersion,
  extractJsonVersion,
  extractJsVersion,
  extractReadmeVersion,
  normalizeVersion,
  versionsMatch,
} from "../src/lib/version-sync.mjs";

describe("normalizeVersion", () => {
  test("preserves a full four-part version", () => {
    expect(normalizeVersion("1.9.86.0")).toBe("1.9.86.0");
  });

  test("appends .0 to a three-part version for comparison", () => {
    expect(normalizeVersion("1.9.86")).toBe("1.9.86.0");
  });

  test("keeps a three-part version when trailing part is significant", () => {
    expect(normalizeVersion("1.9.86.1")).toBe("1.9.86.1");
  });
});

describe("versionsMatch", () => {
  test("returns true for identical versions", () => {
    expect(versionsMatch("1.9.86.0", "1.9.86.0")).toBe(true);
  });

  test("treats 1.9.86 as matching 1.9.86.0", () => {
    expect(versionsMatch("1.9.86.0", "1.9.86")).toBe(true);
  });

  test("returns false for a different build number", () => {
    expect(versionsMatch("1.9.86.0", "1.9.87.0")).toBe(false);
  });

  test("returns false for a different minor version", () => {
    expect(versionsMatch("1.9.86.0", "1.10.0.0")).toBe(false);
  });
});

describe("extractJsonVersion", () => {
  test("extracts the version field from manifest-like JSON", () => {
    const json = '{ "name": "hh-copilot", "version": "1.9.86.0" }';
    expect(extractJsonVersion(json, "version")).toBe("1.9.86.0");
  });

  test("returns null when the version field is missing", () => {
    expect(extractJsonVersion('{ "name": "hh-copilot" }', "version")).toBeNull();
  });
});

describe("extractJsVersion", () => {
  test("extracts the VERSION constant from a JS module", () => {
    const js = 'export const VERSION = "1.9.86.0";';
    expect(extractJsVersion(js)).toBe("1.9.86.0");
  });

  test("returns null when no VERSION constant is present", () => {
    expect(extractJsVersion("export const OTHER = 42;")).toBeNull();
  });
});

describe("extractHtmlVersion", () => {
  test("extracts the padded version from HTML subtitle", () => {
    const html = '<div class="subtitle" id="version">v1.9.86.0</div>';
    expect(extractHtmlVersion(html)).toBe("1.9.86.0");
  });

  test("extracts a three-part version from HTML", () => {
    const html = "<div>v1.9.86</div>";
    expect(extractHtmlVersion(html)).toBe("1.9.86");
  });

  test("returns null when no version is present", () => {
    expect(extractHtmlVersion("<div>no version here</div>")).toBeNull();
  });
});

describe("extractReadmeVersion", () => {
  test("extracts the padded version from a README version line", () => {
    const md = "**Version:** 1.9.86.0 | **Platform:** Chrome";
    expect(extractReadmeVersion(md)).toBe("1.9.86.0");
  });

  test("extracts a Russian version line", () => {
    const md = "**Версия:** 1.9.86";
    expect(extractReadmeVersion(md)).toBe("1.9.86");
  });

  test("returns null when no version line is present", () => {
    expect(extractReadmeVersion("# Plain heading only")).toBeNull();
  });
});

describe("checkVersions", () => {
  const manifest = '{\n  "version": "1.9.86.0"\n}';
  const matches = { manifest, package: manifest, js: 'export const VERSION = "1.9.86.0";' };
  const sources = { package: "package", js: "src/lib/version.js" };

  test("reports no mismatch when all versions agree", () => {
    const result = checkVersions(manifest, matches, sources);
    expect(result.mismatches).toHaveLength(0);
  });

  test("reports a mismatch when a source differs", () => {
    const result = checkVersions(manifest, { ...matches, package: '{\n  "version": "1.9.87.0"\n}' }, sources);
    expect(result.mismatches).toContain("package");
  });

  test("accepts a three-part source version as matching", () => {
    const result = checkVersions(manifest, { ...matches, js: 'export const VERSION = "1.9.86";' }, sources);
    expect(result.mismatches).toHaveLength(0);
  });
});

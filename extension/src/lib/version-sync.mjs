/**
 * Version Sync -- ensures all version references in the extension are
 * consistent with manifest.json (the single source of truth).
 */

export function normalizeVersion(version) {
  const parts = version.split(".");
  while (parts.length < 4) {
    parts.push("0");
  }
  return parts.join(".");
}

export function versionsMatch(a, b) {
  return normalizeVersion(a) === normalizeVersion(b);
}

export function extractJsonVersion(content, field) {
  try {
    const parsed = JSON.parse(content);
    return parsed[field] ?? null;
  } catch {
    return null;
  }
}

export function extractJsVersion(content) {
  const match = content.match(/VERSION\s*=\s*['"]([^'"]+)['"]/);
  return match ? match[1] : null;
}

export function extractHtmlVersion(content) {
  const match = content.match(/v?(\d+\.\d+\.\d+(?:\.\d+)?)/);
  return match ? match[1] : null;
}

export function extractReadmeVersion(content) {
  const match = content.match(/(?:версия|version)[\s*:]*v?(\d+\.\d+\.\d+(?:\.\d+)?)/i);
  return match ? match[1] : null;
}

export function checkVersions(manifestContent, sourcesContents, sourceLabels) {
  const truth = extractJsonVersion(manifestContent, "version") ?? "";
  const mismatches = [];

  for (const key of Object.keys(sourcesContents)) {
    const content = sourcesContents[key];
    const version = (() => {
      if (key === "package") return extractJsonVersion(content, "version");
      if (key === "js") return extractJsVersion(content);
      if (key === "html") return extractHtmlVersion(content);
      if (key === "readme") return extractReadmeVersion(content);
      return null;
    })();

    if (version != null && !versionsMatch(truth, version)) {
      mismatches.push(sourceLabels[key] ?? key);
    }
  }

  return { truth, mismatches };
}

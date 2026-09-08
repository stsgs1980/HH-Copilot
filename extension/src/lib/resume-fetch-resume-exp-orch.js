/**
 * Resume experience orchestrator -- Strategies 1-6 + iframe visibility override.
 *
 * Coordinates experience parsing strategies and applies iframe-based
 * visibility detection overrides (the most reliable source).
 *
 * Split from resume-fetch-resume.js for anti-monolith compliance.
 */
import { createLogger } from "./anti-hallucination.js";
import { parseExperienceFromDocStrategies1to3 } from "./resume-fetch-experience.js";
import { parseExperienceFromHtmlText } from "./resume-fetch-strategy4-text.js";
import { parseExperienceFromScripts } from "./resume-fetch-strategy5-scripts.js";
import { fetchExpandedExperience } from "./resume-fetch-strategy6-expand.js";

const expLog = createLogger("ResumeFetch");

/**
 * Orchestrate experience parsing using all 6 strategies in sequence.
 * Also applies iframe visibility overrides from Strategy 6.
 *
 * Modifies `resume` object in-place.
 *
 * @param {Document} doc - Parsed document
 * @param {Function} dbg - Debug logger callback
 * @param {object} resume - Resume object to populate
 * @param {string} html - Raw HTML string
 * @param {string} resumeUrl - Resume page URL (for Strategy 6)
 */
export async function parseExperienceFromDoc(doc, dbg, resume, html, resumeUrl) {
  // Strategies 1-3: DOM-based parsing
  const entries = parseExperienceFromDocStrategies1to3(doc, resume);

  // Strategy 4: Parse experience from raw HTML text patterns
  if (html && entries.length > 0) {
    const textParsed = parseExperienceFromHtmlText(html, entries.length);
    if (textParsed.length > entries.length) {
      expLog.info(
        "Strategy 4 (text patterns): found " + textParsed.length + " experiences (was " + entries.length + ")",
      );
      resume._debug.found.push("experience (text pattern supplement): " + textParsed.length);
      entries.length = 0;
      entries.push(...textParsed);
    }
  }

  // Strategy 5: Parse experience from Magritte <script> hydration JSON
  if (html) {
    const scriptParsed = parseExperienceFromScripts(doc, html);
    if (scriptParsed.length > entries.length) {
      expLog.info(
        "Strategy 5 (script JSON): found " + scriptParsed.length + " experiences (was " + entries.length + ")",
      );
      resume._debug.found.push("experience (script JSON): " + scriptParsed.length);
      entries.length = 0;
      entries.push(...scriptParsed);
    } else if (scriptParsed.length > 0) {
      expLog.info(
        "Strategy 5 (script JSON): found " +
          scriptParsed.length +
          " experiences (not more than " +
          entries.length +
          ", skipping)",
      );
    }
  }

  // Strategy 6: Fetch expanded experience via AJAX/API endpoints
  if (html && entries.length > 0 && entries.length < 20) {
    try {
      const s6result = await fetchExpandedExperience(doc, html, resume.id, entries.length, resumeUrl);
      if (s6result.entries && s6result.entries.length > entries.length) {
        expLog.info(
          "Strategy 6 (expanded fetch): found " + s6result.entries.length + " experiences (was " + entries.length + ")",
        );
        resume._debug.found.push("experience (expanded fetch): " + s6result.entries.length);
        entries.length = 0;
        entries.push(...s6result.entries);
      }
    } catch (err) {
      expLog.warn("Strategy 6 failed: " + err.message);
    }
  }

  resume.experience = entries;
  if (entries.length > 0) resume._debug.found.push("experience: " + entries.length);
  else resume._debug.missing.push("experience (0 entries)");
}

/**
 * Next.js Instrumentation — loads resume data on server startup.
 * FastAPI backend is no longer needed — all logic runs in Next.js API routes.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Dynamic import to avoid Edge Runtime issues
    const { readFile } = await import("fs/promises");
    const { join } = await import("path");

    // Pre-load resume data so the first request is fast
    try {
      const resumesPath = join(process.cwd(), "download", "output", "parsed_resumes.json");
      const raw = await readFile(resumesPath, "utf-8");
      const data = JSON.parse(raw);
      const count = (data.resumes || []).length;
      console.log(`[instrumentation] Resume data loaded. ${count} resumes found.`);
    } catch {
      console.log("[instrumentation] No resume data file found — search will work without match scoring.");
    }
  }
}

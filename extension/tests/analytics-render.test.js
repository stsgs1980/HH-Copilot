import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/ui/state.js", () => ({
  refs: { shadowRoot: null },
}));

vi.mock("../src/ui/html.js", () => ({
  esc: (s) => s || "",
}));

import { refs } from "../src/ui/state.js";
import { renderAnalytics } from "../src/ui/tabs/analytics-render.js";

function setupDom() {
  const root = document.createElement("div");
  const content = document.createElement("div");
  content.id = "analytics-content";
  const empty = document.createElement("div");
  empty.id = "analytics-empty";
  const avgEl = document.createElement("span");
  avgEl.id = "analytics-avg-score";
  const totalEl = document.createElement("span");
  totalEl.id = "analytics-total";
  const topSkillEl = document.createElement("span");
  topSkillEl.id = "analytics-top-skill";
  const skillsList = document.createElement("div");
  skillsList.id = "analytics-skills-list";

  content.appendChild(avgEl);
  content.appendChild(totalEl);
  content.appendChild(topSkillEl);
  content.appendChild(skillsList);
  root.appendChild(content);
  root.appendChild(empty);

  refs.shadowRoot = { getElementById: (id) => root.querySelector("#" + id) };
  return { content, empty, avgEl, totalEl, topSkillEl, skillsList };
}

describe("renderAnalytics", () => {
  beforeEach(() => {
    refs.shadowRoot = null;
  });

  it("shows empty state when vacancies is empty array", () => {
    const { content, empty } = setupDom();
    renderAnalytics([], null);
    expect(content.style.display).toBe("none");
    expect(empty.style.display).toBe("");
  });

  it("shows empty state when vacancies is null", () => {
    const { content, empty } = setupDom();
    renderAnalytics(null, null);
    expect(content.style.display).toBe("none");
    expect(empty.style.display).toBe("");
  });

  it("shows content when vacancies exist", () => {
    const { content, empty } = setupDom();
    const vacancies = [{ matchScore: 80, keySkills: [] }];
    renderAnalytics(vacancies, null);
    expect(content.style.display).toBe("");
    expect(empty.style.display).toBe("none");
  });

  it("calculates average score correctly", () => {
    const { avgEl } = setupDom();
    const vacancies = [
      { matchScore: 60, keySkills: [] },
      { matchScore: 80, keySkills: [] },
      { matchScore: 100, keySkills: [] },
    ];
    renderAnalytics(vacancies, null);
    expect(avgEl.textContent).toBe("80%");
  });

  it("handles vacancies with null matchScore", () => {
    const { avgEl } = setupDom();
    const vacancies = [
      { matchScore: null, keySkills: [] },
      { matchScore: 90, keySkills: [] },
      { matchScore: null, keySkills: [] },
    ];
    renderAnalytics(vacancies, null);
    expect(avgEl.textContent).toBe("90%");
  });

  it("shows total vacancy count", () => {
    const { totalEl } = setupDom();
    const vacancies = [
      { matchScore: 50, keySkills: [] },
      { matchScore: 70, keySkills: [] },
    ];
    renderAnalytics(vacancies, null);
    expect(totalEl.textContent).toBe("2");
  });

  it("shows top skill name", () => {
    const { topSkillEl } = setupDom();
    const vacancies = [
      { matchScore: 80, keySkills: ["JavaScript", "TypeScript", "React"] },
      { matchScore: 70, keySkills: ["JavaScript", "Vue"] },
    ];
    renderAnalytics(vacancies, null);
    expect(topSkillEl.textContent).toBe("JavaScript");
  });

  it("handles mixed string/{name} skill formats", () => {
    const { topSkillEl, skillsList } = setupDom();
    const vacancies = [
      { matchScore: 80, keySkills: ["JavaScript", { name: "TypeScript" }, { name: "JavaScript" }] },
      { matchScore: 70, keySkills: ["Vue", { name: "JavaScript" }] },
    ];
    renderAnalytics(vacancies, null);
    expect(topSkillEl.textContent).toBe("JavaScript");
    expect(skillsList.innerHTML).toContain("JavaScript (3)");
    expect(skillsList.innerHTML).toContain("TypeScript (1)");
    expect(skillsList.innerHTML).toContain("Vue (1)");
  });

  it("sorts skills by count descending and limits to top 10", () => {
    const { skillsList } = setupDom();
    const skills = Array.from({ length: 15 }, (_, i) => `Skill${i}`);
    const vacancies = skills.map((s, i) => ({
      matchScore: 60,
      keySkills: [s, ...skills.slice(0, i)],
    }));
    renderAnalytics(vacancies, null);
    const spans = skillsList.querySelectorAll("span");
    expect(spans.length).toBe(10);
    expect(spans[0].textContent).toContain("Skill0");
  });

  it("returns early when DOM elements missing", () => {
    refs.shadowRoot = { getElementById: () => null };
    expect(() => renderAnalytics([{ matchScore: 80 }], null)).not.toThrow();
  });
});

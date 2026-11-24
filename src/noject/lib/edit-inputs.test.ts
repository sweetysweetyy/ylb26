import { describe, expect, it } from "vitest";
import { taskPatchSchema, projectPatchSchema } from "./edit-inputs";

describe("Noject edit permissions", () => {
  it("task edits cannot change identity, ownership, project, or server completion dates", () => {
    for (const patch of [{ id: "other" }, { user_id: "other" }, { project_id: "other" }, { completed_at: "2026-01-01" }]) {
      expect(() => taskPatchSchema.parse(patch)).toThrow();
    }
    expect(taskPatchSchema.parse({ status: "termine", title: "Review" })).toEqual({ status: "termine", title: "Review" });
  });
  it("project edits cannot change ownership or calculated fields", () => {
    for (const patch of [{ user_id: "other" }, { id: "other" }, { progress: 100 }, { health_score: 100 }, { ai_plan: {} }]) {
      expect(() => projectPatchSchema.parse(patch)).toThrow();
    }
    expect(projectPatchSchema.parse({ name: "Plan", budget: 1000, phase: "execution" })).toEqual({ name: "Plan", budget: 1000, phase: "execution" });
  });
});
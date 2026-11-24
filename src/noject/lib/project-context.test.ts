import { describe, expect, it, vi } from "vitest";
import { loadOwnedProjectContext } from "./project-context.server";
import type { nj } from "./db";

function database(project: unknown) {
  const reads: Array<{ table: string; filters: Record<string, string> }> = [];
  const from = vi.fn((table: string) => {
    const filters: Record<string, string> = {};
    reads.push({ table, filters });
    const chain = {
      select: () => chain,
      eq: (key: string, value: string) => { filters[key] = value; return chain; },
      maybeSingle: async () => ({ data: project, error: null }),
      then: (resolve: (value: { data: never[] }) => unknown) => Promise.resolve(resolve({ data: [] })),
    };
    return chain;
  });
  return { db: { from } as unknown as ReturnType<typeof nj>, reads, from };
}

describe("Noject coaching access", () => {
  it("rejects foreign projects before reading their details", async () => {
    const fixture = database(null);
    await expect(loadOwnedProjectContext(fixture.db, "owner", "foreign-project")).rejects.toThrow();
    expect(fixture.from).toHaveBeenCalledTimes(1);
    expect(fixture.reads[0]?.filters).toEqual({ id: "foreign-project", user_id: "owner" });
  });
  it("loads only the owner's tasks, events, expenses and time", async () => {
    const fixture = database({ id: "project", user_id: "owner" });
    const result = await loadOwnedProjectContext(fixture.db, "owner", "project");
    expect(result.project).toEqual({ id: "project", user_id: "owner" });
    expect(fixture.reads).toHaveLength(5);
    for (const read of fixture.reads.slice(1)) expect(read.filters).toEqual({ project_id: "project", user_id: "owner" });
  });
});
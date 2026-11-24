import type { nj } from "./db";

export async function loadOwnedProjectContext(db: ReturnType<typeof nj>, userId: string, projectId: string) {
  const { data: project, error } = await db.from("noject_projects").select("*").eq("id", projectId).eq("user_id", userId).maybeSingle();
  if (error || !project) throw new Error("Projet introuvable");
  const [{ data: tasks }, { data: events }, { data: expenses }, { data: timeEntries }] = await Promise.all([
    db.from("noject_tasks").select("*").eq("project_id", projectId).eq("user_id", userId),
    db.from("noject_calendar_events").select("*").eq("project_id", projectId).eq("user_id", userId),
    db.from("noject_expenses").select("*").eq("project_id", projectId).eq("user_id", userId),
    db.from("noject_time_entries").select("*").eq("project_id", projectId).eq("user_id", userId),
  ]);
  return { project, tasks: tasks ?? [], events: events ?? [], expenses: expenses ?? [], timeEntries: timeEntries ?? [] };
}
// Studio Produit owns only sp_ tables (sp_shoots, sp_shots, sp_drive_accounts, sp_drive_imports, sp_oauth_states); they are not in the generated types.
export type SpShoot = { id: string; user_id: string; product_name: string; source_path: string; analysis: unknown; settings: Record<string, unknown>; status: string; origin: string; drive_upload_status: string | null; created_at: string; updated_at: string };
export type SpShot = { id: string; shoot_id: string; user_id: string; position: number; title: string; intent: string; prompt: string; image_path: string | null; status: string; error: string | null; created_at: string; updated_at: string };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const sp = (client: unknown) => client as any;

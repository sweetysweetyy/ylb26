// Coussel owns only csl_ tables (csl_carousels, csl_slides); they are not in the generated types.
export type CslCarousel = { id: string; user_id: string; topic: string; title: string; idea: string | null; settings: Record<string, unknown>; sources: { label?: string; url?: string }[]; status: string; error: string | null; created_at: string; updated_at: string };
export type CslSlide = { id: string; carousel_id: string; user_id: string; position: number; role: string | null; headline: string | null; body: string | null; visual_prompt: string | null; image_url: string | null; status: string; created_at: string };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const csl = (client: unknown) => client as any;

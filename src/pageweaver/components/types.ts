import type { Design } from "@/pageweaver/lib/ai.functions";

export type Marker = { id: string; x: number; y: number; note: string };
export type Stroke = { id: string; points: [number, number][]; note: string };
export type Annotations = { markers: Marker[]; strokes: Stroke[] };

export type SectionConfig = {
  layout?: string;
  background?: string;
  height?: string;
  animation?: string;
  stagger?: boolean;
  hover?: boolean;
  float?: boolean;
  marquee?: boolean;
  extra?: string;
  history?: string[];
  request?: string;
};

export type Section = {
  id: string;
  project_id: string;
  title: string;
  description: string;
  config: SectionConfig;
  html: string | null;
  status: string;
  x: number;
  y: number;
  annotations: Annotations;
  in_page: boolean;
  page_order: number;
};

export type Project = {
  id: string;
  name: string;
  brief: string;
  design: Design;
  page_html: string | null;
  page_x: number;
  page_y: number;
};

export const CARD_W = 640;
export const VIRTUAL_W = 1280;
export const SCALE = CARD_W / VIRTUAL_W;

export const uid = () => Math.random().toString(36).slice(2, 10);

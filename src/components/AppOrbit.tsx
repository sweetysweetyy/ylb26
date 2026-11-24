import { useNavigate } from "@tanstack/react-router";
import { Activity, Headphones, FileScan, Cloud, ListChecks, CalendarDays, FileText, Sheet, Mail, Home, Workflow, Users, Bot, ReceiptEuro, Mic, StickyNote, Briefcase, FolderKanban, NotebookPen, ShoppingCart, Calculator, Presentation, Linkedin, BriefcaseBusiness, Radar, QrCode, Building2, Sofa, GalleryHorizontal, Camera, Globe, LayoutTemplate, Target, type LucideIcon } from "lucide-react";

export type SkyApp = { id: string; name: string; desc: string; to: string; icon: LucideIcon; color: string };

/** Every app of the lab, shown in the orbit opened by holding the Aura button. */
export const SKY_APPS: SkyApp[] = [
  { id: "home", name: "COCKPIT", desc: "Accueil du laboratoire", to: "/dashboard", icon: Home, color: "#FCF6F3" },
  { id: "mm", name: "MYMACKENZY", desc: "Automatisations", to: "/mm/cockpit", icon: Workflow, color: "#a78bfa" },
  { id: "st", name: "SMART TEAMS", desc: "Équipes d'agents IA", to: "/smartteams", icon: Users, color: "#4ade80" },
  { id: "ock", name: "OCKTAVUS", desc: "Google Workspace", to: "/ocktavus", icon: Bot, color: "#2dd4bf" },
  { id: "angelo", name: "ANGELO", desc: "Factures Odoo", to: "/angelo/tableau-de-bord", icon: ReceiptEuro, color: "#fbbf24" },
  { id: "memo", name: "MEMOTRACK", desc: "Mémos de réunion", to: "/memotrack", icon: Mic, color: "#22d3ee" },
  { id: "tep", name: "TEP", desc: "Tableaux & post-it", to: "/tep", icon: StickyNote, color: "#fb7185" },
  { id: "cloud", name: "SKY CLOUD", desc: "Stockage sécurisé", to: "/sky/cloud", icon: Cloud, color: "#38bdf8" },
  { id: "task", name: "SKY TASK", desc: "Tâches & notes", to: "/skytask", icon: ListChecks, color: "#f472b6" },
  { id: "cal", name: "CALENDSKY", desc: "Planning intelligent", to: "/calendsky/planning", icon: CalendarDays, color: "#facc15" },
  { id: "doc", name: "SKYDOC", desc: "Documents IA", to: "/skydoc/dashboard", icon: FileText, color: "#c4b5fd" },
  { id: "tab", name: "SKYTAB", desc: "Tableur IA", to: "/skytab/dashboard", icon: Sheet, color: "#86efac" },
  { id: "mail", name: "SENDYME", desc: "Messagerie", to: "/sendy", icon: Mail, color: "#fb923c" },
  { id: "crm", name: "NOVA CRM", desc: "Pipeline & opportunités", to: "/crm/dashboard", icon: Briefcase, color: "#60a5fa" },
  { id: "noject", name: "NOJECT", desc: "Gestion de projets", to: "/noject/dashboard", icon: FolderKanban, color: "#e879f9" },
  { id: "planning", name: "PLANNING", desc: "Post-it & agenda", to: "/planning", icon: NotebookPen, color: "#a3e635" },
  { id: "skyvente", name: "SKYVENTE", desc: "Devis & factures", to: "/skyvente", icon: ReceiptEuro, color: "#34d399" },
  { id: "skyachat", name: "SKYACHAT", desc: "Achats fournisseurs", to: "/skyachat/dashboard", icon: ShoppingCart, color: "#38bdf8" },
  { id: "skycomptable", name: "SKYCOMPTABLE", desc: "Comptabilité générale", to: "/skycomptable/dashboard", icon: Calculator, color: "#a78bfa" },
  { id: "dyap", name: "DYAP", desc: "Diaporamas IA", to: "/dyap/dashboard", icon: Presentation, color: "#22d3ee" },
  { id: "businessplan", name: "BUSINESS PLAN", desc: "Dossiers de financement", to: "/businessplan", icon: Presentation, color: "#f59e0b" },
  { id: "cml", name: "HOLO CM", desc: "LinkedIn IA", to: "/cml/dashboard", icon: Linkedin, color: "#5DF8D8" },
  { id: "nexusjob", name: "NEXUSJOB", desc: "Emploi IA", to: "/nexusjob/dashboard", icon: BriefcaseBusiness, color: "#FFB116" },
  { id: "etudedemarche", name: "ÉTUDE MARCHÉ", desc: "Études de marché IA", to: "/etudedemarche", icon: FileText, color: "#06b6d4" },
  { id: "chytect", name: "CHYTECT", desc: "Aménagement IA sur photo", to: "/chytect", icon: Sofa, color: "#22d3ee" },
  { id: "coussel", name: "COUSSEL", desc: "Carrousels illustrés IA", to: "/coussel/dashboard", icon: GalleryHorizontal, color: "#f97316" },
  { id: "studioproduit", name: "STUDIO PRODUIT", desc: "Photos produit IA", to: "/studioproduit/dashboard", icon: Camera, color: "#e7a14a" },
  { id: "immo", name: "ATELIERIMMO", desc: "Fiches immobilières IA", to: "/immo", icon: Building2, color: "#f59e0b" },
  { id: "caisse", name: "CAISSE VOCALE", desc: "Caisse Odoo à la voix", to: "/caisse/dashboard", icon: Mic, color: "#d946ef" },
  { id: "odooweb", name: "ODOO SITE", desc: "Site web Odoo par l’IA", to: "/odooweb/dashboard", icon: Globe, color: "#c0502e" },
  { id: "pageweaver", name: "PAGE WEAVER", desc: "Maquettes de pages web par l’IA", to: "/pageweaver/dashboard", icon: LayoutTemplate, color: "#d9662b" },
  { id: "pulse", name: "PULSE", desc: "Santé économique Odoo et analyste vocal", to: "/pulse", icon: Activity, color: "#2fc4a8" },
  { id: "pulsesupport", name: "PULSESUPPORT", desc: "Support client vocal relié à Odoo", to: "/pulsesupport/dashboard", icon: Headphones, color: "#2f7f86" },
  { id: "kooky", name: "KOOKY", desc: "Prospects analysés vers Odoo CRM", to: "/kooky/dashboard", icon: Target, color: "#e8a93a" },
  { id: "ecoflux", name: "ECOFLUX", desc: "Ingénierie économique des processus", to: "/ecoflux/dashboard", icon: Workflow, color: "#8b5cf6" },
  { id: "facturodoo", name: "FACTURODOO", desc: "Factures fournisseurs PDF vers Odoo", to: "/facturodoo", icon: FileScan, color: "#c47a3a" },
  { id: "queueflow", name: "QUEUE FLOW", desc: "Salle d’attente virtuelle", to: "/queueflow/dashboard", icon: QrCode, color: "#14b8a6" },
  { id: "financierplan", name: "FINANCIERPLAN", desc: "Prévisionnel financier IA", to: "/financierplan/dashboard", icon: FileText, color: "#8b5cf6" },
  { id: "prospect", name: "PROSPECT", desc: "Prospection IA avec OLLY", to: "/prospect", icon: Radar, color: "#5da5b3" },
  { id: "feeloo", name: "FEELOO", desc: "Cockpit RH IA", to: "/feeloo", icon: Users, color: "#FE017C" },
];

/** Ring of sk-glass sk-glass pods orbiting; each logo also spins on itself. */
export function AppOrbit({ size = 420, onPick, showLabels = true }: { size?: number; onPick?: () => void; showLabels?: boolean }) {
  const nav = useNavigate();
  const pod = Math.round(size * (SKY_APPS.length > 8 ? 0.13 : 0.22));
  const r = size / 2 - pod / 2 - 4;
  return (
    <div className="sky-orbit relative" style={{ width: size, height: size }}>
      <div className="sky-orbit-ring absolute rounded-full" style={{ inset: pod / 2 }} />
      <div className="sky-orbit-ring sky-orbit-ring-2 absolute rounded-full" style={{ inset: pod / 2 + 10 }} />
      <div className="sky-orbit-spin absolute inset-0">
        {SKY_APPS.map((a, i) => {
          const ang = (i / SKY_APPS.length) * Math.PI * 2 - Math.PI / 2;
          const x = size / 2 + r * Math.cos(ang) - pod / 2;
          const y = size / 2 + r * Math.sin(ang) - pod / 2;
          const Icon = a.icon;
          return (
            <button
              key={a.id}
              type="button"
              aria-label={`Ouvrir ${a.name}`}
              title={`${a.name} — ${a.desc}`}
              onClick={() => { onPick?.(); nav({ to: a.to }); }}
              className="sky-orbit-pod group absolute flex flex-col items-center justify-center rounded-[28%]"
              style={{ left: x, top: y, width: pod, height: pod, ["--pod" as string]: a.color }}
            >
              <Icon className="sky-orbit-logo" style={{ width: pod * 0.42, height: pod * 0.42, color: a.color }} />
              {showLabels && (
                <span className="sky-orbit-label pointer-events-none absolute -bottom-7 whitespace-nowrap text-xs font-semibold tracking-wide">
                  {a.name}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

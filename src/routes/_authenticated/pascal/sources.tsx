import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listSources, createSource, deleteSource, scanNow } from "@/pascal/lib/sources.functions";
import { listSpreadsheetTabs, previewSheetHeaders } from "@/pascal/lib/google.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2, Plus, RefreshCw, Sheet } from "lucide-react";

export const Route = createFileRoute("/_authenticated/pascal/sources")({ component: SourcesPage });

function SourcesPage() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["sources"], queryFn: () => listSources() });
  const del = useMutation({ mutationFn: (id: string) => deleteSource({ data: { id } }), onSuccess: () => qc.invalidateQueries({ queryKey: ["sources"] }) });
  const scan = useMutation({
    mutationFn: () => scanNow(),
    onSuccess: (r) => { toast.success(`Scan: ${r.added} prospects ajoutes, ${r.sent} envois.`); qc.invalidateQueries(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur"),
  });

  return (
    <div className="space-y-6 max-w-5xl">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Sources Google Sheets</h1>
          <p className="text-sm text-muted-foreground">Chaque source est scrutee en continu. Les nouveaux prospects sont automatiquement contactes.</p>
        </div>
        <Button onClick={() => scan.mutate()} disabled={scan.isPending} variant="outline">
          <RefreshCw className={`size-4 mr-2 ${scan.isPending ? "animate-spin" : ""}`} /> Scanner maintenant
        </Button>
      </header>

      <NewSourceForm />

      <div className="grid gap-3">
        {(list.data ?? []).map((s) => (
          <div key={s.id} className="surface-1 p-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 font-medium"><Sheet className="size-4 text-primary" /> {s.display_name ?? s.sheet_name}</div>
              <div className="text-xs text-muted-foreground font-mono mt-1 break-all">{s.spreadsheet_id} · onglet "{s.sheet_name}"</div>
              <div className="text-xs text-muted-foreground mt-1">Colonnes : email=<b>{s.email_column}</b>{s.name_column ? `, nom=${s.name_column}` : ""}{s.company_column ? `, societe=${s.company_column}` : ""}{s.context_column ? `, contexte=${s.context_column}` : ""}</div>
            </div>
            <Button size="icon" variant="ghost" onClick={() => del.mutate(s.id)}><Trash2 className="size-4" /></Button>
          </div>
        ))}
        {(list.data ?? []).length === 0 && <div className="surface-1 p-8 text-center text-muted-foreground text-sm">Aucune source. Ajoutez votre premiere Google Sheet ci-dessus.</div>}
      </div>
    </div>
  );
}

function NewSourceForm() {
  const qc = useQueryClient();
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [tabs, setTabs] = useState<string[]>([]);
  const [sheetName, setSheetName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [emailCol, setEmailCol] = useState("");
  const [nameCol, setNameCol] = useState("");
  const [companyCol, setCompanyCol] = useState("");
  const [contextCol, setContextCol] = useState("");
  const [displayName, setDisplayName] = useState("");

  function parseId(input: string) {
    const m = input.match(/\/d\/([a-zA-Z0-9_-]{20,})/);
    return m ? m[1] : input.trim();
  }

  const loadTabs = useMutation({
    mutationFn: async () => {
      const id = parseId(spreadsheetId);
      setSpreadsheetId(id);
      const r = await listSpreadsheetTabs({ data: { spreadsheetId: id } });
      setTabs(r.tabs);
      if (!displayName) setDisplayName(r.title);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Impossible d'acceder a la Sheet (verifiez que Google est connecte)"),
  });

  const loadHeaders = useMutation({
    mutationFn: async (sn: string) => {
      const r = await previewSheetHeaders({ data: { spreadsheetId, sheetName: sn } });
      setHeaders(r.headers);
      const guess = r.headers.find((h) => /e-?mail/i.test(h));
      if (guess) setEmailCol(guess);
    },
  });

  const create = useMutation({
    mutationFn: () => createSource({ data: {
      spreadsheet_id: spreadsheetId, sheet_name: sheetName, display_name: displayName || undefined,
      email_column: emailCol, name_column: nameCol || undefined, company_column: companyCol || undefined, context_column: contextCol || undefined,
    }}),
    onSuccess: () => {
      toast.success("Source ajoutee.");
      qc.invalidateQueries({ queryKey: ["sources"] });
      setSpreadsheetId(""); setTabs([]); setSheetName(""); setHeaders([]); setEmailCol(""); setNameCol(""); setCompanyCol(""); setContextCol(""); setDisplayName("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur"),
  });

  return (
    <div className="surface-1 p-5 space-y-4">
      <h3 className="font-semibold flex items-center gap-2"><Plus className="size-4" /> Nouvelle source</h3>
      <div className="grid lg:grid-cols-[1fr_auto] gap-2">
        <div>
          <Label>URL ou ID Google Sheet</Label>
          <Input value={spreadsheetId} onChange={(e) => setSpreadsheetId(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/..." />
        </div>
        <Button onClick={() => loadTabs.mutate()} disabled={!spreadsheetId || loadTabs.isPending} className="self-end">Charger</Button>
      </div>
      {tabs.length > 0 && (
        <div className="grid lg:grid-cols-2 gap-2">
          <div>
            <Label>Onglet</Label>
            <Select value={sheetName} onValueChange={(v) => { setSheetName(v); loadHeaders.mutate(v); }}>
              <SelectTrigger><SelectValue placeholder="Choisir un onglet" /></SelectTrigger>
              <SelectContent>{tabs.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Nom d'affichage</Label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
        </div>
      )}
      {headers.length > 0 && (
        <div className="grid lg:grid-cols-2 gap-3">
          <ColumnSelect label="Colonne email (obligatoire)" value={emailCol} onChange={setEmailCol} headers={headers} required />
          <ColumnSelect label="Colonne nom" value={nameCol} onChange={setNameCol} headers={headers} />
          <ColumnSelect label="Colonne societe" value={companyCol} onChange={setCompanyCol} headers={headers} />
          <ColumnSelect label="Colonne contexte" value={contextCol} onChange={setContextCol} headers={headers} />
        </div>
      )}
      {headers.length > 0 && (
        <Button onClick={() => create.mutate()} disabled={!emailCol || create.isPending} className="glow-primary">Ajouter la source</Button>
      )}
    </div>
  );
}

function ColumnSelect({ label, value, onChange, headers, required }: { label: string; value: string; onChange: (v: string) => void; headers: string[]; required?: boolean }) {
  return (
    <div>
      <Label>{label}</Label>
      <Select value={value || "__none"} onValueChange={(v) => onChange(v === "__none" ? "" : v)}>
        <SelectTrigger><SelectValue placeholder="(aucune)" /></SelectTrigger>
        <SelectContent>
          {!required && <SelectItem value="__none">(aucune)</SelectItem>}
          {headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
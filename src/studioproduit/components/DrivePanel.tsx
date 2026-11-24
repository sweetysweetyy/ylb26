import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import {
  createDriveFolder,
  disconnectDrive,
  getDriveStatus,
  listDriveFolders,
  listDriveImports,
  runDriveNow,
  saveDriveConfig,
  startDriveConnect,
  type DriveStatus,
} from "@/studioproduit/lib/drive.functions";

type Folder = { id: string; name: string };
type ImportRow = {
  id: string;
  file_name: string | null;
  status: string;
  error: string | null;
  created_at: string;
};

function FolderPicker({
  label,
  value,
  folders,
  busy,
  onSearch,
  onPick,
  onCreate,
}: {
  label: string;
  value: Folder | null;
  folders: Folder[];
  busy: boolean;
  onSearch: (q: string) => void;
  onPick: (f: Folder | null) => void;
  onCreate: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  return (
    <div className="rounded-2xl border border-border bg-secondary/30 p-4">
      <p className="mb-1.5 text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-sm">{value ? value.name : "Aucun dossier choisi"}</p>
        <button
          type="button"
          className="sp-btn-ghost shrink-0 px-3 py-1.5 text-xs hover:bg-secondary"
          onClick={() => {
            setOpen((o) => !o);
            if (!open) onSearch("");
          }}
        >
          {open ? "Fermer" : "Choisir"}
        </button>
      </div>

      {open && (
        <div className="mt-3 space-y-2">
          <div className="flex gap-2">
            <input
              className="sp-field focus:sp-field-focus"
              placeholder="Rechercher un dossier…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                onSearch(e.target.value);
              }}
            />
            <button
              type="button"
              disabled={busy || !query.trim()}
              onClick={() => {
                onCreate(query.trim());
                setQuery("");
              }}
              className="sp-btn-ghost shrink-0 px-3 py-1.5 text-xs hover:bg-secondary disabled:opacity-40"
            >
              Créer
            </button>
          </div>
          <div className="max-h-52 space-y-1 overflow-y-auto">
            {busy && <p className="text-xs text-muted-foreground">Chargement…</p>}
            {!busy && folders.length === 0 && (
              <p className="text-xs text-muted-foreground">Aucun dossier trouvé.</p>
            )}
            {folders.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  onPick(f);
                  setOpen(false);
                }}
                className="block w-full truncate rounded-lg px-3 py-2 text-left text-sm hover:bg-secondary"
              >
                {f.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function DrivePanel() {
  const status = useServerFn(getDriveStatus);
  const connect = useServerFn(startDriveConnect);
  const folders = useServerFn(listDriveFolders);
  const createFolder = useServerFn(createDriveFolder);
  const save = useServerFn(saveDriveConfig);
  const disconnect = useServerFn(disconnectDrive);
  const runNow = useServerFn(runDriveNow);
  const imports = useServerFn(listDriveImports);

  const [state, setState] = useState<DriveStatus | null>(null);
  const [list, setList] = useState<Folder[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const s = await status({});
      setState(s);
      if (s.connected) setRows((await imports({})) as ImportRow[]);
    } catch {
      /* silencieux : le panneau reste masqué */
    }
  }, [status, imports]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Retour depuis Google
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const drive = params.get("drive");
    if (!drive) return;
    if (drive === "connected") toast.success("Google Drive est connecté.");
    else toast.error(params.get("message") ?? "Connexion Google impossible.");
    window.history.replaceState({}, "", window.location.pathname);
    void refresh();
  }, [refresh]);

  async function searchFolders(query: string) {
    setLoadingFolders(true);
    try {
      setList((await folders({ data: { query } })) as Folder[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lecture des dossiers impossible");
    } finally {
      setLoadingFolders(false);
    }
  }

  async function patch(data: Parameters<typeof save>[0] extends { data: infer D } ? D : never) {
    setBusy(true);
    try {
      await save({ data });
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Enregistrement impossible");
    } finally {
      setBusy(false);
    }
  }

  async function newFolder(name: string, target: "watch" | "output") {
    setBusy(true);
    try {
      const created = (await createFolder({ data: { name } })) as Folder;
      await patch(target === "watch" ? { watchFolder: created } : { outputFolder: created });
      toast.success(`Dossier « ${created.name} » créé dans votre Drive.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Création impossible");
    } finally {
      setBusy(false);
    }
  }

  if (!state) return null;

  return (
    <section className="sp-card-lift mt-12 rounded-3xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl">Automatisation Google Drive</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Déposez une photo produit dans le dossier surveillé : les 5 photos sont créées puis
            déposées automatiquement dans votre dossier de destination.
          </p>
        </div>
        {state.connected ? (
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-secondary px-3 py-1 text-xs">{state.email}</span>
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={async () => {
                await disconnect({});
                await refresh();
                toast.success("Compte Google déconnecté.");
              }}
            >
              Déconnecter
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="sp-btn-primary hover:brightness-110"
            onClick={async () => {
              try {
                const { url } = await connect({});
                window.location.href = url;
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Connexion impossible");
              }
            }}
          >
            Connecter Google Drive
          </button>
        )}
      </div>

      {state.connected && (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <FolderPicker
              label="Dossier surveillé"
              value={state.watchFolder}
              folders={list}
              busy={loadingFolders || busy}
              onSearch={(q) => void searchFolders(q)}
              onPick={(f) => void patch({ watchFolder: f })}
              onCreate={(n) => void newFolder(n, "watch")}
            />
            <FolderPicker
              label="Dossier de destination"
              value={state.outputFolder}
              folders={list}
              busy={loadingFolders || busy}
              onSearch={(q) => void searchFolders(q)}
              onPick={(f) => void patch({ outputFolder: f })}
              onCreate={(n) => void newFolder(n, "output")}
            />
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => void patch({ autoEnabled: !state.autoEnabled })}
              className={`rounded-xl border px-4 py-2 text-sm transition-colors ${
                state.autoEnabled
                  ? "border-ring bg-secondary text-foreground"
                  : "border-border text-muted-foreground hover:bg-secondary/60"
              }`}
            >
              {state.autoEnabled ? "Automatisation active" : "Automatisation en pause"}
            </button>
            <button
              type="button"
              disabled={busy}
              className="sp-btn-ghost text-sm hover:bg-secondary disabled:opacity-40"
              onClick={async () => {
                setBusy(true);
                try {
                  const { outcome } = await runNow({});
                  toast.success(`Vérification terminée : ${outcome}`);
                  await refresh();
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Vérification impossible");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Vérifier maintenant
            </button>
            {state.lastCheckedAt && (
              <span className="text-xs text-muted-foreground">
                Dernière vérification :{" "}
                {new Date(state.lastCheckedAt).toLocaleString("fr-FR")}
              </span>
            )}
          </div>

          {state.lastError && (
            <p className="mt-3 rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
              {state.lastError}
            </p>
          )}

          {rows.length > 0 && (
            <div className="mt-6">
              <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                Derniers fichiers traités
              </p>
              <ul className="space-y-1 text-sm">
                {rows.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3">
                    <span className="truncate">{r.file_name ?? "Photo"}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {r.status === "done"
                        ? "livré"
                        : r.status === "failed"
                          ? (r.error ?? "échec")
                          : "en cours"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}

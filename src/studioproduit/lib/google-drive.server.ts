/**
 * Minimal Google Drive client (fetch only, no SDK).
 * Uses the project's own Google OAuth 2.0 credentials.
 */

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/userinfo.email",
  "openid",
].join(" ");

export const DRIVE_CALLBACK_PATH = "/api/public/sp-google/callback";

function clientCreds() {
  const id = process.env["GOOGLE_CLIENT_ID"];
  const secret = process.env["GOOGLE_CLIENT_SECRET"];
  if (!id || !secret) throw new Error("Identifiants Google manquants.");
  return { id, secret };
}

export function buildAuthUrl(origin: string, state: string) {
  const { id } = clientCreds();
  const params = new URLSearchParams({
    client_id: id,
    redirect_uri: origin + DRIVE_CALLBACK_PATH,
    response_type: "code",
    scope: GOOGLE_SCOPES,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
};

export async function exchangeCode(code: string, origin: string): Promise<TokenResponse> {
  const { id, secret } = clientCreds();
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: id,
      client_secret: secret,
      redirect_uri: origin + DRIVE_CALLBACK_PATH,
      grant_type: "authorization_code",
    }),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`Google OAuth: ${body.slice(0, 200)}`);
  return JSON.parse(body) as TokenResponse;
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const { id, secret } = clientCreds();
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: id,
      client_secret: secret,
      grant_type: "refresh_token",
    }),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`Google OAuth (rafraîchissement) : ${body.slice(0, 200)}`);
  return JSON.parse(body) as TokenResponse;
}

async function driveFetch(token: string, url: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Google Drive (${res.status}) : ${text.slice(0, 200)}`);
  }
  return res;
}

export async function getGoogleEmail(token: string): Promise<string | null> {
  try {
    const res = await driveFetch(token, "https://www.googleapis.com/oauth2/v2/userinfo");
    const json = (await res.json()) as { email?: string };
    return json.email ?? null;
  } catch {
    return null;
  }
}

export type DriveFolder = { id: string; name: string };

export async function listFolders(token: string, query?: string): Promise<DriveFolder[]> {
  const q = [
    "mimeType = 'application/vnd.google-apps.folder'",
    "trashed = false",
    query ? `name contains '${query.replace(/'/g, "")}'` : null,
  ]
    .filter(Boolean)
    .join(" and ");
  const params = new URLSearchParams({
    q,
    fields: "files(id,name)",
    pageSize: "100",
    orderBy: "modifiedTime desc",
    spaces: "drive",
    includeItemsFromAllDrives: "true",
    supportsAllDrives: "true",
  });
  const res = await driveFetch(token, `https://www.googleapis.com/drive/v3/files?${params}`);
  const json = (await res.json()) as { files?: DriveFolder[] };
  return json.files ?? [];
}

export type DriveFile = { id: string; name: string; mimeType: string; createdTime: string };

export async function listImagesInFolder(token: string, folderId: string): Promise<DriveFile[]> {
  const params = new URLSearchParams({
    q: `'${folderId}' in parents and trashed = false and mimeType contains 'image/'`,
    fields: "files(id,name,mimeType,createdTime)",
    pageSize: "25",
    orderBy: "createdTime desc",
    includeItemsFromAllDrives: "true",
    supportsAllDrives: "true",
  });
  const res = await driveFetch(token, `https://www.googleapis.com/drive/v3/files?${params}`);
  const json = (await res.json()) as { files?: DriveFile[] };
  return json.files ?? [];
}

export async function downloadFile(token: string, fileId: string): Promise<Uint8Array> {
  const res = await driveFetch(
    token,
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`,
  );
  return new Uint8Array(await res.arrayBuffer());
}

export async function createFolder(token: string, name: string, parentId?: string) {
  const res = await driveFetch(
    token,
    "https://www.googleapis.com/drive/v3/files?fields=id,name&supportsAllDrives=true",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        mimeType: "application/vnd.google-apps.folder",
        ...(parentId ? { parents: [parentId] } : {}),
      }),
    },
  );
  return (await res.json()) as DriveFolder;
}

/** Multipart upload of a binary file into a Drive folder. */
export async function uploadFile(params: {
  token: string;
  name: string;
  parentId: string;
  mimeType: string;
  bytes: Uint8Array;
}): Promise<{ id: string }> {
  const form = new FormData();
  form.append(
    "metadata",
    new Blob([JSON.stringify({ name: params.name, parents: [params.parentId] })], {
      type: "application/json",
    }),
  );
  form.append(
    "file",
    new Blob([params.bytes as unknown as BlobPart], { type: params.mimeType }),
    params.name,
  );
  const res = await driveFetch(
    params.token,
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id&supportsAllDrives=true",
    { method: "POST", body: form },
  );
  return (await res.json()) as { id: string };
}

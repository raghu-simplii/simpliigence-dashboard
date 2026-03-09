/**
 * Cloud spreadsheet download — supports Dropbox and OneDrive share links.
 *
 * Dropbox (recommended):
 *   - Shared links like https://www.dropbox.com/scl/fi/…?dl=0
 *   - Transforms to dl.dropboxusercontent.com for direct CORS-friendly download
 *
 * OneDrive (personal only — Business/SharePoint requires auth):
 *   - Short links like https://1drv.ms/x/…
 *   - Tries Graph + legacy shares APIs
 *   - Falls back to direct /content paths
 *   - Also handles URLs with resid + authkey params
 */

/* ================================================================== */
/*  Dropbox                                                            */
/* ================================================================== */

function isDropboxUrl(url: string): boolean {
  return /dropbox\.com/i.test(url) || /dropboxusercontent\.com/i.test(url);
}

/**
 * Convert a Dropbox shared link to a direct download URL.
 *   www.dropbox.com/…?dl=0  →  dl.dropboxusercontent.com/…?dl=1
 */
function dropboxDirectUrl(url: string): string {
  let u = url.replace(/\bdl=0\b/, 'dl=1');
  // If no dl param at all, add it
  if (!/[?&]dl=1/.test(u)) {
    u += (u.includes('?') ? '&' : '?') + 'dl=1';
  }
  // Use the content domain (reliable CORS headers)
  u = u.replace('www.dropbox.com', 'dl.dropboxusercontent.com');
  return u;
}

async function fetchFromDropbox(shareUrl: string): Promise<ArrayBuffer> {
  const downloadUrl = dropboxDirectUrl(shareUrl);

  let resp: Response;
  try {
    resp = await fetch(downloadUrl);
  } catch {
    throw new Error(
      'Network error fetching from Dropbox. Check your internet connection.'
    );
  }

  if (!resp.ok) {
    if (resp.status === 404) {
      throw new Error('Dropbox file not found. The share link may have expired or the file was moved.');
    }
    if (resp.status === 403 || resp.status === 401) {
      throw new Error(
        'Dropbox access denied. Make sure the link is shared with "Anyone with the link" access.'
      );
    }
    throw new Error(`Dropbox returned HTTP ${resp.status}. Try re-sharing the file.`);
  }

  const contentLength = resp.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > 10_000_000) {
    throw new Error('File is larger than 10MB. Please use a smaller spreadsheet.');
  }

  return resp.arrayBuffer();
}

/* ================================================================== */
/*  OneDrive / SharePoint                                              */
/* ================================================================== */

function isSharePointUrl(url: string): boolean {
  return /sharepoint\.com/i.test(url);
}

function encodeShareToken(shareUrl: string): string {
  const base64 = btoa(unescape(encodeURIComponent(shareUrl)));
  return 'u!' + base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * If URL has resid + authkey params, build a direct download URL.
 */
function tryDirectDownloadUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const resid = parsed.searchParams.get('resid');
    const authkey = parsed.searchParams.get('authkey');
    if (resid && authkey) {
      return `https://onedrive.live.com/download.aspx?resid=${encodeURIComponent(resid)}&authkey=${encodeURIComponent(authkey)}`;
    }
  } catch { /* ignore */ }
  return null;
}

interface ApiResult {
  downloadUrl?: string;
  lastStatus: number;
  lastError: string;
}

async function trySharesApi(shareUrl: string): Promise<ApiResult> {
  const token = encodeShareToken(shareUrl);
  const endpoints = [
    `https://graph.microsoft.com/v1.0/shares/${token}/driveItem`,
    `https://graph.microsoft.com/v1.0/shares/${token}/root`,
    `https://api.onedrive.com/v1.0/shares/${token}/driveItem`,
    `https://api.onedrive.com/v1.0/shares/${token}/root`,
  ];

  let lastStatus = 0;
  let lastError = '';

  for (const url of endpoints) {
    try {
      const resp = await fetch(url);
      lastStatus = resp.status;
      if (resp.ok) {
        const json = await resp.json() as Record<string, unknown>;
        const dlUrl =
          (json['@microsoft.graph.downloadUrl'] as string | undefined) ||
          (json['@content.downloadUrl'] as string | undefined);
        if (dlUrl) return { downloadUrl: dlUrl, lastStatus, lastError: '' };
        lastError = 'Response missing download URL';
        continue;
      }
      try {
        const errBody = await resp.json() as Record<string, unknown>;
        const errObj = errBody.error as Record<string, unknown> | undefined;
        lastError = (errObj?.message as string) || `HTTP ${resp.status}`;
      } catch {
        lastError = `HTTP ${resp.status}`;
      }
    } catch {
      lastError = 'Network/CORS error';
    }
  }
  return { lastStatus, lastError };
}

async function tryDirectContent(shareUrl: string): Promise<ArrayBuffer | null> {
  const token = encodeShareToken(shareUrl);
  const urls = [
    `https://api.onedrive.com/v1.0/shares/${token}/root/content`,
    `https://api.onedrive.com/v1.0/shares/${token}/driveItem/content`,
  ];
  for (const url of urls) {
    try {
      const resp = await fetch(url);
      if (resp.ok) {
        const ct = resp.headers.get('content-type') || '';
        if (!ct.includes('html')) return resp.arrayBuffer();
      }
    } catch { /* CORS or network — skip */ }
  }
  return null;
}

async function fetchFromOneDrive(shareUrl: string): Promise<ArrayBuffer> {
  // Check if SharePoint URL — these require auth and won't work from the browser
  if (isSharePointUrl(shareUrl)) {
    throw new Error(
      'SharePoint / OneDrive for Business links require authentication and cannot be accessed from this browser app. ' +
      'Please upload the file to Dropbox instead, share it with "Anyone with the link", and paste the Dropbox link here.'
    );
  }

  // Attempt 1: direct download (resid + authkey in URL)
  const directUrl = tryDirectDownloadUrl(shareUrl);
  if (directUrl) {
    try {
      const resp = await fetch(directUrl);
      if (resp.ok) return resp.arrayBuffer();
    } catch { /* fall through */ }
  }

  // Attempt 2: Shares metadata API → pre-auth download URL
  const apiResult = await trySharesApi(shareUrl);
  if (apiResult.downloadUrl) {
    let fileResponse: Response;
    try {
      fileResponse = await fetch(apiResult.downloadUrl);
    } catch {
      throw new Error('Network error downloading file. Check your internet connection.');
    }
    if (!fileResponse.ok) {
      throw new Error(`Failed to download file (HTTP ${fileResponse.status}).`);
    }
    const cl = fileResponse.headers.get('content-length');
    if (cl && parseInt(cl, 10) > 10_000_000) {
      throw new Error('File is larger than 10MB.');
    }
    return fileResponse.arrayBuffer();
  }

  // Attempt 3: Direct /content path
  const directBuffer = await tryDirectContent(shareUrl);
  if (directBuffer) {
    if (directBuffer.byteLength > 10_000_000) throw new Error('File is larger than 10MB.');
    return directBuffer;
  }

  // All failed
  if (apiResult.lastStatus === 401 || apiResult.lastStatus === 403) {
    throw new Error(
      'Access denied. If using OneDrive for Business, it requires authentication. ' +
      'Please upload the file to Dropbox instead, share it, and paste the Dropbox link.'
    );
  }

  throw new Error(
    `Could not access the shared file (${apiResult.lastError}). ` +
    'Tip: Upload the file to Dropbox, right-click → "Copy link", and paste the Dropbox link here.'
  );
}

/* ================================================================== */
/*  Public API                                                         */
/* ================================================================== */

/**
 * Fetch an Excel file from a Dropbox or OneDrive share URL.
 * Returns raw bytes as an ArrayBuffer suitable for xlsx.read().
 */
export async function fetchExcelFromOneDrive(shareUrl: string): Promise<ArrayBuffer> {
  const trimmed = shareUrl.trim();
  if (!trimmed) throw new Error('Share URL is empty');

  if (isDropboxUrl(trimmed)) {
    return fetchFromDropbox(trimmed);
  }

  return fetchFromOneDrive(trimmed);
}

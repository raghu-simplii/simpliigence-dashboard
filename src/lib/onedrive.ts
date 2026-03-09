/**
 * OneDrive / SharePoint file download for publicly shared Excel files.
 *
 * Supports multiple URL formats:
 *  - Short share links:  https://1drv.ms/x/c/…
 *  - Full share links:   https://onedrive.live.com/…  or  https://…sharepoint.com/…
 *  - Direct embed links:  https://onedrive.live.com/download?resid=…&authkey=…
 *
 * Strategy:
 *  1. Try Microsoft Graph shares API (graph.microsoft.com)  — current endpoint
 *  2. Try legacy OneDrive shares API (api.onedrive.com)     — fallback
 *  3. If the URL contains resid + authkey, build a direct download URL
 */

/* ------------------------------------------------------------------ */
/*  Encoding helper                                                    */
/* ------------------------------------------------------------------ */

/**
 * Encode a share URL into a Graph-API-safe token.
 * Algorithm per Microsoft docs:
 *   UTF-8 bytes → base64 → URL-safe (+→-, /→_, strip =) → prepend 'u!'
 */
function encodeShareToken(shareUrl: string): string {
  const base64 = btoa(unescape(encodeURIComponent(shareUrl)));
  return 'u!' + base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/* ------------------------------------------------------------------ */
/*  URL format detection                                               */
/* ------------------------------------------------------------------ */

/**
 * If the URL already contains `resid` and `authkey` query params
 * (e.g. the user copied the browser address bar while viewing the file),
 * we can build a direct download URL without hitting any API.
 */
function tryDirectDownloadUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const resid = parsed.searchParams.get('resid');
    const authkey = parsed.searchParams.get('authkey');
    if (resid && authkey) {
      return `https://onedrive.live.com/download.aspx?resid=${encodeURIComponent(resid)}&authkey=${encodeURIComponent(authkey)}`;
    }
  } catch {
    // not a valid URL
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  Shares-API approach (Graph + legacy)                               */
/* ------------------------------------------------------------------ */

interface ApiResult {
  downloadUrl?: string;
  lastStatus: number;
  lastError: string;
}

async function trySharesApi(shareUrl: string): Promise<ApiResult> {
  const token = encodeShareToken(shareUrl);

  // Endpoints to try, in order of preference
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
        // Got 200 but no download URL — keep trying
        lastError = 'Response missing download URL';
        continue;
      }

      // Parse error detail
      try {
        const errBody = await resp.json() as Record<string, unknown>;
        const errObj = errBody.error as Record<string, unknown> | undefined;
        lastError = (errObj?.message as string) || `HTTP ${resp.status}`;
      } catch {
        lastError = `HTTP ${resp.status}`;
      }

      // 401/403 means auth required — no point trying more endpoints on same host
      if (resp.status === 401 || resp.status === 403) {
        // but DO try the other host
        continue;
      }
    } catch {
      lastError = 'Network/CORS error';
    }
  }

  return { lastStatus, lastError };
}

/* ------------------------------------------------------------------ */
/*  Direct-download fallback (using /content path with redirect)       */
/* ------------------------------------------------------------------ */

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
        // Make sure we got binary data, not an HTML error page
        if (!ct.includes('html')) {
          return resp.arrayBuffer();
        }
      }
    } catch {
      // CORS block or network error — skip
    }
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Fetch an Excel file from a OneDrive share URL.
 * Returns raw bytes as an ArrayBuffer suitable for xlsx.read().
 */
export async function fetchExcelFromOneDrive(shareUrl: string): Promise<ArrayBuffer> {
  const trimmed = shareUrl.trim();
  if (!trimmed) throw new Error('Share URL is empty');

  // ---- Attempt 1: direct download URL (resid + authkey in the URL) ----
  const directUrl = tryDirectDownloadUrl(trimmed);
  if (directUrl) {
    try {
      const resp = await fetch(directUrl);
      if (resp.ok) {
        return resp.arrayBuffer();
      }
    } catch {
      // fall through to API approach
    }
  }

  // ---- Attempt 2: Shares metadata API → pre-auth download URL ----
  const apiResult = await trySharesApi(trimmed);

  if (apiResult.downloadUrl) {
    let fileResponse: Response;
    try {
      fileResponse = await fetch(apiResult.downloadUrl);
    } catch {
      throw new Error('Network error downloading the file. Check your internet connection.');
    }
    if (!fileResponse.ok) {
      throw new Error(`Failed to download file (HTTP ${fileResponse.status}). Try syncing again.`);
    }
    const contentLength = fileResponse.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > 10_000_000) {
      throw new Error('File is larger than 10MB. Please use a smaller spreadsheet.');
    }
    return fileResponse.arrayBuffer();
  }

  // ---- Attempt 3: Direct /content path (last resort) ----
  const directBuffer = await tryDirectContent(trimmed);
  if (directBuffer) {
    if (directBuffer.byteLength > 10_000_000) {
      throw new Error('File is larger than 10MB. Please use a smaller spreadsheet.');
    }
    return directBuffer;
  }

  // ---- All attempts failed — give a helpful error ----
  if (apiResult.lastStatus === 401 || apiResult.lastStatus === 403) {
    throw new Error(
      'Access denied. Make sure the file is shared with "Anyone with the link" in OneDrive, not "People in your organization".'
    );
  }
  if (apiResult.lastStatus === 404) {
    throw new Error('File not found. The share link may have expired or been deleted.');
  }

  throw new Error(
    `Could not access the shared file (${apiResult.lastError}). ` +
    'Tips: (1) In OneDrive, right-click the file → Share → "Anyone with the link". ' +
    '(2) Copy the share link and paste it here. ' +
    '(3) If that still fails, open the file in OneDrive web and copy the full URL from your browser address bar.'
  );
}

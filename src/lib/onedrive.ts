/**
 * OneDrive public shares API integration.
 *
 * Two-step approach:
 * 1. Encode the share URL → call the shares API to get a pre-authenticated download URL
 * 2. Fetch the file from that direct URL (no auth needed, CORS-friendly)
 *
 * Works with "Anyone with the link" shared files.
 */

/**
 * Encode a OneDrive/SharePoint share URL into an API-safe token.
 *
 * Algorithm (from Microsoft docs):
 * 1. UTF-8 encode the URL, then Base64-encode the bytes
 * 2. Replace '+' → '-', '/' → '_', remove trailing '='
 * 3. Prepend 'u!'
 */
export function encodeShareUrl(shareUrl: string): string {
  const trimmed = shareUrl.trim();
  if (!trimmed) throw new Error('Share URL is empty');

  // UTF-8 safe base64 encoding (matches Microsoft's C# Encoding.UTF8.GetBytes)
  const base64 = btoa(unescape(encodeURIComponent(trimmed)));

  // URL-safe base64: replace + with -, / with _, strip trailing =
  return 'u!' + base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Fetch an Excel file from a OneDrive share URL.
 *
 * Strategy:
 * 1. Call the shares metadata API to get a pre-authenticated @content.downloadUrl
 * 2. Download the file from that direct CDN URL
 *
 * This avoids the /content redirect which causes CORS issues.
 */
export async function fetchExcelFromOneDrive(shareUrl: string): Promise<ArrayBuffer> {
  const encoded = encodeShareUrl(shareUrl);

  // --- Step 1: Get driveItem metadata (contains a pre-auth download URL) ---
  // Try both API paths — /driveItem (newer) and /root (legacy)
  const endpoints = [
    `https://api.onedrive.com/v1.0/shares/${encoded}/driveItem`,
    `https://api.onedrive.com/v1.0/shares/${encoded}/root`,
  ];

  let metaJson: Record<string, unknown> | null = null;
  let lastStatus = 0;
  let lastError = '';

  for (const url of endpoints) {
    try {
      const resp = await fetch(url);
      lastStatus = resp.status;

      if (resp.ok) {
        metaJson = await resp.json() as Record<string, unknown>;
        break;
      }

      // Try to parse error detail from response
      try {
        const errBody = await resp.json() as Record<string, unknown>;
        const errObj = errBody.error as Record<string, unknown> | undefined;
        lastError = (errObj?.message as string) || `HTTP ${resp.status}`;
      } catch {
        lastError = `HTTP ${resp.status}`;
      }
    } catch {
      lastError = 'Network error';
    }
  }

  if (!metaJson) {
    if (lastStatus === 401 || lastStatus === 403) {
      throw new Error(
        'Access denied. Make sure the file is shared with "Anyone with the link" in OneDrive.'
      );
    }
    if (lastStatus === 404) {
      throw new Error(
        'File not found. The share link may have expired or the file was deleted.'
      );
    }
    throw new Error(
      `Could not access the shared file (${lastError}). ` +
      'Please verify the OneDrive share link is correct and the file is shared with "Anyone with the link".'
    );
  }

  // --- Step 2: Extract the pre-authenticated download URL ---
  const downloadUrl =
    (metaJson['@content.downloadUrl'] as string | undefined) ||
    (metaJson['@microsoft.graph.downloadUrl'] as string | undefined);

  if (!downloadUrl) {
    throw new Error(
      'OneDrive did not provide a download URL. ' +
      'Make sure the file is shared with "Anyone with the link" (not "People in your organization").'
    );
  }

  // --- Step 3: Download the actual file ---
  let fileResponse: Response;
  try {
    fileResponse = await fetch(downloadUrl);
  } catch {
    throw new Error(
      'Network error downloading the file. Check your internet connection and try again.'
    );
  }

  if (!fileResponse.ok) {
    throw new Error(`Failed to download file (HTTP ${fileResponse.status}). Try syncing again.`);
  }

  // Guard against very large files
  const contentLength = fileResponse.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > 10_000_000) {
    throw new Error('File is larger than 10MB. Please use a smaller spreadsheet.');
  }

  return fileResponse.arrayBuffer();
}

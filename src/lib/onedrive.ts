/**
 * OneDrive public shares API integration.
 *
 * Converts a share URL to a direct download URL using Microsoft's
 * encoding algorithm, then fetches the file as an ArrayBuffer.
 * Works with "Anyone with the link" shared files — no auth needed.
 */

/**
 * Convert a OneDrive/SharePoint sharing URL to a direct download API URL.
 *
 * Algorithm (from Microsoft docs):
 * 1. Base64-encode the share URL
 * 2. Replace '+' → '-', '/' → '_', remove trailing '='
 * 3. Prepend 'u!'
 * 4. Use: https://api.onedrive.com/v1.0/shares/{encoded}/root/content
 */
export function shareUrlToDownloadUrl(shareUrl: string): string {
  const trimmed = shareUrl.trim();
  if (!trimmed) throw new Error('Share URL is empty');

  // Base64 encode
  const base64 = btoa(trimmed);

  // Make URL-safe: replace + with -, / with _, strip trailing =
  const encoded = 'u!' + base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  return `https://api.onedrive.com/v1.0/shares/${encoded}/root/content`;
}

/**
 * Fetch an Excel file from a OneDrive share URL.
 * Returns the raw bytes as an ArrayBuffer suitable for xlsx.read().
 */
export async function fetchExcelFromOneDrive(shareUrl: string): Promise<ArrayBuffer> {
  const downloadUrl = shareUrlToDownloadUrl(shareUrl);

  let response: Response;
  try {
    response = await fetch(downloadUrl);
  } catch (err) {
    throw new Error(
      'Network error fetching from OneDrive. Check your internet connection and try again.'
    );
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error(
        'Access denied. Make sure the file is shared with "Anyone with the link" in OneDrive.'
      );
    }
    if (response.status === 404) {
      throw new Error(
        'File not found. The share link may have expired or the file was deleted.'
      );
    }
    throw new Error(`OneDrive returned HTTP ${response.status}. Try re-sharing the file.`);
  }

  // Guard against very large files
  const contentLength = response.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > 10_000_000) {
    throw new Error('File is larger than 10MB. Please use a smaller spreadsheet.');
  }

  return response.arrayBuffer();
}

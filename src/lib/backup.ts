/**
 * Backup utility — exports all Supabase tables to a downloadable JSON file.
 *
 * Also supports automatic daily backups that save to localStorage,
 * and can trigger a download on demand from the Settings page.
 */
import { supabase } from './supabase';

const BACKUP_TIMESTAMP_KEY = 'simpliigence-last-backup';
const BACKUP_DATA_KEY = 'simpliigence-backup-data';
const BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

const TABLES = [
  'forecast_assignments',
  'forecast_meta',
  'financial_settings',
  'sync_config',
  'hiring_forecast_config',
  'staffing_requests',
  'pipeline_projects',
  'india_staffing_accounts',
  'india_staffing_requisitions',
  'india_staffing_statuses',
  'us_staffing_accounts',
  'us_staffing_requisitions',
] as const;

export interface BackupPayload {
  version: 1;
  timestamp: string;
  tables: Record<string, unknown[]>;
}

/** Fetch all data from every Supabase table. */
async function fetchAllData(): Promise<BackupPayload | null> {
  const tables: Record<string, unknown[]> = {};
  let hasError = false;

  const results = await Promise.all(
    TABLES.map(async (table) => {
      const { data, error } = await supabase.from(table).select('*');
      if (error) {
        console.warn(`[backup] Failed to fetch ${table}:`, error.message);
        hasError = true;
        return { table, data: [] };
      }
      return { table, data: data || [] };
    }),
  );

  if (hasError) return null;

  for (const { table, data } of results) {
    tables[table] = data;
  }

  return {
    version: 1,
    timestamp: new Date().toISOString(),
    tables,
  };
}

/** Download backup as a JSON file. */
export async function downloadBackup(): Promise<boolean> {
  const payload = await fetchAllData();
  if (!payload) return false;

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const date = new Date().toISOString().slice(0, 10);
  const a = document.createElement('a');
  a.href = url;
  a.download = `simpliigence-backup-${date}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  // Update last backup timestamp
  try {
    localStorage.setItem(BACKUP_TIMESTAMP_KEY, new Date().toISOString());
    localStorage.setItem(BACKUP_DATA_KEY, JSON.stringify(payload));
  } catch { /* localStorage full — ok, file was already downloaded */ }

  return true;
}

/** Save a silent backup to localStorage (no file download). */
export async function silentBackup(): Promise<boolean> {
  const payload = await fetchAllData();
  if (!payload) return false;

  try {
    localStorage.setItem(BACKUP_TIMESTAMP_KEY, new Date().toISOString());
    localStorage.setItem(BACKUP_DATA_KEY, JSON.stringify(payload));
    console.log('[backup] Silent backup saved to localStorage at', payload.timestamp);
    return true;
  } catch {
    console.warn('[backup] localStorage full, could not save silent backup');
    return false;
  }
}

/** Run a silent backup if more than 24 hours since last backup. */
export async function autoBackupIfNeeded(): Promise<void> {
  try {
    const last = localStorage.getItem(BACKUP_TIMESTAMP_KEY);
    if (last) {
      const elapsed = Date.now() - new Date(last).getTime();
      if (elapsed < BACKUP_INTERVAL_MS) {
        console.log('[backup] Last backup was', Math.round(elapsed / 3600000), 'hours ago — skipping');
        return;
      }
    }
    console.log('[backup] Running automatic daily backup...');
    await silentBackup();
  } catch {
    console.warn('[backup] Auto-backup check failed');
  }
}

/** Get the timestamp of the last backup. */
export function getLastBackupTime(): string | null {
  try {
    return localStorage.getItem(BACKUP_TIMESTAMP_KEY);
  } catch {
    return null;
  }
}

/** Restore data from a backup JSON file into Supabase. */
export async function restoreFromBackup(file: File): Promise<{ success: boolean; error?: string }> {
  try {
    const text = await file.text();
    const payload: BackupPayload = JSON.parse(text);

    if (payload.version !== 1 || !payload.tables) {
      return { success: false, error: 'Invalid backup file format' };
    }

    // Restore each table
    for (const table of TABLES) {
      const rows = payload.tables[table];
      if (!rows || rows.length === 0) continue;

      // Clear existing data first
      const { error: delError } = await supabase.from(table).delete().neq('id', '');
      if (delError) {
        console.warn(`[restore] Failed to clear ${table}:`, delError.message);
      }

      // Insert backup data
      const { error } = await supabase.from(table).insert(rows);
      if (error) {
        console.warn(`[restore] Failed to restore ${table}:`, error.message);
        return { success: false, error: `Failed to restore ${table}: ${error.message}` };
      }
    }

    return { success: true };
  } catch (e) {
    return { success: false, error: `Parse error: ${e instanceof Error ? e.message : String(e)}` };
  }
}

/**
 * Orchestrates the full Dropbox/OneDrive → Spreadsheet → Forecast Store sync.
 */
import { fetchExcelFromOneDrive } from './onedrive';
import { parseForecastingSheet } from './parseSpreadsheet';
import { useSyncStore } from '../store/useSyncStore';
import { useForecastStore } from '../store/useForecastStore';

export interface SyncResult {
  success: boolean;
  message: string;
  assignmentCount: number;
}

export async function performSync(): Promise<SyncResult> {
  const syncState = useSyncStore.getState();
  const { oneDriveUrl, sheetName } = syncState;

  if (!oneDriveUrl) {
    syncState.setSyncError('No share URL configured.');
    return { success: false, message: 'No share URL configured.', assignmentCount: 0 };
  }

  syncState.setSyncStarted();

  try {
    const buffer = await fetchExcelFromOneDrive(oneDriveUrl);
    const { assignments, weekDates } = await parseForecastingSheet(buffer, sheetName || 'Forecasting Hrs');

    useForecastStore.getState().setData(assignments, weekDates);

    const employees = new Set(assignments.map((a) => a.employeeName));
    const projects = new Set(assignments.map((a) => a.project));
    syncState.setSyncSuccess(assignments.length, employees.size, projects.size);

    return {
      success: true,
      message: `Synced ${assignments.length} assignments (${employees.size} employees, ${projects.size} projects).`,
      assignmentCount: assignments.length,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error during sync.';
    syncState.setSyncError(message);
    return { success: false, message, assignmentCount: 0 };
  }
}

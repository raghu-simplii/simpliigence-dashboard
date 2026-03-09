/**
 * Orchestrates the full OneDrive → Spreadsheet → Zustand sync pipeline.
 */
import { fetchExcelFromOneDrive } from './onedrive';
import { parseForcastingSheet, transformToModels } from './parseSpreadsheet';
import { useSyncStore } from '../store/useSyncStore';
import { useTeamStore } from '../store/useTeamStore';
import { useProjectStore } from '../store/useProjectStore';
import { useFinancialStore } from '../store/useFinancialStore';

export interface SyncResult {
  success: boolean;
  message: string;
  memberCount: number;
  projectCount: number;
  rowCount: number;
}

export async function performSync(): Promise<SyncResult> {
  const syncState = useSyncStore.getState();
  const { oneDriveUrl, sheetName } = syncState;

  if (!oneDriveUrl) {
    syncState.setSyncError('No OneDrive URL configured.');
    return { success: false, message: 'No OneDrive URL configured.', memberCount: 0, projectCount: 0, rowCount: 0 };
  }

  syncState.setSyncStarted();

  try {
    // 1. Fetch the Excel file
    const buffer = await fetchExcelFromOneDrive(oneDriveUrl);

    // 2. Parse the sheet
    const rows = await parseForcastingSheet(buffer, sheetName || 'Forecasting Hrs');

    // 3. Get current data from stores for matching
    const existingMembers = useTeamStore.getState().members;
    const existingProjects = useProjectStore.getState().projects;
    const exchangeRate = useFinancialStore.getState().settings.exchangeRate;

    // 4. Transform rows into models
    const { members, projects } = transformToModels(rows, existingMembers, existingProjects, exchangeRate);

    // 5. Write to stores (Zustand persist auto-saves to localStorage)
    useTeamStore.getState().setMembers(members);
    useProjectStore.getState().setProjects(projects);

    // 6. Update sync status
    syncState.setSyncSuccess(rows.length, members.length, projects.length);

    return {
      success: true,
      message: `Synced ${rows.length} rows → ${members.length} members, ${projects.length} projects.`,
      memberCount: members.length,
      projectCount: projects.length,
      rowCount: rows.length,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error during sync.';
    syncState.setSyncError(message);
    return { success: false, message, memberCount: 0, projectCount: 0, rowCount: 0 };
  }
}

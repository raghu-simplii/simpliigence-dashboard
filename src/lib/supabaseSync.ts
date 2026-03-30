/**
 * Supabase sync layer — bridges Zustand stores ↔ Supabase database.
 *
 * Architecture:
 *  - On app init: fetch from Supabase → hydrate stores (overrides localStorage)
 *  - On store mutations: store actions call db.* functions (fire-and-forget)
 *  - On realtime: remote changes update stores via setState (bypasses actions → no echo)
 *  - localStorage persist middleware kept as offline fallback / instant page load cache
 */
import { nanoid } from 'nanoid';
import { supabase, CLIENT_ID } from './supabase';
import type { ForecastAssignment, Month, ZohoPipelineProject } from '../types/forecast';
import type { FinancialSettings } from '../types/financial';
import type { ConciergeConfig, ScenarioSettings, StaffingRequest } from '../types/hiringForecast';
import { emptyMonthRecord } from '../types/forecast';

// ─── Conversion helpers ────────────────────────────────────────────

function assignmentToRow(a: ForecastAssignment) {
  return {
    id: a.id || nanoid(),
    employee_name: a.employeeName,
    notes: a.notes || '',
    role: a.role,
    rate_card: a.rateCard,
    is_si: a.isSI,
    is_contractor: a.isContractor,
    project: a.project,
    weekly_hours: a.weeklyHours || {},
    monthly_totals: a.monthlyTotals || emptyMonthRecord(),
    manually_edited: a._manuallyEdited || false,
    manually_added: a._manuallyAdded || false,
    original_key: a._originalKey || null,
    updated_by: CLIENT_ID,
    updated_at: new Date().toISOString(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rowToAssignment(row: any): ForecastAssignment {
  return {
    id: row.id,
    employeeName: row.employee_name,
    notes: row.notes || '',
    role: row.role,
    rateCard: row.rate_card,
    isSI: row.is_si,
    isContractor: row.is_contractor,
    project: row.project,
    weeklyHours: row.weekly_hours || {},
    monthlyTotals: row.monthly_totals || emptyMonthRecord(),
    _manuallyEdited: row.manually_edited || false,
    _manuallyAdded: row.manually_added || false,
    _originalKey: row.original_key || undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pipelineRowToProject(row: any): ZohoPipelineProject {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    owner: row.owner,
    startDate: row.start_date,
    endDate: row.end_date,
    source: row.source || 'manual',
    zohoId: row.zoho_id || undefined,
    forecastName: row.forecast_name || undefined,
    goLiveDate: row.go_live_date || undefined,
    revenue: row.revenue,
    revenueCurrency: row.revenue_currency || 'USD',
    resources: row.resources || [],
    phases: row.phases || [],
  };
}

function projectToRow(p: ZohoPipelineProject) {
  return {
    id: p.id,
    name: p.name,
    status: p.status,
    owner: p.owner,
    start_date: p.startDate,
    end_date: p.endDate,
    source: p.source,
    zoho_id: p.zohoId || null,
    forecast_name: p.forecastName || null,
    go_live_date: p.goLiveDate || null,
    revenue: p.revenue || null,
    revenue_currency: p.revenueCurrency || 'USD',
    resources: p.resources || [],
    phases: p.phases || [],
    updated_by: CLIENT_ID,
    updated_at: new Date().toISOString(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToStaffingRequest(row: any): StaffingRequest {
  return {
    id: row.id,
    roleCategory: row.role_category,
    hoursPerMonth: row.hours_per_month,
    startMonth: row.start_month as Month,
    endMonth: row.end_month as Month,
    clientName: row.client_name,
  };
}

function staffingRequestToRow(r: StaffingRequest) {
  return {
    id: r.id,
    role_category: r.roleCategory,
    hours_per_month: r.hoursPerMonth,
    start_month: r.startMonth,
    end_month: r.endMonth,
    client_name: r.clientName,
    updated_by: CLIENT_ID,
  };
}

// ─── Data fetchers (used on app init) ──────────────────────────────

export async function fetchAssignments(): Promise<{ assignments: ForecastAssignment[]; weekDates: string[] } | null> {
  const [{ data: rows, error }, { data: meta }] = await Promise.all([
    supabase.from('forecast_assignments').select('*'),
    supabase.from('forecast_meta').select('*').eq('id', 'singleton').single(),
  ]);
  if (error) { console.warn('[supabase] fetch assignments failed:', error.message, error.code, error.details); return null; }
  return {
    assignments: (rows || []).map(rowToAssignment),
    weekDates: (meta?.week_dates as string[]) || [],
  };
}

export async function fetchFinancialSettings(): Promise<FinancialSettings | null> {
  const { data, error } = await supabase.from('financial_settings').select('*').eq('id', 'singleton').single();
  if (error || !data) return null;
  return {
    exchangeRate: data.exchange_rate ?? 83.5,
    cadToUsdRate: data.cad_to_usd_rate ?? 0.73,
    displayCurrency: data.display_currency ?? 'inr',
  };
}

export async function fetchSyncConfig() {
  const { data, error } = await supabase.from('sync_config').select('*').eq('id', 'singleton').single();
  if (error || !data) return null;
  return {
    oneDriveUrl: data.onedrive_url || '',
    sheetName: data.sheet_name || 'Forecasting Hrs',
    autoSyncOnLoad: data.auto_sync_on_load ?? true,
    lastSyncAt: data.last_sync_at,
    lastSyncStatus: data.last_sync_status || 'never',
    lastSyncError: data.last_sync_error,
    lastSyncRowCount: data.last_sync_row_count || 0,
    lastSyncMemberCount: data.last_sync_member_count || 0,
    lastSyncProjectCount: data.last_sync_project_count || 0,
  };
}

export async function fetchHiringForecastConfig() {
  const { data, error } = await supabase.from('hiring_forecast_config').select('*').eq('id', 'singleton').single();
  if (error || !data) return null;
  return {
    conciergeConfig: (data.concierge_config || {}) as ConciergeConfig,
    scenarioSettings: (data.scenario_settings || {}) as ScenarioSettings,
  };
}

export async function fetchStaffingRequests(): Promise<StaffingRequest[] | null> {
  const { data, error } = await supabase.from('staffing_requests').select('*');
  if (error) return null;
  return (data || []).map(rowToStaffingRequest);
}

export async function fetchPipelineProjects(): Promise<ZohoPipelineProject[] | null> {
  const { data, error } = await supabase.from('pipeline_projects').select('*');
  if (error) return null;
  return (data || []).map(pipelineRowToProject);
}

// ─── Writers (called by store actions) ─────────────────────────────

export const db = {
  // --- Assignments ---
  async upsertAssignment(a: ForecastAssignment) {
    const row = assignmentToRow(a);
    const { error } = await supabase.from('forecast_assignments').upsert(row, { onConflict: 'id' });
    if (error) console.warn('[supabase] upsert assignment failed:', error);
  },

  async upsertAssignments(assignments: ForecastAssignment[]) {
    if (assignments.length === 0) return;
    const rows = assignments.map(assignmentToRow);
    const { error } = await supabase.from('forecast_assignments').upsert(rows, { onConflict: 'id' });
    if (error) console.warn('[supabase] bulk upsert assignments failed:', error);
  },

  async deleteAssignment(id: string) {
    const { error } = await supabase.from('forecast_assignments').delete().eq('id', id);
    if (error) console.warn('[supabase] delete assignment failed:', error);
  },

  async deleteAssignmentsByEmployee(employeeName: string) {
    const { error } = await supabase.from('forecast_assignments').delete().ilike('employee_name', employeeName);
    if (error) console.warn('[supabase] delete employee assignments failed:', error);
  },

  async deleteAllAssignments() {
    const { error } = await supabase.from('forecast_assignments').delete().neq('id', '');
    if (error) console.warn('[supabase] delete all assignments failed:', error);
  },

  async saveWeekDates(weekDates: string[]) {
    const { error } = await supabase.from('forecast_meta').upsert({
      id: 'singleton',
      week_dates: weekDates,
      updated_by: CLIENT_ID,
      updated_at: new Date().toISOString(),
    });
    if (error) console.warn('[supabase] save week dates failed:', error);
  },

  /** Full sync: replace all assignments in Supabase with the given list. */
  async replaceAllAssignments(assignments: ForecastAssignment[], weekDates: string[]) {
    // Delete all existing, then insert new
    await db.deleteAllAssignments();
    if (assignments.length > 0) {
      const rows = assignments.map(assignmentToRow);
      // Supabase has a limit of ~1000 rows per request, batch if needed
      const batchSize = 500;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const { error } = await supabase.from('forecast_assignments').insert(batch);
        if (error) console.warn('[supabase] batch insert assignments failed:', error);
      }
    }
    await db.saveWeekDates(weekDates);
  },

  // --- Financial ---
  async saveFinancialSettings(settings: FinancialSettings) {
    const { error } = await supabase.from('financial_settings').upsert({
      id: 'singleton',
      exchange_rate: settings.exchangeRate,
      cad_to_usd_rate: settings.cadToUsdRate,
      display_currency: settings.displayCurrency,
      updated_by: CLIENT_ID,
      updated_at: new Date().toISOString(),
    });
    if (error) console.warn('[supabase] save financial settings failed:', error);
  },

  // --- Sync Config ---
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async saveSyncConfig(config: Record<string, any>) {
    const { error } = await supabase.from('sync_config').upsert({
      id: 'singleton',
      onedrive_url: config.oneDriveUrl ?? config.onedrive_url,
      sheet_name: config.sheetName ?? config.sheet_name,
      auto_sync_on_load: config.autoSyncOnLoad ?? config.auto_sync_on_load,
      last_sync_at: config.lastSyncAt ?? config.last_sync_at,
      last_sync_status: config.lastSyncStatus ?? config.last_sync_status,
      last_sync_error: config.lastSyncError ?? config.last_sync_error,
      last_sync_row_count: config.lastSyncRowCount ?? config.last_sync_row_count,
      last_sync_member_count: config.lastSyncMemberCount ?? config.last_sync_member_count,
      last_sync_project_count: config.lastSyncProjectCount ?? config.last_sync_project_count,
      updated_by: CLIENT_ID,
      updated_at: new Date().toISOString(),
    });
    if (error) console.warn('[supabase] save sync config failed:', error);
  },

  // --- Hiring Forecast ---
  async saveHiringConfig(conciergeConfig: ConciergeConfig, scenarioSettings: ScenarioSettings) {
    const { error } = await supabase.from('hiring_forecast_config').upsert({
      id: 'singleton',
      concierge_config: conciergeConfig,
      scenario_settings: scenarioSettings,
      updated_by: CLIENT_ID,
      updated_at: new Date().toISOString(),
    });
    if (error) console.warn('[supabase] save hiring config failed:', error);
  },

  async insertStaffingRequest(r: StaffingRequest) {
    const { error } = await supabase.from('staffing_requests').insert(staffingRequestToRow(r));
    if (error) console.warn('[supabase] insert staffing request failed:', error);
  },

  async deleteStaffingRequest(id: string) {
    const { error } = await supabase.from('staffing_requests').delete().eq('id', id);
    if (error) console.warn('[supabase] delete staffing request failed:', error);
  },

  async deleteAllStaffingRequests() {
    const { error } = await supabase.from('staffing_requests').delete().neq('id', '');
    if (error) console.warn('[supabase] delete all staffing requests failed:', error);
  },

  // --- Pipeline ---
  async upsertPipelineProject(p: ZohoPipelineProject) {
    const { error } = await supabase.from('pipeline_projects').upsert(projectToRow(p), { onConflict: 'id' });
    if (error) console.warn('[supabase] upsert pipeline project failed:', error);
  },

  async upsertPipelineProjects(projects: ZohoPipelineProject[]) {
    if (projects.length === 0) return;
    const rows = projects.map(projectToRow);
    const { error } = await supabase.from('pipeline_projects').upsert(rows, { onConflict: 'id' });
    if (error) console.warn('[supabase] bulk upsert pipeline projects failed:', error);
  },

  async deletePipelineProject(id: string) {
    const { error } = await supabase.from('pipeline_projects').delete().eq('id', id);
    if (error) console.warn('[supabase] delete pipeline project failed:', error);
  },

  async replacePipelineProjects(projects: ZohoPipelineProject[]) {
    const { error: delErr } = await supabase.from('pipeline_projects').delete().neq('id', '');
    if (delErr) console.warn('[supabase] delete all pipeline projects failed:', delErr);
    if (projects.length > 0) {
      const rows = projects.map(projectToRow);
      const { error } = await supabase.from('pipeline_projects').insert(rows);
      if (error) console.warn('[supabase] batch insert pipeline projects failed:', error);
    }
  },

  /** Clear all tables (for Settings → Clear All Data). */
  async clearAll() {
    await Promise.all([
      supabase.from('forecast_assignments').delete().neq('id', ''),
      supabase.from('forecast_meta').upsert({ id: 'singleton', week_dates: [], updated_by: CLIENT_ID }),
      supabase.from('financial_settings').upsert({
        id: 'singleton', exchange_rate: 83.5, cad_to_usd_rate: 0.73, display_currency: 'inr', updated_by: CLIENT_ID,
      }),
      supabase.from('sync_config').upsert({
        id: 'singleton', onedrive_url: '', sheet_name: 'Forecasting Hrs', auto_sync_on_load: true,
        last_sync_at: null, last_sync_status: 'never', last_sync_error: null,
        last_sync_row_count: 0, last_sync_member_count: 0, last_sync_project_count: 0,
        updated_by: CLIENT_ID,
      }),
      supabase.from('hiring_forecast_config').upsert({
        id: 'singleton', concierge_config: {}, scenario_settings: {}, updated_by: CLIENT_ID,
      }),
      supabase.from('staffing_requests').delete().neq('id', ''),
      supabase.from('pipeline_projects').delete().neq('id', ''),
    ]);
  },
};

// ─── Realtime subscriptions ────────────────────────────────────────

type StoreSetters = {
  setForecastState: (assignments: ForecastAssignment[], weekDates?: string[]) => void;
  setFinancialSettings: (s: FinancialSettings) => void;
  setSyncConfig: (c: Record<string, unknown>) => void;
  setHiringConfig: (concierge: ConciergeConfig, scenario: ScenarioSettings, requests: StaffingRequest[]) => void;
  setPipelineProjects: (p: ZohoPipelineProject[]) => void;
  getForecastAssignments: () => ForecastAssignment[];
  getStaffingRequests: () => StaffingRequest[];
  getPipelineProjects: () => ZohoPipelineProject[];
};

export function setupRealtimeSubscriptions(setters: StoreSetters) {
  // Use unique channel name to avoid conflicts on React StrictMode re-renders
  const channel = supabase.channel(`db-sync-${nanoid(6)}`);

  // --- Forecast assignments ---
  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'forecast_assignments' },
    (payload) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const row = (payload.new || payload.old) as any;
      if (row?.updated_by === CLIENT_ID) return; // Skip own changes

      const current = setters.getForecastAssignments();
      if (payload.eventType === 'INSERT') {
        const a = rowToAssignment(payload.new);
        if (!current.find((x) => x.id === a.id)) {
          setters.setForecastState([...current, a]);
        }
      } else if (payload.eventType === 'UPDATE') {
        const a = rowToAssignment(payload.new);
        setters.setForecastState(current.map((x) => (x.id === a.id ? a : x)));
      } else if (payload.eventType === 'DELETE') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const oldRow = payload.old as any;
        if (oldRow?.id) {
          setters.setForecastState(current.filter((x) => x.id !== oldRow.id));
        }
      }
    },
  );

  // --- Forecast meta ---
  channel.on(
    'postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'forecast_meta' },
    (payload) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const row = payload.new as any;
      if (row?.updated_by === CLIENT_ID) return;
      setters.setForecastState(setters.getForecastAssignments(), row.week_dates || []);
    },
  );

  // --- Financial settings ---
  channel.on(
    'postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'financial_settings' },
    (payload) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const row = payload.new as any;
      if (row?.updated_by === CLIENT_ID) return;
      setters.setFinancialSettings({
        exchangeRate: row.exchange_rate ?? 83.5,
        cadToUsdRate: row.cad_to_usd_rate ?? 0.73,
        displayCurrency: row.display_currency ?? 'inr',
      });
    },
  );

  // --- Sync config ---
  channel.on(
    'postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'sync_config' },
    (payload) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const row = payload.new as any;
      if (row?.updated_by === CLIENT_ID) return;
      setters.setSyncConfig({
        oneDriveUrl: row.onedrive_url || '',
        sheetName: row.sheet_name || 'Forecasting Hrs',
        autoSyncOnLoad: row.auto_sync_on_load ?? true,
        lastSyncAt: row.last_sync_at,
        lastSyncStatus: row.last_sync_status || 'never',
        lastSyncError: row.last_sync_error,
        lastSyncRowCount: row.last_sync_row_count || 0,
        lastSyncMemberCount: row.last_sync_member_count || 0,
        lastSyncProjectCount: row.last_sync_project_count || 0,
      });
    },
  );

  // --- Hiring config ---
  channel.on(
    'postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'hiring_forecast_config' },
    (payload) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const row = payload.new as any;
      if (row?.updated_by === CLIENT_ID) return;
      setters.setHiringConfig(
        row.concierge_config || {},
        row.scenario_settings || {},
        setters.getStaffingRequests(),
      );
    },
  );

  // --- Staffing requests ---
  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'staffing_requests' },
    (payload) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const row = (payload.new || payload.old) as any;
      if (row?.updated_by === CLIENT_ID) return;
      // Refetch all staffing requests (simpler than diffing)
      fetchStaffingRequests().then((requests) => {
        if (requests) {
          const { conciergeConfig, scenarioSettings } = getHiringConfigFromStore();
          setters.setHiringConfig(conciergeConfig, scenarioSettings, requests);
        }
      });
    },
  );

  // --- Pipeline projects ---
  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'pipeline_projects' },
    (payload) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const row = (payload.new || payload.old) as any;
      if (row?.updated_by === CLIENT_ID) return;
      const current = setters.getPipelineProjects();
      if (payload.eventType === 'INSERT') {
        const p = pipelineRowToProject(payload.new);
        if (!current.find((x) => x.id === p.id)) {
          setters.setPipelineProjects([...current, p]);
        }
      } else if (payload.eventType === 'UPDATE') {
        const p = pipelineRowToProject(payload.new);
        setters.setPipelineProjects(current.map((x) => (x.id === p.id ? p : x)));
      } else if (payload.eventType === 'DELETE') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const oldRow = payload.old as any;
        if (oldRow?.id) {
          setters.setPipelineProjects(current.filter((x) => x.id !== oldRow.id));
        }
      }
    },
  );

  channel.subscribe();
  return () => { supabase.removeChannel(channel); };
}

// Helper: read hiring config from the store (avoids circular import)
let _getHiringConfig: () => { conciergeConfig: ConciergeConfig; scenarioSettings: ScenarioSettings } = () => ({
  conciergeConfig: { monthlyHours: { BA: {} as Record<Month, number>, JuniorDev: {} as Record<Month, number>, SeniorDev: {} as Record<Month, number> } },
  scenarioSettings: { targetUtilization: 80, forecastStartMonth: 'Mar' as Month, forecastEndMonth: 'Dec' as Month },
});

export function registerHiringConfigGetter(fn: typeof _getHiringConfig) {
  _getHiringConfig = fn;
}

function getHiringConfigFromStore() {
  return _getHiringConfig();
}

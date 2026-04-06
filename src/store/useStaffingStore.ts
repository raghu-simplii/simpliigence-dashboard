import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type {
  StaffingAccount,
  StaffingRequisition,
  DailyStatus,
  StaffingStatus,
  PipelineStage,
} from '../types/staffing';

/* ââ Seed data from original Staffing.xlsx ââ */
const SEED_ACCOUNTS: StaffingAccount[] = [
  { id: 'acct-1', name: 'Acuity', created_at: '2025-03-01' },
  { id: 'acct-2', name: 'Amex', created_at: '2025-03-01' },
  { id: 'acct-3', name: 'Ciklum', created_at: '2025-03-01' },
  { id: 'acct-4', name: 'Ness', created_at: '2025-03-01' },
  { id: 'acct-5', name: 'Persistent', created_at: '2025-03-01' },
  { id: 'acct-6', name: 'Merck', created_at: '2025-03-01' },
];

const SEED_REQS: StaffingRequisition[] = [
  {id:'r1',account_id:'acct-1',title:'Mixed (FSL Architect, Python+AI, .Net FullStack)',month:'March',new_positions:1,backfills:5,expected_closure:'March End',close_by_date:'',status_field:'In Progress' as StaffingStatus,stage:'Sourcing' as PipelineStage,anticipation:'Expecting closures in early next week',created_at:'2025-03-01',updated_at:'2025-03-27'},
  {id:'r2',account_id:'acct-2',title:'Product Owner',month:'March',new_positions:2,backfills:0,expected_closure:'March End',close_by_date:'',status_field:'In Progress' as StaffingStatus,stage:'Sourcing' as PipelineStage,anticipation:'Expecting onboarding Mon/Early next week',created_at:'2025-03-01',updated_at:'2025-03-27'},
  {id:'r3',account_id:'acct-3',title:'AI Architect - Healthcare',month:'March',new_positions:1,backfills:1,expected_closure:'March End',close_by_date:'',status_field:'In Progress' as StaffingStatus,stage:'Sourcing' as PipelineStage,anticipation:'No hopes. Expecting the L1 Selection',created_at:'2025-03-01',updated_at:'2025-03-26'},
  {id:'r4',account_id:'acct-3',title:'AI',month:'March',new_positions:1,backfills:0,expected_closure:'March End',close_by_date:'',status_field:'In Progress' as StaffingStatus,stage:'Sourcing' as PipelineStage,anticipation:'Expecting client call - no hopes',created_at:'2025-03-01',updated_at:'2025-03-26'},
  {id:'r5',account_id:'acct-3',title:'DevOps',month:'March',new_positions:2,backfills:0,expected_closure:'March End',close_by_date:'',status_field:'In Progress' as StaffingStatus,stage:'Sourcing' as PipelineStage,anticipation:'No hopes. Expecting at least one selection',created_at:'2025-03-01',updated_at:'2025-03-25'},
  {id:'r6',account_id:'acct-3',title:'Java',month:'March',new_positions:10,backfills:0,expected_closure:'March End',close_by_date:'',status_field:'In Progress' as StaffingStatus,stage:'Sourcing' as PipelineStage,anticipation:'No hopes. Screening but no hopes on closures',created_at:'2025-03-01',updated_at:'2025-03-27'},
  {id:'r7',account_id:'acct-4',title:'Support',month:'March',new_positions:4,backfills:0,expected_closure:'March End',close_by_date:'',status_field:'In Progress' as StaffingStatus,stage:'Sourcing' as PipelineStage,anticipation:'Expecting the slots',created_at:'2025-03-01',updated_at:'2025-03-27'},
  {id:'r8',account_id:'acct-4',title:'Developer',month:'March',new_positions:3,backfills:0,expected_closure:'March End',close_by_date:'',status_field:'In Progress' as StaffingStatus,stage:'Sourcing' as PipelineStage,anticipation:'Expecting one more slot',created_at:'2025-03-01',updated_at:'2025-03-18'},
  {id:'r9',account_id:'acct-4',title:'Lead',month:'March',new_positions:1,backfills:0,expected_closure:'March End',close_by_date:'',status_field:'In Progress' as StaffingStatus,stage:'Sourcing' as PipelineStage,anticipation:'Expecting slots 03/23 or 03/24',created_at:'2025-03-01',updated_at:'2025-03-26'},
  {id:'r10',account_id:'acct-5',title:'CPQ/Conga Architect',month:'March',new_positions:1,backfills:0,expected_closure:'Overdue',close_by_date:'',status_field:'In Progress' as StaffingStatus,stage:'Sourcing' as PipelineStage,anticipation:'Expecting the onboarding date',created_at:'2025-03-01',updated_at:'2025-03-24'},
  {id:'r11',account_id:'acct-5',title:'CPQ/Conga Developer',month:'March',new_positions:1,backfills:0,expected_closure:'Overdue',close_by_date:'',status_field:'In Progress' as StaffingStatus,stage:'Sourcing' as PipelineStage,anticipation:'Expecting the onboarding date',created_at:'2025-03-01',updated_at:'2025-03-24'},
  {id:'r12',account_id:'acct-5',title:'CPQ Architect + AI',month:'March',new_positions:1,backfills:0,expected_closure:'March End',close_by_date:'',status_field:'In Progress' as StaffingStatus,stage:'Sourcing' as PipelineStage,anticipation:'No hopes. Expecting more slots',created_at:'2025-03-01',updated_at:'2025-03-26'},
  {id:'r13',account_id:'acct-5',title:'CPQ Developer + AI',month:'March',new_positions:2,backfills:0,expected_closure:'March End',close_by_date:'',status_field:'In Progress' as StaffingStatus,stage:'Sourcing' as PipelineStage,anticipation:'Expecting select or more client discussion',created_at:'2025-03-01',updated_at:'2025-03-25'},
  {id:'r14',account_id:'acct-5',title:'LWC/Integration',month:'March',new_positions:1,backfills:0,expected_closure:'March End',close_by_date:'',status_field:'In Progress' as StaffingStatus,stage:'Sourcing' as PipelineStage,anticipation:'Expecting the L1 slot',created_at:'2025-03-01',updated_at:'2025-03-26'},
  {id:'r15',account_id:'acct-5',title:'Dev Lead - Salescloud, CPQ',month:'March',new_positions:1,backfills:0,expected_closure:'March End',close_by_date:'',status_field:'In Progress' as StaffingStatus,stage:'Sourcing' as PipelineStage,anticipation:'Expecting at least 1 to hit',created_at:'2025-03-01',updated_at:'2025-03-26'},
  {id:'r16',account_id:'acct-5',title:'Service Cloud Voice Tech Lead + Architect',month:'March',new_positions:2,backfills:0,expected_closure:'March End',close_by_date:'',status_field:'In Progress' as StaffingStatus,stage:'Sourcing' as PipelineStage,anticipation:'R1 should clear',created_at:'2025-03-01',updated_at:'2025-03-27'},
  {id:'r17',account_id:'acct-5',title:'SF Architect (Sales, Conga CPQ, CLM)',month:'March',new_positions:1,backfills:0,expected_closure:'March End',close_by_date:'',status_field:'In Progress' as StaffingStatus,stage:'Sourcing' as PipelineStage,anticipation:'No hopes. Expecting clarity on role',created_at:'2025-03-01',updated_at:'2025-03-27'},
  {id:'r18',account_id:'acct-5',title:'SF Automation QA (ACCELQ)',month:'March',new_positions:1,backfills:0,expected_closure:'March End',close_by_date:'',status_field:'In Progress' as StaffingStatus,stage:'Sourcing' as PipelineStage,anticipation:'Expecting the slots',created_at:'2025-03-01',updated_at:'2025-03-24'},
  {id:'r19',account_id:'acct-5',title:'Salesforce Agentforce (7+ Yrs)',month:'March',new_positions:1,backfills:0,expected_closure:'March End',close_by_date:'',status_field:'In Progress' as StaffingStatus,stage:'Sourcing' as PipelineStage,anticipation:'No hopes. Expecting L1 Selection',created_at:'2025-03-01',updated_at:'2025-03-25'},
  {id:'r20',account_id:'acct-5',title:'SF Vlocity',month:'March',new_positions:1,backfills:0,expected_closure:'March End',close_by_date:'',status_field:'In Progress' as StaffingStatus,stage:'Sourcing' as PipelineStage,anticipation:'No hopes. Expecting L1 Selection',created_at:'2025-03-01',updated_at:'2025-03-18'},
  {id:'r21',account_id:'acct-6',title:'SF Developer',month:'March',new_positions:1,backfills:0,expected_closure:'March End',close_by_date:'',status_field:'In Progress' as StaffingStatus,stage:'Sourcing' as PipelineStage,anticipation:'Expecting client discussion',created_at:'2025-03-01',updated_at:'2025-03-27'},
  {id:'r22',account_id:'acct-6',title:'SF Service Cloud CTI',month:'March',new_positions:1,backfills:0,expected_closure:'March End',close_by_date:'',status_field:'In Progress' as StaffingStatus,stage:'Sourcing' as PipelineStage,anticipation:'Expecting client discussion',created_at:'2025-03-01',updated_at:'2025-03-23'},
  // April
  {id:'r23',account_id:'acct-1',title:'SF Architect / Python+AI / Solution Architect',month:'April',new_positions:1,backfills:2,expected_closure:'7th April',close_by_date:'',status_field:'In Progress' as StaffingStatus,stage:'Sourcing' as PipelineStage,anticipation:'Python+AI shall close one of 3 proposed',created_at:'2025-04-01',updated_at:'2025-04-02'},
  {id:'r24',account_id:'acct-2',title:'Product Owner',month:'April',new_positions:2,backfills:0,expected_closure:'March 31st (Carried)',close_by_date:'',status_field:'In Progress' as StaffingStatus,stage:'Sourcing' as PipelineStage,anticipation:'In Onboarding discussion',created_at:'2025-04-01',updated_at:'2025-04-02'},
  {id:'r25',account_id:'acct-3',title:'Java',month:'April',new_positions:10,backfills:0,expected_closure:'TBD',close_by_date:'',status_field:'In Progress' as StaffingStatus,stage:'Sourcing' as PipelineStage,anticipation:'No hopes. No hopes on closures',created_at:'2025-04-01',updated_at:'2025-04-02'},
  {id:'r26',account_id:'acct-4',title:'Support',month:'April',new_positions:3,backfills:0,expected_closure:'10th April',close_by_date:'',status_field:'In Progress' as StaffingStatus,stage:'Sourcing' as PipelineStage,anticipation:'Profiles shared, awaiting feedback',created_at:'2025-04-01',updated_at:'2025-04-02'},
  {id:'r27',account_id:'acct-4',title:'Developer',month:'April',new_positions:6,backfills:0,expected_closure:'24th April',close_by_date:'',status_field:'In Progress' as StaffingStatus,stage:'Sourcing' as PipelineStage,anticipation:'Targeting to close in April',created_at:'2025-04-01',updated_at:'2025-04-02'},
  {id:'r28',account_id:'acct-4',title:'Lead',month:'April',new_positions:1,backfills:0,expected_closure:'10th April',close_by_date:'',status_field:'In Progress' as StaffingStatus,stage:'Sourcing' as PipelineStage,anticipation:'Early stage',created_at:'2025-04-01',updated_at:'2025-04-02'},
  {id:'r29',account_id:'acct-5',title:'CPQ Architect + AI',month:'April',new_positions:1,backfills:0,expected_closure:'TBD',close_by_date:'',status_field:'In Progress' as StaffingStatus,stage:'Sourcing' as PipelineStage,anticipation:'No hopes. Expecting more slots',created_at:'2025-04-01',updated_at:'2025-03-26'},
  {id:'r30',account_id:'acct-5',title:'Dev Lead - Salescloud, CPQ',month:'April',new_positions:1,backfills:0,expected_closure:'TBD',close_by_date:'',status_field:'In Progress' as StaffingStatus,stage:'Sourcing' as PipelineStage,anticipation:'No hopes. Expecting at least 1 to hit',created_at:'2025-04-01',updated_at:'2025-03-26'},
  {id:'r31',account_id:'acct-5',title:'Service Cloud Voice Tech Lead + Architect',month:'April',new_positions:2,backfills:0,expected_closure:'TBD',close_by_date:'',status_field:'In Progress' as StaffingStatus,stage:'Sourcing' as PipelineStage,anticipation:'No Hopes. R1 should clear',created_at:'2025-04-01',updated_at:'2025-03-27'},
  {id:'r32',account_id:'acct-5',title:'SF Architect (Sales, Conga CPQ, CLM)',month:'April',new_positions:1,backfills:0,expected_closure:'TBD',close_by_date:'',status_field:'In Progress' as StaffingStatus,stage:'Sourcing' as PipelineStage,anticipation:'No hopes',created_at:'2025-04-01',updated_at:'2025-03-27'},
  {id:'r33',account_id:'acct-5',title:'SF Automation QA (ACCELQ)',month:'April',new_positions:1,backfills:0,expected_closure:'TBD',close_by_date:'',status_field:'In Progress' as StaffingStatus,stage:'Sourcing' as PipelineStage,anticipation:'Expecting the slots',created_at:'2025-04-01',updated_at:'2025-04-02'},
  {id:'r34',account_id:'acct-5',title:'Salesforce Agentforce (7+ Yrs)',month:'April',new_positions:1,backfills:0,expected_closure:'TBD',close_by_date:'',status_field:'In Progress' as StaffingStatus,stage:'Sourcing' as PipelineStage,anticipation:'No hopes to hopes. Expecting L1 Selection',created_at:'2025-04-01',updated_at:'2025-04-02'},
  {id:'r35',account_id:'acct-6',title:'SF Developer',month:'April',new_positions:1,backfills:0,expected_closure:'April 10th',close_by_date:'',status_field:'In Progress' as StaffingStatus,stage:'Sourcing' as PipelineStage,anticipation:'Reject',created_at:'2025-04-01',updated_at:'2025-04-01'},
  {id:'r36',account_id:'acct-6',title:'SF Service Cloud CTI',month:'April',new_positions:1,backfills:0,expected_closure:'TBD',close_by_date:'',status_field:'In Progress' as StaffingStatus,stage:'Sourcing' as PipelineStage,anticipation:'Onboarding - 3 to 4 weeks',created_at:'2025-04-01',updated_at:'2025-04-01'},
];

const SEED_STATUSES: DailyStatus[] = [
  {id:'s1',requisition_id:'r1',status_date:'2025-03-27',status_text:'Got an FSL Architect position; Python+AI 2 interviews scheduled',anticipation:'Expecting closures early next week',created_at:'2025-03-27'},
  {id:'s2',requisition_id:'r1',status_date:'2025-03-26',status_text:'Closed 2 .Net Full Stack positions & working on Python+AI',anticipation:'Targeting to close today/tomorrow',created_at:'2025-03-26'},
  {id:'s3',requisition_id:'r1',status_date:'2025-03-25',status_text:'Full Stack interviews scheduled & working on Python+AI',anticipation:'',created_at:'2025-03-25'},
  {id:'s4',requisition_id:'r1',status_date:'2025-03-18',status_text:'1 .Net FullStack Select',anticipation:'',created_at:'2025-03-18'},
  {id:'s5',requisition_id:'r1',status_date:'2025-03-17',status_text:'1 .Net closed, 2 .Net FullStack in Client Evaluation, 1 Python in Screening',anticipation:'',created_at:'2025-03-17'},
  {id:'s6',requisition_id:'r2',status_date:'2025-03-27',status_text:'Closed 2 positions & working on onboarding process',anticipation:'Onboarding Mon/Early next week',created_at:'2025-03-27'},
  {id:'s7',requisition_id:'r2',status_date:'2025-03-24',status_text:'1 Select (Rashmi for senior PO), other scheduled. Got verbal communication',anticipation:'',created_at:'2025-03-24'},
  {id:'s8',requisition_id:'r2',status_date:'2025-03-23',status_text:'Got slots for 2 candidates - 03/24 & 03/26',anticipation:'',created_at:'2025-03-23'},
  {id:'s9',requisition_id:'r2',status_date:'2025-03-17',status_text:'Shared profiles',anticipation:'',created_at:'2025-03-17'},
  {id:'s10',requisition_id:'r6',status_date:'2025-03-27',status_text:'1 In Client round & 2 Need client slots',anticipation:'No hopes on closures',created_at:'2025-03-27'},
  {id:'s11',requisition_id:'r6',status_date:'2025-03-26',status_text:'6 Evaluations done - 3 select for next round',anticipation:'',created_at:'2025-03-26'},
  {id:'s12',requisition_id:'r6',status_date:'2025-03-24',status_text:'Got slots for 12 folks',anticipation:'',created_at:'2025-03-24'},
  {id:'s13',requisition_id:'r6',status_date:'2025-03-17',status_text:'Planning to share 09 profiles',anticipation:'',created_at:'2025-03-17'},
  {id:'s14',requisition_id:'r7',status_date:'2025-03-27',status_text:'1 Select out of 3 & Need more profiles',anticipation:'',created_at:'2025-03-27'},
  {id:'s15',requisition_id:'r7',status_date:'2025-03-26',status_text:'2 Interviews done, 1 select for next round',anticipation:'',created_at:'2025-03-26'},
  {id:'s16',requisition_id:'r23',status_date:'2025-04-02',status_text:'SF Architect: Shared 4 profiles. Python+AI: Awaiting feedback. 2 Backfill interviews in place',anticipation:'Python+AI shall close one of 3',created_at:'2025-04-02'},
  {id:'s17',requisition_id:'r24',status_date:'2025-04-02',status_text:'Identified Resources & Working on onboarding Process',anticipation:'In Onboarding discussion',created_at:'2025-04-02'},
  {id:'s18',requisition_id:'r24',status_date:'2025-04-01',status_text:'In Onboarding discussion',anticipation:'',created_at:'2025-04-01'},
  {id:'s19',requisition_id:'r25',status_date:'2025-04-02',status_text:'Ciklum TA working on high priority tasks. Need time to move forward',anticipation:'No hopes',created_at:'2025-04-02'},
  {id:'s20',requisition_id:'r25',status_date:'2025-04-01',status_text:'No News from Client',anticipation:'',created_at:'2025-04-01'},
  {id:'s21',requisition_id:'r26',status_date:'2025-04-02',status_text:'Shared 5 profiles on 04/01, 1 Candidate Reject',anticipation:'',created_at:'2025-04-02'},
  {id:'s22',requisition_id:'r27',status_date:'2025-04-02',status_text:'1 R2 clear & put across client round',anticipation:'Targeting to close in April',created_at:'2025-04-02'},
  {id:'s23',requisition_id:'r34',status_date:'2025-04-02',status_text:'Client Select & Awaiting Final feedback',anticipation:'Expecting L1 Selection',created_at:'2025-04-02'},
  {id:'s24',requisition_id:'r36',status_date:'2025-04-01',status_text:'Select - got the confirmation',anticipation:'Onboarding 3-4 weeks',created_at:'2025-04-01'},
];

/* ââ Store shape ââ */
interface StaffingState {
  accounts: StaffingAccount[];
  requisitions: StaffingRequisition[];
  statuses: DailyStatus[];

  addAccount: (name: string) => StaffingAccount;
  removeAccount: (id: string) => void;

  addRequisition: (req: Omit<StaffingRequisition, 'id' | 'created_at' | 'updated_at'>) => StaffingRequisition;
  updateRequisition: (id: string, patch: Partial<StaffingRequisition>) => void;
  removeRequisition: (id: string) => void;

  addStatus: (s: Omit<DailyStatus, 'id' | 'created_at'>) => DailyStatus;
  removeStatus: (id: string) => void;

  importRows: (rows: Array<{
    month: string; account: string; requisition: string;
    new_positions: number; backfills: number; expected_closure: string;
    status_text: string; anticipation: string;
  }>) => { imported: number; errors: string[] };
}

export const useStaffingStore = create<StaffingState>()(
  persist(
    (set, get) => ({
      accounts: SEED_ACCOUNTS,
      requisitions: SEED_REQS,
      statuses: SEED_STATUSES,

      addAccount: (name) => {
        const acct: StaffingAccount = { id: nanoid(), name, created_at: new Date().toISOString() };
        set((s) => ({ accounts: [...s.accounts, acct] }));
        return acct;
      },

      removeAccount: (id) =>
        set((s) => ({
          accounts: s.accounts.filter((a) => a.id !== id),
          requisitions: s.requisitions.filter((r) => r.account_id !== id),
          statuses: s.statuses.filter(
            (st) => !s.requisitions.filter((r) => r.account_id === id).some((r) => r.id === st.requisition_id),
          ),
        })),

      addRequisition: (req) => {
        const now = new Date().toISOString();
        const r: StaffingRequisition = { ...req, id: nanoid(), created_at: now, updated_at: now };
        set((s) => ({ requisitions: [...s.requisitions, r] }));
        return r;
      },

      updateRequisition: (id, patch) =>
        set((s) => ({
          requisitions: s.requisitions.map((r) =>
            r.id === id ? { ...r, ...patch, updated_at: new Date().toISOString() } : r,
          ),
        })),

      removeRequisition: (id) =>
        set((s) => ({
          requisitions: s.requisitions.filter((r) => r.id !== id),
          statuses: s.statuses.filter((st) => st.requisition_id !== id),
        })),

      addStatus: (input) => {
        const ds: DailyStatus = { ...input, id: nanoid(), created_at: new Date().toISOString() };
        set((s) => ({ statuses: [...s.statuses, ds] }));
        return ds;
      },

      removeStatus: (id) => set((s) => ({ statuses: s.statuses.filter((st) => st.id !== id) })),

      importRows: (rows) => {
        const state = get();
        let imported = 0;
        const errors: string[] = [];
        const newAccounts = [...state.accounts];
        const newReqs = [...state.requisitions];
        const newStatuses = [...state.statuses];

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          try {
            if (!row.account || !row.requisition) {
              errors.push(`Row ${i + 1}: missing account or requisition`);
              continue;
            }
            let acct = newAccounts.find((a) => a.name === row.account);
            if (!acct) {
              acct = { id: nanoid(), name: row.account, created_at: new Date().toISOString() };
              newAccounts.push(acct);
            }
            let req = newReqs.find(
              (r) => r.account_id === acct!.id && r.title === row.requisition && r.month === row.month,
            );
            if (!req) {
              const now = new Date().toISOString();
              req = {
                id: nanoid(), account_id: acct.id, title: row.requisition, month: row.month,
                new_positions: row.new_positions || 0, backfills: row.backfills || 0,
                expected_closure: row.expected_closure || '', close_by_date: '', status_field: 'Open' as StaffingStatus, stage: 'Sourcing' as PipelineStage,
                anticipation: row.anticipation || '',
                created_at: now, updated_at: now,
              };
              newReqs.push(req);
            }
            if (row.status_text) {
              newStatuses.push({
                id: nanoid(), requisition_id: req.id,
                status_date: new Date().toISOString().slice(0, 10),
                status_text: row.status_text, anticipation: row.anticipation || '',
                created_at: new Date().toISOString(),
              });
            }
            imported++;
          } catch (e) {
            errors.push(`Row ${i + 1}: ${e}`);
          }
        }

        set({ accounts: newAccounts, requisitions: newReqs, statuses: newStatuses });
        return { imported, errors };
      },
    }),
    { name: 'simpliigence-staffing' },
  ),
);

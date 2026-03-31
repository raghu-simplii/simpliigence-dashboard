import { useState, useMemo } from 'react';
import { useConciergeStore } from '../store/useConciergeStore';
import type { ConciergeTicket } from '../store/useConciergeStore';
import { PageHeader } from '../components/shared/PageHeader';
import { Card, StatCard, Badge } from '../components/ui';
import {
  Search,
  ChevronDown,
  ChevronRight,
  Headset,
  AlertTriangle,
  Clock,
  PauseCircle,
  ExternalLink,
} from 'lucide-react';

/* ── Helpers ───────────────────────────────────── */

function formatDate(iso: string | null): string {
  if (!iso) return '--';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}

function statusVariant(status: string): 'danger' | 'warning' {
  return status === 'Open' ? 'danger' : 'warning';
}

function priorityVariant(priority: string | null): 'danger' | 'warning' | 'neutral' {
  if (priority === 'High') return 'danger';
  if (priority === 'Medium') return 'warning';
  return 'neutral';
}

function priorityLabel(priority: string | null): string {
  return priority ?? 'None';
}

interface ClientGroup {
  account: string;
  tickets: ConciergeTicket[];
  openCount: number;
  onHoldCount: number;
}

/* ── Client Group Card ─────────────────────────── */

function ClientGroupCard({ group }: { group: ClientGroup }) {
  const [expanded, setExpanded] = useState(group.openCount > 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-slate-50 transition-colors rounded-xl"
      >
        <div className="flex items-center gap-3">
          {expanded ? (
            <ChevronDown size={18} className="text-slate-400" />
          ) : (
            <ChevronRight size={18} className="text-slate-400" />
          )}
          <h3 className="text-sm font-semibold text-slate-800">{group.account}</h3>
          <Badge variant="neutral">{group.tickets.length} ticket{group.tickets.length !== 1 ? 's' : ''}</Badge>
        </div>
        <div className="flex items-center gap-2">
          {group.openCount > 0 && <Badge variant="danger">{group.openCount} Open</Badge>}
          {group.onHoldCount > 0 && <Badge variant="warning">{group.onHoldCount} On Hold</Badge>}
        </div>
      </button>

      {expanded && (
        <div className="px-6 pb-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2 pr-4 text-xs font-medium text-slate-500 uppercase tracking-wider">#</th>
                  <th className="text-left py-2 pr-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Subject</th>
                  <th className="text-left py-2 pr-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-left py-2 pr-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Priority</th>
                  <th className="text-left py-2 pr-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Channel</th>
                  <th className="text-left py-2 pr-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Created</th>
                  <th className="text-left py-2 text-xs font-medium text-slate-500 uppercase tracking-wider">Due Date</th>
                </tr>
              </thead>
              <tbody>
                {group.tickets.map((t) => (
                  <tr key={t.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-2.5 pr-4 text-slate-500 font-mono text-xs">{t.ticketNumber}</td>
                    <td className="py-2.5 pr-4 max-w-xs">
                      <a
                        href={t.webUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1"
                      >
                        <span className="truncate">{t.subject}</span>
                        <ExternalLink size={12} className="flex-shrink-0 opacity-60" />
                      </a>
                    </td>
                    <td className="py-2.5 pr-4">
                      <Badge variant={statusVariant(t.status)}>{t.status}</Badge>
                    </td>
                    <td className="py-2.5 pr-4">
                      <Badge variant={priorityVariant(t.priority)}>{priorityLabel(t.priority)}</Badge>
                    </td>
                    <td className="py-2.5 pr-4 text-slate-600">{t.channel}</td>
                    <td className="py-2.5 pr-4 text-slate-600 whitespace-nowrap">{formatDate(t.createdTime)}</td>
                    <td className={`py-2.5 whitespace-nowrap ${isOverdue(t.dueDate) ? 'text-red-600 font-medium' : 'text-slate-600'}`}>
                      {formatDate(t.dueDate)}
                      {isOverdue(t.dueDate) && <span className="ml-1 text-xs">(overdue)</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main Page ─────────────────────────────────── */

export default function ConciergePage() {
  const { tickets, lastSynced } = useConciergeStore();
  const [statusFilter, setStatusFilter] = useState<'All' | 'Open' | 'On Hold'>('All');
  const [search, setSearch] = useState('');

  /* ── Derived data ─── */
  const filtered = useMemo(() => {
    let result = tickets;
    if (statusFilter !== 'All') {
      result = result.filter((t) => t.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.subject.toLowerCase().includes(q) ||
          t.ticketNumber.includes(q) ||
          t.account.toLowerCase().includes(q),
      );
    }
    return result;
  }, [tickets, statusFilter, search]);

  const stats = useMemo(() => {
    const open = tickets.filter((t) => t.status === 'Open').length;
    const onHold = tickets.filter((t) => t.status === 'On Hold').length;
    const highPriority = tickets.filter((t) => t.priority === 'High').length;
    const overdue = tickets.filter((t) => isOverdue(t.dueDate)).length;
    return { total: tickets.length, open, onHold, highPriority, overdue };
  }, [tickets]);

  const clientGroups = useMemo<ClientGroup[]>(() => {
    const map = new Map<string, ConciergeTicket[]>();
    for (const t of filtered) {
      const existing = map.get(t.account) ?? [];
      existing.push(t);
      map.set(t.account, existing);
    }
    return Array.from(map.entries())
      .map(([account, tickets]) => ({
        account,
        tickets,
        openCount: tickets.filter((t) => t.status === 'Open').length,
        onHoldCount: tickets.filter((t) => t.status === 'On Hold').length,
      }))
      .sort((a, b) => b.tickets.length - a.tickets.length);
  }, [filtered]);

  const statusOptions: Array<'All' | 'Open' | 'On Hold'> = ['All', 'Open', 'On Hold'];

  return (
    <div>
      <PageHeader
        title="Concierge"
        subtitle={`${stats.total} open tickets across ${new Set(tickets.map((t) => t.account)).size} clients`}
        action={
          lastSynced && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Clock size={14} />
              Last synced {new Date(lastSynced).toLocaleString()}
            </div>
          )
        }
      />

      {/* ── Summary Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Tickets"
          value={stats.total}
          icon={<Headset size={20} />}
        />
        <StatCard
          label="On Hold"
          value={stats.onHold}
          icon={<PauseCircle size={20} />}
        />
        <StatCard
          label="High Priority"
          value={stats.highPriority}
          icon={<AlertTriangle size={20} />}
        />
        <StatCard
          label="Overdue"
          value={stats.overdue}
          subtitle={stats.overdue > 0 ? 'Past due date' : 'All on track'}
          icon={<Clock size={20} />}
        />
      </div>

      {/* ── Filter Bar ─── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
        <div className="flex gap-1 bg-white border border-slate-200 rounded-lg p-1">
          {statusOptions.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setStatusFilter(opt)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                statusFilter === opt
                  ? 'bg-primary text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search tickets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
          />
        </div>
      </div>

      {/* ── Client Groups ─── */}
      <div className="space-y-4">
        {clientGroups.length === 0 && (
          <Card>
            <p className="text-center text-slate-500 py-8">No tickets match your filters.</p>
          </Card>
        )}
        {clientGroups.map((group) => (
          <ClientGroupCard key={group.account} group={group} />
        ))}
      </div>
    </div>
  );
}

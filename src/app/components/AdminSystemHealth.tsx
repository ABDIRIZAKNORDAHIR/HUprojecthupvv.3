import { useCallback, useEffect, useState } from 'react';
import { Activity, Database, Server, RefreshCw, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';
import { api } from '../api/client';
import { PageHero } from './PageHero';
import { HU_IMAGES } from '../config/appImages';
import { ROLE_THEME } from '../config/brandTheme';

const ADMIN = ROLE_THEME.admin;

export function AdminSystemHealth() {
  const [health, setHealth] = useState<Awaited<ReturnType<typeof api.health>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [auditLogs, setAuditLogs] = useState<Awaited<ReturnType<typeof api.getAdminAuditLogs>>['logs']>([]);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    Promise.all([api.health(), api.getAdminAuditLogs()])
      .then(([healthData, auditData]) => {
        setHealth(healthData);
        setAuditLogs(auditData.logs);
        setLastChecked(new Date());
      })
      .catch(e => {
        setHealth(null);
        setError(e instanceof Error ? e.message : 'Cannot reach the university server');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [load]);

  const dbOk =
    !!health?.database &&
    health.status === 'ok' &&
    !String(health.database).toLowerCase().includes('fail') &&
    !String(health.database).toLowerCase().includes('error');

  return (
    <div className="dashboard-canvas space-y-6 pb-mobile-nav">
      <PageHero
        dense
        icon={Activity}
        eyebrow="Platform health"
        title="System health"
        subtitle="Database, API, and service status at a glance."
        image={HU_IMAGES.campus}
      >
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-sm font-semibold shadow-sm shrink-0 disabled:opacity-60"
          style={{ color: ADMIN.accent }}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </PageHero>

      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-100 text-red-800">
          <XCircle size={20} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-sm">API offline</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatusCard
          icon={Server}
          title="API"
          ok={health?.status === 'ok'}
          value={health?.service || (loading ? 'Checking…' : 'Offline')}
          detail={health?.status === 'ok' ? 'Online' : 'Offline'}
        />
        <StatusCard
          icon={Database}
          title="Database"
          ok={dbOk}
          value={health?.database || (loading ? 'Checking…' : 'Unknown')}
          detail={dbOk ? 'Connected' : 'Check .env'}
        />
        <StatusCard
          icon={Activity}
          title="Checked"
          ok={!!lastChecked && !error}
          value={lastChecked ? lastChecked.toLocaleTimeString() : '—'}
          detail="Every 30s"
        />
      </div>

      <section className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="p-5 border-b flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: ADMIN.soft }}>
            <ShieldCheck size={18} style={{ color: ADMIN.accent }} />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">Security audit activity</h2>
            <p className="text-xs text-gray-500">Recent sign-ins and sensitive account changes</p>
          </div>
        </div>
        <div className="divide-y max-h-[420px] overflow-y-auto">
          {auditLogs.slice(0, 30).map(log => (
            <div key={log.AuditLogId} className="px-5 py-3 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800">{log.Action.replaceAll('.', ' ')}</p>
                <p className="text-xs text-gray-500 truncate">
                  {[log.FirstName, log.LastName].filter(Boolean).join(' ') || 'System'}
                  {log.Role ? ` · ${log.Role}` : ''}
                  {log.EntityId ? ` · ${log.EntityType || 'record'} ${log.EntityId}` : ''}
                </p>
              </div>
              <time className="text-xs text-gray-400 whitespace-nowrap" dateTime={log.CreatedAt}>
                {new Date(log.CreatedAt).toLocaleString()}
              </time>
            </div>
          ))}
          {!auditLogs.length && !loading && (
            <p className="p-6 text-sm text-gray-500 text-center">No security activity recorded yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function StatusCard({
  icon: Icon,
  title,
  ok,
  value,
  detail,
}: {
  icon: typeof Server;
  title: string;
  ok: boolean;
  value: string;
  detail: string;
}) {
  return (
    <div className="bg-white rounded-2xl border p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: ADMIN.soft }}
          >
            <Icon size={18} style={{ color: ADMIN.accent }} />
          </div>
          <p className="font-bold text-sm text-gray-900">{title}</p>
        </div>
        {ok ? (
          <CheckCircle2 size={20} className="text-green-600" />
        ) : (
          <XCircle size={20} className="text-red-500" />
        )}
      </div>
      <p className="font-semibold text-gray-800 text-sm break-words">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{detail}</p>
    </div>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { Activity, Database, Server, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { api } from '../api/client';
import { PageHero } from './PageHero';
import { APP_IMAGES, HU_BRAND_GREEN } from '../config/appImages';

export function AdminSystemHealth() {
  const [health, setHealth] = useState<Awaited<ReturnType<typeof api.health>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    api.health()
      .then(data => {
        setHealth(data);
        setLastChecked(new Date());
      })
      .catch(e => {
        setHealth(null);
        setError(e instanceof Error ? e.message : 'Cannot reach API');
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
    <div className="p-4 sm:p-6 space-y-6 max-w-screen-2xl mx-auto pb-mobile-nav">
      <PageHero
        title="System Health"
        subtitle={undefined}
        image={APP_IMAGES.campusGroup}
        gradient={`linear-gradient(135deg, rgba(22,128,85,0.92), rgba(37,99,235,0.88))`}
      >
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-sm font-semibold shadow-sm shrink-0 disabled:opacity-60"
          style={{ color: HU_BRAND_GREEN }}
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
          title="MySQL"
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
            style={{ background: `${HU_BRAND_GREEN}15` }}
          >
            <Icon size={18} style={{ color: HU_BRAND_GREEN }} />
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

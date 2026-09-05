'use client';

import { useEffect, useState } from 'react';
import { Activity, KeyRound, ShieldCheck, Trash2, Plus, RefreshCw, Globe, Pencil, Settings } from 'lucide-react';

type Service = {
  id: string;
  name: string;
  url: string;
  method: string;
  requestBody?: string | null;
  status: string;
  checkIntervalMs: number;
  timeoutMs: number;
  lastCheckedAt: string | null;
};

type ApiKey = {
  id: string;
  name: string;
  revoked: boolean;
  lastUsedAt: string | null;
  createdAt: string;
};

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

export function DashboardClient() {
  const [services, setServices] = useState<Service[]>([]);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newMethod, setNewMethod] = useState('GET');
  const [newBody, setNewBody] = useState('');
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    const [servicesRes, keysRes] = await Promise.all([
      fetch('/api/services'),
      fetch('/api/keys')
    ]);

    if (servicesRes.ok) {
      const servicesData = await servicesRes.json();
      setServices(servicesData.services ?? []);
    }

    if (keysRes.ok) {
      const keysData = await keysRes.json();
      setKeys(keysData.keys ?? []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  function resetForm() {
    setNewName('');
    setNewUrl('');
    setNewMethod('GET');
    setNewBody('');
    setEditingServiceId(null);
  }

  function populateEditor(service: Service) {
    setEditingServiceId(service.id);
    setNewName(service.name);
    setNewUrl(service.url);
    setNewMethod(service.method || 'GET');
    setNewBody(service.requestBody || '');
  }

  async function saveService() {
    if (!newName.trim() || !newUrl.trim()) {
      alert('Please enter a service name and URL');
      return;
    }

    const payload = {
      name: newName.trim(),
      url: newUrl.trim(),
      method: newMethod,
      requestBody: ['GET', 'HEAD'].includes(newMethod) ? null : newBody.trim() || '{}'
    };

    const response = editingServiceId
      ? await fetch(`/api/services/${editingServiceId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      : await fetch('/api/services', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

    const result = await response.json();
    if (!response.ok) {
      alert(result.error ?? 'Failed to save monitor');
      return;
    }

    resetForm();
    await loadData();
  }

  async function deleteService(serviceId: string) {
    const response = await fetch(`/api/services/${serviceId}`, {
      method: 'DELETE'
    });

    const payload = await response.json();
    if (!response.ok) {
      alert(payload.error ?? 'Failed to remove monitor');
      return;
    }

    if (editingServiceId === serviceId) {
      resetForm();
    }

    await loadData();
  }

  async function pingNow(serviceId: string) {
    const response = await fetch(`/api/services/${serviceId}/check`, {
      method: 'POST'
    });

    const payload = await response.json();
    if (!response.ok) {
      alert(payload.error ?? 'Ping failed');
      return;
    }

    await loadData();
  }

  async function generateKey() {
    if (!newKeyName.trim()) return;

    const response = await fetch('/api/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newKeyName.trim() })
    });

    const payload = await response.json();
    if (response.ok) {
      setNewKeyValue(payload.key);
      setNewKeyName('');
      await loadData();
      return;
    }

    alert(payload.error ?? 'Failed to generate key');
  }

  async function revokeKey(id: string) {
    const response = await fetch(`/api/keys/${id}/revoke`, {
      method: 'PATCH'
    });

    const payload = await response.json();
    if (response.ok) {
      await loadData();
      return;
    }

    alert(payload.error ?? 'Failed to revoke key');
  }

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-soft md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-emerald-400">Operations Console</p>
            <h1 className="mt-2 text-3xl font-bold">Uptime Monitor & API Gateway</h1>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-2 text-sm text-slate-300">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            SQLite local mode • Zero external services
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <StatCard icon={<Activity className="h-5 w-5 text-emerald-400" />} label="Total services" value={String(services.length)} tone="emerald" />
          <StatCard icon={<span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />} label="Up" value={String(services.filter((s) => s.status === 'UP').length)} tone="emerald" />
          <StatCard icon={<span className="h-2.5 w-2.5 rounded-full bg-red-500" />} label="Down" value={String(services.filter((s) => s.status === 'DOWN').length)} tone="red" />
          <StatCard icon={<KeyRound className="h-5 w-5 text-violet-400" />} label="API keys" value={String(keys.length)} tone="violet" />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-soft">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">{editingServiceId ? 'Edit monitor settings' : 'Add monitor'}</h2>
              {editingServiceId ? (
                <button
                  onClick={resetForm}
                  className="text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancel edit
                </button>
              ) : null}
            </div>

            <div className="space-y-3">
              <input
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                placeholder="Service name"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500"
              />

              <div className="grid gap-3 md:grid-cols-[180px_1fr]">
                <select
                  value={newMethod}
                  onChange={(event) => setNewMethod(event.target.value)}
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none"
                >
                  {HTTP_METHODS.map((method) => (
                    <option key={method} value={method}>{method}</option>
                  ))}
                </select>

                <input
                  value={newUrl}
                  onChange={(event) => setNewUrl(event.target.value)}
                  placeholder="https://example.com/api/health"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500"
                />
              </div>

              {['GET', 'HEAD'].includes(newMethod) ? null : (
                <textarea
                  value={newBody}
                  onChange={(event) => setNewBody(event.target.value)}
                  placeholder="Optional JSON body for POST/PUT/PATCH"
                  rows={4}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500"
                />
              )}

              <button
                onClick={saveService}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-emerald-400"
              >
                {editingServiceId ? <Pencil className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
                {editingServiceId ? 'Save monitor settings' : 'Start monitoring'}
              </button>
            </div>

            <div className="mt-6 mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Monitored services</h2>
              <span className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-300">{services.length} active</span>
            </div>
            {loading ? (
              <p className="text-slate-400">Loading services...</p>
            ) : (
              <div className="space-y-3">
                {services.map((service) => (
                  <div key={service.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h3 className="font-medium text-white">{service.name}</h3>
                        <p className="text-xs text-slate-400">{service.method} • {service.url}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${service.status === 'UP' ? 'bg-emerald-500' : service.status === 'DOWN' ? 'bg-red-500' : 'bg-amber-500'}`} />
                        <span className="text-sm font-medium text-slate-200">{service.status}</span>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-3 text-sm text-slate-300 sm:grid-cols-4">
                      <div className="rounded-lg bg-slate-900 p-2">
                        <div className="text-slate-400">Method</div>
                        <div>{service.method}</div>
                      </div>
                      <div className="rounded-lg bg-slate-900 p-2">
                        <div className="text-slate-400">Interval</div>
                        <div>{service.checkIntervalMs / 1000}s</div>
                      </div>
                      <div className="rounded-lg bg-slate-900 p-2">
                        <div className="text-slate-400">Timeout</div>
                        <div>{service.timeoutMs}ms</div>
                      </div>
                      <div className="rounded-lg bg-slate-900 p-2">
                        <div className="text-slate-400">Last checked</div>
                        <div>{service.lastCheckedAt ? new Date(service.lastCheckedAt).toLocaleString() : 'Never'}</div>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap justify-end gap-2">
                      <button
                        onClick={() => pingNow(service.id)}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-100 hover:border-emerald-500/40 hover:text-emerald-200"
                      >
                        <RefreshCw className="h-3.5 w-3.5" /> Ping now
                      </button>
                      <button
                        onClick={() => populateEditor(service)}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-100 hover:border-amber-500/40 hover:text-amber-200"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => deleteService(service.id)}
                        className="inline-flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-200 hover:bg-red-500/20"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-soft">
              <div className="mb-4 flex items-center gap-2">
                <Settings className="h-5 w-5 text-slate-400" />
                <h2 className="text-xl font-semibold">Settings</h2>
              </div>

              <div className="space-y-3">
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Monitor management</p>
                  <p className="mt-2 text-sm text-slate-300">Create, edit, delete, and test monitors from one place.</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Service rules</p>
                  <p className="mt-2 text-sm text-slate-300">Supports GET, POST, PUT, PATCH, DELETE, HEAD, and OPTIONS checks.</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-soft">
              <h2 className="mb-4 text-xl font-semibold">API key panel</h2>

              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    value={newKeyName}
                    onChange={(event) => setNewKeyName(event.target.value)}
                    placeholder="e.g. Monitoring worker"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none ring-0 placeholder:text-slate-500"
                  />
                  <button
                    onClick={generateKey}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-3 py-2 text-sm font-medium text-slate-950 transition hover:bg-emerald-400"
                  >
                    <Plus className="h-4 w-4" /> Generate
                  </button>
                </div>

                {newKeyValue ? (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
                    <div className="mb-1 text-xs uppercase tracking-[0.2em] text-emerald-300">New key</div>
                    <code className="break-all text-xs">{newKeyValue}</code>
                  </div>
                ) : null}
              </div>

              <div className="mt-4 space-y-3">
                {keys.length === 0 ? (
                  <p className="text-sm text-slate-400">No API keys created yet.</p>
                ) : (
                  keys.map((apiKey) => (
                    <div key={apiKey.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-slate-100">{apiKey.name}</span>
                        <span className={`rounded-full px-2 py-1 text-xs ${apiKey.revoked ? 'bg-red-500/20 text-red-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                          {apiKey.revoked ? 'Revoked' : 'Active'}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-slate-400">Last used: {apiKey.lastUsedAt ? new Date(apiKey.lastUsedAt).toLocaleString() : 'Never'}</p>
                      {!apiKey.revoked ? (
                        <button
                          onClick={() => revokeKey(apiKey.id)}
                          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-xs font-medium text-red-200 hover:bg-red-500/20"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Revoke
                        </button>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-soft">
              <h2 className="mb-4 text-xl font-semibold">Recent incidents</h2>
              <div className="space-y-3">
                {services.flatMap((service) => service.status === 'UP' ? [] : [{ id: service.id, label: service.name, status: service.status, url: service.url }]).slice(0, 6).map((item) => (
                  <div key={item.id} className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                    <div className="mt-1 h-2.5 w-2.5 rounded-full bg-red-500" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-100">{item.label}</p>
                      <p className="text-xs text-slate-400">{item.status} • {item.url}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: 'emerald' | 'red' | 'violet';
}) {
  const toneClasses = {
    emerald: 'border-emerald-500/20 bg-emerald-500/10',
    red: 'border-red-500/20 bg-red-500/10',
    violet: 'border-violet-500/20 bg-violet-500/10'
  };

  return (
    <div className={`rounded-2xl border p-4 ${toneClasses[tone]}`}>
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-300">{label}</p>
        {icon}
      </div>
      <div className="mt-4 text-3xl font-bold text-white">{value}</div>
    </div>
  );
}

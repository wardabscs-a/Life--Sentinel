import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  isBackendConfigured,
  apiGetAdminStats,
  apiGetAllReports,
  apiUpdateReportStatus,
  apiGetSOSEvents,
  apiResolveSOS,
} from '../services/apiClient';
import {
  AlertTriangle, Shield, MapPin, Clock, Users, PhoneCall,
  RefreshCw, CheckCircle, AlertOctagon, Loader2, ExternalLink,
  ArrowRight, XCircle
} from 'lucide-react';

const STATUS_FLOW = ['NEW', 'ACKNOWLEDGED', 'ASSIGNED', 'RESOLVED'];
const STATUS_COLORS = {
  NEW: { bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', border: 'border-red-200 dark:border-red-800' },
  ACKNOWLEDGED: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800' },
  ASSIGNED: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' },
  RESOLVED: { bg: 'bg-green-500/10', text: 'text-green-600 dark:text-green-400', border: 'border-green-200 dark:border-green-800' },
};

export default function DispatchDashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [stats, setStats] = useState(null);
  const [reports, setReports] = useState([]);
  const [sosEvents, setSosEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [activeTab, setActiveTab] = useState('reports'); // 'reports' | 'sos'
  const [statusFilter, setStatusFilter] = useState('');

  const fetchData = useCallback(async () => {
    if (!isBackendConfigured()) {
      setError('Backend server is not configured. Set VITE_BACKEND_URL in .env to enable the dispatch dashboard.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [statsRes, reportsRes, sosRes] = await Promise.all([
        apiGetAdminStats(),
        apiGetAllReports({ limit: 100 }),
        apiGetSOSEvents({ limit: 50 }),
      ]);
      setStats(statsRes.stats);
      setReports(reportsRes.reports || []);
      setSosEvents(sosRes.events || []);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      if (err.code === 'HTTP_403') {
        setError('Access denied. Your account is not authorized for dispatch operations.');
      } else {
        setError(`Failed to load dashboard data: ${err.message}`);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleStatusUpdate = async (reportId, newStatus) => {
    setUpdatingId(reportId);
    try {
      await apiUpdateReportStatus(reportId, newStatus);
      setReports((prev) =>
        prev.map((r) => (r.id === reportId || r.reportId === reportId ? { ...r, status: newStatus } : r))
      );
      // Refresh stats
      const statsRes = await apiGetAdminStats();
      setStats(statsRes.stats);
    } catch (err) {
      console.error('Status update failed:', err);
      alert(`Failed to update status: ${err.message}`);
    }
    setUpdatingId(null);
  };

  const handleResolveSOS = async (sosId) => {
    setUpdatingId(sosId);
    try {
      await apiResolveSOS(sosId);
      setSosEvents((prev) =>
        prev.map((e) => (e.id === sosId || e.sosId === sosId ? { ...e, status: 'RESOLVED' } : e))
      );
      const statsRes = await apiGetAdminStats();
      setStats(statsRes.stats);
    } catch (err) {
      console.error('SOS resolve failed:', err);
      alert(`Failed to resolve SOS: ${err.message}`);
    }
    setUpdatingId(null);
  };

  const filteredReports = statusFilter
    ? reports.filter((r) => r.status === statusFilter)
    : reports;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-sentinel-500" />
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>Loading dispatch dashboard…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto mt-8 p-6">
        <div className="card p-6 text-center">
          <XCircle className="w-12 h-12 mx-auto mb-4 text-emergency-500" />
          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>Dispatch Dashboard Unavailable</h2>
          <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>{error}</p>
          <button onClick={fetchData} className="btn-primary px-6 py-2 rounded-lg text-sm font-semibold">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <Shield className="w-6 h-6 text-sentinel-500" />
            Emergency Dispatch Dashboard
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            Operator: {user?.email}
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          style={{ color: 'var(--color-text)' }}
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="New Reports" value={stats.newReports} color="#ef4444" icon={AlertTriangle} />
          <StatCard label="Acknowledged" value={stats.acknowledgedReports} color="#f59e0b" icon={Clock} />
          <StatCard label="Assigned" value={stats.assignedReports} color="#3b82f6" icon={Users} />
          <StatCard label="Active SOS" value={stats.activeSOS} color="#dc2626" icon={AlertOctagon} />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <TabButton active={activeTab === 'reports'} onClick={() => setActiveTab('reports')}>
          Emergency Reports ({reports.length})
        </TabButton>
        <TabButton active={activeTab === 'sos'} onClick={() => setActiveTab('sos')}>
          SOS Events ({sosEvents.length})
        </TabButton>
      </div>

      {/* Reports tab */}
      {activeTab === 'reports' && (
        <div className="space-y-3">
          {/* Filter */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setStatusFilter('')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${!statusFilter ? 'bg-sentinel-500 text-white' : ''}`}
              style={statusFilter ? { color: 'var(--color-text-secondary)', background: 'var(--color-bg-secondary)' } : {}}
            >
              All
            </button>
            {STATUS_FLOW.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${statusFilter === s ? `${STATUS_COLORS[s].bg} ${STATUS_COLORS[s].text}` : ''}`}
                style={statusFilter !== s ? { color: 'var(--color-text-secondary)', background: 'var(--color-bg-secondary)' } : {}}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Report list */}
          {filteredReports.length === 0 ? (
            <div className="card p-8 text-center">
              <CheckCircle className="w-10 h-10 mx-auto mb-3 text-safe-500" />
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>No reports found.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredReports.map((report) => {
                const id = report.id || report.reportId;
                const sc = STATUS_COLORS[report.status] || STATUS_COLORS.NEW;
                const isUpdating = updatingId === id;
                const currentIdx = STATUS_FLOW.indexOf(report.status);
                const nextStatus = currentIdx < STATUS_FLOW.length - 1 ? STATUS_FLOW[currentIdx + 1] : null;

                return (
                  <div key={id} className={`card p-4 border ${sc.border}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${sc.bg} ${sc.text}`}>
                            {report.status}
                          </span>
                          <span className="text-[10px] font-mono" style={{ color: 'var(--color-text-secondary)' }}>
                            {id}
                          </span>
                        </div>
                        <p className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
                          {report.category} — {report.severity}
                        </p>
                        <p className="text-xs line-clamp-2 mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                          {report.description}
                        </p>
                        <div className="flex items-center gap-3 text-[10px] flex-wrap" style={{ color: 'var(--color-text-secondary)' }}>
                          {report.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {report.location.lat?.toFixed(4)}, {report.location.lng?.toFixed(4)}
                            </span>
                          )}
                          {report.mapLink && (
                            <a href={report.mapLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sentinel-500 hover:underline">
                              <ExternalLink className="w-3 h-3" /> Map
                            </a>
                          )}
                          {report.clientTimestamp && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(report.clientTimestamp).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Status action */}
                      {nextStatus && (
                        <button
                          onClick={() => handleStatusUpdate(id, nextStatus)}
                          disabled={isUpdating}
                          className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold text-white transition-colors flex-shrink-0 disabled:opacity-50"
                          style={{ background: nextStatus === 'RESOLVED' ? '#22c55e' : '#0ea5e9' }}
                        >
                          {isUpdating ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <>
                              <ArrowRight className="w-3.5 h-3.5" />
                              {nextStatus}
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SOS tab */}
      {activeTab === 'sos' && (
        <div className="space-y-3">
          {sosEvents.length === 0 ? (
            <div className="card p-8 text-center">
              <CheckCircle className="w-10 h-10 mx-auto mb-3 text-safe-500" />
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>No SOS events recorded.</p>
            </div>
          ) : (
            sosEvents.map((event) => {
              const id = event.id || event.sosId;
              const isActive = event.status === 'ACTIVE';
              const isUpdating = updatingId === id;

              return (
                <div key={id} className={`card p-4 border ${isActive ? 'border-red-300 dark:border-red-700' : 'border-gray-200 dark:border-gray-700'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {isActive && <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isActive ? 'bg-red-500/10 text-red-600' : 'bg-green-500/10 text-green-600'}`}>
                          {event.status}
                        </span>
                        <span className="text-[10px] font-mono" style={{ color: 'var(--color-text-secondary)' }}>{id}</span>
                      </div>
                      <p className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
                        {event.emergencyType || 'General'} SOS
                      </p>
                      <div className="flex items-center gap-3 text-[10px] flex-wrap" style={{ color: 'var(--color-text-secondary)' }}>
                        {event.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {event.location.lat?.toFixed(4)}, {event.location.lng?.toFixed(4)}
                          </span>
                        )}
                        {event.mapLink && (
                          <a href={event.mapLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sentinel-500 hover:underline">
                            <ExternalLink className="w-3 h-3" /> Map
                          </a>
                        )}
                        {event.contacts && (
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" /> {event.contacts.length} contacts
                          </span>
                        )}
                      </div>
                    </div>

                    {isActive && (
                      <button
                        onClick={() => handleResolveSOS(id)}
                        disabled={isUpdating}
                        className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold text-white bg-green-500 hover:bg-green-600 transition-colors flex-shrink-0 disabled:opacity-50"
                      >
                        {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                        Resolve
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Important notice */}
      <div className="card p-4 border border-amber-200 dark:border-amber-800">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">Important Notice</p>
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              This dashboard is for authorized dispatch operators only. Life Sentinel does not directly contact
              police, Rescue 1122, fire brigade, or any government emergency service. Official emergency service
              integration requires authorized API access or partnerships with the relevant authorities.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color, icon: Icon }) {
  return (
    <div className="card p-3 sm:p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4" style={{ color }} />
        <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
      </div>
      <p className="text-2xl font-bold" style={{ color }}>{value ?? '—'}</p>
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
        active
          ? 'border-sentinel-500 text-sentinel-600'
          : 'border-transparent hover:border-gray-300'
      }`}
      style={!active ? { color: 'var(--color-text-secondary)' } : {}}
    >
      {children}
    </button>
  );
}

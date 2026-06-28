'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

let _supabase = null;
function getSupabase() {
  if (typeof window === 'undefined') return null;
  if (!_supabase) {
    _supabase = createClient(
      'https://wldkrgiojrustsmgzitk.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsZGtyZ2lvanJ1c3RzbWd6aXRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1MDgxODQsImV4cCI6MjA5ODA4NDE4NH0.mwMfdEIaK9-caleD-N24QhMAiC-W41WoFTUXC8fZh_0'
    );
  }
  return _supabase;
}

const EMPTY_TRADE = {
  date: new Date().toISOString().split('T')[0],
  ticker: '',
  option_type: 'CALL',
  strike: '',
  expiry: '',
  contracts: '1',
  entry_price: '',
  exit_price: '',
  pnl: '',
  setup: '',
  outcome: 'WIN',
  notes: '',
};

export default function JournifiApp() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [trades, setTrades] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_TRADE);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    sb.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      if (session) fetchTrades(session.user.id);
    });
    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchTrades(session.user.id);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function fetchTrades(userId) {
    const sb = getSupabase();
    const { data } = await sb.from('trades').select('*').eq('user_id', userId).order('date', { ascending: false });
    if (data) setTrades(data);
  }

  async function handleEmailLogin(e) {
    e.preventDefault();
    setAuthError('');
    const sb = getSupabase();
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) setAuthError(error.message);
  }

  async function handleGoogleLogin() {
    const sb = getSupabase();
    await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: 'https://journifi-next.vercel.app' }
    });
  }

  async function handleLogout() {
    const sb = getSupabase();
    await sb.auth.signOut();
    setSession(null);
    setTrades([]);
  }

  function handleFormChange(e) {
    const { name, value } = e.target;
    setForm(prev => {
      const updated = { ...prev, [name]: value };
      // Auto-calculate P&L if entry + exit + contracts are set
      if (['entry_price', 'exit_price', 'contracts'].includes(name)) {
        const entry = parseFloat(updated.entry_price);
        const exit = parseFloat(updated.exit_price);
        const contracts = parseFloat(updated.contracts) || 1;
        if (!isNaN(entry) && !isNaN(exit)) {
          updated.pnl = ((exit - entry) * contracts * 100).toFixed(2);
        }
      }
      return updated;
    });
  }

  async function handleSaveTrade(e) {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    const sb = getSupabase();
    const { error } = await sb.from('trades').insert({
      user_id: session.user.id,
      date: form.date,
      ticker: form.ticker.toUpperCase(),
      option_type: form.option_type,
      strike: parseFloat(form.strike) || null,
      expiry: form.expiry || null,
      contracts: parseInt(form.contracts) || 1,
      entry_price: parseFloat(form.entry_price) || null,
      exit_price: parseFloat(form.exit_price) || null,
      pnl: parseFloat(form.pnl) || null,
      setup: form.setup,
      outcome: form.outcome,
      notes: form.notes,
    });
    setSaving(false);
    if (error) {
      setSaveError(error.message);
    } else {
      setShowModal(false);
      setForm(EMPTY_TRADE);
      fetchTrades(session.user.id);
    }
  }

  // Stats
  const totalPnl = trades.reduce((sum, t) => sum + (parseFloat(t.pnl) || 0), 0);
  const wins = trades.filter(t => t.outcome === 'WIN').length;
  const winRate = trades.length ? Math.round((wins / trades.length) * 100) : 0;

  if (loading) return (
    <div style={s.center}>
      <div style={s.spinner} />
    </div>
  );

  if (!session) return (
    <div style={s.page}>
      <div style={s.authCard}>
        <h1 style={s.logo}>Journifi</h1>
        <p style={s.tagline}>Your options trade journal</p>
        <button onClick={handleGoogleLogin} style={s.googleBtn}>Continue with Google</button>
        <div style={s.divider}><span>or</span></div>
        <form onSubmit={handleEmailLogin}>
          <input style={s.input} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
          <input style={s.input} type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
          {authError && <p style={s.error}>{authError}</p>}
          <button type="submit" style={s.submitBtn}>Sign In</button>
        </form>
      </div>
    </div>
  );

  return (
    <div style={s.page}>
      {/* Header */}
      <header style={s.header}>
        <h1 style={s.logo}>Journifi</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={s.userEmail}>{session.user.email}</span>
          <button onClick={handleLogout} style={s.logoutBtn}>Sign Out</button>
        </div>
      </header>

      {/* Stats Bar */}
      <div style={s.statsBar}>
        <div style={s.statCard}>
          <div style={s.statLabel}>Total P&L</div>
          <div style={{ ...s.statValue, color: totalPnl >= 0 ? '#4ade80' : '#f87171' }}>
            {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
          </div>
        </div>
        <div style={s.statCard}>
          <div style={s.statLabel}>Win Rate</div>
          <div style={s.statValue}>{winRate}%</div>
        </div>
        <div style={s.statCard}>
          <div style={s.statLabel}>Total Trades</div>
          <div style={s.statValue}>{trades.length}</div>
        </div>
        <div style={s.statCard}>
          <div style={s.statLabel}>Wins</div>
          <div style={{ ...s.statValue, color: '#4ade80' }}>{wins}</div>
        </div>
        <div style={s.statCard}>
          <div style={s.statLabel}>Losses</div>
          <div style={{ ...s.statValue, color: '#f87171' }}>{trades.filter(t => t.outcome === 'LOSS').length}</div>
        </div>
      </div>

      {/* Main */}
      <main style={s.main}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={s.sectionTitle}>Trade Journal</h2>
          <button onClick={() => { setShowModal(true); setForm(EMPTY_TRADE); }} style={s.addBtn}>+ Add Trade</button>
        </div>

        {trades.length === 0 ? (
          <div style={s.emptyState}>
            <div style={s.emptyIcon}>📋</div>
            <p style={s.emptyText}>No trades yet.</p>
            <p style={s.emptySubtext}>Click "Add Trade" to log your first options trade.</p>
          </div>
        ) : (
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr>
                  {['Date','Ticker','Type','Strike','Expiry','Contracts','Entry','Exit','P&L','Setup','Result','Notes'].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trades.map(t => (
                  <tr key={t.id} style={s.tr}>
                    <td style={s.td}>{t.date}</td>
                    <td style={{ ...s.td, fontWeight: 600, color: '#00C4B4' }}>{t.ticker}</td>
                    <td style={s.td}>
                      <span style={{ ...s.badge, background: t.option_type === 'CALL' ? '#14532d' : '#450a0a', color: t.option_type === 'CALL' ? '#4ade80' : '#f87171' }}>
                        {t.option_type}
                      </span>
                    </td>
                    <td style={s.td}>${t.strike}</td>
                    <td style={s.td}>{t.expiry}</td>
                    <td style={s.td}>{t.contracts}</td>
                    <td style={s.td}>${t.entry_price}</td>
                    <td style={s.td}>${t.exit_price}</td>
                    <td style={{ ...s.td, fontWeight: 700, color: parseFloat(t.pnl) >= 0 ? '#4ade80' : '#f87171' }}>
                      {parseFloat(t.pnl) >= 0 ? '+' : ''}${parseFloat(t.pnl || 0).toFixed(2)}
                    </td>
                    <td style={s.td}>{t.setup}</td>
                    <td style={s.td}>
                      <span style={{ ...s.badge, background: t.outcome === 'WIN' ? '#14532d' : t.outcome === 'LOSS' ? '#450a0a' : '#1e2030', color: t.outcome === 'WIN' ? '#4ade80' : t.outcome === 'LOSS' ? '#f87171' : '#888' }}>
                        {t.outcome}
                      </span>
                    </td>
                    <td style={{ ...s.td, color: '#888', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Add Trade Modal */}
      {showModal && (
        <div style={s.overlay} onClick={() => setShowModal(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Log Trade</h2>
              <button onClick={() => setShowModal(false)} style={s.closeBtn}>✕</button>
            </div>

            <form onSubmit={handleSaveTrade}>
              <div style={s.formGrid}>
                <div style={s.formGroup}>
                  <label style={s.label}>Date</label>
                  <input style={s.input} type="date" name="date" value={form.date} onChange={handleFormChange} required />
                </div>
                <div style={s.formGroup}>
                  <label style={s.label}>Ticker</label>
                  <input style={s.input} type="text" name="ticker" placeholder="SPY" value={form.ticker} onChange={handleFormChange} required />
                </div>
                <div style={s.formGroup}>
                  <label style={s.label}>Type</label>
                  <select style={s.input} name="option_type" value={form.option_type} onChange={handleFormChange}>
                    <option value="CALL">CALL</option>
                    <option value="PUT">PUT</option>
                  </select>
                </div>
                <div style={s.formGroup}>
                  <label style={s.label}>Strike</label>
                  <input style={s.input} type="number" name="strike" placeholder="500" value={form.strike} onChange={handleFormChange} />
                </div>
                <div style={s.formGroup}>
                  <label style={s.label}>Expiry</label>
                  <input style={s.input} type="date" name="expiry" value={form.expiry} onChange={handleFormChange} />
                </div>
                <div style={s.formGroup}>
                  <label style={s.label}>Contracts</label>
                  <input style={s.input} type="number" name="contracts" min="1" value={form.contracts} onChange={handleFormChange} />
                </div>
                <div style={s.formGroup}>
                  <label style={s.label}>Entry Price</label>
                  <input style={s.input} type="number" step="0.01" name="entry_price" placeholder="1.50" value={form.entry_price} onChange={handleFormChange} />
                </div>
                <div style={s.formGroup}>
                  <label style={s.label}>Exit Price</label>
                  <input style={s.input} type="number" step="0.01" name="exit_price" placeholder="3.00" value={form.exit_price} onChange={handleFormChange} />
                </div>
                <div style={s.formGroup}>
                  <label style={s.label}>P&L (auto)</label>
                  <input style={{ ...s.input, color: parseFloat(form.pnl) >= 0 ? '#4ade80' : '#f87171', fontWeight: 700 }} type="number" step="0.01" name="pnl" placeholder="0.00" value={form.pnl} onChange={handleFormChange} />
                </div>
                <div style={s.formGroup}>
                  <label style={s.label}>Outcome</label>
                  <select style={s.input} name="outcome" value={form.outcome} onChange={handleFormChange}>
                    <option value="WIN">WIN</option>
                    <option value="LOSS">LOSS</option>
                    <option value="BREAKEVEN">BREAKEVEN</option>
                  </select>
                </div>
                <div style={{ ...s.formGroup, gridColumn: '1 / -1' }}>
                  <label style={s.label}>Setup</label>
                  <input style={s.input} type="text" name="setup" placeholder="VWAP reclaim, double bottom, trap..." value={form.setup} onChange={handleFormChange} />
                </div>
                <div style={{ ...s.formGroup, gridColumn: '1 / -1' }}>
                  <label style={s.label}>Notes</label>
                  <textarea style={{ ...s.input, height: 72, resize: 'vertical' }} name="notes" placeholder="What happened? What did you learn?" value={form.notes} onChange={handleFormChange} />
                </div>
              </div>

              {saveError && <p style={s.error}>{saveError}</p>}

              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button type="button" onClick={() => setShowModal(false)} style={s.cancelBtn}>Cancel</button>
                <button type="submit" style={s.submitBtn} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Trade'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', background: '#0F1117', color: '#fff', fontFamily: "'IBM Plex Sans', sans-serif" },
  center: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#0F1117' },
  spinner: { width: 36, height: 36, border: '3px solid #1e2030', borderTop: '3px solid #00C4B4', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  authCard: { maxWidth: 400, margin: '0 auto', padding: '80px 32px', display: 'flex', flexDirection: 'column', gap: 14 },
  logo: { margin: 0, fontSize: 32, fontWeight: 700, color: '#00C4B4', letterSpacing: '-1px' },
  tagline: { margin: 0, color: '#666', fontSize: 14 },
  googleBtn: { background: '#fff', color: '#111', border: 'none', borderRadius: 8, padding: '12px 16px', fontSize: 15, fontWeight: 600, cursor: 'pointer', width: '100%' },
  divider: { textAlign: 'center', color: '#444', fontSize: 13 },
  input: { display: 'block', width: '100%', padding: '10px 12px', background: '#1A1D27', border: '1px solid #2a2d3a', borderRadius: 8, color: '#fff', fontSize: 14, boxSizing: 'border-box', outline: 'none' },
  submitBtn: { width: '100%', padding: '12px', background: '#00C4B4', color: '#000', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer' },
  cancelBtn: { flex: 1, padding: '12px', background: 'transparent', color: '#888', border: '1px solid #2a2d3a', borderRadius: 8, fontSize: 15, cursor: 'pointer' },
  error: { color: '#f87171', fontSize: 13, margin: '4px 0' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 32px', borderBottom: '1px solid #1e2030' },
  userEmail: { color: '#666', fontSize: 13 },
  logoutBtn: { background: 'transparent', color: '#666', border: '1px solid #2a2d3a', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 13 },
  statsBar: { display: 'flex', gap: 1, borderBottom: '1px solid #1e2030', background: '#0a0c12' },
  statCard: { flex: 1, padding: '16px 24px', borderRight: '1px solid #1e2030' },
  statLabel: { fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 },
  statValue: { fontSize: 22, fontWeight: 700, color: '#fff' },
  main: { padding: '28px 32px' },
  sectionTitle: { margin: 0, fontSize: 18, fontWeight: 600 },
  addBtn: { background: '#00C4B4', color: '#000', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  emptyState: { textAlign: 'center', padding: '80px 0' },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { color: '#fff', fontSize: 18, fontWeight: 600, margin: '0 0 8px' },
  emptySubtext: { color: '#555', fontSize: 14, margin: 0 },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 900 },
  th: { textAlign: 'left', padding: '10px 14px', borderBottom: '1px solid #1e2030', color: '#555', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' },
  td: { padding: '13px 14px', borderBottom: '1px solid #111', fontSize: 14 },
  tr: { transition: 'background 0.1s' },
  badge: { padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 },
  modal: { background: '#13151f', border: '1px solid #1e2030', borderRadius: 12, padding: 28, width: '100%', maxWidth: 620, maxHeight: '90vh', overflowY: 'auto' },
  closeBtn: { background: 'transparent', border: 'none', color: '#666', fontSize: 20, cursor: 'pointer', padding: 4 },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  formGroup: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 12, color: '#666', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' },
};

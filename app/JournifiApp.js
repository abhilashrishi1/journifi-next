'use client';

import { useState, useEffect, useMemo } from 'react';
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

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function getDateRange(preset) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (preset) {
    case 'today': return { from: today, to: today };
    case 'this_week': {
      const mon = new Date(today); mon.setDate(today.getDate() - today.getDay() + 1);
      return { from: mon, to: today };
    }
    case 'last_week': {
      const mon = new Date(today); mon.setDate(today.getDate() - today.getDay() - 6);
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
      return { from: mon, to: sun };
    }
    case 'this_month': return { from: new Date(today.getFullYear(), today.getMonth(), 1), to: today };
    case 'last_month': {
      const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const last = new Date(today.getFullYear(), today.getMonth(), 0);
      return { from: first, to: last };
    }
    case 'all': default: return null;
  }
}

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

  // Filters
  const [datePreset, setDatePreset] = useState('all');
  const [filterDay, setFilterDay] = useState('all');
  const [filterTicker, setFilterTicker] = useState('all');
  const [filterOutcome, setFilterOutcome] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

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
    await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: 'https://journifi-next.vercel.app' } });
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
    if (error) { setSaveError(error.message); }
    else { setShowModal(false); setForm(EMPTY_TRADE); fetchTrades(session.user.id); }
  }

  // Unique tickers for filter dropdown
  const uniqueTickers = useMemo(() => {
    const tickers = [...new Set(trades.map(t => t.ticker).filter(Boolean))].sort();
    return tickers;
  }, [trades]);

  // Apply all filters
  const filteredTrades = useMemo(() => {
    return trades.filter(t => {
      const tradeDate = new Date(t.date + 'T00:00:00');

      // Date range filter
      if (datePreset === 'custom') {
        if (customFrom && tradeDate < new Date(customFrom)) return false;
        if (customTo && tradeDate > new Date(customTo)) return false;
      } else if (datePreset !== 'all') {
        const range = getDateRange(datePreset);
        if (range) {
          if (tradeDate < range.from || tradeDate > range.to) return false;
        }
      }

      // Day of week filter
      if (filterDay !== 'all') {
        if (DAYS[tradeDate.getDay()] !== filterDay) return false;
      }

      // Ticker filter
      if (filterTicker !== 'all' && t.ticker !== filterTicker) return false;

      // Outcome filter
      if (filterOutcome !== 'all' && t.outcome !== filterOutcome) return false;

      // Type filter
      if (filterType !== 'all' && t.option_type !== filterType) return false;

      return true;
    });
  }, [trades, datePreset, filterDay, filterTicker, filterOutcome, filterType, customFrom, customTo]);

  // Stats from filtered trades
  const totalPnl = filteredTrades.reduce((sum, t) => sum + (parseFloat(t.pnl) || 0), 0);
  const wins = filteredTrades.filter(t => t.outcome === 'WIN').length;
  const losses = filteredTrades.filter(t => t.outcome === 'LOSS').length;
  const winRate = filteredTrades.length ? Math.round((wins / filteredTrades.length) * 100) : 0;
  const avgWin = wins ? filteredTrades.filter(t => t.outcome === 'WIN').reduce((s, t) => s + parseFloat(t.pnl || 0), 0) / wins : 0;
  const avgLoss = losses ? filteredTrades.filter(t => t.outcome === 'LOSS').reduce((s, t) => s + parseFloat(t.pnl || 0), 0) / losses : 0;

  const activeFilters = [datePreset !== 'all', filterDay !== 'all', filterTicker !== 'all', filterOutcome !== 'all', filterType !== 'all'].filter(Boolean).length;

  function resetFilters() {
    setDatePreset('all'); setFilterDay('all'); setFilterTicker('all');
    setFilterOutcome('all'); setFilterType('all'); setCustomFrom(''); setCustomTo('');
  }

  if (loading) return <div style={s.center}><div style={s.spinner} /></div>;

  if (!session) return (
    <div style={s.page}>
      <div style={s.authCard}>
        <h1 style={s.logo}>Journifi</h1>
        <p style={s.tagline}>Your financial journey, logged.</p>
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
        {[
          { label: 'Total P&L', value: `${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(2)}`, color: totalPnl >= 0 ? '#4ade80' : '#f87171' },
          { label: 'Win Rate', value: `${winRate}%`, color: '#fff' },
          { label: 'Trades', value: filteredTrades.length, color: '#fff' },
          { label: 'Wins', value: wins, color: '#4ade80' },
          { label: 'Losses', value: losses, color: '#f87171' },
          { label: 'Avg Win', value: `+$${avgWin.toFixed(2)}`, color: '#4ade80' },
          { label: 'Avg Loss', value: `-$${Math.abs(avgLoss).toFixed(2)}`, color: '#f87171' },
        ].map(stat => (
          <div key={stat.label} style={s.statCard}>
            <div style={s.statLabel}>{stat.label}</div>
            <div style={{ ...s.statValue, color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Main */}
      <main style={s.main}>
        {/* Toolbar */}
        <div style={s.toolbar}>
          <h2 style={s.sectionTitle}>Trade Journal</h2>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => setShowFilters(!showFilters)} style={{ ...s.filterBtn, background: activeFilters > 0 ? '#00C4B4' : 'transparent', color: activeFilters > 0 ? '#000' : '#888' }}>
              ⚙ Filters {activeFilters > 0 ? `(${activeFilters})` : ''}
            </button>
            {activeFilters > 0 && <button onClick={resetFilters} style={s.resetBtn}>✕ Reset</button>}
            <button onClick={() => { setShowModal(true); setForm(EMPTY_TRADE); }} style={s.addBtn}>+ Add Trade</button>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div style={s.filterPanel}>
            {/* Date Presets */}
            <div style={s.filterGroup}>
              <div style={s.filterLabel}>Date Range</div>
              <div style={s.filterChips}>
                {[['all','All Time'],['today','Today'],['this_week','This Week'],['last_week','Last Week'],['this_month','This Month'],['last_month','Last Month'],['custom','Custom']].map(([val, label]) => (
                  <button key={val} onClick={() => setDatePreset(val)} style={{ ...s.chip, background: datePreset === val ? '#00C4B4' : '#1a1d27', color: datePreset === val ? '#000' : '#888' }}>{label}</button>
                ))}
              </div>
              {datePreset === 'custom' && (
                <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                  <input style={{ ...s.input, width: 160 }} type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
                  <span style={{ color: '#555', alignSelf: 'center' }}>to</span>
                  <input style={{ ...s.input, width: 160 }} type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} />
                </div>
              )}
            </div>

            {/* Day of Week */}
            <div style={s.filterGroup}>
              <div style={s.filterLabel}>Day of Week</div>
              <div style={s.filterChips}>
                {[['all','All'],['Monday','Mon'],['Tuesday','Tue'],['Wednesday','Wed'],['Thursday','Thu'],['Friday','Fri']].map(([val, label]) => (
                  <button key={val} onClick={() => setFilterDay(val)} style={{ ...s.chip, background: filterDay === val ? '#00C4B4' : '#1a1d27', color: filterDay === val ? '#000' : '#888' }}>{label}</button>
                ))}
              </div>
            </div>

            {/* Ticker */}
            <div style={s.filterGroup}>
              <div style={s.filterLabel}>Ticker</div>
              <div style={s.filterChips}>
                <button onClick={() => setFilterTicker('all')} style={{ ...s.chip, background: filterTicker === 'all' ? '#00C4B4' : '#1a1d27', color: filterTicker === 'all' ? '#000' : '#888' }}>All</button>
                {uniqueTickers.map(ticker => (
                  <button key={ticker} onClick={() => setFilterTicker(ticker)} style={{ ...s.chip, background: filterTicker === ticker ? '#00C4B4' : '#1a1d27', color: filterTicker === ticker ? '#000' : '#888' }}>{ticker}</button>
                ))}
              </div>
            </div>

            {/* Outcome + Type */}
            <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
              <div style={s.filterGroup}>
                <div style={s.filterLabel}>Outcome</div>
                <div style={s.filterChips}>
                  {[['all','All'],['WIN','Win'],['LOSS','Loss'],['BREAKEVEN','Breakeven']].map(([val, label]) => (
                    <button key={val} onClick={() => setFilterOutcome(val)} style={{ ...s.chip, background: filterOutcome === val ? '#00C4B4' : '#1a1d27', color: filterOutcome === val ? '#000' : '#888' }}>{label}</button>
                  ))}
                </div>
              </div>
              <div style={s.filterGroup}>
                <div style={s.filterLabel}>Type</div>
                <div style={s.filterChips}>
                  {[['all','All'],['CALL','Call'],['PUT','Put']].map(([val, label]) => (
                    <button key={val} onClick={() => setFilterType(val)} style={{ ...s.chip, background: filterType === val ? '#00C4B4' : '#1a1d27', color: filterType === val ? '#000' : '#888' }}>{label}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Trade Table */}
        {filteredTrades.length === 0 ? (
          <div style={s.emptyState}>
            <div style={s.emptyIcon}>📋</div>
            <p style={s.emptyText}>{trades.length > 0 ? 'No trades match your filters.' : 'No trades yet.'}</p>
            <p style={s.emptySubtext}>{trades.length > 0 ? 'Try adjusting your filters.' : 'Click "Add Trade" to log your first trade.'}</p>
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
                {filteredTrades.map(t => (
                  <tr key={t.id} style={s.tr}>
                    <td style={s.td}>
                      <div>{t.date}</div>
                      <div style={{ fontSize: 11, color: '#555' }}>{DAYS[new Date(t.date + 'T00:00:00').getDay()]}</div>
                    </td>
                    <td style={{ ...s.td, fontWeight: 600, color: '#00C4B4' }}>{t.ticker}</td>
                    <td style={s.td}>
                      <span style={{ ...s.badge, background: t.option_type === 'CALL' ? '#14532d' : '#450a0a', color: t.option_type === 'CALL' ? '#4ade80' : '#f87171' }}>{t.option_type}</span>
                    </td>
                    <td style={s.td}>{t.strike ? `$${t.strike}` : '-'}</td>
                    <td style={s.td}>{t.expiry || '-'}</td>
                    <td style={s.td}>{t.contracts}</td>
                    <td style={s.td}>{t.entry_price ? `$${t.entry_price}` : '-'}</td>
                    <td style={s.td}>{t.exit_price ? `$${t.exit_price}` : '-'}</td>
                    <td style={{ ...s.td, fontWeight: 700, color: parseFloat(t.pnl) >= 0 ? '#4ade80' : '#f87171' }}>
                      {parseFloat(t.pnl) >= 0 ? '+' : ''}${parseFloat(t.pnl || 0).toFixed(2)}
                    </td>
                    <td style={s.td}>{t.setup || '-'}</td>
                    <td style={s.td}>
                      <span style={{ ...s.badge, background: t.outcome === 'WIN' ? '#14532d' : t.outcome === 'LOSS' ? '#450a0a' : '#1e2030', color: t.outcome === 'WIN' ? '#4ade80' : t.outcome === 'LOSS' ? '#f87171' : '#888' }}>{t.outcome}</span>
                    </td>
                    <td style={{ ...s.td, color: '#666', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.notes || '-'}</td>
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
                <div style={s.formGroup}><label style={s.label}>Date</label><input style={s.input} type="date" name="date" value={form.date} onChange={handleFormChange} required /></div>
                <div style={s.formGroup}><label style={s.label}>Ticker</label><input style={s.input} type="text" name="ticker" placeholder="SPY" value={form.ticker} onChange={handleFormChange} required /></div>
                <div style={s.formGroup}><label style={s.label}>Type</label><select style={s.input} name="option_type" value={form.option_type} onChange={handleFormChange}><option value="CALL">CALL</option><option value="PUT">PUT</option></select></div>
                <div style={s.formGroup}><label style={s.label}>Strike</label><input style={s.input} type="number" name="strike" placeholder="500" value={form.strike} onChange={handleFormChange} /></div>
                <div style={s.formGroup}><label style={s.label}>Expiry</label><input style={s.input} type="date" name="expiry" value={form.expiry} onChange={handleFormChange} /></div>
                <div style={s.formGroup}><label style={s.label}>Contracts</label><input style={s.input} type="number" name="contracts" min="1" value={form.contracts} onChange={handleFormChange} /></div>
                <div style={s.formGroup}><label style={s.label}>Entry Price</label><input style={s.input} type="number" step="0.01" name="entry_price" placeholder="1.50" value={form.entry_price} onChange={handleFormChange} /></div>
                <div style={s.formGroup}><label style={s.label}>Exit Price</label><input style={s.input} type="number" step="0.01" name="exit_price" placeholder="3.00" value={form.exit_price} onChange={handleFormChange} /></div>
                <div style={s.formGroup}><label style={s.label}>P&L (auto)</label><input style={{ ...s.input, color: parseFloat(form.pnl) >= 0 ? '#4ade80' : '#f87171', fontWeight: 700 }} type="number" step="0.01" name="pnl" placeholder="0.00" value={form.pnl} onChange={handleFormChange} /></div>
                <div style={s.formGroup}><label style={s.label}>Outcome</label><select style={s.input} name="outcome" value={form.outcome} onChange={handleFormChange}><option value="WIN">WIN</option><option value="LOSS">LOSS</option><option value="BREAKEVEN">BREAKEVEN</option></select></div>
                <div style={{ ...s.formGroup, gridColumn: '1 / -1' }}><label style={s.label}>Setup</label><input style={s.input} type="text" name="setup" placeholder="VWAP reclaim, double bottom, trap..." value={form.setup} onChange={handleFormChange} /></div>
                <div style={{ ...s.formGroup, gridColumn: '1 / -1' }}><label style={s.label}>Notes</label><textarea style={{ ...s.input, height: 72, resize: 'vertical' }} name="notes" placeholder="What happened? What did you learn?" value={form.notes} onChange={handleFormChange} /></div>
              </div>
              {saveError && <p style={s.error}>{saveError}</p>}
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button type="button" onClick={() => setShowModal(false)} style={s.cancelBtn}>Cancel</button>
                <button type="submit" style={s.submitBtn} disabled={saving}>{saving ? 'Saving...' : 'Save Trade'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', width: '100%', overflowX: 'hidden', background: '#0F1117', color: '#fff', fontFamily: "'IBM Plex Sans', sans-serif" },
  center: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#0F1117' },
  spinner: { width: 36, height: 36, border: '3px solid #1e2030', borderTop: '3px solid #00C4B4', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  authCard: { maxWidth: 400, margin: '0 auto', padding: '80px 32px', display: 'flex', flexDirection: 'column', gap: 14 },
  logo: { margin: 0, fontSize: 28, fontWeight: 700, color: '#00C4B4', letterSpacing: '-1px' },
  tagline: { margin: 0, color: '#555', fontSize: 13 },
  googleBtn: { background: '#fff', color: '#111', border: 'none', borderRadius: 8, padding: '12px 16px', fontSize: 15, fontWeight: 600, cursor: 'pointer', width: '100%' },
  divider: { textAlign: 'center', color: '#444', fontSize: 13 },
  input: { display: 'block', width: '100%', padding: '10px 12px', background: '#1A1D27', border: '1px solid #2a2d3a', borderRadius: 8, color: '#fff', fontSize: 14, boxSizing: 'border-box', outline: 'none' },
  submitBtn: { width: '100%', padding: '12px', background: '#00C4B4', color: '#000', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer' },
  cancelBtn: { flex: 1, padding: '12px', background: 'transparent', color: '#888', border: '1px solid #2a2d3a', borderRadius: 8, fontSize: 15, cursor: 'pointer' },
  error: { color: '#f87171', fontSize: 13, margin: '4px 0' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid #1e2030' },
  userEmail: { color: '#555', fontSize: 13 },
  logoutBtn: { background: 'transparent', color: '#555', border: '1px solid #2a2d3a', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 13 },
  statsBar: { display: 'flex', flexWrap: 'wrap', borderBottom: '1px solid #1e2030', background: '#0a0c12' },
  statCard: { flex: '1 1 120px', padding: '14px 20px', borderRight: '1px solid #1e2030' },
  statLabel: { fontSize: 10, color: '#444', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 },
  statValue: { fontSize: 20, fontWeight: 700 },
  main: { padding: '24px' },
  toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 },
  sectionTitle: { margin: 0, fontSize: 17, fontWeight: 600 },
  filterBtn: { border: '1px solid #2a2d3a', borderRadius: 7, padding: '8px 14px', fontSize: 13, cursor: 'pointer', fontWeight: 500 },
  resetBtn: { background: 'transparent', color: '#f87171', border: '1px solid #f8717133', borderRadius: 7, padding: '8px 12px', fontSize: 13, cursor: 'pointer' },
  addBtn: { background: '#00C4B4', color: '#000', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  filterPanel: { background: '#0d0f18', border: '1px solid #1e2030', borderRadius: 10, padding: '20px', marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 18 },
  filterGroup: { display: 'flex', flexDirection: 'column', gap: 8 },
  filterLabel: { fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 },
  filterChips: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  chip: { border: '1px solid #2a2d3a', borderRadius: 20, padding: '5px 14px', fontSize: 13, cursor: 'pointer', fontWeight: 500, transition: 'all 0.15s' },
  emptyState: { textAlign: 'center', padding: '60px 0' },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { color: '#fff', fontSize: 17, fontWeight: 600, margin: '0 0 6px' },
  emptySubtext: { color: '#444', fontSize: 13, margin: 0 },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 900 },
  th: { textAlign: 'left', padding: '10px 14px', borderBottom: '1px solid #1e2030', color: '#444', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' },
  td: { padding: '12px 14px', borderBottom: '1px solid #0d0f18', fontSize: 13 },
  tr: {},
  badge: { padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 },
  modal: { background: '#13151f', border: '1px solid #1e2030', borderRadius: 12, padding: 28, width: '100%', maxWidth: 620, maxHeight: '90vh', overflowY: 'auto' },
  closeBtn: { background: 'transparent', border: 'none', color: '#555', fontSize: 20, cursor: 'pointer', padding: 4 },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  formGroup: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 11, color: '#555', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' },
};

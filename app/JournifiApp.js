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
  ticker: '', option_type: 'CALL', strike: '', expiry: '',
  contracts: '1', entry_price: '', exit_price: '', pnl: '',
  setup: '', outcome: 'WIN', notes: '',
};

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function getDateRange(preset) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (preset) {
    case 'today': return { from: today, to: today };
    case 'this_week': { const mon = new Date(today); mon.setDate(today.getDate() - today.getDay() + 1); return { from: mon, to: today }; }
    case 'last_week': { const mon = new Date(today); mon.setDate(today.getDate() - today.getDay() - 6); const sun = new Date(mon); sun.setDate(mon.getDate() + 6); return { from: mon, to: sun }; }
    case 'this_month': return { from: new Date(today.getFullYear(), today.getMonth(), 1), to: today };
    case 'last_month': { const first = new Date(today.getFullYear(), today.getMonth() - 1, 1); const last = new Date(today.getFullYear(), today.getMonth(), 0); return { from: first, to: last }; }
    default: return null;
  }
}

// ── Logo SVG ──────────────────────────────────────────────────────────────────
function JournifiLogo({ dark }) {
  const text = dark ? '#0a0c14' : '#fff';
  const accent = '#00C4B4';
  return (
    <svg width="160" height="36" viewBox="0 0 160 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Chart uptrend line integrated into J */}
      <polyline points="4,28 4,10 4,22 10,14 16,18 22,8" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <circle cx="22" cy="8" r="2.5" fill={accent}/>
      {/* Wordmark */}
      <text x="30" y="25" fontFamily="'IBM Plex Sans', system-ui, sans-serif" fontWeight="700" fontSize="20" letterSpacing="-0.5" fill={text}>
        ournifi
      </text>
      {/* J in accent */}
      <text x="30" y="25" fontFamily="'IBM Plex Sans', system-ui, sans-serif" fontWeight="700" fontSize="20" fill={accent} letterSpacing="-0.5">J</text>
      <text x="38" y="25" fontFamily="'IBM Plex Sans', system-ui, sans-serif" fontWeight="700" fontSize="20" fill={text} letterSpacing="-0.5">ournifi</text>
    </svg>
  );
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
  const [darkMode, setDarkMode] = useState(true);

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
        if (!isNaN(entry) && !isNaN(exit)) updated.pnl = ((exit - entry) * contracts * 100).toFixed(2);
      }
      return updated;
    });
  }

  async function handleSaveTrade(e) {
    e.preventDefault();
    setSaving(true); setSaveError('');
    const sb = getSupabase();
    const { error } = await sb.from('trades').insert({
      user_id: session.user.id, date: form.date, ticker: form.ticker.toUpperCase(),
      option_type: form.option_type, strike: parseFloat(form.strike) || null,
      expiry: form.expiry || null, contracts: parseInt(form.contracts) || 1,
      entry_price: parseFloat(form.entry_price) || null, exit_price: parseFloat(form.exit_price) || null,
      pnl: parseFloat(form.pnl) || null, setup: form.setup, outcome: form.outcome, notes: form.notes,
    });
    setSaving(false);
    if (error) setSaveError(error.message);
    else { setShowModal(false); setForm(EMPTY_TRADE); fetchTrades(session.user.id); }
  }

  const uniqueTickers = useMemo(() => [...new Set(trades.map(t => t.ticker).filter(Boolean))].sort(), [trades]);

  const filteredTrades = useMemo(() => trades.filter(t => {
    const tradeDate = new Date(t.date + 'T00:00:00');
    if (datePreset === 'custom') {
      if (customFrom && tradeDate < new Date(customFrom)) return false;
      if (customTo && tradeDate > new Date(customTo)) return false;
    } else if (datePreset !== 'all') {
      const range = getDateRange(datePreset);
      if (range && (tradeDate < range.from || tradeDate > range.to)) return false;
    }
    if (filterDay !== 'all' && DAYS[tradeDate.getDay()] !== filterDay) return false;
    if (filterTicker !== 'all' && t.ticker !== filterTicker) return false;
    if (filterOutcome !== 'all' && t.outcome !== filterOutcome) return false;
    if (filterType !== 'all' && t.option_type !== filterType) return false;
    return true;
  }), [trades, datePreset, filterDay, filterTicker, filterOutcome, filterType, customFrom, customTo]);

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

  // Theme tokens
  const d = darkMode;
  const T = {
    // Backgrounds
    pageBg:    d ? 'linear-gradient(135deg, #0a0c14 0%, #0d1117 50%, #0a0e1a 100%)' : 'linear-gradient(135deg, #e8edf5 0%, #f0f4fa 50%, #e4eaf3 100%)',
    glassBg:   d ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.65)',
    glassBorder: d ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    glassBlur: 'blur(20px)',
    headerBg:  d ? 'rgba(10,12,20,0.8)' : 'rgba(255,255,255,0.8)',
    cardBg:    d ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.7)',
    inputBg:   d ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
    inputBorder: d ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)',
    modalBg:   d ? 'rgba(13,15,24,0.95)' : 'rgba(255,255,255,0.95)',
    tableBorder: d ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)',
    rowHover:  d ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
    // Text
    text:      d ? '#e8edf5' : '#0d1117',
    textMuted: d ? '#6b7280' : '#6b7280',
    textFaint: d ? '#374151' : '#d1d5db',
    // Accent
    accent:    '#00C4B4',
    accentDim: d ? 'rgba(0,196,180,0.12)' : 'rgba(0,196,180,0.1)',
    accentText: d ? '#000' : '#000',
    // Status
    green:     '#22c55e',
    greenBg:   d ? 'rgba(34,197,94,0.1)' : 'rgba(34,197,94,0.12)',
    red:       '#ef4444',
    redBg:     d ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.12)',
    // Orbs (decorative background blobs)
    orb1:      d ? 'rgba(0,196,180,0.06)' : 'rgba(0,196,180,0.08)',
    orb2:      d ? 'rgba(99,102,241,0.05)' : 'rgba(99,102,241,0.06)',
  };

  const globalStyle = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { margin: 0; }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: ${T.textFaint}; border-radius: 3px; }
    input[type=date]::-webkit-calendar-picker-indicator { filter: ${d ? 'invert(1)' : 'none'}; opacity: 0.4; }
    select option { background: ${d ? '#0d1117' : '#fff'}; color: ${T.text}; }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    .trade-row:hover td { background: ${T.rowHover}; }
  `;

  if (loading) return (
    <>
      <style>{globalStyle}</style>
      <div style={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh', background: T.pageBg }}>
        <div style={{ width:36, height:36, border:`3px solid ${T.textFaint}`, borderTop:`3px solid ${T.accent}`, borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      </div>
    </>
  );

  // ── AUTH PAGE ────────────────────────────────────────────────────────────────
  if (!session) return (
    <>
      <style>{globalStyle}</style>
      <div style={{ minHeight:'100vh', background: T.pageBg, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24, position:'relative', overflow:'hidden' }}>
        {/* Background orbs */}
        <div style={{ position:'absolute', width:600, height:600, borderRadius:'50%', background:T.orb1, filter:'blur(80px)', top:-100, right:-100, pointerEvents:'none' }} />
        <div style={{ position:'absolute', width:400, height:400, borderRadius:'50%', background:T.orb2, filter:'blur(80px)', bottom:-50, left:-50, pointerEvents:'none' }} />

        {/* Logo centered */}
        <div style={{ marginBottom: 40, animation:'fadeIn 0.6s ease' }}>
          <JournifiLogo dark={!darkMode} />
          <p style={{ textAlign:'center', color:T.textMuted, fontSize:13, marginTop:8, letterSpacing:'0.02em' }}>Your financial journey, logged.</p>
        </div>

        {/* Glass card */}
        <div style={{ width:'100%', maxWidth:400, background:T.glassBg, backdropFilter:T.glassBlur, WebkitBackdropFilter:T.glassBlur, border:`1px solid ${T.glassBorder}`, borderRadius:20, padding:'32px 28px', animation:'fadeIn 0.7s ease' }}>
          <button onClick={handleGoogleLogin} style={{ width:'100%', padding:'12px 16px', background: d ? 'rgba(255,255,255,0.9)' : '#fff', color:'#111', border:'none', borderRadius:12, fontSize:15, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:10, marginBottom:20 }}>
            <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/></svg>
            Continue with Google
          </button>

          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
            <div style={{ flex:1, height:1, background:T.glassBorder }} />
            <span style={{ color:T.textMuted, fontSize:12 }}>or</span>
            <div style={{ flex:1, height:1, background:T.glassBorder }} />
          </div>

          <form onSubmit={handleEmailLogin} style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <input style={{ padding:'11px 14px', background:T.inputBg, border:`1px solid ${T.inputBorder}`, borderRadius:10, color:T.text, fontSize:14, outline:'none', width:'100%' }} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
            <input style={{ padding:'11px 14px', background:T.inputBg, border:`1px solid ${T.inputBorder}`, borderRadius:10, color:T.text, fontSize:14, outline:'none', width:'100%' }} type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
            {authError && <p style={{ color:T.red, fontSize:13 }}>{authError}</p>}
            <button type="submit" style={{ padding:'12px', background:T.accent, color:'#000', border:'none', borderRadius:10, fontSize:15, fontWeight:700, cursor:'pointer', marginTop:4 }}>Sign In</button>
          </form>
        </div>

        {/* Dark/light toggle */}
        <button onClick={() => setDarkMode(!d)} style={{ marginTop:24, background:'transparent', border:`1px solid ${T.glassBorder}`, color:T.textMuted, borderRadius:20, padding:'6px 16px', fontSize:13, cursor:'pointer' }}>
          {d ? '☀ Light Mode' : '🌙 Dark Mode'}
        </button>
      </div>
    </>
  );

  // ── MAIN APP ─────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{globalStyle}</style>
      <div style={{ minHeight:'100vh', background: T.pageBg, color: T.text, fontFamily:"'IBM Plex Sans', system-ui, sans-serif", position:'relative' }}>

        {/* Background orbs */}
        <div style={{ position:'fixed', width:800, height:800, borderRadius:'50%', background:T.orb1, filter:'blur(100px)', top:-200, right:-200, pointerEvents:'none', zIndex:0 }} />
        <div style={{ position:'fixed', width:500, height:500, borderRadius:'50%', background:T.orb2, filter:'blur(100px)', bottom:-100, left:-100, pointerEvents:'none', zIndex:0 }} />

        {/* Header */}
        <header style={{ position:'sticky', top:0, zIndex:50, background:T.headerBg, backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', borderBottom:`1px solid ${T.glassBorder}`, padding:'0 24px', height:60, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <JournifiLogo dark={!darkMode} />
          <div style={{ position:'absolute', left:'50%', transform:'translateX(-50%)' }}>
            {/* center slot — can put nav tabs here later */}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <button onClick={() => setDarkMode(!d)} style={{ background:T.glassBg, border:`1px solid ${T.glassBorder}`, borderRadius:8, padding:'6px 10px', cursor:'pointer', fontSize:15, color:T.textMuted }}>
              {d ? '☀' : '🌙'}
            </button>
            <span style={{ color:T.textMuted, fontSize:12 }}>{session.user.email}</span>
            <button onClick={handleLogout} style={{ background:'transparent', color:T.textMuted, border:`1px solid ${T.glassBorder}`, borderRadius:8, padding:'6px 14px', cursor:'pointer', fontSize:13 }}>Sign Out</button>
          </div>
        </header>

        <div style={{ position:'relative', zIndex:1 }}>
          {/* Stats Bar */}
          <div style={{ display:'flex', flexWrap:'wrap', borderBottom:`1px solid ${T.glassBorder}`, background: d ? 'rgba(10,12,20,0.6)' : 'rgba(255,255,255,0.5)', backdropFilter:'blur(20px)' }}>
            {[
              { label:'Total P&L', value:`${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(2)}`, color: totalPnl >= 0 ? T.green : T.red },
              { label:'Win Rate', value:`${winRate}%`, color: T.text },
              { label:'Trades', value: filteredTrades.length, color: T.text },
              { label:'Wins', value: wins, color: T.green },
              { label:'Losses', value: losses, color: T.red },
              { label:'Avg Win', value:`+$${avgWin.toFixed(2)}`, color: T.green },
              { label:'Avg Loss', value:`$${avgLoss.toFixed(2)}`, color: T.red },
            ].map((stat, i) => (
              <div key={stat.label} style={{ flex:'1 1 120px', padding:'14px 20px', borderRight:`1px solid ${T.glassBorder}` }}>
                <div style={{ fontSize:10, color:T.textMuted, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:5 }}>{stat.label}</div>
                <div style={{ fontSize:20, fontWeight:700, color:stat.color, fontVariantNumeric:'tabular-nums' }}>{stat.value}</div>
              </div>
            ))}
          </div>

          {/* Main content */}
          <main style={{ padding:'24px', maxWidth:1400, margin:'0 auto' }}>
            {/* Toolbar */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:10 }}>
              <h2 style={{ fontSize:16, fontWeight:600, color:T.text }}>Trade Journal</h2>
              <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                <button onClick={() => setShowFilters(!showFilters)} style={{ background: activeFilters > 0 ? T.accent : T.glassBg, backdropFilter:'blur(10px)', color: activeFilters > 0 ? '#000' : T.textMuted, border:`1px solid ${activeFilters > 0 ? T.accent : T.glassBorder}`, borderRadius:8, padding:'8px 14px', fontSize:13, cursor:'pointer', fontWeight:500 }}>
                  ⚙ Filters {activeFilters > 0 ? `(${activeFilters})` : ''}
                </button>
                {activeFilters > 0 && (
                  <button onClick={resetFilters} style={{ background:'transparent', color:T.red, border:`1px solid ${T.red}44`, borderRadius:8, padding:'8px 12px', fontSize:13, cursor:'pointer' }}>✕ Reset</button>
                )}
                <button onClick={() => { setShowModal(true); setForm(EMPTY_TRADE); }} style={{ background:T.accent, color:'#000', border:'none', borderRadius:8, padding:'9px 18px', fontSize:14, fontWeight:700, cursor:'pointer' }}>+ Add Trade</button>
              </div>
            </div>

            {/* Filter Panel */}
            {showFilters && (
              <div style={{ background:T.glassBg, backdropFilter:T.glassBlur, WebkitBackdropFilter:T.glassBlur, border:`1px solid ${T.glassBorder}`, borderRadius:14, padding:20, marginBottom:20, display:'flex', flexDirection:'column', gap:16, animation:'fadeIn 0.2s ease' }}>
                {[
                  { label:'Date Range', key:'datePreset', setter:setDatePreset, val:datePreset, opts:[['all','All Time'],['today','Today'],['this_week','This Week'],['last_week','Last Week'],['this_month','This Month'],['last_month','Last Month'],['custom','Custom']] },
                  { label:'Day of Week', key:'filterDay', setter:setFilterDay, val:filterDay, opts:[['all','All'],['Monday','Mon'],['Tuesday','Tue'],['Wednesday','Wed'],['Thursday','Thu'],['Friday','Fri']] },
                  { label:'Outcome', key:'filterOutcome', setter:setFilterOutcome, val:filterOutcome, opts:[['all','All'],['WIN','Win'],['LOSS','Loss'],['BREAKEVEN','Breakeven']] },
                  { label:'Type', key:'filterType', setter:setFilterType, val:filterType, opts:[['all','All'],['CALL','Call'],['PUT','Put']] },
                ].map(f => (
                  <div key={f.key}>
                    <div style={{ fontSize:10, color:T.textMuted, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8, fontWeight:600 }}>{f.label}</div>
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                      {f.opts.map(([val, label]) => (
                        <button key={val} onClick={() => f.setter(val)} style={{ background: f.val === val ? T.accent : T.inputBg, color: f.val === val ? '#000' : T.textMuted, border:`1px solid ${f.val === val ? T.accent : T.inputBorder}`, borderRadius:20, padding:'5px 14px', fontSize:13, cursor:'pointer', fontWeight: f.val === val ? 600 : 400, transition:'all 0.15s' }}>{label}</button>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Ticker row */}
                <div>
                  <div style={{ fontSize:10, color:T.textMuted, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8, fontWeight:600 }}>Ticker</div>
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                    {[['all','All'], ...uniqueTickers.map(t => [t, t])].map(([val, label]) => (
                      <button key={val} onClick={() => setFilterTicker(val)} style={{ background: filterTicker === val ? T.accent : T.inputBg, color: filterTicker === val ? '#000' : T.textMuted, border:`1px solid ${filterTicker === val ? T.accent : T.inputBorder}`, borderRadius:20, padding:'5px 14px', fontSize:13, cursor:'pointer', fontWeight: filterTicker === val ? 600 : 400 }}>{label}</button>
                    ))}
                  </div>
                </div>

                {datePreset === 'custom' && (
                  <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                    <input style={{ padding:'8px 12px', background:T.inputBg, border:`1px solid ${T.inputBorder}`, borderRadius:8, color:T.text, fontSize:13 }} type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
                    <span style={{ color:T.textMuted }}>→</span>
                    <input style={{ padding:'8px 12px', background:T.inputBg, border:`1px solid ${T.inputBorder}`, borderRadius:8, color:T.text, fontSize:13 }} type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} />
                  </div>
                )}
              </div>
            )}

            {/* Table */}
            {filteredTrades.length === 0 ? (
              <div style={{ textAlign:'center', padding:'80px 0' }}>
                <div style={{ fontSize:48, marginBottom:16 }}>📋</div>
                <p style={{ color:T.text, fontSize:18, fontWeight:600, marginBottom:8 }}>{trades.length > 0 ? 'No trades match your filters.' : 'No trades yet.'}</p>
                <p style={{ color:T.textMuted, fontSize:14 }}>{trades.length > 0 ? 'Try adjusting your filters.' : 'Click "+ Add Trade" to log your first trade.'}</p>
              </div>
            ) : (
              <div style={{ overflowX:'auto', background:T.glassBg, backdropFilter:T.glassBlur, WebkitBackdropFilter:T.glassBlur, border:`1px solid ${T.glassBorder}`, borderRadius:14 }}>
                <table style={{ width:'100%', borderCollapse:'collapse', minWidth:900 }}>
                  <thead>
                    <tr style={{ borderBottom:`1px solid ${T.glassBorder}` }}>
                      {['Date','Ticker','Type','Strike','Expiry','Qty','Entry','Exit','P&L','Setup','Result','Notes'].map(h => (
                        <th key={h} style={{ textAlign:'left', padding:'12px 16px', color:T.textMuted, fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em', whiteSpace:'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTrades.map((t, i) => (
                      <tr key={t.id} className="trade-row" style={{ borderBottom:`1px solid ${T.tableBorder}` }}>
                        <td style={{ padding:'13px 16px', fontSize:13 }}>
                          <div style={{ color:T.text, fontWeight:500 }}>{t.date}</div>
                          <div style={{ fontSize:10, color:T.textMuted, marginTop:2 }}>{DAYS[new Date(t.date + 'T00:00:00').getDay()]}</div>
                        </td>
                        <td style={{ padding:'13px 16px', fontSize:14, fontWeight:700, color:T.accent }}>{t.ticker}</td>
                        <td style={{ padding:'13px 16px' }}>
                          <span style={{ padding:'3px 9px', borderRadius:5, fontSize:11, fontWeight:700, background: t.option_type === 'CALL' ? T.greenBg : T.redBg, color: t.option_type === 'CALL' ? T.green : T.red }}>{t.option_type}</span>
                        </td>
                        <td style={{ padding:'13px 16px', fontSize:13, color:T.text }}>{t.strike ? `$${t.strike}` : <span style={{color:T.textFaint}}>—</span>}</td>
                        <td style={{ padding:'13px 16px', fontSize:13, color:T.text }}>{t.expiry || <span style={{color:T.textFaint}}>—</span>}</td>
                        <td style={{ padding:'13px 16px', fontSize:13, color:T.text }}>{t.contracts}</td>
                        <td style={{ padding:'13px 16px', fontSize:13, color:T.text }}>{t.entry_price ? `$${t.entry_price}` : <span style={{color:T.textFaint}}>—</span>}</td>
                        <td style={{ padding:'13px 16px', fontSize:13, color:T.text }}>{t.exit_price ? `$${t.exit_price}` : <span style={{color:T.textFaint}}>—</span>}</td>
                        <td style={{ padding:'13px 16px', fontSize:14, fontWeight:700, color: parseFloat(t.pnl) >= 0 ? T.green : T.red, fontVariantNumeric:'tabular-nums' }}>
                          {parseFloat(t.pnl) >= 0 ? '+' : ''}${parseFloat(t.pnl || 0).toFixed(2)}
                        </td>
                        <td style={{ padding:'13px 16px', fontSize:13, color:T.textMuted }}>{t.setup || <span style={{color:T.textFaint}}>—</span>}</td>
                        <td style={{ padding:'13px 16px' }}>
                          <span style={{ padding:'3px 9px', borderRadius:5, fontSize:11, fontWeight:700, background: t.outcome === 'WIN' ? T.greenBg : t.outcome === 'LOSS' ? T.redBg : T.accentDim, color: t.outcome === 'WIN' ? T.green : t.outcome === 'LOSS' ? T.red : T.textMuted }}>{t.outcome}</span>
                        </td>
                        <td style={{ padding:'13px 16px', fontSize:13, color:T.textMuted, maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.notes || <span style={{color:T.textFaint}}>—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </main>
        </div>

        {/* Add Trade Modal */}
        {showModal && (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, padding:16 }} onClick={() => setShowModal(false)}>
            <div style={{ background:T.modalBg, border:`1px solid ${T.glassBorder}`, borderRadius:16, padding:28, width:'100%', maxWidth:620, maxHeight:'90vh', overflowY:'auto', animation:'fadeIn 0.2s ease' }} onClick={e => e.stopPropagation()}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
                <h2 style={{ fontSize:18, fontWeight:700, color:T.text }}>Log Trade</h2>
                <button onClick={() => setShowModal(false)} style={{ background:'transparent', border:'none', color:T.textMuted, fontSize:22, cursor:'pointer', lineHeight:1 }}>✕</button>
              </div>
              <form onSubmit={handleSaveTrade}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                  {[
                    { label:'Date', name:'date', type:'date', span:1 },
                    { label:'Ticker', name:'ticker', type:'text', placeholder:'SPY', span:1 },
                  ].map(f => (
                    <div key={f.name} style={{ gridColumn:`span ${f.span}` }}>
                      <label style={{ display:'block', fontSize:11, color:T.textMuted, textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:600, marginBottom:6 }}>{f.label}</label>
                      <input style={{ width:'100%', padding:'10px 12px', background:T.inputBg, border:`1px solid ${T.inputBorder}`, borderRadius:8, color:T.text, fontSize:14 }} type={f.type} name={f.name} placeholder={f.placeholder} value={form[f.name]} onChange={handleFormChange} required />
                    </div>
                  ))}

                  {/* Type select */}
                  <div>
                    <label style={{ display:'block', fontSize:11, color:T.textMuted, textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:600, marginBottom:6 }}>Type</label>
                    <select style={{ width:'100%', padding:'10px 12px', background:T.inputBg, border:`1px solid ${T.inputBorder}`, borderRadius:8, color:T.text, fontSize:14 }} name="option_type" value={form.option_type} onChange={handleFormChange}>
                      <option value="CALL">CALL</option><option value="PUT">PUT</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display:'block', fontSize:11, color:T.textMuted, textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:600, marginBottom:6 }}>Strike</label>
                    <input style={{ width:'100%', padding:'10px 12px', background:T.inputBg, border:`1px solid ${T.inputBorder}`, borderRadius:8, color:T.text, fontSize:14 }} type="number" name="strike" placeholder="500" value={form.strike} onChange={handleFormChange} />
                  </div>

                  <div>
                    <label style={{ display:'block', fontSize:11, color:T.textMuted, textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:600, marginBottom:6 }}>Expiry</label>
                    <input style={{ width:'100%', padding:'10px 12px', background:T.inputBg, border:`1px solid ${T.inputBorder}`, borderRadius:8, color:T.text, fontSize:14 }} type="date" name="expiry" value={form.expiry} onChange={handleFormChange} />
                  </div>

                  <div>
                    <label style={{ display:'block', fontSize:11, color:T.textMuted, textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:600, marginBottom:6 }}>Contracts</label>
                    <input style={{ width:'100%', padding:'10px 12px', background:T.inputBg, border:`1px solid ${T.inputBorder}`, borderRadius:8, color:T.text, fontSize:14 }} type="number" name="contracts" min="1" value={form.contracts} onChange={handleFormChange} />
                  </div>

                  <div>
                    <label style={{ display:'block', fontSize:11, color:T.textMuted, textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:600, marginBottom:6 }}>Entry Price</label>
                    <input style={{ width:'100%', padding:'10px 12px', background:T.inputBg, border:`1px solid ${T.inputBorder}`, borderRadius:8, color:T.text, fontSize:14 }} type="number" step="0.01" name="entry_price" placeholder="1.50" value={form.entry_price} onChange={handleFormChange} />
                  </div>

                  <div>
                    <label style={{ display:'block', fontSize:11, color:T.textMuted, textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:600, marginBottom:6 }}>Exit Price</label>
                    <input style={{ width:'100%', padding:'10px 12px', background:T.inputBg, border:`1px solid ${T.inputBorder}`, borderRadius:8, color:T.text, fontSize:14 }} type="number" step="0.01" name="exit_price" placeholder="3.00" value={form.exit_price} onChange={handleFormChange} />
                  </div>

                  <div>
                    <label style={{ display:'block', fontSize:11, color:T.textMuted, textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:600, marginBottom:6 }}>P&L (auto)</label>
                    <input style={{ width:'100%', padding:'10px 12px', background:T.inputBg, border:`1px solid ${T.inputBorder}`, borderRadius:8, color: parseFloat(form.pnl) >= 0 ? T.green : T.red, fontSize:14, fontWeight:700 }} type="number" step="0.01" name="pnl" placeholder="0.00" value={form.pnl} onChange={handleFormChange} />
                  </div>

                  <div>
                    <label style={{ display:'block', fontSize:11, color:T.textMuted, textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:600, marginBottom:6 }}>Outcome</label>
                    <select style={{ width:'100%', padding:'10px 12px', background:T.inputBg, border:`1px solid ${T.inputBorder}`, borderRadius:8, color:T.text, fontSize:14 }} name="outcome" value={form.outcome} onChange={handleFormChange}>
                      <option value="WIN">WIN</option><option value="LOSS">LOSS</option><option value="BREAKEVEN">BREAKEVEN</option>
                    </select>
                  </div>

                  <div style={{ gridColumn:'1 / -1' }}>
                    <label style={{ display:'block', fontSize:11, color:T.textMuted, textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:600, marginBottom:6 }}>Setup</label>
                    <input style={{ width:'100%', padding:'10px 12px', background:T.inputBg, border:`1px solid ${T.inputBorder}`, borderRadius:8, color:T.text, fontSize:14 }} type="text" name="setup" placeholder="VWAP reclaim, double bottom, trap..." value={form.setup} onChange={handleFormChange} />
                  </div>

                  <div style={{ gridColumn:'1 / -1' }}>
                    <label style={{ display:'block', fontSize:11, color:T.textMuted, textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:600, marginBottom:6 }}>Notes</label>
                    <textarea style={{ width:'100%', padding:'10px 12px', background:T.inputBg, border:`1px solid ${T.inputBorder}`, borderRadius:8, color:T.text, fontSize:14, height:80, resize:'vertical' }} name="notes" placeholder="What happened? What did you learn?" value={form.notes} onChange={handleFormChange} />
                  </div>
                </div>

                {saveError && <p style={{ color:T.red, fontSize:13, marginTop:12 }}>{saveError}</p>}

                <div style={{ display:'flex', gap:10, marginTop:20 }}>
                  <button type="button" onClick={() => setShowModal(false)} style={{ flex:1, padding:'12px', background:'transparent', color:T.textMuted, border:`1px solid ${T.glassBorder}`, borderRadius:10, fontSize:15, cursor:'pointer' }}>Cancel</button>
                  <button type="submit" style={{ flex:2, padding:'12px', background:T.accent, color:'#000', border:'none', borderRadius:10, fontSize:15, fontWeight:700, cursor:'pointer' }} disabled={saving}>{saving ? 'Saving...' : 'Save Trade'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

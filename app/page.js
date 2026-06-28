'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
/* ---------------------------------------------------------------- */
/* Tokens                                                             */
/* ---------------------------------------------------------------- */

const THEMES = {
  dark: {
    bg: '#0F1117', surface: '#181C24', surfaceAlt: '#1E232D',
    border: '#252B36', ink: '#F0EDE6', inkMuted: '#7A8494',
    gold: '#C9993A', gain: '#5BAF89', loss: '#C0614A',
    gainGlow: 'rgba(91,175,137,0.18)', lossGlow: 'rgba(192,97,74,0.18)',
    gainBorder: 'rgba(91,175,137,0.4)', lossBorder: 'rgba(192,97,74,0.4)',
  },
  light: {
    bg: '#F7F5F0', surface: '#FFFFFF', surfaceAlt: '#F0EDE6',
    border: '#E2DDD6', ink: '#1A1E26', inkMuted: '#6B7280',
    gold: '#A07820', gain: '#2D6E50', loss: '#A04030',
    gainGlow: 'rgba(45,110,80,0.10)', lossGlow: 'rgba(160,64,48,0.10)',
    gainBorder: 'rgba(45,110,80,0.35)', lossBorder: 'rgba(160,64,48,0.35)',
  },
};

const FINNHUB_KEY = 'd8u068pr01qinhuetdfgd8u068pr01qinhuetdg0';
const WATCHLIST = ['AAPL','MSFT','GOOGL','AMZN','META','NVDA','TSLA','AMD','SPY','QQQ'];
const SETUP_OPTIONS = ['21 EMA Pullback', 'Trap Pattern', 'Breakout', 'Other'];
const PSYCH_OPTIONS = ['Followed Plan', 'Stopped Out as Planned', 'FOMO Entry', 'Revenge Trade', 'Cut Early', 'Held Too Long', 'Hesitated'];
const CHECKLIST_ITEMS = [
  '8 AM scan: review levels & watchlist',
  'Confirm setup: 21 EMA pullback or trap pattern',
  '10 AM: execute planned entries only',
  'Stop set — max risk per trade respected',
  'Close & review by 3:30 PM EST',
];

/* ---------------------------------------------------------------- */
/* Helpers                                                            */
/* ---------------------------------------------------------------- */

function fmtMoney(n) {
  const sign = n < 0 ? '-' : '+';
  return `${sign}$${Math.abs(n).toFixed(2)}`;
}
function fmtPlain(n) { return `$${Math.abs(n).toFixed(2)}`; }
function shortDate(d) {
  const [y, m, day] = d.split('-').map(Number);
  return `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m-1]} ${day}`;
}
function hexToRgba(hex, a) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${a})`;
}
function computeStats(trades) {
  if (!trades.length) return { netPnl:0, winRate:0, avgWin:0, avgLoss:0, profitFactor:0, total:0, wins:0, losses:0 };
  const wins = trades.filter(t=>t.pnl>0), losses = trades.filter(t=>t.pnl<0);
  const netPnl = trades.reduce((s,t)=>s+t.pnl,0);
  const sumWins = wins.reduce((s,t)=>s+t.pnl,0);
  const sumLosses = Math.abs(losses.reduce((s,t)=>s+t.pnl,0));
  return {
    netPnl, wins: wins.length, losses: losses.length, total: trades.length,
    winRate: (wins.length/trades.length)*100,
    avgWin: wins.length ? sumWins/wins.length : 0,
    avgLoss: losses.length ? sumLosses/losses.length : 0,
    profitFactor: sumLosses ? sumWins/sumLosses : sumWins>0 ? Infinity : 0,
  };
}
function groupByDate(trades) {
  const map = {};
  trades.forEach(t => { map[t.date] = (map[t.date]||0)+t.pnl; });
  return map;
}
function filterByPeriod(trades, period) {
  if (period === 'all' || !trades.length) return trades;
  const most = new Date(trades[0].date);
  if (period === 'month') {
    return trades.filter(t => { const d=new Date(t.date); return d.getFullYear()===most.getFullYear()&&d.getMonth()===most.getMonth(); });
  }
  if (period === 'week') {
    const cutoff = new Date(most); cutoff.setDate(cutoff.getDate()-6);
    return trades.filter(t => { const d=new Date(t.date); return d>=cutoff&&d<=most; });
  }
  return trades;
}

/* ---------------------------------------------------------------- */
/* Login Screen                                                       */
/* ---------------------------------------------------------------- */

function LoginScreen({ onLogin }) {
  const T = THEMES.dark;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('login');
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async () => {
    setLoading(true); setError('');
    try {
      if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onLogin(data.user);
      } else {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { data: { username: email.split('@')[0] } }
        });
        if (error) throw error;
        setError('Check your email to confirm your account, then sign in.');
        setMode('login');
      }
    } catch(e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
  };

  return (
    <div style={{ minHeight:'100vh', background:T.bg, display:'flex', alignItems:'center', justifyContent:'center', padding:32 }}>
      <div style={{ width:'100%', maxWidth:360, display:'flex', flexDirection:'column', gap:20 }}>
        <div style={{ textAlign:'center', marginBottom:8 }}>
          <svg width="48" height="48" viewBox="0 0 28 28" fill="none" style={{ margin:'0 auto 8px', display:'block' }}>
            <line x1="7" y1="2" x2="7" y2="26" stroke="#5BAF89" strokeWidth="1.5"/>
            <rect x="4" y="9" width="6" height="9" rx="1" fill="#5BAF89"/>
            <line x1="21" y1="2" x2="21" y2="26" stroke="#C0614A" strokeWidth="1.5"/>
            <rect x="18" y="4" width="6" height="11" rx="1" fill="#C0614A"/>
          </svg>
          <div style={{ fontSize:32, fontWeight:700, fontFamily:"'Fraunces', serif", color:T.ink }}>Journifi</div>
          <div style={{ fontSize:12, textTransform:'uppercase', letterSpacing:'0.12em', color:T.gold, fontFamily:"'IBM Plex Mono', monospace", marginTop:4 }}>
            Personal Trade Journal
          </div>
        </div>

        <div style={{ background:T.surface, borderRadius:14, padding:20, border:`1px solid ${T.border}`, display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ display:'flex', background:T.surfaceAlt, borderRadius:8, padding:3, marginBottom:4 }}>
            {['login','signup'].map(m => (
              <button key={m} onClick={() => setMode(m)}
                style={{ flex:1, padding:'7px 0', fontSize:13, fontFamily:"'IBM Plex Mono', monospace", textTransform:'uppercase', letterSpacing:'0.06em', border:'none', cursor:'pointer', borderRadius:6,
                  background: mode===m ? T.gold : 'transparent', color: mode===m ? '#1A1208' : T.inkMuted }}>
                {m === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <button onClick={handleGoogle}
            style={{ padding:'11px 16px', fontSize:14, fontWeight:500, borderRadius:8, background:T.surfaceAlt, color:T.ink, border:`1px solid ${T.border}`, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
            <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/></svg>
            Continue with Google
          </button>

          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ flex:1, height:1, background:T.border }}/>
            <span style={{ fontSize:11, color:T.inkMuted, fontFamily:"'IBM Plex Mono', monospace" }}>or</span>
            <div style={{ flex:1, height:1, background:T.border }}/>
          </div>

          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email address"
            style={{ fontSize:15, borderRadius:8, padding:'10px 12px', background:T.surfaceAlt, color:T.ink, border:`1px solid ${T.border}`, outline:'none' }} />

          <div style={{ position:'relative' }}>
            <input type={showPass?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&handleSubmit()} placeholder="Password"
              style={{ width:'100%', fontSize:15, borderRadius:8, padding:'10px 12px', background:T.surfaceAlt, color:T.ink, border:`1px solid ${T.border}`, outline:'none' }} />
            <button onClick={()=>setShowPass(s=>!s)}
              style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'transparent', border:'none', cursor:'pointer', fontSize:16, color:T.inkMuted }}>
              {showPass ? '🙈' : '👁️'}
            </button>
          </div>

          {error && <div style={{ fontSize:12, color: error.includes('Check') ? T.gain : T.loss, textAlign:'center', fontFamily:"'IBM Plex Mono', monospace" }}>{error}</div>}

          <button onClick={handleSubmit} disabled={loading}
            style={{ padding:'12px 0', fontSize:15, fontWeight:600, borderRadius:8, background:T.gold, color:'#1A1208', border:'none', cursor:'pointer', opacity:loading?0.7:1 }}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </div>

        <div style={{ textAlign:'center', fontSize:11, color:T.inkMuted, fontFamily:"'IBM Plex Mono', monospace" }}>
          Your trades are private and encrypted.
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Stat Card                                                          */
/* ---------------------------------------------------------------- */

function StatCard({ label, value, valueColor, glyph, sub, glow, C }) {
  const glowStyle = glow === 'gain'
    ? { boxShadow:`0 0 0 1px ${C.gainBorder}, 0 6px 28px ${C.gainGlow}`, border:`1px solid ${C.gainBorder}` }
    : glow === 'loss'
    ? { boxShadow:`0 0 0 1px ${C.lossBorder}, 0 6px 28px ${C.lossGlow}`, border:`1px solid ${C.lossBorder}` }
    : {};
  return (
    <div style={{ borderRadius:14, padding:14, background:C.surface, border:`1px solid ${C.border}`, display:'flex', flexDirection:'column', gap:6, ...glowStyle }}>
      <div style={{ display:'flex', alignItems:'center', gap:6, color:C.inkMuted }}>
        <span style={{ fontSize:12, fontFamily:"'IBM Plex Mono', monospace" }}>{glyph}</span>
        <span style={{ fontSize:11, textTransform:'uppercase', letterSpacing:'0.08em', color:C.inkMuted, fontFamily:"'IBM Plex Mono', monospace" }}>{label}</span>
      </div>
      <div style={{ fontSize:24, fontWeight:600, fontFamily:"'Fraunces', serif", color:valueColor||C.ink, letterSpacing:'-0.02em' }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:C.inkMuted }}>{sub}</div>}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Trade Row                                                          */
/* ---------------------------------------------------------------- */

function TradeRow({ trade, note, onNoteChange, expanded, onToggle, maxLoss, C }) {
  const gain = trade.pnl >= 0;
  const violates = trade.pnl < -Math.abs(maxLoss);
  return (
    <div style={{ borderBottom:`1px solid ${C.border}` }}>
      <button onClick={onToggle}
        style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 4px', background:'transparent', border:'none', cursor:'pointer' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ fontSize:12, width:50, fontFamily:"'IBM Plex Mono', monospace", color:C.inkMuted }}>{shortDate(trade.date)}</div>
          <div style={{ fontWeight:600, fontSize:14, color:C.ink }}>{trade.symbol}</div>
          <span style={{ fontSize:10, padding:'2px 6px', borderRadius:4, textTransform:'uppercase', fontFamily:"'IBM Plex Mono', monospace", color:gain?C.gain:C.loss, border:`1px solid ${hexToRgba(gain?C.gain:C.loss,0.4)}`, background:hexToRgba(gain?C.gain:C.loss,0.08) }}>
            {trade.exit_type||trade.exitType}
          </span>
          {violates && <span style={{ color:C.loss, fontSize:12 }}>⚠</span>}
          {note && (note.setup||note.psychology) && <span style={{ color:C.gold, fontSize:10 }}>●</span>}
        </div>
        <div style={{ fontWeight:600, fontSize:14, fontFamily:"'IBM Plex Mono', monospace", color:gain?C.gain:C.loss }}>{fmtMoney(trade.pnl)}</div>
      </button>
      {expanded && (
        <div style={{ paddingBottom:16, paddingLeft:4, paddingRight:4, display:'flex', flexDirection:'column', gap:10 }}>
          {violates && <div style={{ fontSize:12, color:C.loss, background:hexToRgba(C.loss,0.1), border:`1px solid ${hexToRgba(C.loss,0.3)}`, borderRadius:6, padding:'6px 8px' }}>Exceeded max loss rule by {fmtPlain(Math.abs(trade.pnl)-Math.abs(maxLoss))}</div>}
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {['setup','psychology'].map(field => (
              <div key={field} style={{ flex:1, minWidth:140 }}>
                <label style={{ fontSize:11, textTransform:'uppercase', letterSpacing:'0.08em', color:C.inkMuted, fontFamily:"'IBM Plex Mono', monospace", display:'block', marginBottom:4 }}>{field}</label>
                <select value={(note&&note[field])||''} onChange={e=>onNoteChange({...note,[field]:e.target.value})}
                  style={{ width:'100%', fontSize:14, borderRadius:6, padding:'6px 8px', background:C.surfaceAlt, color:C.ink, border:`1px solid ${C.border}` }}>
                  <option value="">— Select —</option>
                  {(field==='setup'?SETUP_OPTIONS:PSYCH_OPTIONS).map(o=><option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ))}
          </div>
          <textarea defaultValue={(note&&note.text)||''} onBlur={e=>onNoteChange({...note,text:e.target.value})}
            placeholder="What did you see? What would you do differently?" rows={2}
            style={{ width:'100%', fontSize:14, borderRadius:6, padding:'6px 8px', resize:'none', background:C.surfaceAlt, color:C.ink, border:`1px solid ${C.border}` }} />
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Main Dashboard                                                     */
/* ---------------------------------------------------------------- */

export default function Home() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trades, setTrades] = useState([]);
  const [notes, setNotes] = useState({});
  const [theme, setTheme] = useState('dark');
  const [period, setPeriod] = useState('all');
  const [activeTab, setActiveTab] = useState('journal');
  const [expandedId, setExpandedId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [maxLoss, setMaxLoss] = useState(300);
  const [dailyGoal, setDailyGoal] = useState(100);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);

  const C = THEMES[theme];

  // Auth listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load trades from Supabase
  useEffect(() => {
    if (!user) return;
    const loadTrades = async () => {
      const { data, error } = await supabase
        .from('trades')
        .select('*, trade_notes(*)')
        .eq('user_id', user.id)
        .order('date', { ascending: false });
      if (!error && data) {
        setTrades(data);
        // Build notes map
        const notesMap = {};
        data.forEach(t => {
          if (t.trade_notes && t.trade_notes.length > 0) {
            notesMap[t.id] = t.trade_notes[0];
          }
        });
        setNotes(notesMap);
      }
    };
    loadTrades();
  }, [user]);

  // Save note to Supabase
  const handleNoteChange = async (tradeId, nextNote) => {
    setNotes(prev => ({ ...prev, [tradeId]: nextNote }));
    await supabase.from('trade_notes').upsert({
      trade_id: tradeId,
      user_id: user.id,
      setup: nextNote.setup || null,
      psychology: nextNote.psychology || null,
      notes: nextNote.text || null,
    }, { onConflict: 'trade_id,user_id' });
  };

  // Add trade manually
  const handleAddTrade = async (trade) => {
    const { data, error } = await supabase.from('trades').insert({
      id: `manual-${Date.now()}`,
      user_id: user.id,
      date: trade.date,
      symbol: trade.symbol,
      exit_type: trade.exitType,
      pnl: trade.pnl,
    }).select().single();
    if (!error && data) setTrades(prev => [data, ...prev].sort((a,b) => a.date<b.date?1:-1));
  };

  const filteredTrades = useMemo(() => filterByPeriod(trades, period), [trades, period]);
  const stats = useMemo(() => computeStats(filteredTrades), [filteredTrades]);
  const dailyPnl = useMemo(() => groupByDate(trades), [trades]);

  const todayKey = new Date().toISOString().slice(0,10);
  const todayPnl = (dailyPnl[todayKey] || 0);
  const goalPct = Math.min(100, Math.max(0, (todayPnl / dailyGoal) * 100));
  const goalHit = todayPnl >= dailyGoal;

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'#0F1117', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ color:'#C9993A', fontFamily:"'Fraunces', serif", fontSize:24 }}>Journifi</div>
    </div>
  );

  if (!user) return <LoginScreen onLogin={setUser} />;

  return (
    <div style={{ minHeight:'100vh', background:C.bg }}>
      <div style={{ maxWidth:480, margin:'0 auto', padding:'32px 20px 100px', display:'flex', flexDirection:'column', gap:20 }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <line x1="7" y1="2" x2="7" y2="26" stroke={C.gain} strokeWidth="1.5"/>
              <rect x="4" y="9" width="6" height="9" rx="1" fill={C.gain}/>
              <line x1="21" y1="2" x2="21" y2="26" stroke={C.loss} strokeWidth="1.5"/>
              <rect x="18" y="4" width="6" height="11" rx="1" fill={C.loss}/>
            </svg>
            <div>
              <div style={{ fontSize:26, fontWeight:700, fontFamily:"'Fraunces', serif", color:C.ink }}>Journifi</div>
              <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'0.1em', color:C.gold, fontFamily:"'IBM Plex Mono', monospace" }}>
                {user.email?.split('@')[0]} · {trades.length} trades
              </div>
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={()=>setTheme(t=>t==='dark'?'light':'dark')}
              style={{ background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:20, padding:'6px 10px', cursor:'pointer', fontSize:14, color:C.inkMuted }}>
              {theme==='dark'?'☀️':'🌙'}
            </button>
            <button onClick={()=>supabase.auth.signOut()}
              style={{ background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:20, padding:'6px 10px', cursor:'pointer', fontSize:12, color:C.inkMuted, fontFamily:"'IBM Plex Mono', monospace" }}>
              Sign out
            </button>
          </div>
        </div>

        {activeTab === 'journal' && (
          <>
            {/* Period toggle */}
            <div style={{ display:'flex', borderRadius:8, border:`1px solid ${C.border}`, overflow:'hidden' }}>
              {['all','month','week'].map(p => (
                <button key={p} onClick={()=>setPeriod(p)}
                  style={{ flex:1, padding:'8px 0', fontSize:12, fontFamily:"'IBM Plex Mono', monospace", textTransform:'uppercase', letterSpacing:'0.06em', border:'none', cursor:'pointer',
                    background:period===p?hexToRgba(C.gold,0.15):'transparent', color:period===p?C.gold:C.inkMuted }}>
                  {p==='all'?'All':p==='month'?'This Month':'This Week'}
                </button>
              ))}
            </div>

            {/* Stats */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              <StatCard C={C} label="Net P&L" value={fmtMoney(stats.netPnl)} valueColor={stats.netPnl>=0?C.gain:C.loss} glyph={stats.netPnl>=0?'↑':'↓'} sub={`${stats.total} trades`} glow={stats.netPnl>=0?'gain':'loss'} />
              <StatCard C={C} label="Win Rate" value={`${stats.winRate.toFixed(0)}%`} glyph="◎" sub={`${stats.wins}W / ${stats.losses}L`} />
              <StatCard C={C} label="Avg Win" value={fmtPlain(stats.avgWin)} valueColor={C.gain} glyph="↑" glow="gain" />
              <StatCard C={C} label="Avg Loss" value={fmtPlain(stats.avgLoss)} valueColor={C.loss} glyph="↓" glow="loss" />
              <StatCard C={C} label="Profit Factor" value={isFinite(stats.profitFactor)?stats.profitFactor.toFixed(2):'∞'} glyph="⚖" />
              <StatCard C={C} label="Trades" value={stats.total} glyph="#" />
            </div>

            {/* Daily Goal */}
            <div style={{ borderRadius:14, padding:14, background:C.surface, border:`1px solid ${goalHit?hexToRgba(C.gain,0.5):C.border}` }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <span style={{ fontSize:11, textTransform:'uppercase', letterSpacing:'0.08em', color:C.inkMuted, fontFamily:"'IBM Plex Mono', monospace" }}>Daily Goal {goalHit?'✓ HIT':''}</span>
                <div style={{ display:'flex', alignItems:'baseline', gap:3 }}>
                  <span style={{ fontSize:11, color:C.inkMuted }}>$</span>
                  <input type="number" value={dailyGoal} onChange={e=>setDailyGoal(Number(e.target.value)||0)}
                    style={{ width:52, fontSize:14, fontWeight:600, fontFamily:"'Fraunces', serif", color:C.ink, background:'transparent', border:'none', borderBottom:`1px solid ${C.border}`, padding:0, textAlign:'right' }} />
                  <span style={{ fontSize:11, color:C.inkMuted }}>/day</span>
                </div>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                <div style={{ fontSize:20, fontWeight:700, fontFamily:"'Fraunces', serif", color:todayPnl>=0?C.gain:C.loss }}>
                  {todayPnl>=0?'+':'-'}${Math.abs(todayPnl).toFixed(2)}
                </div>
                <div style={{ fontSize:12, color:C.inkMuted, fontFamily:"'IBM Plex Mono', monospace" }}>{goalPct.toFixed(0)}% of goal</div>
              </div>
              <div style={{ borderRadius:4, height:8, background:C.border, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${goalPct}%`, background:goalHit?C.gain:C.gold, borderRadius:4, transition:'width 0.4s ease' }} />
              </div>
            </div>

            {/* Insight */}
            <div style={{ borderRadius:14, padding:14, display:'flex', gap:8, background:hexToRgba(C.gold,0.08), border:`1px solid ${hexToRgba(C.gold,0.3)}` }}>
              <span style={{ color:C.gold, flexShrink:0 }}>📓</span>
              <div style={{ fontSize:13, lineHeight:1.5, color:C.ink }}>
                {stats.total === 0 ? 'No trades in this period yet.' :
                  stats.profitFactor < 1 && stats.winRate >= 45
                    ? `Win rate is ${stats.winRate.toFixed(0)}% — solid. The leak is size: avg losses (${fmtPlain(stats.avgLoss)}) are bigger than avg wins (${fmtPlain(stats.avgWin)}). Cut losers faster or hold winners longer.`
                    : stats.profitFactor >= 1
                    ? `Profit factor of ${stats.profitFactor.toFixed(2)} — you're net positive. Keep tagging trades to see which setup is carrying the period.`
                    : `Win rate ${stats.winRate.toFixed(0)}% and reward/risk both need work. Review FOMO and revenge trades first.`
                }
              </div>
            </div>

            {/* Trade Log */}
            <div style={{ borderRadius:14, padding:14, background:C.surface, border:`1px solid ${C.border}` }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                <div style={{ fontSize:11, textTransform:'uppercase', letterSpacing:'0.08em', color:C.inkMuted, fontFamily:"'IBM Plex Mono', monospace" }}>Trade Log</div>
                <div style={{ display:'flex', gap:12 }}>
                  {syncing && <span style={{ fontSize:11, color:C.gold, fontFamily:"'IBM Plex Mono', monospace" }}>Syncing...</span>}
                  {lastSync && <span style={{ fontSize:11, color:C.inkMuted, fontFamily:"'IBM Plex Mono', monospace" }}>Synced {lastSync}</span>}
                  <button onClick={()=>setShowAddForm(s=>!s)}
                    style={{ fontSize:11, textTransform:'uppercase', letterSpacing:'0.08em', color:C.gold, background:'transparent', border:'none', cursor:'pointer', fontFamily:"'IBM Plex Mono', monospace" }}>
                    + Add
                  </button>
                </div>
              </div>
              {showAddForm && <AddTradeForm onAdd={handleAddTrade} onClose={()=>setShowAddForm(false)} C={C} />}
              {filteredTrades.length === 0
                ? <div style={{ fontSize:13, color:C.inkMuted, padding:'16px 0' }}>No trades in this period.</div>
                : filteredTrades.map(trade => (
                  <TradeRow key={trade.id} trade={trade} note={notes[trade.id]} maxLoss={maxLoss} C={C}
                    expanded={expandedId===trade.id}
                    onToggle={()=>setExpandedId(expandedId===trade.id?null:trade.id)}
                    onNoteChange={n=>handleNoteChange(trade.id,n)} />
                ))
              }
            </div>
          </>
        )}

        {activeTab === 'quotes' && <QuotesTab C={C} />}
        {activeTab === 'news' && <NewsTab C={C} />}

        <div style={{ paddingBottom:8 }} />
      </div>

      {/* Bottom Tab Bar */}
      <div style={{ position:'fixed', bottom:0, left:0, right:0, background:C.surface, borderTop:`1px solid ${C.border}`, display:'flex', zIndex:100, paddingBottom:'env(safe-area-inset-bottom)' }}>
        {[
          { id:'journal', icon:'📒', label:'Journal' },
          { id:'quotes', icon:'📈', label:'Quotes' },
          { id:'news', icon:'📰', label:'News' },
        ].map(tab => (
          <button key={tab.id} onClick={()=>setActiveTab(tab.id)}
            style={{ flex:1, padding:'10px 0', display:'flex', flexDirection:'column', alignItems:'center', gap:2, background:'transparent', border:'none', cursor:'pointer', color:activeTab===tab.id?C.gold:C.inkMuted }}>
            <span style={{ fontSize:20 }}>{tab.icon}</span>
            <span style={{ fontSize:10, fontFamily:"'IBM Plex Mono', monospace", textTransform:'uppercase', letterSpacing:'0.06em' }}>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Add Trade Form                                                     */
/* ---------------------------------------------------------------- */

function AddTradeForm({ onAdd, onClose, C }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0,10));
  const [symbol, setSymbol] = useState('');
  const [pnl, setPnl] = useState('');
  const [exitType, setExitType] = useState('MARKET');

  return (
    <div style={{ borderRadius:8, padding:12, marginBottom:12, background:C.surfaceAlt, border:`1px solid ${C.border}`, display:'flex', flexDirection:'column', gap:8 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontSize:14, fontWeight:600, color:C.ink, fontFamily:"'Fraunces', serif" }}>New trade</span>
        <button onClick={onClose} style={{ background:'transparent', border:'none', color:C.inkMuted, cursor:'pointer', fontSize:16 }}>×</button>
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <input type="date" value={date} onChange={e=>setDate(e.target.value)}
          style={{ flex:1, fontSize:14, borderRadius:6, padding:'6px 8px', background:C.surface, color:C.ink, border:`1px solid ${C.border}` }} />
        <input type="text" value={symbol} onChange={e=>setSymbol(e.target.value)} placeholder="Symbol"
          style={{ width:80, fontSize:14, borderRadius:6, padding:'6px 8px', background:C.surface, color:C.ink, border:`1px solid ${C.border}` }} />
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <input type="number" step="0.01" value={pnl} onChange={e=>setPnl(e.target.value)} placeholder="P&L (e.g. -45.00)"
          style={{ flex:1, fontSize:14, borderRadius:6, padding:'6px 8px', background:C.surface, color:C.ink, border:`1px solid ${C.border}` }} />
        <select value={exitType} onChange={e=>setExitType(e.target.value)}
          style={{ fontSize:14, borderRadius:6, padding:'6px 8px', background:C.surface, color:C.ink, border:`1px solid ${C.border}` }}>
          <option value="MARKET">Market</option>
          <option value="LIMIT">Limit</option>
          <option value="STOP">Stop</option>
          <option value="EXPIRED">Expired</option>
        </select>
      </div>
      <button onClick={()=>{ if(!symbol||!pnl) return; onAdd({date,symbol:symbol.toUpperCase(),exitType,pnl:parseFloat(pnl)}); onClose(); }}
        style={{ padding:'8px 0', fontSize:14, fontWeight:600, borderRadius:6, background:C.gold, color:'#1A1208', border:'none', cursor:'pointer' }}>
        Add Trade
      </button>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Quotes Tab                                                         */
/* ---------------------------------------------------------------- */

function QuotesTab({ C }) {
  const [quotes, setQuotes] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch_all = async () => {
      setLoading(true);
      const results = {};
      await Promise.all(WATCHLIST.map(async sym => {
        try {
          const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${sym}&token=${FINNHUB_KEY}`);
          results[sym] = await res.json();
        } catch(e) {}
      }));
      setQuotes(results);
      setLoading(false);
    };
    fetch_all();
    const iv = setInterval(fetch_all, 30000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      <div style={{ fontSize:11, color:C.inkMuted, fontFamily:"'IBM Plex Mono', monospace", textTransform:'uppercase', letterSpacing:'0.08em' }}>Live Quotes · refreshes every 30s</div>
      {loading ? <div style={{ textAlign:'center', padding:32, color:C.inkMuted }}>Loading...</div> :
        WATCHLIST.map(sym => {
          const q = quotes[sym] || {};
          const gain = (q.dp||0) >= 0;
          return (
            <div key={sym} style={{ borderRadius:10, padding:'10px 14px', background:C.surface, border:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontWeight:700, fontSize:15, color:C.ink }}>{sym}</div>
                <div style={{ fontSize:11, color:C.inkMuted, fontFamily:"'IBM Plex Mono', monospace" }}>O:{(q.o||0).toFixed(2)} H:{(q.h||0).toFixed(2)} L:{(q.l||0).toFixed(2)}</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontWeight:700, fontSize:17, fontFamily:"'Fraunces', serif", color:C.ink }}>${(q.c||0).toFixed(2)}</div>
                <div style={{ fontSize:12, fontFamily:"'IBM Plex Mono', monospace", color:gain?C.gain:C.loss }}>{gain?'+':''}{(q.dp||0).toFixed(2)}%</div>
              </div>
            </div>
          );
        })
      }
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* News Tab                                                           */
/* ---------------------------------------------------------------- */

function NewsTab({ C }) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState('general');

  useEffect(() => {
    setLoading(true);
    const fetchNews = async () => {
      try {
        let url = active === 'general'
          ? `https://finnhub.io/api/v1/news?category=general&token=${FINNHUB_KEY}`
          : `https://finnhub.io/api/v1/company-news?symbol=${active}&from=${new Date(Date.now()-7*86400000).toISOString().slice(0,10)}&to=${new Date().toISOString().slice(0,10)}&token=${FINNHUB_KEY}`;
        const res = await fetch(url);
        setArticles((await res.json() || []).slice(0,20));
      } catch(e) {}
      setLoading(false);
    };
    fetchNews();
  }, [active]);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <div style={{ display:'flex', gap:6, overflowX:'auto', paddingBottom:4 }}>
        {['general',...WATCHLIST].map(s => (
          <button key={s} onClick={()=>setActive(s)}
            style={{ flexShrink:0, padding:'5px 12px', borderRadius:16, fontSize:12, cursor:'pointer', fontFamily:"'IBM Plex Mono', monospace", textTransform:'uppercase', letterSpacing:'0.06em',
              background:active===s?C.gold:C.surfaceAlt, color:active===s?'#1A1208':C.inkMuted, border:`1px solid ${active===s?C.gold:C.border}`, fontWeight:active===s?600:400 }}>
            {s==='general'?'Market':s}
          </button>
        ))}
      </div>
      {loading ? <div style={{ textAlign:'center', padding:32, color:C.inkMuted }}>Loading...</div> :
        articles.map((a,i) => (
          <a key={i} href={a.url} target="_blank" rel="noopener noreferrer"
            style={{ textDecoration:'none', display:'block', borderRadius:10, padding:12, background:C.surface, border:`1px solid ${C.border}` }}>
            <div style={{ display:'flex', gap:10 }}>
              {a.image && <img src={a.image} alt="" style={{ width:60, height:60, borderRadius:6, objectFit:'cover', flexShrink:0 }} onError={e=>e.target.style.display='none'} />}
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:C.ink, lineHeight:1.35, marginBottom:4 }}>{a.headline}</div>
                <div style={{ fontSize:11, color:C.inkMuted, fontFamily:"'IBM Plex Mono', monospace" }}>{a.source} · {new Date(a.datetime*1000).toLocaleDateString('en-CA',{month:'short',day:'numeric'})}</div>
              </div>
            </div>
          </a>
        ))
      }
    </div>
  );
}

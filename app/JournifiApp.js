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
  ticker:'', option_type:'CALL', strike:'', expiry:'',
  contracts:'1', entry_price:'', exit_price:'', pnl:'',
  setup:'', outcome:'WIN', notes:'',
};
const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function getDateRange(preset) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch(preset) {
    case 'today': return { from: today, to: today };
    case 'this_week': { const m=new Date(today); m.setDate(today.getDate()-today.getDay()+1); return {from:m,to:today}; }
    case 'last_week': { const m=new Date(today); m.setDate(today.getDate()-today.getDay()-6); const s=new Date(m); s.setDate(m.getDate()+6); return {from:m,to:s}; }
    case 'this_month': return { from: new Date(today.getFullYear(),today.getMonth(),1), to: today };
    case 'last_month': { const f=new Date(today.getFullYear(),today.getMonth()-1,1); const l=new Date(today.getFullYear(),today.getMonth(),0); return {from:f,to:l}; }
    default: return null;
  }
}

function Logo({ light }) {
  const t = light ? '#0a0c14' : '#fff';
  const a = '#00C4B4';
  return (
    <svg width="148" height="32" viewBox="0 0 148 32" fill="none">
      <polyline points="2,26 2,8 8,20 14,12 20,16 26,4" stroke={a} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <circle cx="26" cy="4" r="2.2" fill={a}/>
      <text x="33" y="23" fontFamily="'IBM Plex Sans',system-ui,sans-serif" fontWeight="700" fontSize="19" fill={a}>J</text>
      <text x="43" y="23" fontFamily="'IBM Plex Sans',system-ui,sans-serif" fontWeight="700" fontSize="19" fill={t}>ournifi</text>
    </svg>
  );
}

// ── PRICING PAGE ─────────────────────────────────────────────────────────────
function PricingPage({ T, onGetStarted }) {
  const [yearly, setYearly] = useState(false);
  const plans = [
    {
      name:'Starter', monthlyPrice:19.99, color:'#6b7280', popular:false,
      desc:'Perfect for traders just getting started with journaling.',
      features:['Unlimited trade logs','Manual entry only','Basic P&L stats','Win/loss tracking','Day of week filters','Monthly challenge access'],
      missing:['IBKR auto-sync','News feed','AI analysis','Learning Hub'],
    },
    {
      name:'Pro', monthlyPrice:29.99, color:T.accent, popular:true,
      desc:'For active traders who want real insights and automation.',
      features:['Everything in Starter','IBKR auto-sync','Advanced analytics','Time of day breakdown','Chart screenshot upload','Strategy builder + rules tracking','News feed per ticker','Learning Hub (Beginner → Advanced)','P&L charts & equity curve'],
      missing:['AI chart analysis','AI trade coaching'],
    },
    {
      name:'Elite', monthlyPrice:49.99, color:'#a78bfa', popular:false,
      desc:'The full trading coach. For serious traders who want an edge.',
      features:['Everything in Pro','AI chart analysis','AI trade coaching','Pre-market AI briefing','Pattern recognition engine','Weekly performance report','Priority support','Early access to new features'],
      missing:[],
    },
  ];

  return (
    <div style={{ padding:'48px 24px', maxWidth:1100, margin:'0 auto' }}>
      <div style={{ textAlign:'center', marginBottom:48 }}>
        <h1 style={{ fontSize:40, fontWeight:800, color:T.text, letterSpacing:'-1px', marginBottom:12 }}>Plans for every trader</h1>
        <p style={{ color:T.textMuted, fontSize:16, maxWidth:500, margin:'0 auto 28px' }}>Start free. Upgrade when you're ready. Cancel anytime.</p>

        {/* Toggle */}
        <div style={{ display:'inline-flex', alignItems:'center', gap:12, background:T.glassBg, backdropFilter:'blur(20px)', border:`1px solid ${T.glassBorder}`, borderRadius:40, padding:'6px 8px' }}>
          <button onClick={() => setYearly(false)} style={{ padding:'8px 20px', borderRadius:32, border:'none', background: !yearly ? T.accent : 'transparent', color: !yearly ? '#000' : T.textMuted, fontSize:14, fontWeight:600, cursor:'pointer' }}>Monthly</button>
          <button onClick={() => setYearly(true)} style={{ padding:'8px 20px', borderRadius:32, border:'none', background: yearly ? T.accent : 'transparent', color: yearly ? '#000' : T.textMuted, fontSize:14, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:8 }}>
            Yearly <span style={{ background:'#22c55e', color:'#000', fontSize:11, fontWeight:700, padding:'2px 7px', borderRadius:10 }}>-20%</span>
          </button>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))', gap:20 }}>
        {plans.map(plan => {
          const price = yearly ? (plan.monthlyPrice * 0.8).toFixed(2) : plan.monthlyPrice.toFixed(2);
          return (
            <div key={plan.name} style={{ background: plan.popular ? `linear-gradient(135deg, ${T.accent}15, ${T.accent}08)` : T.glassBg, backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', border:`1px solid ${plan.popular ? T.accent+'44' : T.glassBorder}`, borderRadius:20, padding:28, position:'relative', display:'flex', flexDirection:'column' }}>
              {plan.popular && <div style={{ position:'absolute', top:-12, left:'50%', transform:'translateX(-50%)', background:T.accent, color:'#000', fontSize:11, fontWeight:700, padding:'4px 14px', borderRadius:20, whiteSpace:'nowrap' }}>MOST POPULAR</div>}

              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:12, fontWeight:700, color:plan.color, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8 }}>{plan.name}</div>
                <div style={{ display:'flex', alignItems:'baseline', gap:4, marginBottom:8 }}>
                  <span style={{ fontSize:42, fontWeight:800, color:T.text, letterSpacing:'-2px' }}>${price}</span>
                  <span style={{ color:T.textMuted, fontSize:14 }}>/mo</span>
                </div>
                {yearly && <div style={{ fontSize:12, color:'#22c55e' }}>Billed ${(plan.monthlyPrice*0.8*12).toFixed(0)}/year · Save ${(plan.monthlyPrice*0.2*12).toFixed(0)}</div>}
                <p style={{ color:T.textMuted, fontSize:13, marginTop:10, lineHeight:1.5 }}>{plan.desc}</p>
              </div>

              <button onClick={onGetStarted} style={{ width:'100%', padding:'13px', background: plan.popular ? T.accent : 'transparent', color: plan.popular ? '#000' : T.text, border:`1px solid ${plan.popular ? T.accent : T.glassBorder}`, borderRadius:12, fontSize:15, fontWeight:700, cursor:'pointer', marginBottom:24 }}>
                Get Started
              </button>

              <div style={{ flex:1 }}>
                {plan.features.map(f => (
                  <div key={f} style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:10 }}>
                    <span style={{ color:'#22c55e', fontSize:14, marginTop:1, flexShrink:0 }}>✓</span>
                    <span style={{ color:T.text, fontSize:13, lineHeight:1.4 }}>{f}</span>
                  </div>
                ))}
                {plan.missing.map(f => (
                  <div key={f} style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:10, opacity:0.35 }}>
                    <span style={{ color:T.textMuted, fontSize:14, marginTop:1, flexShrink:0 }}>✕</span>
                    <span style={{ color:T.textMuted, fontSize:13, lineHeight:1.4 }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* FAQ */}
      <div style={{ marginTop:64, maxWidth:700, margin:'64px auto 0' }}>
        <h2 style={{ fontSize:28, fontWeight:700, color:T.text, textAlign:'center', marginBottom:32 }}>Frequently Asked Questions</h2>
        {[
          ['Is there a free trial?','Yes — start with up to 10 trades for free, no credit card required. Upgrade anytime.'],
          ['Can I cancel anytime?','Absolutely. Cancel in one click from your account. No questions asked.'],
          ['What brokers are supported?','Currently IBKR auto-sync is supported. Questrade, Webull, and MT4/MT5 are coming soon. All brokers work via manual entry.'],
          ['Is my data secure?','Yes. All data is encrypted and stored securely via Supabase. We never sell your data.'],
          ['Do you support stocks and forex?','Yes — Journifi works for options, stocks, forex, futures, and crypto.'],
        ].map(([q, a]) => (
          <div key={q} style={{ background:T.glassBg, backdropFilter:'blur(20px)', border:`1px solid ${T.glassBorder}`, borderRadius:12, padding:'18px 20px', marginBottom:10 }}>
            <div style={{ fontSize:15, fontWeight:600, color:T.text, marginBottom:8 }}>{q}</div>
            <div style={{ fontSize:14, color:T.textMuted, lineHeight:1.6 }}>{a}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── ABOUT PAGE ────────────────────────────────────────────────────────────────
function AboutPage({ T }) {
  return (
    <div style={{ maxWidth:800, margin:'0 auto', padding:'48px 24px' }}>
      <div style={{ textAlign:'center', marginBottom:56 }}>
        <h1 style={{ fontSize:40, fontWeight:800, color:T.text, letterSpacing:'-1px', marginBottom:16 }}>Built by a trader.<br/>For every trader.</h1>
        <p style={{ color:T.textMuted, fontSize:16, lineHeight:1.8, maxWidth:600, margin:'0 auto' }}>
          Journifi was born from a simple frustration — when you're learning to trade, there's no single place that tracks your trades, shows your patterns, holds you accountable to your rules, and teaches you at the same time.
        </p>
      </div>

      {[
        { icon:'📉', title:'The Problem', body:`Most traders lose money not because they don't have a strategy — but because they don't follow it consistently. They take revenge trades. They exit early. They break their own rules. And a month later, they can't even remember what happened because they never wrote it down.` },
        { icon:'💡', title:'The Idea', body:`Financial + Journey = Journifi. Every trade you take is a step in your financial journey. Journifi is the memory bank that captures every step — the chart, the setup, the outcome, the lesson. So a month later you don't need TradingView to remember. It's all right there.` },
        { icon:'🎯', title:'The Mission', body:`To give every trader — beginner to advanced, stocks to options to forex — the tools that professional prop firms give their traders. A structured journal. Real analytics. Honest feedback. And eventually, an AI coach that knows your patterns better than you do.` },
        { icon:'🚀', title:'Where We\'re Going', body:`IBKR auto-sync. AI chart analysis. Strategy rule tracking. A learning hub from zero to advanced. Monthly challenges. A community. And a pricing model that doesn't punish you for being new. This is just the beginning.` },
      ].map(item => (
        <div key={item.title} style={{ background:T.glassBg, backdropFilter:'blur(20px)', border:`1px solid ${T.glassBorder}`, borderRadius:16, padding:'28px 28px', marginBottom:16 }}>
          <div style={{ fontSize:28, marginBottom:12 }}>{item.icon}</div>
          <h3 style={{ fontSize:18, fontWeight:700, color:T.text, marginBottom:10 }}>{item.title}</h3>
          <p style={{ color:T.textMuted, fontSize:14, lineHeight:1.8 }}>{item.body}</p>
        </div>
      ))}

      <div style={{ background:`linear-gradient(135deg, ${T.accent}15, ${T.accent}05)`, border:`1px solid ${T.accent}33`, borderRadius:16, padding:'32px 28px', marginTop:32, textAlign:'center' }}>
        <div style={{ fontSize:32, marginBottom:12 }}>👋</div>
        <h3 style={{ fontSize:20, fontWeight:700, color:T.text, marginBottom:10 }}>From the founder</h3>
        <p style={{ color:T.textMuted, fontSize:14, lineHeight:1.8, maxWidth:540, margin:'0 auto' }}>
          "I'm Abhilash Rishi — AZ truck driver, day trader, and content creator. I built Journifi because I needed it myself. Everything you see here was built from real trading pain points. If it helps one trader stop repeating the same mistakes, it's worth it."
        </p>
        <p style={{ color:T.accent, fontWeight:600, fontSize:14, marginTop:16 }}>— Abhilash Rishi, Founder · Journifi</p>
      </div>
    </div>
  );
}

// ── SUPPORT PAGE ──────────────────────────────────────────────────────────────
function SupportPage({ T }) {
  const [open, setOpen] = useState(null);
  const faqs = [
    ['How do I log a trade?','Click the "+ Add Trade" button on the Journal tab. Fill in the ticker, type (CALL/PUT), entry/exit price, and contracts. P&L calculates automatically.'],
    ['Why isn\'t my P&L calculating?','Make sure you\'ve entered both Entry Price and Exit Price. P&L = (Exit − Entry) × Contracts × 100 for options.'],
    ['How do filters work?','Click the ⚙ Filters button on the Journal tab. You can filter by date range, day of week, ticker, outcome, and type. Stats update in real time.'],
    ['Can I edit or delete a trade?','Trade editing and deletion is coming soon. For now, contact support if you need a trade removed.'],
    ['How do I connect IBKR?','IBKR auto-sync is coming in the Pro plan. Currently trades can be logged manually or imported via the console script.'],
    ['I found a bug. What do I do?','Email us at support@journifi.app with a screenshot and description. We respond within 24 hours.'],
    ['How do I cancel my subscription?','Subscription management is coming with the Stripe integration. Email support@journifi.app to cancel.'],
    ['Is my data private?','Yes. Your trades are stored in a secure Supabase database and are never shared or sold. Only you can see your data.'],
  ];

  return (
    <div style={{ maxWidth:700, margin:'0 auto', padding:'48px 24px' }}>
      <div style={{ textAlign:'center', marginBottom:48 }}>
        <h1 style={{ fontSize:40, fontWeight:800, color:T.text, letterSpacing:'-1px', marginBottom:12 }}>Support Center</h1>
        <p style={{ color:T.textMuted, fontSize:16 }}>Find answers or reach out — we're here to help.</p>
      </div>

      {/* Contact cards */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:40 }}>
        {[
          { icon:'✉️', title:'Email Support', desc:'support@journifi.app', sub:'Response within 24 hours' },
          { icon:'💬', title:'Community', desc:'Join our Discord', sub:'Talk to other Journifi traders' },
        ].map(c => (
          <div key={c.title} style={{ background:T.glassBg, backdropFilter:'blur(20px)', border:`1px solid ${T.glassBorder}`, borderRadius:14, padding:'22px 20px', textAlign:'center' }}>
            <div style={{ fontSize:28, marginBottom:10 }}>{c.icon}</div>
            <div style={{ fontWeight:700, color:T.text, fontSize:15, marginBottom:4 }}>{c.title}</div>
            <div style={{ color:T.accent, fontSize:14, marginBottom:4 }}>{c.desc}</div>
            <div style={{ color:T.textMuted, fontSize:12 }}>{c.sub}</div>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize:22, fontWeight:700, color:T.text, marginBottom:20 }}>Common Questions</h2>
      {faqs.map(([q, a], i) => (
        <div key={q} style={{ background:T.glassBg, backdropFilter:'blur(20px)', border:`1px solid ${open===i ? T.accent+'44' : T.glassBorder}`, borderRadius:12, marginBottom:8, overflow:'hidden', transition:'border 0.2s' }}>
          <button onClick={() => setOpen(open===i ? null : i)} style={{ width:'100%', padding:'16px 20px', background:'transparent', border:'none', color:T.text, fontSize:14, fontWeight:600, cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center', textAlign:'left' }}>
            {q}
            <span style={{ color:T.accent, fontSize:18, transform: open===i ? 'rotate(45deg)' : 'none', transition:'transform 0.2s', flexShrink:0, marginLeft:12 }}>+</span>
          </button>
          {open===i && <div style={{ padding:'0 20px 16px', color:T.textMuted, fontSize:14, lineHeight:1.7 }}>{a}</div>}
        </div>
      ))}
    </div>
  );
}

// ── MAIN APP ─────────────────────────────────────────────────────────────────
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
  const [tab, setTab] = useState('journal');

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
      setSession(session); setLoading(false);
      if (session) fetchTrades(session.user.id);
    });
    const { data: { subscription } } = sb.auth.onAuthStateChange((_e, session) => {
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
    e.preventDefault(); setAuthError('');
    const sb = getSupabase();
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) setAuthError(error.message);
  }

  async function handleGoogleLogin() {
    const sb = getSupabase();
    await sb.auth.signInWithOAuth({ provider:'google', options:{ redirectTo:'https://journifi-next.vercel.app' } });
  }

  async function handleLogout() {
    const sb = getSupabase();
    await sb.auth.signOut();
    setSession(null); setTrades([]);
  }

  function handleFormChange(e) {
    const { name, value } = e.target;
    setForm(prev => {
      const u = { ...prev, [name]: value };
      if (['entry_price','exit_price','contracts'].includes(name)) {
        const en = parseFloat(u.entry_price), ex = parseFloat(u.exit_price), co = parseFloat(u.contracts)||1;
        if (!isNaN(en) && !isNaN(ex)) u.pnl = ((ex-en)*co*100).toFixed(2);
      }
      return u;
    });
  }

  async function handleSaveTrade(e) {
    e.preventDefault(); setSaving(true); setSaveError('');
    const sb = getSupabase();
    const { error } = await sb.from('trades').insert({
      user_id:session.user.id, date:form.date, ticker:form.ticker.toUpperCase(),
      option_type:form.option_type, strike:parseFloat(form.strike)||null,
      expiry:form.expiry||null, contracts:parseInt(form.contracts)||1,
      entry_price:parseFloat(form.entry_price)||null, exit_price:parseFloat(form.exit_price)||null,
      pnl:parseFloat(form.pnl)||null, setup:form.setup, outcome:form.outcome, notes:form.notes,
    });
    setSaving(false);
    if (error) setSaveError(error.message);
    else { setShowModal(false); setForm(EMPTY_TRADE); fetchTrades(session.user.id); }
  }

  const uniqueTickers = useMemo(() => [...new Set(trades.map(t => t.ticker).filter(Boolean))].sort(), [trades]);

  const filteredTrades = useMemo(() => trades.filter(t => {
    const d = new Date(t.date+'T00:00:00');
    if (datePreset==='custom') {
      if (customFrom && d < new Date(customFrom)) return false;
      if (customTo && d > new Date(customTo)) return false;
    } else if (datePreset!=='all') {
      const r = getDateRange(datePreset);
      if (r && (d < r.from || d > r.to)) return false;
    }
    if (filterDay!=='all' && DAYS[d.getDay()]!==filterDay) return false;
    if (filterTicker!=='all' && t.ticker!==filterTicker) return false;
    if (filterOutcome!=='all' && t.outcome!==filterOutcome) return false;
    if (filterType!=='all' && t.option_type!==filterType) return false;
    return true;
  }), [trades,datePreset,filterDay,filterTicker,filterOutcome,filterType,customFrom,customTo]);

  const totalPnl = filteredTrades.reduce((s,t) => s+(parseFloat(t.pnl)||0), 0);
  const wins = filteredTrades.filter(t => t.outcome==='WIN').length;
  const losses = filteredTrades.filter(t => t.outcome==='LOSS').length;
  const winRate = filteredTrades.length ? Math.round(wins/filteredTrades.length*100) : 0;
  const avgWin = wins ? filteredTrades.filter(t=>t.outcome==='WIN').reduce((s,t)=>s+parseFloat(t.pnl||0),0)/wins : 0;
  const avgLoss = losses ? filteredTrades.filter(t=>t.outcome==='LOSS').reduce((s,t)=>s+parseFloat(t.pnl||0),0)/losses : 0;
  const activeFilters = [datePreset!=='all',filterDay!=='all',filterTicker!=='all',filterOutcome!=='all',filterType!=='all'].filter(Boolean).length;

  function resetFilters() { setDatePreset('all'); setFilterDay('all'); setFilterTicker('all'); setFilterOutcome('all'); setFilterType('all'); setCustomFrom(''); setCustomTo(''); }

  const d = darkMode;
  const T = {
    pageBg: d ? 'linear-gradient(135deg,#0a0c14 0%,#0d1117 50%,#0a0e1a 100%)' : 'linear-gradient(135deg,#e8edf5 0%,#f0f4fa 50%,#e4eaf3 100%)',
    glassBg: d ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.65)',
    glassBorder: d ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    headerBg: d ? 'rgba(10,12,20,0.85)' : 'rgba(255,255,255,0.85)',
    inputBg: d ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
    inputBorder: d ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)',
    modalBg: d ? 'rgba(13,15,24,0.97)' : 'rgba(255,255,255,0.97)',
    tableBorder: d ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)',
    text: d ? '#e8edf5' : '#0d1117',
    textMuted: d ? '#6b7280' : '#6b7280',
    textFaint: d ? '#2d3748' : '#e2e8f0',
    accent: '#00C4B4',
    green: '#22c55e', greenBg: d ? 'rgba(34,197,94,0.12)' : 'rgba(34,197,94,0.1)',
    red: '#ef4444', redBg: d ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.1)',
    orb1: d ? 'rgba(0,196,180,0.07)' : 'rgba(0,196,180,0.09)',
    orb2: d ? 'rgba(99,102,241,0.05)' : 'rgba(99,102,241,0.07)',
  };

  const css = `
    *{box-sizing:border-box;margin:0;padding:0;}
    body{margin:0;}
    ::-webkit-scrollbar{width:5px;height:5px;}
    ::-webkit-scrollbar-track{background:transparent;}
    ::-webkit-scrollbar-thumb{background:${T.textFaint};border-radius:3px;}
    input[type=date]::-webkit-calendar-picker-indicator{filter:${d?'invert(1)':'none'};opacity:.4;}
    select option{background:${d?'#0d1117':'#fff'};color:${T.text};}
    @keyframes spin{to{transform:rotate(360deg);}}
    @keyframes fadeIn{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);}}
    .trow:hover td{background:${d?'rgba(255,255,255,0.02)':'rgba(0,0,0,0.02)'};}
    .nav-tab{transition:all 0.15s;}
  `;

  if (loading) return (
    <><style>{css}</style>
    <div style={{display:'flex',justifyContent:'center',alignItems:'center',minHeight:'100vh',background:T.pageBg}}>
      <div style={{width:36,height:36,border:`3px solid ${T.textFaint}`,borderTop:`3px solid ${T.accent}`,borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
    </div></>
  );

  if (!session) return (
    <><style>{css}</style>
    <div style={{minHeight:'100vh',background:T.pageBg,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:24,position:'relative',overflow:'hidden'}}>
      <div style={{position:'absolute',width:600,height:600,borderRadius:'50%',background:T.orb1,filter:'blur(80px)',top:-100,right:-100,pointerEvents:'none'}}/>
      <div style={{position:'absolute',width:400,height:400,borderRadius:'50%',background:T.orb2,filter:'blur(80px)',bottom:-50,left:-50,pointerEvents:'none'}}/>
      <div style={{marginBottom:36,animation:'fadeIn 0.5s ease',textAlign:'center'}}>
        <Logo light={!d}/>
        <p style={{color:T.textMuted,fontSize:13,marginTop:10,letterSpacing:'0.02em'}}>Your financial journey, logged.</p>
      </div>
      <div style={{width:'100%',maxWidth:400,background:T.glassBg,backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',border:`1px solid ${T.glassBorder}`,borderRadius:20,padding:'28px 24px',animation:'fadeIn 0.6s ease'}}>
        <button onClick={handleGoogleLogin} style={{width:'100%',padding:'12px 16px',background:d?'rgba(255,255,255,0.92)':'#fff',color:'#111',border:'none',borderRadius:12,fontSize:15,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:10,marginBottom:18}}>
          <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/></svg>
          Continue with Google
        </button>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:18}}>
          <div style={{flex:1,height:1,background:T.glassBorder}}/><span style={{color:T.textMuted,fontSize:12}}>or</span><div style={{flex:1,height:1,background:T.glassBorder}}/>
        </div>
        <form onSubmit={handleEmailLogin} style={{display:'flex',flexDirection:'column',gap:10}}>
          <input style={{padding:'11px 14px',background:T.inputBg,border:`1px solid ${T.inputBorder}`,borderRadius:10,color:T.text,fontSize:14,outline:'none',width:'100%'}} type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required/>
          <input style={{padding:'11px 14px',background:T.inputBg,border:`1px solid ${T.inputBorder}`,borderRadius:10,color:T.text,fontSize:14,outline:'none',width:'100%'}} type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} required/>
          {authError && <p style={{color:T.red,fontSize:13}}>{authError}</p>}
          <button type="submit" style={{padding:'12px',background:T.accent,color:'#000',border:'none',borderRadius:10,fontSize:15,fontWeight:700,cursor:'pointer',marginTop:4}}>Sign In</button>
        </form>
      </div>
      <button onClick={()=>setDarkMode(!d)} style={{marginTop:20,background:'transparent',border:`1px solid ${T.glassBorder}`,color:T.textMuted,borderRadius:20,padding:'6px 16px',fontSize:13,cursor:'pointer'}}>{d?'☀ Light Mode':'🌙 Dark Mode'}</button>
    </div></>
  );

  const TABS = [
    { id:'journal', label:'📊 Journal' },
    { id:'pricing', label:'💎 Pricing' },
    { id:'about',   label:'✦ About' },
    { id:'support', label:'💬 Support' },
  ];

  return (
    <><style>{css}</style>
    <div style={{minHeight:'100vh',background:T.pageBg,color:T.text,fontFamily:"'IBM Plex Sans',system-ui,sans-serif",position:'relative'}}>
      <div style={{position:'fixed',width:800,height:800,borderRadius:'50%',background:T.orb1,filter:'blur(100px)',top:-200,right:-200,pointerEvents:'none',zIndex:0}}/>
      <div style={{position:'fixed',width:500,height:500,borderRadius:'50%',background:T.orb2,filter:'blur(100px)',bottom:-100,left:-100,pointerEvents:'none',zIndex:0}}/>

      {/* HEADER */}
      <header style={{position:'sticky',top:0,zIndex:50,background:T.headerBg,backdropFilter:'blur(24px)',WebkitBackdropFilter:'blur(24px)',borderBottom:`1px solid ${T.glassBorder}`}}>
        {/* Top bar */}
        <div style={{padding:'0 24px',height:56,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <Logo light={!d}/>
          {/* Centered nav */}
          <nav style={{position:'absolute',left:'50%',transform:'translateX(-50%)',display:'flex',gap:4,background:T.glassBg,border:`1px solid ${T.glassBorder}`,borderRadius:12,padding:'4px'}}>
            {TABS.map(t => (
              <button key={t.id} className="nav-tab" onClick={()=>setTab(t.id)} style={{padding:'7px 16px',borderRadius:8,border:'none',background:tab===t.id ? T.accent : 'transparent',color:tab===t.id ? '#000' : T.textMuted,fontSize:13,fontWeight:tab===t.id?700:500,cursor:'pointer',whiteSpace:'nowrap'}}>
                {t.label}
              </button>
            ))}
          </nav>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <button onClick={()=>setDarkMode(!d)} style={{background:T.glassBg,border:`1px solid ${T.glassBorder}`,borderRadius:8,padding:'6px 10px',cursor:'pointer',fontSize:14,color:T.textMuted}}>{d?'☀':'🌙'}</button>
            <span style={{color:T.textMuted,fontSize:12,maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{session.user.email}</span>
            <button onClick={handleLogout} style={{background:'transparent',color:T.textMuted,border:`1px solid ${T.glassBorder}`,borderRadius:8,padding:'6px 12px',cursor:'pointer',fontSize:12}}>Sign Out</button>
          </div>
        </div>
      </header>

      <div style={{position:'relative',zIndex:1}}>

        {/* JOURNAL TAB */}
        {tab==='journal' && <>
          {/* Stats Bar */}
          <div style={{display:'flex',flexWrap:'wrap',borderBottom:`1px solid ${T.glassBorder}`,background:d?'rgba(10,12,20,0.6)':'rgba(255,255,255,0.5)',backdropFilter:'blur(20px)'}}>
            {[
              {label:'Total P&L', value:`${totalPnl>=0?'+':''}$${totalPnl.toFixed(2)}`, color:totalPnl>=0?T.green:T.red},
              {label:'Win Rate', value:`${winRate}%`, color:T.text},
              {label:'Trades', value:filteredTrades.length, color:T.text},
              {label:'Wins', value:wins, color:T.green},
              {label:'Losses', value:losses, color:T.red},
              {label:'Avg Win', value:`+$${avgWin.toFixed(2)}`, color:T.green},
              {label:'Avg Loss', value:`$${avgLoss.toFixed(2)}`, color:T.red},
            ].map(stat => (
              <div key={stat.label} style={{flex:'1 1 110px',padding:'12px 18px',borderRight:`1px solid ${T.glassBorder}`}}>
                <div style={{fontSize:10,color:T.textMuted,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:4}}>{stat.label}</div>
                <div style={{fontSize:19,fontWeight:700,color:stat.color,fontVariantNumeric:'tabular-nums'}}>{stat.value}</div>
              </div>
            ))}
          </div>

          <main style={{padding:'20px 24px',maxWidth:1400,margin:'0 auto'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,flexWrap:'wrap',gap:8}}>
              <h2 style={{fontSize:15,fontWeight:600,color:T.text}}>Trade Journal</h2>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                <button onClick={()=>setShowFilters(!showFilters)} style={{background:activeFilters>0?T.accent:T.glassBg,backdropFilter:'blur(10px)',color:activeFilters>0?'#000':T.textMuted,border:`1px solid ${activeFilters>0?T.accent:T.glassBorder}`,borderRadius:8,padding:'7px 14px',fontSize:13,cursor:'pointer',fontWeight:500}}>
                  ⚙ Filters {activeFilters>0?`(${activeFilters})`:''}
                </button>
                {activeFilters>0 && <button onClick={resetFilters} style={{background:'transparent',color:T.red,border:`1px solid ${T.red}44`,borderRadius:8,padding:'7px 12px',fontSize:13,cursor:'pointer'}}>✕ Reset</button>}
                <button onClick={()=>{setShowModal(true);setForm(EMPTY_TRADE);}} style={{background:T.accent,color:'#000',border:'none',borderRadius:8,padding:'8px 16px',fontSize:14,fontWeight:700,cursor:'pointer'}}>+ Add Trade</button>
              </div>
            </div>

            {showFilters && (
              <div style={{background:T.glassBg,backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',border:`1px solid ${T.glassBorder}`,borderRadius:14,padding:18,marginBottom:16,display:'flex',flexDirection:'column',gap:14,animation:'fadeIn 0.2s ease'}}>
                {[
                  {label:'Date Range',key:'datePreset',setter:setDatePreset,val:datePreset,opts:[['all','All Time'],['today','Today'],['this_week','This Week'],['last_week','Last Week'],['this_month','This Month'],['last_month','Last Month'],['custom','Custom']]},
                  {label:'Day',key:'filterDay',setter:setFilterDay,val:filterDay,opts:[['all','All'],['Monday','Mon'],['Tuesday','Tue'],['Wednesday','Wed'],['Thursday','Thu'],['Friday','Fri']]},
                  {label:'Outcome',key:'filterOutcome',setter:setFilterOutcome,val:filterOutcome,opts:[['all','All'],['WIN','Win'],['LOSS','Loss'],['BREAKEVEN','Breakeven']]},
                  {label:'Type',key:'filterType',setter:setFilterType,val:filterType,opts:[['all','All'],['CALL','Call'],['PUT','Put']]},
                ].map(f => (
                  <div key={f.key}>
                    <div style={{fontSize:10,color:T.textMuted,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6,fontWeight:600}}>{f.label}</div>
                    <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                      {f.opts.map(([val,label]) => (
                        <button key={val} onClick={()=>f.setter(val)} style={{background:f.val===val?T.accent:T.inputBg,color:f.val===val?'#000':T.textMuted,border:`1px solid ${f.val===val?T.accent:T.inputBorder}`,borderRadius:20,padding:'5px 13px',fontSize:12,cursor:'pointer',fontWeight:f.val===val?700:400}}>{label}</button>
                      ))}
                    </div>
                  </div>
                ))}
                <div>
                  <div style={{fontSize:10,color:T.textMuted,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6,fontWeight:600}}>Ticker</div>
                  <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                    {[['all','All'],...uniqueTickers.map(t=>[t,t])].map(([val,label]) => (
                      <button key={val} onClick={()=>setFilterTicker(val)} style={{background:filterTicker===val?T.accent:T.inputBg,color:filterTicker===val?'#000':T.textMuted,border:`1px solid ${filterTicker===val?T.accent:T.inputBorder}`,borderRadius:20,padding:'5px 13px',fontSize:12,cursor:'pointer',fontWeight:filterTicker===val?700:400}}>{label}</button>
                    ))}
                  </div>
                </div>
                {datePreset==='custom' && (
                  <div style={{display:'flex',gap:10,alignItems:'center'}}>
                    <input style={{padding:'7px 12px',background:T.inputBg,border:`1px solid ${T.inputBorder}`,borderRadius:8,color:T.text,fontSize:13}} type="date" value={customFrom} onChange={e=>setCustomFrom(e.target.value)}/>
                    <span style={{color:T.textMuted}}>→</span>
                    <input style={{padding:'7px 12px',background:T.inputBg,border:`1px solid ${T.inputBorder}`,borderRadius:8,color:T.text,fontSize:13}} type="date" value={customTo} onChange={e=>setCustomTo(e.target.value)}/>
                  </div>
                )}
              </div>
            )}

            {filteredTrades.length===0 ? (
              <div style={{textAlign:'center',padding:'70px 0'}}>
                <div style={{fontSize:44,marginBottom:12}}>📋</div>
                <p style={{color:T.text,fontSize:17,fontWeight:600,marginBottom:6}}>{trades.length>0?'No trades match your filters.':'No trades yet.'}</p>
                <p style={{color:T.textMuted,fontSize:13}}>{trades.length>0?'Try adjusting your filters.':'Click "+ Add Trade" to log your first trade.'}</p>
              </div>
            ) : (
              <div style={{overflowX:'auto',background:T.glassBg,backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',border:`1px solid ${T.glassBorder}`,borderRadius:14}}>
                <table style={{width:'100%',borderCollapse:'collapse',minWidth:900}}>
                  <thead>
                    <tr style={{borderBottom:`1px solid ${T.glassBorder}`}}>
                      {['Date','Ticker','Type','Strike','Expiry','Qty','Entry','Exit','P&L','Setup','Result','Notes'].map(h => (
                        <th key={h} style={{textAlign:'left',padding:'11px 16px',color:T.textMuted,fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.08em',whiteSpace:'nowrap'}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTrades.map(t => (
                      <tr key={t.id} className="trow" style={{borderBottom:`1px solid ${T.tableBorder}`}}>
                        <td style={{padding:'12px 16px'}}>
                          <div style={{fontSize:13,color:T.text,fontWeight:500}}>{t.date}</div>
                          <div style={{fontSize:10,color:T.textMuted,marginTop:2}}>{DAYS[new Date(t.date+'T00:00:00').getDay()]}</div>
                        </td>
                        <td style={{padding:'12px 16px',fontSize:14,fontWeight:700,color:T.accent}}>{t.ticker}</td>
                        <td style={{padding:'12px 16px'}}>
                          <span style={{padding:'3px 8px',borderRadius:5,fontSize:11,fontWeight:700,background:t.option_type==='CALL'?T.greenBg:T.redBg,color:t.option_type==='CALL'?T.green:T.red}}>{t.option_type}</span>
                        </td>
                        <td style={{padding:'12px 16px',fontSize:13,color:T.text}}>{t.strike?`$${t.strike}`:<span style={{color:T.textFaint}}>—</span>}</td>
                        <td style={{padding:'12px 16px',fontSize:13,color:T.text}}>{t.expiry||<span style={{color:T.textFaint}}>—</span>}</td>
                        <td style={{padding:'12px 16px',fontSize:13,color:T.text}}>{t.contracts}</td>
                        <td style={{padding:'12px 16px',fontSize:13,color:T.text}}>{t.entry_price?`$${t.entry_price}`:<span style={{color:T.textFaint}}>—</span>}</td>
                        <td style={{padding:'12px 16px',fontSize:13,color:T.text}}>{t.exit_price?`$${t.exit_price}`:<span style={{color:T.textFaint}}>—</span>}</td>
                        <td style={{padding:'12px 16px',fontSize:14,fontWeight:700,color:parseFloat(t.pnl)>=0?T.green:T.red,fontVariantNumeric:'tabular-nums'}}>
                          {parseFloat(t.pnl)>=0?'+':''}${parseFloat(t.pnl||0).toFixed(2)}
                        </td>
                        <td style={{padding:'12px 16px',fontSize:13,color:T.textMuted}}>{t.setup||<span style={{color:T.textFaint}}>—</span>}</td>
                        <td style={{padding:'12px 16px'}}>
                          <span style={{padding:'3px 8px',borderRadius:5,fontSize:11,fontWeight:700,background:t.outcome==='WIN'?T.greenBg:t.outcome==='LOSS'?T.redBg:'rgba(107,114,128,0.12)',color:t.outcome==='WIN'?T.green:t.outcome==='LOSS'?T.red:T.textMuted}}>{t.outcome}</span>
                        </td>
                        <td style={{padding:'12px 16px',fontSize:13,color:T.textMuted,maxWidth:150,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.notes||<span style={{color:T.textFaint}}>—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </main>
        </>}

        {tab==='pricing' && <PricingPage T={T} onGetStarted={()=>setTab('journal')}/>}
        {tab==='about'   && <AboutPage T={T}/>}
        {tab==='support' && <SupportPage T={T}/>}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,padding:16}} onClick={()=>setShowModal(false)}>
          <div style={{background:T.modalBg,border:`1px solid ${T.glassBorder}`,borderRadius:16,padding:28,width:'100%',maxWidth:620,maxHeight:'90vh',overflowY:'auto',animation:'fadeIn 0.2s ease'}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <h2 style={{fontSize:18,fontWeight:700,color:T.text}}>Log Trade</h2>
              <button onClick={()=>setShowModal(false)} style={{background:'transparent',border:'none',color:T.textMuted,fontSize:22,cursor:'pointer'}}>✕</button>
            </div>
            <form onSubmit={handleSaveTrade}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                {[
                  {l:'Date',n:'date',t:'date',r:true,s:1},{l:'Ticker',n:'ticker',t:'text',p:'SPY',r:true,s:1},
                  {l:'Strike',n:'strike',t:'number',p:'500',s:1},{l:'Expiry',n:'expiry',t:'date',s:1},
                  {l:'Contracts',n:'contracts',t:'number',s:1},{l:'Entry Price',n:'entry_price',t:'number',p:'1.50',s:1},
                  {l:'Exit Price',n:'exit_price',t:'number',p:'3.00',s:1},
                ].map(f => (
                  <div key={f.n} style={{gridColumn:`span ${f.s}`}}>
                    <label style={{display:'block',fontSize:11,color:T.textMuted,textTransform:'uppercase',letterSpacing:'0.06em',fontWeight:600,marginBottom:6}}>{f.l}</label>
                    <input style={{width:'100%',padding:'10px 12px',background:T.inputBg,border:`1px solid ${T.inputBorder}`,borderRadius:8,color:T.text,fontSize:14,outline:'none'}} type={f.t} name={f.n} placeholder={f.p} value={form[f.n]} onChange={handleFormChange} required={f.r} step={f.t==='number'?'0.01':undefined} min={f.n==='contracts'?'1':undefined}/>
                  </div>
                ))}
                <div>
                  <label style={{display:'block',fontSize:11,color:T.textMuted,textTransform:'uppercase',letterSpacing:'0.06em',fontWeight:600,marginBottom:6}}>P&L (auto)</label>
                  <input style={{width:'100%',padding:'10px 12px',background:T.inputBg,border:`1px solid ${T.inputBorder}`,borderRadius:8,color:parseFloat(form.pnl)>=0?T.green:T.red,fontSize:14,fontWeight:700,outline:'none'}} type="number" step="0.01" name="pnl" placeholder="0.00" value={form.pnl} onChange={handleFormChange}/>
                </div>
                {[
                  {l:'Type',n:'option_type',opts:['CALL','PUT']},
                  {l:'Outcome',n:'outcome',opts:['WIN','LOSS','BREAKEVEN']},
                ].map(f => (
                  <div key={f.n}>
                    <label style={{display:'block',fontSize:11,color:T.textMuted,textTransform:'uppercase',letterSpacing:'0.06em',fontWeight:600,marginBottom:6}}>{f.l}</label>
                    <select style={{width:'100%',padding:'10px 12px',background:T.inputBg,border:`1px solid ${T.inputBorder}`,borderRadius:8,color:T.text,fontSize:14,outline:'none'}} name={f.n} value={form[f.n]} onChange={handleFormChange}>
                      {f.opts.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
                <div style={{gridColumn:'1/-1'}}>
                  <label style={{display:'block',fontSize:11,color:T.textMuted,textTransform:'uppercase',letterSpacing:'0.06em',fontWeight:600,marginBottom:6}}>Setup</label>
                  <input style={{width:'100%',padding:'10px 12px',background:T.inputBg,border:`1px solid ${T.inputBorder}`,borderRadius:8,color:T.text,fontSize:14,outline:'none'}} type="text" name="setup" placeholder="VWAP reclaim, double bottom, trap..." value={form.setup} onChange={handleFormChange}/>
                </div>
                <div style={{gridColumn:'1/-1'}}>
                  <label style={{display:'block',fontSize:11,color:T.textMuted,textTransform:'uppercase',letterSpacing:'0.06em',fontWeight:600,marginBottom:6}}>Notes</label>
                  <textarea style={{width:'100%',padding:'10px 12px',background:T.inputBg,border:`1px solid ${T.inputBorder}`,borderRadius:8,color:T.text,fontSize:14,height:76,resize:'vertical',outline:'none',fontFamily:'inherit'}} name="notes" placeholder="What happened? What did you learn?" value={form.notes} onChange={handleFormChange}/>
                </div>
              </div>
              {saveError && <p style={{color:T.red,fontSize:13,marginTop:12}}>{saveError}</p>}
              <div style={{display:'flex',gap:10,marginTop:20}}>
                <button type="button" onClick={()=>setShowModal(false)} style={{flex:1,padding:'12px',background:'transparent',color:T.textMuted,border:`1px solid ${T.glassBorder}`,borderRadius:10,fontSize:15,cursor:'pointer'}}>Cancel</button>
                <button type="submit" style={{flex:2,padding:'12px',background:T.accent,color:'#000',border:'none',borderRadius:10,fontSize:15,fontWeight:700,cursor:'pointer'}} disabled={saving}>{saving?'Saving...':'Save Trade'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div></>
  );
}

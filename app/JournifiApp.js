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

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const ASSET_TYPES = ['All','Stocks','Options','Futures','Forex','Crypto'];

const EMPTY_TRADE = {
  date: new Date().toISOString().split('T')[0],
  asset_type:'options', ticker:'', direction:'LONG', option_type:'CALL',
  strike:'', expiry:'', dte:'', contracts:'1', shares:'', lots:'',
  entry_price:'', exit_price:'', pips:'', pnl:'', commission:'0',
  setup:'', outcome:'WIN', notes:'', entry_time:'', exit_time:'',
  market_condition:'', strategy_id:'',
};

function getDateRange(preset) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch(preset) {
    case 'today': return {from:today,to:today};
    case 'this_week': {const m=new Date(today);m.setDate(today.getDate()-today.getDay()+1);return{from:m,to:today};}
    case 'last_week': {const m=new Date(today);m.setDate(today.getDate()-today.getDay()-6);const s=new Date(m);s.setDate(m.getDate()+6);return{from:m,to:s};}
    case 'this_month': return{from:new Date(today.getFullYear(),today.getMonth(),1),to:today};
    case 'last_month': {const f=new Date(today.getFullYear(),today.getMonth()-1,1);const l=new Date(today.getFullYear(),today.getMonth(),0);return{from:f,to:l};}
    default: return null;
  }
}

function Logo({ light, size='md' }) {
  const t = light ? '#0a0c14' : '#fff';
  const a = '#00C4B4';
  const configs = {
    sm:{w:120,h:28,fs:16,jx:28,tx:38,ty:20,pts:'2,22 2,6 6,16 11,10 16,13 21,3',cr:2,cx:21,cy:3,sw:2},
    md:{w:148,h:32,fs:19,jx:33,tx:43,ty:23,pts:'2,26 2,8 8,20 14,12 20,16 26,4',cr:2.2,cx:26,cy:4,sw:2.2},
    lg:{w:220,h:48,fs:30,jx:48,tx:65,ty:36,pts:'4,40 4,12 12,30 20,18 28,24 36,6',cr:3.5,cx:36,cy:6,sw:3.2},
  };
  const c = configs[size]||configs.md;
  return (
    <svg width={c.w} height={c.h} viewBox={`0 0 ${c.w} ${c.h}`} fill="none">
      <polyline points={c.pts} stroke={a} strokeWidth={c.sw} strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <circle cx={c.cx} cy={c.cy} r={c.cr} fill={a}/>
      <text x={c.jx} y={c.ty} fontFamily="'IBM Plex Sans',system-ui,sans-serif" fontWeight="800" fontSize={c.fs} fill={a}>J</text>
      <text x={c.tx} y={c.ty} fontFamily="'IBM Plex Sans',system-ui,sans-serif" fontWeight="800" fontSize={c.fs} fill={t}>ournifi</text>
    </svg>
  );
}

function MiniLineChart({ data, color, height=60 }) {
  if (!data||data.length<2) return null;
  const w=300,h=height,min=Math.min(...data),max=Math.max(...data),range=max-min||1;
  const pts=data.map((v,i)=>{const x=(i/(data.length-1))*w;const y=h-((v-min)/range)*(h-8)-4;return`${x},${y}`;}).join(' ');
  const fillPts=`0,${h} ${pts} ${w},${h}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{width:'100%',height}} preserveAspectRatio="none">
      <defs><linearGradient id={`g${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.3"/><stop offset="100%" stopColor={color} stopOpacity="0"/></linearGradient></defs>
      <polygon points={fillPts} fill={`url(#g${color.replace('#','')})`}/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function BarChart({ data, T }) {
  if (!data||data.length===0) return <div style={{color:T.textMuted,fontSize:13,textAlign:'center',padding:20}}>No data yet</div>;
  const max=Math.max(...data.map(d=>Math.abs(d.value)),1);
  return (
    <div style={{display:'flex',alignItems:'flex-end',gap:6,height:120,padding:'8px 0'}}>
      {data.map((d,i)=>{
        const pct=Math.abs(d.value)/max*100,pos=d.value>=0;
        return (
          <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4,height:'100%',justifyContent:'flex-end'}}>
            <div style={{fontSize:10,color:T.textMuted,textAlign:'center'}}>{d.value>=0?'+':''}${Math.abs(d.value).toFixed(0)}</div>
            <div style={{width:'100%',height:`${pct}%`,minHeight:2,background:pos?T.green:T.red,borderRadius:'3px 3px 0 0',opacity:0.85}}/>
            <div style={{fontSize:11,color:T.textMuted,textAlign:'center',whiteSpace:'nowrap'}}>{d.label}</div>
          </div>
        );
      })}
    </div>
  );
}

function DonutChart({ wins, losses, breakeven, T }) {
  const total=wins+losses+breakeven||1,winPct=wins/total,lossPct=losses/total;
  const r=40,cx=60,cy=60,circ=2*Math.PI*r;
  const winDash=winPct*circ,lossDash=lossPct*circ;
  return (
    <div style={{display:'flex',alignItems:'center',gap:20}}>
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={T.textFaint} strokeWidth="12"/>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={T.green} strokeWidth="12" strokeDasharray={`${winDash} ${circ-winDash}`} strokeDashoffset={circ/4} strokeLinecap="round"/>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={T.red} strokeWidth="12" strokeDasharray={`${lossDash} ${circ-lossDash}`} strokeDashoffset={circ/4-winDash} strokeLinecap="round"/>
        <text x={cx} y={cy-6} textAnchor="middle" fontSize="16" fontWeight="800" fill={T.text}>{Math.round(winPct*100)}%</text>
        <text x={cx} y={cy+12} textAnchor="middle" fontSize="10" fill={T.textMuted}>Win Rate</text>
      </svg>
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {[{label:'Wins',val:wins,color:T.green},{label:'Losses',val:losses,color:T.red},{label:'Breakeven',val:breakeven,color:T.textMuted}].map(item=>(
          <div key={item.label} style={{display:'flex',alignItems:'center',gap:8}}>
            <div style={{width:10,height:10,borderRadius:'50%',background:item.color,flexShrink:0}}/>
            <span style={{fontSize:13,color:T.textMuted}}>{item.label}</span>
            <span style={{fontSize:13,fontWeight:700,color:T.text,marginLeft:'auto'}}>{item.val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PnlCalendar({ trades, T }) {
  const [month, setMonth] = useState(new Date());
  const year=month.getFullYear(),mon=month.getMonth();
  const firstDay=new Date(year,mon,1).getDay(),daysInMonth=new Date(year,mon+1,0).getDate();
  const dayMap=useMemo(()=>{
    const m={};
    trades.forEach(t=>{
      const d=t.date?.split('T')[0];if(!d)return;
      const[y,mo,day]=d.split('-').map(Number);
      if(y===year&&mo-1===mon)m[day]=(m[day]||0)+(parseFloat(t.pnl)||0);
    });
    return m;
  },[trades,year,mon]);
  const maxAbs=Math.max(...Object.values(dayMap).map(Math.abs),1);
  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
        <button onClick={()=>setMonth(new Date(year,mon-1,1))} style={{background:T.glassBg,border:`1px solid ${T.glassBorder}`,borderRadius:8,padding:'5px 10px',color:T.textMuted,cursor:'pointer',fontSize:14}}>‹</button>
        <span style={{color:T.text,fontWeight:600,fontSize:14}}>{month.toLocaleString('default',{month:'long',year:'numeric'})}</span>
        <button onClick={()=>setMonth(new Date(year,mon+1,1))} style={{background:T.glassBg,border:`1px solid ${T.glassBorder}`,borderRadius:8,padding:'5px 10px',color:T.textMuted,cursor:'pointer',fontSize:14}}>›</button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:3}}>
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d=>(<div key={d} style={{textAlign:'center',fontSize:10,color:T.textMuted,padding:'3px 0',fontWeight:600}}>{d}</div>))}
        {Array.from({length:firstDay}).map((_,i)=><div key={`e${i}`}/>)}
        {Array.from({length:daysInMonth}).map((_,i)=>{
          const day=i+1,pnl=dayMap[day];
          const intensity=pnl?Math.min(Math.abs(pnl)/maxAbs*0.8+0.2,1):0;
          const bg=pnl>0?`rgba(34,197,94,${intensity})`:pnl<0?`rgba(239,68,68,${intensity})`:T.glassBg;
          return (
            <div key={day} style={{aspectRatio:'1',maxHeight:52,borderRadius:5,background:bg,border:`1px solid ${T.glassBorder}`,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
              <span style={{fontSize:11,color:T.text,fontWeight:500}}>{day}</span>
              {pnl?<span style={{fontSize:8,color:pnl>0?T.green:T.red,fontWeight:700}}>{pnl>0?'+':''}${Math.abs(pnl).toFixed(0)}</span>:null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── NEWS PANEL ────────────────────────────────────────────────────────────────
const KEY_EVENTS = [
  { date:'2026-07-09', event:'FOMC Minutes Release', type:'Fed', impact:'high' },
  { date:'2026-07-15', event:'CPI Data Release', type:'Economic', impact:'high' },
  { date:'2026-07-16', event:'AMD Earnings (Q2)', type:'Earnings', impact:'high' },
  { date:'2026-07-22', event:'SPY Options Expiry', type:'Options', impact:'medium' },
  { date:'2026-07-29', event:'FOMC Rate Decision', type:'Fed', impact:'high' },
  { date:'2026-07-30', event:'GDP Q2 Preliminary', type:'Economic', impact:'high' },
  { date:'2026-08-01', event:'Jobs Report (NFP)', type:'Economic', impact:'high' },
  { date:'2026-08-13', event:'CPI Data Release', type:'Economic', impact:'high' },
  { date:'2026-08-15', event:'Retail Sales', type:'Economic', impact:'medium' },
  { date:'2026-09-16', event:'FOMC Rate Decision', type:'Fed', impact:'high' },
];

function NewsPanel({ T, tickers }) {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState('market');
  const [newsTab, setNewsTab] = useState('news');

  // Deduplicate tickers and merge with defaults
  const allTickers = [...new Set([...tickers, 'SPY', 'QQQ', 'VIX'])].slice(0, 10);

  const MARKET_NEWS = [
    { headline:'Markets rally as Fed signals pause in rate hikes', source:'Reuters', url:'#', datetime: Date.now()/1000 - 3600 },
    { headline:'Tech stocks lead gains as AI spending continues to surge', source:'Bloomberg', url:'#', datetime: Date.now()/1000 - 7200 },
    { headline:'S&P 500 hits new all-time high amid strong earnings season', source:'CNBC', url:'#', datetime: Date.now()/1000 - 10800 },
    { headline:'VIX falls to multi-month low as volatility expectations ease', source:'MarketWatch', url:'#', datetime: Date.now()/1000 - 14400 },
    { headline:'Options traders positioning for major move ahead of CPI data', source:'The Street', url:'#', datetime: Date.now()/1000 - 18000 },
    { headline:'AMD surges on strong datacenter revenue guidance', source:'Seeking Alpha', url:'#', datetime: Date.now()/1000 - 21600 },
    { headline:'SPY breaks key resistance level — traders watch $560 next', source:'Benzinga', url:'#', datetime: Date.now()/1000 - 25200 },
  ];

  async function fetchNews(ticker) {
    setSelected(ticker);
    if (ticker === 'market') { setNews(MARKET_NEWS); return; }
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const monthAgo = new Date(Date.now()-30*24*60*60*1000).toISOString().split('T')[0];
      const res = await fetch(`https://finnhub.io/api/v1/company-news?symbol=${ticker}&from=${monthAgo}&to=${today}&token=demo`);
      const data = await res.json();
      setNews(Array.isArray(data) && data.length > 0 ? data.slice(0, 10) : MARKET_NEWS);
    } catch {
      setNews(MARKET_NEWS);
    }
    setLoading(false);
  }

  useEffect(() => { fetchNews('market'); }, []);

  const impactColor = (impact) => impact==='high' ? T.red : impact==='medium' ? '#f59e0b' : T.textMuted;

  return (
    <div style={{display:'flex',flexDirection:'column',gap:10}}>
      <div style={{fontSize:13,fontWeight:600,color:T.text}}>Market News</div>

      {/* News / Key Events tabs */}
      <div style={{display:'flex',gap:0,background:T.inputBg,border:`1px solid ${T.inputBorder}`,borderRadius:8,padding:3}}>
        {[['news','📰 News'],['events','📅 Key Events']].map(([id,label])=>(
          <button key={id} onClick={()=>setNewsTab(id)} style={{flex:1,padding:'6px 0',borderRadius:6,border:'none',background:newsTab===id?T.accent:'transparent',color:newsTab===id?'#000':T.textMuted,fontSize:12,fontWeight:newsTab===id?700:400,cursor:'pointer'}}>{label}</button>
        ))}
      </div>

      {newsTab==='news' && <>
        {/* Ticker selector */}
        <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
          <button onClick={()=>fetchNews('market')} style={{padding:'3px 10px',borderRadius:16,border:`1px solid ${selected==='market'?T.accent:T.glassBorder}`,background:selected==='market'?T.accent:T.glassBg,color:selected==='market'?'#000':T.textMuted,fontSize:11,cursor:'pointer',fontWeight:selected==='market'?700:400}}>🌐 Market</button>
          {allTickers.map(t=>(
            <button key={t} onClick={()=>fetchNews(t)} style={{padding:'3px 10px',borderRadius:16,border:`1px solid ${selected===t?T.accent:T.glassBorder}`,background:selected===t?T.accent:T.glassBg,color:selected===t?'#000':T.textMuted,fontSize:11,cursor:'pointer',fontWeight:selected===t?700:400}}>{t}</button>
          ))}
        </div>

        {loading && <div style={{color:T.textMuted,fontSize:13,textAlign:'center',padding:16}}>Loading news...</div>}

        {!loading && (
          <div style={{display:'flex',flexDirection:'column',gap:7,maxHeight:460,overflowY:'auto'}}>
            {news.map((item,i)=>(
              <a key={i} href={item.url!=='#'?item.url:undefined} target="_blank" rel="noopener noreferrer" style={{textDecoration:'none'}}>
                <div style={{background:T.inputBg,border:`1px solid ${T.inputBorder}`,borderRadius:9,padding:'10px 12px',cursor:'pointer',transition:'border 0.15s'}}
                  onMouseEnter={e=>e.currentTarget.style.borderColor=T.accent}
                  onMouseLeave={e=>e.currentTarget.style.borderColor=T.inputBorder}>
                  <div style={{fontSize:12,fontWeight:600,color:T.text,lineHeight:1.4,marginBottom:5}}>{item.headline}</div>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <span style={{fontSize:10,color:T.accent,fontWeight:600}}>{item.source}</span>
                    <span style={{fontSize:10,color:T.textMuted}}>{new Date(item.datetime*1000).toLocaleDateString()}</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </>}

      {newsTab==='events' && (
        <div style={{display:'flex',flexDirection:'column',gap:7,maxHeight:500,overflowY:'auto'}}>
          {KEY_EVENTS.map((ev,i)=>{
            const daysAway = Math.ceil((new Date(ev.date)-new Date())/(1000*60*60*24));
            const isPast = daysAway < 0;
            return (
              <div key={i} style={{background:T.inputBg,border:`1px solid ${isPast?T.inputBorder:impactColor(ev.impact)+'33'}`,borderRadius:9,padding:'10px 12px',opacity:isPast?0.5:1}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:5}}>
                  <span style={{fontSize:12,fontWeight:600,color:T.text,lineHeight:1.4,flex:1}}>{ev.event}</span>
                  <span style={{fontSize:10,fontWeight:700,color:impactColor(ev.impact),background:impactColor(ev.impact)+'22',padding:'2px 7px',borderRadius:10,marginLeft:8,flexShrink:0}}>{ev.impact}</span>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontSize:10,color:T.accent,fontWeight:600}}>{ev.type}</span>
                  <span style={{fontSize:10,color:isPast?T.textMuted:T.text,fontWeight:isPast?400:600}}>{isPast?'Past':daysAway===0?'Today':daysAway===1?'Tomorrow':`In ${daysAway}d`} · {ev.date}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── TRADE FORM ────────────────────────────────────────────────────────────────
function TradeModal({ T, session, strategies, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY_TRADE);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function handleChange(e) {
    const{name,value}=e.target;
    setForm(prev=>{
      const u={...prev,[name]:value};
      if(['entry_price','exit_price','contracts','shares','lots'].includes(name)){
        const en=parseFloat(u.entry_price),ex=parseFloat(u.exit_price);
        if(!isNaN(en)&&!isNaN(ex)){
          const qty=u.asset_type==='options'?(parseFloat(u.contracts)||1)*100:u.asset_type==='stocks'?(parseFloat(u.shares)||1):u.asset_type==='forex'?(parseFloat(u.lots)||1)*100000:(parseFloat(u.contracts)||1);
          u.pnl=((ex-en)*qty*(u.direction==='SHORT'?-1:1)).toFixed(2);
        }
      }
      return u;
    });
  }

  async function handleSave(e) {
    e.preventDefault();setSaving(true);setError('');
    const sb=getSupabase();
    const{error:err}=await sb.from('trades').insert({
      user_id:session.user.id,date:form.date,asset_type:form.asset_type,ticker:form.ticker.toUpperCase(),
      direction:form.direction,option_type:form.asset_type==='options'?form.option_type:null,
      strike:parseFloat(form.strike)||null,expiry:form.expiry||null,dte:parseInt(form.dte)||null,
      contracts:['options','futures'].includes(form.asset_type)?parseInt(form.contracts)||1:null,
      shares:form.asset_type==='stocks'?parseFloat(form.shares)||null:null,
      lots:form.asset_type==='forex'?parseFloat(form.lots)||null:null,
      entry_price:parseFloat(form.entry_price)||null,exit_price:parseFloat(form.exit_price)||null,
      pips:parseFloat(form.pips)||null,pnl:parseFloat(form.pnl)||null,commission:parseFloat(form.commission)||0,
      setup:form.setup,outcome:form.outcome,notes:form.notes,
      entry_time:form.entry_time||null,exit_time:form.exit_time||null,
      market_condition:form.market_condition||null,strategy_id:form.strategy_id||null,
    });
    setSaving(false);
    if(err)setError(err.message);
    else{onSaved();onClose();}
  }

  const inp={padding:'9px 12px',background:T.inputBg,border:`1px solid ${T.inputBorder}`,borderRadius:8,color:T.text,fontSize:13,outline:'none',width:'100%',fontFamily:'inherit'};
  const lbl={display:'block',fontSize:10,color:T.textMuted,textTransform:'uppercase',letterSpacing:'0.06em',fontWeight:600,marginBottom:5};
  const at=form.asset_type;

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.8)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200,padding:16}} onClick={onClose}>
      <div style={{background:T.modalBg,border:`1px solid ${T.glassBorder}`,borderRadius:16,padding:28,width:'100%',maxWidth:680,maxHeight:'92vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          <h2 style={{fontSize:18,fontWeight:700,color:T.text}}>Log Trade</h2>
          <button onClick={onClose} style={{background:'transparent',border:'none',color:T.textMuted,fontSize:22,cursor:'pointer'}}>✕</button>
        </div>
        <div style={{display:'flex',gap:6,marginBottom:20,flexWrap:'wrap'}}>
          {['options','stocks','forex','futures','crypto'].map(type=>(
            <button key={type} onClick={()=>setForm(f=>({...f,asset_type:type}))} style={{padding:'7px 16px',borderRadius:20,border:`1px solid ${form.asset_type===type?T.accent:T.glassBorder}`,background:form.asset_type===type?T.accent:T.glassBg,color:form.asset_type===type?'#000':T.textMuted,fontSize:13,fontWeight:form.asset_type===type?700:400,cursor:'pointer',textTransform:'capitalize'}}>
              {type==='options'?'📈':type==='stocks'?'🏢':type==='forex'?'💱':type==='futures'?'⚡':'₿'} {type}
            </button>
          ))}
        </div>
        <form onSubmit={handleSave}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>
            <div><label style={lbl}>Date</label><input style={inp} type="date" name="date" value={form.date} onChange={handleChange} required/></div>
            <div><label style={lbl}>Ticker</label><input style={inp} type="text" name="ticker" placeholder={at==='forex'?'EUR/USD':at==='crypto'?'BTC':'SPY'} value={form.ticker} onChange={handleChange} required/></div>
            <div><label style={lbl}>Direction</label><select style={inp} name="direction" value={form.direction} onChange={handleChange}><option value="LONG">Long / Buy</option><option value="SHORT">Short / Sell</option></select></div>
            {at==='options'&&<><div><label style={lbl}>Type</label><select style={inp} name="option_type" value={form.option_type} onChange={handleChange}><option value="CALL">CALL</option><option value="PUT">PUT</option></select></div><div><label style={lbl}>Strike</label><input style={inp} type="number" name="strike" placeholder="500" value={form.strike} onChange={handleChange}/></div><div><label style={lbl}>Expiry</label><input style={inp} type="date" name="expiry" value={form.expiry} onChange={handleChange}/></div><div><label style={lbl}>DTE</label><input style={inp} type="number" name="dte" placeholder="0" value={form.dte} onChange={handleChange}/></div><div><label style={lbl}>Contracts</label><input style={inp} type="number" name="contracts" min="1" value={form.contracts} onChange={handleChange}/></div></>}
            {at==='stocks'&&<div><label style={lbl}>Shares</label><input style={inp} type="number" name="shares" placeholder="100" value={form.shares} onChange={handleChange}/></div>}
            {at==='forex'&&<><div><label style={lbl}>Lots</label><input style={inp} type="number" step="0.01" name="lots" placeholder="0.10" value={form.lots} onChange={handleChange}/></div><div><label style={lbl}>Pips</label><input style={inp} type="number" step="0.1" name="pips" placeholder="15" value={form.pips} onChange={handleChange}/></div></>}
            {at==='futures'&&<div><label style={lbl}>Contracts</label><input style={inp} type="number" name="contracts" min="1" value={form.contracts} onChange={handleChange}/></div>}
            {at==='crypto'&&<div><label style={lbl}>Amount</label><input style={inp} type="number" step="0.0001" name="shares" placeholder="0.5" value={form.shares} onChange={handleChange}/></div>}
            <div><label style={lbl}>Entry Price</label><input style={inp} type="number" step="0.0001" name="entry_price" placeholder="0.00" value={form.entry_price} onChange={handleChange}/></div>
            <div><label style={lbl}>Exit Price</label><input style={inp} type="number" step="0.0001" name="exit_price" placeholder="0.00" value={form.exit_price} onChange={handleChange}/></div>
            <div><label style={lbl}>P&L (auto)</label><input style={{...inp,color:parseFloat(form.pnl)>=0?T.green:T.red,fontWeight:700}} type="number" step="0.01" name="pnl" placeholder="0.00" value={form.pnl} onChange={handleChange}/></div>
            <div><label style={lbl}>Entry Time</label><input style={inp} type="time" name="entry_time" value={form.entry_time} onChange={handleChange}/></div>
            <div><label style={lbl}>Exit Time</label><input style={inp} type="time" name="exit_time" value={form.exit_time} onChange={handleChange}/></div>
            <div><label style={lbl}>Commission</label><input style={inp} type="number" step="0.01" name="commission" placeholder="0.00" value={form.commission} onChange={handleChange}/></div>
            <div><label style={lbl}>Outcome</label><select style={inp} name="outcome" value={form.outcome} onChange={handleChange}><option value="WIN">WIN</option><option value="LOSS">LOSS</option><option value="BREAKEVEN">BREAKEVEN</option></select></div>
            <div><label style={lbl}>Market Condition</label><select style={inp} name="market_condition" value={form.market_condition} onChange={handleChange}><option value="">Select...</option><option value="trending_up">Trending Up</option><option value="trending_down">Trending Down</option><option value="ranging">Ranging</option><option value="volatile">Volatile</option><option value="news">News Driven</option></select></div>
            <div><label style={lbl}>Strategy</label><select style={inp} name="strategy_id" value={form.strategy_id} onChange={handleChange}><option value="">No strategy</option>{strategies.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
            <div style={{gridColumn:'1/-1'}}><label style={lbl}>Setup</label><input style={inp} type="text" name="setup" placeholder="VWAP reclaim, double bottom, breakout, trap..." value={form.setup} onChange={handleChange}/></div>
            <div style={{gridColumn:'1/-1'}}><label style={lbl}>Notes</label><textarea style={{...inp,height:72,resize:'vertical'}} name="notes" placeholder="What happened? What did you learn?" value={form.notes} onChange={handleChange}/></div>
          </div>
          {error&&<p style={{color:T.red,fontSize:13,marginTop:12}}>{error}</p>}
          <div style={{display:'flex',gap:10,marginTop:20}}>
            <button type="button" onClick={onClose} style={{flex:1,padding:'12px',background:'transparent',color:T.textMuted,border:`1px solid ${T.glassBorder}`,borderRadius:10,fontSize:15,cursor:'pointer'}}>Cancel</button>
            <button type="submit" style={{flex:2,padding:'12px',background:T.accent,color:'#000',border:'none',borderRadius:10,fontSize:15,fontWeight:700,cursor:'pointer'}} disabled={saving}>{saving?'Saving...':'Save Trade'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── STRATEGY MODAL ────────────────────────────────────────────────────────────
function StrategyModal({ T, session, onClose, onSaved, existing }) {
  const [name,setName]=useState(existing?.name||'');
  const [desc,setDesc]=useState(existing?.description||'');
  const [rules,setRules]=useState(existing?.rules||['']);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const addRule=()=>setRules(r=>[...r,'']);
  const removeRule=i=>setRules(r=>r.filter((_,idx)=>idx!==i));
  const updateRule=(i,val)=>setRules(r=>r.map((v,idx)=>idx===i?val:v));
  async function handleSave(e){
    e.preventDefault();setSaving(true);setError('');
    const sb=getSupabase();
    const payload={user_id:session.user.id,name,description:desc,rules:rules.filter(r=>r.trim())};
    const{error:err}=existing?await sb.from('strategies').update(payload).eq('id',existing.id):await sb.from('strategies').insert(payload);
    setSaving(false);
    if(err)setError(err.message);
    else{onSaved();onClose();}
  }
  const inp={padding:'9px 12px',background:T.inputBg,border:`1px solid ${T.inputBorder}`,borderRadius:8,color:T.text,fontSize:13,outline:'none',width:'100%',fontFamily:'inherit'};
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.8)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200,padding:16}} onClick={onClose}>
      <div style={{background:T.modalBg,border:`1px solid ${T.glassBorder}`,borderRadius:16,padding:28,width:'100%',maxWidth:520,maxHeight:'90vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          <h2 style={{fontSize:18,fontWeight:700,color:T.text}}>{existing?'Edit':'Create'} Strategy</h2>
          <button onClick={onClose} style={{background:'transparent',border:'none',color:T.textMuted,fontSize:22,cursor:'pointer'}}>✕</button>
        </div>
        <form onSubmit={handleSave}>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div><label style={{display:'block',fontSize:10,color:T.textMuted,textTransform:'uppercase',letterSpacing:'0.06em',fontWeight:600,marginBottom:5}}>Strategy Name</label><input style={inp} type="text" placeholder="e.g. VWAP Reclaim, Double Bottom" value={name} onChange={e=>setName(e.target.value)} required/></div>
            <div><label style={{display:'block',fontSize:10,color:T.textMuted,textTransform:'uppercase',letterSpacing:'0.06em',fontWeight:600,marginBottom:5}}>Description</label><textarea style={{...inp,height:60,resize:'vertical'}} placeholder="Briefly describe this strategy..." value={desc} onChange={e=>setDesc(e.target.value)}/></div>
            <div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                <label style={{fontSize:10,color:T.textMuted,textTransform:'uppercase',letterSpacing:'0.06em',fontWeight:600}}>Your Rules</label>
                <button type="button" onClick={addRule} style={{background:T.accent,color:'#000',border:'none',borderRadius:6,padding:'4px 12px',fontSize:12,fontWeight:700,cursor:'pointer'}}>+ Add Rule</button>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {rules.map((rule,i)=>(
                  <div key={i} style={{display:'flex',gap:8}}>
                    <input style={{...inp,flex:1}} type="text" placeholder={`Rule ${i+1}: e.g. Wait for VWAP reclaim`} value={rule} onChange={e=>updateRule(i,e.target.value)}/>
                    {rules.length>1&&<button type="button" onClick={()=>removeRule(i)} style={{background:T.redBg,border:'none',color:T.red,borderRadius:6,padding:'4px 10px',cursor:'pointer',fontSize:14}}>✕</button>}
                  </div>
                ))}
              </div>
            </div>
          </div>
          {error&&<p style={{color:T.red,fontSize:13,marginTop:12}}>{error}</p>}
          <div style={{display:'flex',gap:10,marginTop:20}}>
            <button type="button" onClick={onClose} style={{flex:1,padding:'12px',background:'transparent',color:T.textMuted,border:`1px solid ${T.glassBorder}`,borderRadius:10,fontSize:15,cursor:'pointer'}}>Cancel</button>
            <button type="submit" style={{flex:2,padding:'12px',background:T.accent,color:'#000',border:'none',borderRadius:10,fontSize:15,fontWeight:700,cursor:'pointer'}} disabled={saving}>{saving?'Saving...':'Save Strategy'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── DASHBOARD (Overview) ──────────────────────────────────────────────────────
function DashboardTab({ trades, strategies, T, d, onAddTrade }) {
  const totalPnl=trades.reduce((s,t)=>s+(parseFloat(t.pnl)||0),0);
  const wins=trades.filter(t=>t.outcome==='WIN').length;
  const losses=trades.filter(t=>t.outcome==='LOSS').length;
  const winRate=trades.length?Math.round(wins/trades.length*100):0;
  const avgWin=wins?trades.filter(t=>t.outcome==='WIN').reduce((s,t)=>s+parseFloat(t.pnl||0),0)/wins:0;
  const avgLoss=losses?trades.filter(t=>t.outcome==='LOSS').reduce((s,t)=>s+parseFloat(t.pnl||0),0)/losses:0;
  const bestTrade=trades.reduce((b,t)=>parseFloat(t.pnl||0)>parseFloat(b?.pnl||0)?t:b,null);
  const worstTrade=trades.reduce((w,t)=>parseFloat(t.pnl||0)<parseFloat(w?.pnl||0)?t:w,null);
  const recentTrades=trades.slice(0,5);
  const equityCurve=useMemo(()=>{let c=0;return[...trades].reverse().map(t=>{c+=parseFloat(t.pnl)||0;return c;});},[trades]);

  // This week P&L
  const thisWeek=useMemo(()=>{
    const r=getDateRange('this_week');
    return trades.filter(t=>{const d=new Date(t.date+'T00:00:00');return r&&d>=r.from&&d<=r.to;}).reduce((s,t)=>s+(parseFloat(t.pnl)||0),0);
  },[trades]);

  // Sorted = [...trades].reverse()
  let streak=0,streakType='';
  for(const t of trades){if(streak===0){streakType=t.outcome;streak=1;}else if(t.outcome===streakType)streak++;else break;}

  const card={background:T.glassBg,backdropFilter:'blur(24px)',WebkitBackdropFilter:'blur(24px)',border:`1px solid ${T.glassBorder}`,borderRadius:16,padding:20,boxShadow:T.cardShadow};

  return (
    <div style={{display:'flex',flexDirection:'column',gap:20}}>
      {/* Welcome */}
      <div style={{...card,background:`linear-gradient(135deg,${T.accent}12,${T.accent}04)`,border:`1px solid ${T.accent}30`}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
          <div>
            <h2 style={{fontSize:22,fontWeight:800,color:T.text,marginBottom:4}}>Welcome back 👋</h2>
            <p style={{color:T.textMuted,fontSize:14}}>{new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</p>
          </div>
          <div style={{display:'flex',gap:10}}>
            <button onClick={onAddTrade} style={{padding:'10px 20px',borderRadius:10,border:'none',background:T.accent,color:'#000',fontSize:14,fontWeight:700,cursor:'pointer'}}>+ Log Trade</button>
          </div>
        </div>
      </div>

      {/* Key stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:12}}>
        {[
          {label:'Total P&L',value:`${totalPnl>=0?'+':''}$${totalPnl.toFixed(2)}`,color:totalPnl>=0?T.green:T.red},
          {label:'This Week',value:`${thisWeek>=0?'+':''}$${thisWeek.toFixed(2)}`,color:thisWeek>=0?T.green:T.red},
          {label:'Win Rate',value:`${winRate}%`,color:T.text},
          {label:'Total Trades',value:trades.length,color:T.text},
          {label:'Avg Win',value:`+$${avgWin.toFixed(2)}`,color:T.green},
          {label:'Avg Loss',value:`$${avgLoss.toFixed(2)}`,color:T.red},
          {label:'Best Trade',value:`+$${parseFloat(bestTrade?.pnl||0).toFixed(2)}`,color:T.green,sub:bestTrade?.ticker},
          {label:'Streak',value:`${streak} ${streakType==='WIN'?'W 🔥':streakType==='LOSS'?'L':''}`,color:streakType==='WIN'?T.green:streakType==='LOSS'?T.red:T.text},
        ].map(s=>(
          <div key={s.label} style={card}>
            <div style={{fontSize:10,color:T.textMuted,textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:5}}>{s.label}</div>
            <div style={{fontSize:20,fontWeight:800,color:s.color,fontVariantNumeric:'tabular-nums'}}>{s.value}</div>
            {s.sub&&<div style={{fontSize:11,color:T.accent,marginTop:2}}>{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* Trading Edge + R-Multiple */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        {/* Trading Edge */}
        <div style={{...card,background:d?'linear-gradient(135deg,rgba(0,196,180,0.08),rgba(0,196,180,0.02))':'linear-gradient(135deg,rgba(0,196,180,0.06),rgba(255,255,255,0.8))',border:`1px solid ${T.accent}33`}}>
          <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:4}}>⚡ Trading Edge</div>
          <div style={{fontSize:11,color:T.textMuted,marginBottom:16}}>Performance Metrics</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            {[
              {label:'Win Rate',value:`${winRate}%`,sub:`${wins}W · ${losses}L`,color:winRate>=60?T.green:winRate>=50?T.gold:T.red},
              {label:'Profit Factor',value:losses>0?((trades.filter(t=>t.outcome==='WIN').reduce((s,t)=>s+Math.abs(parseFloat(t.pnl||0)),0))/(trades.filter(t=>t.outcome==='LOSS').reduce((s,t)=>s+Math.abs(parseFloat(t.pnl||0)),1)||1)).toFixed(2):'∞',sub:'Win $ / Loss $',color:T.purple},
              {label:'Avg Win',value:`+$${avgWin.toFixed(2)}`,sub:'Per winning trade',color:T.green},
              {label:'Avg Loss',value:`$${avgLoss.toFixed(2)}`,sub:'Per losing trade',color:T.red},
              {label:'Best Trade',value:`+$${parseFloat(bestTrade?.pnl||0).toFixed(2)}`,sub:bestTrade?.ticker||'—',color:T.green},
              {label:'Worst Trade',value:`-$${Math.abs(parseFloat(worstTrade?.pnl||0)).toFixed(2)}`,sub:worstTrade?.ticker||'—',color:T.red},
            ].map(m=>(
              <div key={m.label} style={{background:T.glassBg,backdropFilter:'blur(10px)',border:`1px solid ${T.glassBorder}`,borderRadius:10,padding:'12px 14px'}}>
                <div style={{fontSize:10,color:T.textMuted,textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:5}}>{m.label}</div>
                <div style={{fontSize:18,fontWeight:800,color:m.color,fontVariantNumeric:'tabular-nums'}}>{m.value}</div>
                <div style={{fontSize:10,color:T.textMuted,marginTop:3}}>{m.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* R-Multiple Analysis */}
        <div style={{...card,background:d?'linear-gradient(135deg,rgba(139,92,246,0.08),rgba(139,92,246,0.02))':'linear-gradient(135deg,rgba(139,92,246,0.06),rgba(255,255,255,0.8))',border:`1px solid ${T.purple}33`}}>
          <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:4}}>🎯 R-Multiple Analysis</div>
          <div style={{fontSize:11,color:T.textMuted,marginBottom:16}}>Risk Management Metrics</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            {(()=>{
              const winTrades = trades.filter(t=>t.outcome==='WIN'&&t.pnl);
              const lossTrades = trades.filter(t=>t.outcome==='LOSS'&&t.pnl);
              const avgWinAmt = winTrades.length?winTrades.reduce((s,t)=>s+parseFloat(t.pnl||0),0)/winTrades.length:0;
              const avgLossAmt = lossTrades.length?Math.abs(lossTrades.reduce((s,t)=>s+parseFloat(t.pnl||0),0)/lossTrades.length):0;
              const rMultiple = avgLossAmt>0?(avgWinAmt/avgLossAmt).toFixed(2):'—';
              const expectancy = trades.length?((winRate/100)*avgWinAmt - ((100-winRate)/100)*avgLossAmt).toFixed(2):'—';
              const maxWin = winTrades.length?Math.max(...winTrades.map(t=>parseFloat(t.pnl||0))):0;
              const maxLoss = lossTrades.length?Math.abs(Math.min(...lossTrades.map(t=>parseFloat(t.pnl||0)))):0;
              return [
                {label:'R-Multiple',value:rMultiple==='—'?'—':`${rMultiple}R`,sub:'Avg win / Avg loss',color:parseFloat(rMultiple)>=2?T.green:parseFloat(rMultiple)>=1?T.gold:T.red},
                {label:'Expectancy',value:expectancy==='—'?'—':`$${expectancy}`,sub:'Per trade expected',color:parseFloat(expectancy)>0?T.green:T.red},
                {label:'Largest Win',value:`+$${maxWin.toFixed(2)}`,sub:'Single best trade',color:T.green},
                {label:'Largest Loss',value:`-$${maxLoss.toFixed(2)}`,sub:'Single worst trade',color:T.red},
                {label:'Total Commissions',value:`$${trades.reduce((s,t)=>s+(parseFloat(t.commission)||0),0).toFixed(2)}`,sub:'Trading costs',color:T.gold},
                {label:'Net P&L',value:`${totalPnl>=0?'+':''}$${totalPnl.toFixed(2)}`,sub:'After commissions',color:totalPnl>=0?T.green:T.red},
              ].map(m=>(
                <div key={m.label} style={{background:T.glassBg,backdropFilter:'blur(10px)',border:`1px solid ${T.glassBorder}`,borderRadius:10,padding:'12px 14px'}}>
                  <div style={{fontSize:10,color:T.textMuted,textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:5}}>{m.label}</div>
                  <div style={{fontSize:18,fontWeight:800,color:m.color,fontVariantNumeric:'tabular-nums'}}>{m.value}</div>
                  <div style={{fontSize:10,color:T.textMuted,marginTop:3}}>{m.sub}</div>
                </div>
              ));
            })()}
          </div>
        </div>
      </div>

      {/* Equity curve + Recent trades */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        <div style={card}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <div style={{fontSize:13,fontWeight:600,color:T.text}}>Equity Curve</div>
            <div style={{display:'flex',gap:4}}>
              {[['1W','this_week'],['1M','this_month'],['3M','last3m'],['ALL','all']].map(([label,range])=>(
                <button key={label} style={{padding:'3px 8px',borderRadius:5,border:`1px solid ${T.glassBorder}`,background:T.glassBg,color:T.textMuted,fontSize:10,cursor:'pointer',fontWeight:500}}>{label}</button>
              ))}
            </div>
          </div>
          <MiniLineChart data={equityCurve} color={totalPnl>=0?T.green:T.red} height={80}/>
          <div style={{display:'flex',justifyContent:'space-between',marginTop:6}}>
            <span style={{fontSize:10,color:T.textMuted}}>Start</span>
            <span style={{fontSize:10,color:totalPnl>=0?T.green:T.red,fontWeight:700}}>{totalPnl>=0?'+':''}${totalPnl.toFixed(2)}</span>
            <span style={{fontSize:10,color:T.textMuted}}>Today</span>
          </div>
        </div>

        <div style={card}>
          <div style={{fontSize:13,fontWeight:600,color:T.text,marginBottom:12}}>Recent Trades</div>
          {recentTrades.length===0?(
            <div style={{textAlign:'center',padding:'20px 0',color:T.textMuted,fontSize:13}}>No trades yet</div>
          ):(
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {recentTrades.map(t=>(
                <div key={t.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 12px',background:T.inputBg,borderRadius:8,border:`1px solid ${T.inputBorder}`}}>
                  <div style={{display:'flex',gap:10,alignItems:'center'}}>
                    <span style={{fontSize:13,fontWeight:700,color:T.accent}}>{t.ticker}</span>
                    <span style={{fontSize:10,color:T.textMuted}}>{t.date}</span>
                  </div>
                  <span style={{fontSize:13,fontWeight:700,color:parseFloat(t.pnl)>=0?T.green:T.red}}>{parseFloat(t.pnl)>=0?'+':''}${parseFloat(t.pnl||0).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* P&L Calendar */}
      <div style={card}>
        <div style={{fontSize:13,fontWeight:600,color:T.text,marginBottom:16}}>P&L Calendar</div>
        <PnlCalendar trades={trades} T={T}/>
      </div>
    </div>
  );
}

// ── TRADES TAB ────────────────────────────────────────────────────────────────
function TradesTab({ trades, T, strategies, onAddTrade, onNoTrade, onDelete }) {
  const [assetFilter,setAssetFilter]=useState('All');
  const [datePreset,setDatePreset]=useState('all');
  const [filterOutcome,setFilterOutcome]=useState('all');
  const [showFilters,setShowFilters]=useState(false);
  const [customFrom,setCustomFrom]=useState('');
  const [customTo,setCustomTo]=useState('');
  const [showNews,setShowNews]=useState(false);

  const filtered=useMemo(()=>trades.filter(t=>{
    if(assetFilter!=='All'&&t.asset_type!==assetFilter.toLowerCase())return false;
    if(filterOutcome!=='all'&&t.outcome!==filterOutcome)return false;
    const d2=new Date(t.date+'T00:00:00');
    if(datePreset==='custom'){if(customFrom&&d2<new Date(customFrom))return false;if(customTo&&d2>new Date(customTo))return false;}
    else if(datePreset!=='all'){const r=getDateRange(datePreset);if(r&&(d2<r.from||d2>r.to))return false;}
    return true;
  }),[trades,assetFilter,filterOutcome,datePreset,customFrom,customTo]);

  const stratMap=useMemo(()=>{const m={};strategies.forEach(s=>m[s.id]=s.name);return m;},[strategies]);
  const uniqueTickers=[...new Set(trades.map(t=>t.ticker).filter(Boolean))];

  return (
    <div style={{display:'flex',gap:16}}>
      <div style={{flex:1,minWidth:0}}>
        {/* Asset tabs + toolbar */}
        <div style={{display:'flex',gap:4,marginBottom:14,flexWrap:'wrap',alignItems:'center'}}>
          {ASSET_TYPES.map(type=>(
            <button key={type} onClick={()=>setAssetFilter(type)} style={{padding:'7px 16px',borderRadius:20,border:`1px solid ${assetFilter===type?T.accent:T.glassBorder}`,background:assetFilter===type?T.accent:T.glassBg,color:assetFilter===type?'#000':T.textMuted,fontSize:13,fontWeight:assetFilter===type?700:400,cursor:'pointer'}}>{type}</button>
          ))}
          <div style={{marginLeft:'auto',display:'flex',gap:8}}>
            <button onClick={()=>setShowNews(!showNews)} style={{padding:'7px 14px',borderRadius:8,border:`1px solid ${showNews?T.accent:T.glassBorder}`,background:showNews?T.accent:T.glassBg,color:showNews?'#000':T.textMuted,fontSize:13,cursor:'pointer'}}>📰 News</button>
            <button onClick={()=>setShowFilters(!showFilters)} style={{padding:'7px 14px',borderRadius:8,border:`1px solid ${T.glassBorder}`,background:T.glassBg,color:T.textMuted,fontSize:13,cursor:'pointer'}}>⚙ Filters</button>
            <button onClick={onNoTrade} style={{padding:'7px 14px',borderRadius:8,border:`1px solid ${T.glassBorder}`,background:T.glassBg,color:T.textMuted,fontSize:13,cursor:'pointer'}}>🚫 No Trade</button>
            <button onClick={onAddTrade} style={{padding:'7px 16px',borderRadius:8,border:'none',background:T.accent,color:'#000',fontSize:13,fontWeight:700,cursor:'pointer'}}>+ Add Trade</button>
          </div>
        </div>

        {/* Filters */}
        {showFilters&&(
          <div style={{background:T.glassBg,backdropFilter:'blur(20px)',border:`1px solid ${T.glassBorder}`,borderRadius:12,padding:14,marginBottom:14,display:'flex',gap:16,flexWrap:'wrap',alignItems:'flex-start'}}>
            <div>
              <div style={{fontSize:10,color:T.textMuted,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:6,fontWeight:600}}>Date</div>
              <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                {[['all','All'],['today','Today'],['this_week','Week'],['this_month','Month'],['last_month','Last Mo'],['custom','Custom']].map(([val,label])=>(
                  <button key={val} onClick={()=>setDatePreset(val)} style={{padding:'4px 10px',borderRadius:16,border:`1px solid ${datePreset===val?T.accent:T.inputBorder}`,background:datePreset===val?T.accent:T.inputBg,color:datePreset===val?'#000':T.textMuted,fontSize:12,cursor:'pointer'}}>{label}</button>
                ))}
              </div>
              {datePreset==='custom'&&(
                <div style={{display:'flex',gap:8,marginTop:8,alignItems:'center'}}>
                  <input style={{padding:'6px 10px',background:T.inputBg,border:`1px solid ${T.inputBorder}`,borderRadius:6,color:T.text,fontSize:12}} type="date" value={customFrom} onChange={e=>setCustomFrom(e.target.value)}/>
                  <span style={{color:T.textMuted}}>→</span>
                  <input style={{padding:'6px 10px',background:T.inputBg,border:`1px solid ${T.inputBorder}`,borderRadius:6,color:T.text,fontSize:12}} type="date" value={customTo} onChange={e=>setCustomTo(e.target.value)}/>
                </div>
              )}
            </div>
            <div>
              <div style={{fontSize:10,color:T.textMuted,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:6,fontWeight:600}}>Outcome</div>
              <div style={{display:'flex',gap:4}}>
                {[['all','All'],['WIN','Win'],['LOSS','Loss'],['BREAKEVEN','B/E']].map(([val,label])=>(
                  <button key={val} onClick={()=>setFilterOutcome(val)} style={{padding:'4px 10px',borderRadius:16,border:`1px solid ${filterOutcome===val?T.accent:T.inputBorder}`,background:filterOutcome===val?T.accent:T.inputBg,color:filterOutcome===val?'#000':T.textMuted,fontSize:12,cursor:'pointer'}}>{label}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        {filtered.length===0?(
          <div style={{textAlign:'center',padding:'60px 0'}}>
            <div style={{fontSize:40,marginBottom:12}}>📋</div>
            <p style={{color:T.text,fontWeight:600,fontSize:16,marginBottom:6}}>No trades found</p>
            <p style={{color:T.textMuted,fontSize:13}}>Click "+ Add Trade" to log your first trade</p>
          </div>
        ):(
          <div style={{overflowX:'auto',background:T.glassBg,backdropFilter:'blur(24px)',WebkitBackdropFilter:'blur(24px)',border:`1px solid ${T.glassBorder}`,borderRadius:16,boxShadow:T.cardShadow}}>
            <table style={{width:'100%',borderCollapse:'collapse',minWidth:700}}>
              <thead>
                <tr style={{borderBottom:`1px solid ${T.glassBorder}`}}>
                  {['Date','Ticker','Dir','Type','Qty','Entry','Exit','P&L','Setup','Result','Notes',''].map(h=>(
                    <th key={h} style={{textAlign:'left',padding:'10px 12px',color:T.textMuted,fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.07em',whiteSpace:'nowrap'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(t=>(
                  <tr key={t.id} className="trow" style={{borderBottom:`1px solid ${T.tableBorder}`}}>
                    <td style={{padding:'11px 12px'}}>
                      <div style={{fontSize:12,color:T.text,fontWeight:500}}>{t.date}</div>
                      <div style={{fontSize:10,color:T.textMuted}}>{DAYS[new Date(t.date+'T00:00:00').getDay()]}</div>
                    </td>
                    <td style={{padding:'11px 12px',fontSize:13,fontWeight:700,color:T.accent}}>{t.ticker}</td>
                    <td style={{padding:'11px 12px'}}><span style={{padding:'2px 7px',borderRadius:4,fontSize:10,fontWeight:700,background:t.direction==='LONG'?T.greenBg:T.redBg,color:t.direction==='LONG'?T.green:T.red}}>{t.direction||'—'}</span></td>
                    <td style={{padding:'11px 12px'}}>{t.option_type?<span style={{padding:'2px 7px',borderRadius:4,fontSize:10,fontWeight:700,background:t.option_type==='CALL'?T.greenBg:T.redBg,color:t.option_type==='CALL'?T.green:T.red}}>{t.option_type}</span>:<span style={{color:T.textFaint}}>—</span>}</td>
                    <td style={{padding:'11px 12px',fontSize:12,color:T.text}}>{t.contracts||t.shares||t.lots||<span style={{color:T.textFaint}}>—</span>}</td>
                    <td style={{padding:'11px 12px',fontSize:12,color:T.text}}>{t.entry_price?`$${t.entry_price}`:<span style={{color:T.textFaint}}>—</span>}</td>
                    <td style={{padding:'11px 12px',fontSize:12,color:T.text}}>{t.exit_price?`$${t.exit_price}`:<span style={{color:T.textFaint}}>—</span>}</td>
                    <td style={{padding:'11px 12px',fontSize:13,fontWeight:700,color:parseFloat(t.pnl)>=0?T.green:T.red,fontVariantNumeric:'tabular-nums'}}>{parseFloat(t.pnl)>=0?'+':''}${parseFloat(t.pnl||0).toFixed(2)}</td>
                    <td style={{padding:'11px 12px',fontSize:11,color:T.textMuted,maxWidth:100,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.setup||<span style={{color:T.textFaint}}>—</span>}</td>
                    <td style={{padding:'11px 12px'}}><span style={{padding:'2px 7px',borderRadius:4,fontSize:10,fontWeight:700,background:t.outcome==='WIN'?T.greenBg:t.outcome==='LOSS'?T.redBg:'rgba(107,114,128,0.12)',color:t.outcome==='WIN'?T.green:t.outcome==='LOSS'?T.red:T.textMuted}}>{t.outcome}</span></td>
                    <td style={{padding:'11px 12px',fontSize:11,color:T.textMuted,maxWidth:120,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.notes||<span style={{color:T.textFaint}}>—</span>}</td>
                    <td style={{padding:'11px 12px'}}>
                      <button onClick={()=>onDelete(t.id)} style={{background:T.redBg,border:'none',borderRadius:6,padding:'4px 8px',color:T.red,cursor:'pointer',fontSize:11,fontWeight:600}} title="Delete trade">🗑</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* News Panel */}
      {showNews&&(
        <div style={{width:300,flexShrink:0,background:T.glassBg,backdropFilter:'blur(24px)',WebkitBackdropFilter:'blur(24px)',border:`1px solid ${T.glassBorder}`,borderRadius:16,padding:16,maxHeight:'80vh',overflowY:'auto'}}>
          <NewsPanel T={T} tickers={uniqueTickers}/>
        </div>
      )}
    </div>
  );
}

// ── P&L TAB ───────────────────────────────────────────────────────────────────
function PnlTab({ trades, T }) {
  const equityCurve=useMemo(()=>{let c=0;return[...trades].reverse().map(t=>{c+=parseFloat(t.pnl)||0;return c;});},[trades]);
  const byDay=useMemo(()=>{const m={Monday:0,Tuesday:0,Wednesday:0,Thursday:0,Friday:0};trades.forEach(t=>{const day=DAYS[new Date(t.date+'T00:00:00').getDay()];if(m[day]!==undefined)m[day]+=parseFloat(t.pnl)||0;});return Object.entries(m).map(([label,value])=>({label:label.slice(0,3),value:parseFloat(value.toFixed(2))}));},[trades]);
  const byTicker=useMemo(()=>{const m={};trades.forEach(t=>{m[t.ticker]=(m[t.ticker]||0)+(parseFloat(t.pnl)||0);});return Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([label,value])=>({label,value:parseFloat(value.toFixed(2))}));},[trades]);
  const byMonth=useMemo(()=>{const m={};trades.forEach(t=>{const key=t.date?.slice(0,7);if(key)m[key]=(m[key]||0)+(parseFloat(t.pnl)||0);});return Object.entries(m).sort().slice(-6).map(([key,value])=>({label:key.slice(5),value:parseFloat(value.toFixed(2))}));},[trades]);
  const wins=trades.filter(t=>t.outcome==='WIN').length;
  const losses=trades.filter(t=>t.outcome==='LOSS').length;
  const breakeven=trades.filter(t=>t.outcome==='BREAKEVEN').length;
  const totalPnl=trades.reduce((s,t)=>s+(parseFloat(t.pnl)||0),0);
  const bestTrade=trades.reduce((b,t)=>parseFloat(t.pnl||0)>parseFloat(b?.pnl||0)?t:b,null);
  const worstTrade=trades.reduce((w,t)=>parseFloat(t.pnl||0)<parseFloat(w?.pnl||0)?t:w,null);
  const card={background:T.glassBg,backdropFilter:'blur(24px)',WebkitBackdropFilter:'blur(24px)',border:`1px solid ${T.glassBorder}`,borderRadius:16,padding:20,boxShadow:T.cardShadow};
  return (
    <div style={{display:'flex',flexDirection:'column',gap:20}}>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:12}}>
        {[{label:'Net P&L',value:`${totalPnl>=0?'+':''}$${totalPnl.toFixed(2)}`,color:totalPnl>=0?T.green:T.red},{label:'Best Trade',value:`+$${parseFloat(bestTrade?.pnl||0).toFixed(2)}`,sub:bestTrade?.ticker,color:T.green},{label:'Worst Trade',value:`-$${Math.abs(parseFloat(worstTrade?.pnl||0)).toFixed(2)}`,sub:worstTrade?.ticker,color:T.red},{label:'Profit Factor',value:losses>0?((wins/trades.length)/(losses/trades.length)).toFixed(2):'∞',color:T.accent},{label:'Avg Trade',value:`${totalPnl>=0?'+':''}$${(totalPnl/trades.length||0).toFixed(2)}`,color:T.text}].map(s=>(
          <div key={s.label} style={card}><div style={{fontSize:10,color:T.textMuted,textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:6}}>{s.label}</div><div style={{fontSize:22,fontWeight:800,color:s.color,fontVariantNumeric:'tabular-nums'}}>{s.value}</div>{s.sub&&<div style={{fontSize:12,color:T.accent,marginTop:2}}>{s.sub}</div>}</div>
        ))}
      </div>
      <div style={card}><div style={{fontSize:13,fontWeight:600,color:T.text,marginBottom:12}}>Equity Curve</div><MiniLineChart data={equityCurve} color={totalPnl>=0?T.green:T.red} height={80}/><div style={{display:'flex',justifyContent:'space-between',marginTop:8}}><span style={{fontSize:11,color:T.textMuted}}>Start</span><span style={{fontSize:11,color:T.textMuted}}>Today</span></div></div>
      <div style={card}><div style={{fontSize:13,fontWeight:600,color:T.text,marginBottom:16}}>P&L Calendar</div><PnlCalendar trades={trades} T={T}/></div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        <div style={card}><div style={{fontSize:13,fontWeight:600,color:T.text,marginBottom:12}}>Win/Loss Breakdown</div><DonutChart wins={wins} losses={losses} breakeven={breakeven} T={T}/></div>
        <div style={card}><div style={{fontSize:13,fontWeight:600,color:T.text,marginBottom:4}}>P&L by Day of Week</div><BarChart data={byDay} T={T}/></div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        <div style={card}><div style={{fontSize:13,fontWeight:600,color:T.text,marginBottom:4}}>P&L by Ticker</div><BarChart data={byTicker} T={T}/></div>
        <div style={card}><div style={{fontSize:13,fontWeight:600,color:T.text,marginBottom:4}}>P&L by Month</div><BarChart data={byMonth} T={T}/></div>
      </div>
    </div>
  );
}

// ── STRATEGIES TAB ────────────────────────────────────────────────────────────
function StrategiesTab({ trades, strategies, T, session, onRefresh }) {
  const [showModal,setShowModal]=useState(false);
  const [editing,setEditing]=useState(null);
  async function deleteStrategy(id){if(!confirm('Delete this strategy?'))return;const sb=getSupabase();await sb.from('strategies').delete().eq('id',id);onRefresh();}
  const stratStats=useMemo(()=>strategies.map(s=>{const st=trades.filter(t=>t.strategy_id===s.id);const wins=st.filter(t=>t.outcome==='WIN').length;const pnl=st.reduce((sum,t)=>sum+(parseFloat(t.pnl)||0),0);return{...s,tradeCount:st.length,wins,pnl,winRate:st.length?Math.round(wins/st.length*100):0};}), [strategies,trades]);
  const rulesBreakdown=useMemo(()=>{
    const followed=trades.filter(t=>t.rules_followed==='all');
    const some=trades.filter(t=>t.rules_followed==='some');
    const none=trades.filter(t=>!t.rules_followed||t.rules_followed==='none');
    const pnl=arr=>arr.reduce((s,t)=>s+(parseFloat(t.pnl)||0),0);
    const wr=arr=>arr.length?Math.round(arr.filter(t=>t.outcome==='WIN').length/arr.length*100):0;
    return[{label:'✅ All Rules Followed',trades:followed.length,winRate:wr(followed),pnl:pnl(followed).toFixed(2),color:T.green},{label:'⚠️ Some Rules Followed',trades:some.length,winRate:wr(some),pnl:pnl(some).toFixed(2),color:'#f59e0b'},{label:'❌ Rules Ignored',trades:none.length,winRate:wr(none),pnl:pnl(none).toFixed(2),color:T.red}];
  },[trades,T]);
  const card={background:T.glassBg,backdropFilter:'blur(24px)',WebkitBackdropFilter:'blur(24px)',border:`1px solid ${T.glassBorder}`,borderRadius:16,padding:20,boxShadow:T.cardShadow};
  return (
    <div>
      {showModal&&<StrategyModal T={T} session={session} existing={editing} onClose={()=>{setShowModal(false);setEditing(null);}} onSaved={onRefresh}/>}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <h3 style={{fontSize:16,fontWeight:600,color:T.text}}>My Strategies</h3>
        <button onClick={()=>setShowModal(true)} style={{padding:'9px 18px',borderRadius:8,border:'none',background:T.accent,color:'#000',fontSize:13,fontWeight:700,cursor:'pointer'}}>+ New Strategy</button>
      </div>
      <div style={{...card,marginBottom:20}}>
        <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:4}}>Rules Followed vs P&L</div>
        <div style={{fontSize:12,color:T.textMuted,marginBottom:16}}>The data doesn't lie — see what following your rules is worth in dollars.</div>
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {rulesBreakdown.map(row=>(
            <div key={row.label} style={{background:T.inputBg,border:`1px solid ${T.inputBorder}`,borderRadius:10,padding:'14px 16px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
              <div><div style={{fontSize:14,fontWeight:600,color:T.text,marginBottom:4}}>{row.label}</div><div style={{fontSize:12,color:T.textMuted}}>{row.trades} trades · {row.winRate}% win rate</div></div>
              <div style={{fontSize:22,fontWeight:800,color:row.color,fontVariantNumeric:'tabular-nums'}}>{parseFloat(row.pnl)>=0?'+':''}${Math.abs(parseFloat(row.pnl)).toFixed(2)}</div>
            </div>
          ))}
        </div>
      </div>
      {strategies.length===0?(
        <div style={{...card,textAlign:'center',padding:'48px 24px'}}>
          <div style={{fontSize:40,marginBottom:12}}>📋</div>
          <p style={{color:T.text,fontWeight:600,fontSize:16,marginBottom:8}}>No strategies yet</p>
          <p style={{color:T.textMuted,fontSize:13,marginBottom:20}}>Create your strategy and define your rules. Tag trades to it and see the P&L difference.</p>
          <button onClick={()=>setShowModal(true)} style={{padding:'10px 24px',borderRadius:8,border:'none',background:T.accent,color:'#000',fontSize:14,fontWeight:700,cursor:'pointer'}}>Create First Strategy</button>
        </div>
      ):(
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:16}}>
          {stratStats.map(s=>(
            <div key={s.id} style={card}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
                <div><div style={{fontSize:15,fontWeight:700,color:T.text,marginBottom:4}}>{s.name}</div>{s.description&&<div style={{fontSize:12,color:T.textMuted,lineHeight:1.5}}>{s.description}</div>}</div>
                <div style={{display:'flex',gap:6}}>
                  <button onClick={()=>{setEditing(s);setShowModal(true);}} style={{background:T.glassBg,border:`1px solid ${T.glassBorder}`,borderRadius:6,padding:'4px 8px',color:T.textMuted,cursor:'pointer',fontSize:12}}>Edit</button>
                  <button onClick={()=>deleteStrategy(s.id)} style={{background:T.redBg,border:'none',borderRadius:6,padding:'4px 8px',color:T.red,cursor:'pointer',fontSize:12}}>Delete</button>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:12}}>
                {[{label:'Trades',value:s.tradeCount},{label:'Win Rate',value:`${s.winRate}%`},{label:'P&L',value:`${s.pnl>=0?'+':''}$${s.pnl.toFixed(2)}`,color:s.pnl>=0?T.green:T.red}].map(m=>(
                  <div key={m.label} style={{background:T.inputBg,borderRadius:8,padding:'10px 8px',textAlign:'center'}}><div style={{fontSize:10,color:T.textMuted,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:4}}>{m.label}</div><div style={{fontSize:16,fontWeight:700,color:m.color||T.text}}>{m.value}</div></div>
                ))}
              </div>
              {s.rules&&s.rules.length>0&&<div>{<div style={{fontSize:10,color:T.textMuted,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:8,fontWeight:600}}>Rules</div>}{s.rules.map((rule,i)=>(<div key={i} style={{display:'flex',gap:8,marginBottom:6,fontSize:12,color:T.textMuted}}><span style={{color:T.accent,flexShrink:0,fontWeight:700}}>{i+1}.</span><span>{rule}</span></div>))}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── DAILY JOURNAL TAB ─────────────────────────────────────────────────────────
const DEFAULT_TASKS = {
  premarket: [
    'Review market conditions (futures, VIX)',
    'Check economic calendar for news events',
    'Identify key support/resistance levels',
    'Define trading plan for the day',
    'Set max loss limit for the day',
  ],
  session: [
    'Follow entry checklist before every trade',
    'Set stop loss before entering position',
    'Do not revenge trade after a loss',
  ],
  postmarket: [
    'Review all trades taken today',
    'Tag setups and mistakes',
    'Document lessons learned',
    'Update trade journal notes',
  ],
};

function DailyJournalTab({ T, trades, session }) {
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [journalTab, setJournalTab] = useState('premarket');
  const [preMarketNotes, setPreMarketNotes] = useState('');
  const [postMarketNotes, setPostMarketNotes] = useState('');
  const [checkedTasks, setCheckedTasks] = useState({});
  const [saved, setSaved] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);

  // Session timer
  useEffect(() => {
    let timer;
    if (sessionStarted) {
      timer = setInterval(() => setSessionTime(t => t + 1), 1000);
    }
    return () => clearInterval(timer);
  }, [sessionStarted]);

  const formatTime = (s) => {
    const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = s%60;
    return h > 0 ? `${h}h ${m}m ${sec}s` : m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  function toggleTask(section, i) {
    const key = `${section}-${i}`;
    setCheckedTasks(prev => ({ ...prev, [key]: !prev[key] }));
  }

  const totalTasks = Object.values(DEFAULT_TASKS).flat().length;
  const completedTasks = Object.values(checkedTasks).filter(Boolean).length;

  // Today's trades
  const todayTrades = trades.filter(t => t.date === selectedDate);
  const todayPnl = todayTrades.reduce((s,t) => s + (parseFloat(t.pnl)||0), 0);
  const todayWins = todayTrades.filter(t => t.outcome === 'WIN').length;

  // Activity heatmap data - last 12 weeks
  const heatmapData = useMemo(() => {
    const weeks = [];
    const now = new Date();
    for (let w = 11; w >= 0; w--) {
      const week = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(now);
        date.setDate(now.getDate() - (w * 7) - (now.getDay() - d));
        const dateStr = date.toISOString().split('T')[0];
        const dayTrades = trades.filter(t => t.date === dateStr);
        const pnl = dayTrades.reduce((s,t) => s + (parseFloat(t.pnl)||0), 0);
        week.push({ date: dateStr, trades: dayTrades.length, pnl, isToday: dateStr === today });
      }
      weeks.push(week);
    }
    return weeks;
  }, [trades, today]);

  // Streak
  let streak = 0;
  const sortedDates = [...new Set(trades.map(t=>t.date))].sort().reverse();
  for (const date of sortedDates) {
    const dayTrades = trades.filter(t=>t.date===date);
    if (dayTrades.length > 0) streak++;
    else break;
  }

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const card = { background:T.glassBg, backdropFilter:'blur(24px)', border:`1px solid ${T.glassBorder}`, borderRadius:16, padding:20, boxShadow:T.cardShadow };
  const inp = { padding:'10px 14px', background:T.inputBg, border:`1px solid ${T.inputBorder}`, borderRadius:10, color:T.text, fontSize:13, outline:'none', width:'100%', fontFamily:'inherit', resize:'vertical' };

  return (
    <div style={{display:'flex',flexDirection:'column',gap:20}}>

      {/* Today Summary Bar */}
      <div style={{...card,background:`linear-gradient(135deg,${T.accent}12,${T.accent}04)`,border:`1px solid ${T.accent}30`}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:16}}>
          <div>
            <h2 style={{fontSize:20,fontWeight:800,color:T.text,marginBottom:4}}>📓 Daily Journal</h2>
            <p style={{color:T.textMuted,fontSize:13}}>{new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</p>
          </div>
          <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
            {[
              {label:'Tasks',value:`${completedTasks}/${totalTasks}`,color:completedTasks===totalTasks?T.green:T.text},
              {label:'Session',value:sessionStarted?formatTime(sessionTime):'Not started',color:sessionStarted?T.green:T.textMuted},
              {label:"Today's P&L",value:`${todayPnl>=0?'+':''}$${todayPnl.toFixed(2)}`,color:todayPnl>=0?T.green:todayPnl<0?T.red:T.textMuted},
              {label:'Streak',value:`${streak} days 🔥`,color:T.accent},
            ].map(s=>(
              <div key={s.label} style={{textAlign:'center',padding:'10px 16px',background:T.glassBg,borderRadius:10,border:`1px solid ${T.glassBorder}`}}>
                <div style={{fontSize:10,color:T.textMuted,textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:4}}>{s.label}</div>
                <div style={{fontSize:16,fontWeight:700,color:s.color}}>{s.value}</div>
              </div>
            ))}
            <button onClick={()=>setSessionStarted(!sessionStarted)} style={{padding:'10px 20px',borderRadius:10,border:`1px solid ${sessionStarted?T.red:T.accent}`,background:sessionStarted?T.redBg:T.accentDim,color:sessionStarted?T.red:T.accent,fontSize:13,fontWeight:700,cursor:'pointer'}}>
              {sessionStarted?'⏹ End Session':'▶ Start Session'}
            </button>
          </div>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 320px',gap:20}}>

        {/* Left - Journal + Notes */}
        <div style={{display:'flex',flexDirection:'column',gap:16}}>

          {/* Tab switcher */}
          <div style={{display:'flex',gap:0,background:T.inputBg,border:`1px solid ${T.inputBorder}`,borderRadius:12,padding:4}}>
            {[['premarket','🌅 Pre-Market'],['postmarket','🌇 Post-Market'],['diary','📅 Trade Diary']].map(([id,label])=>(
              <button key={id} onClick={()=>setJournalTab(id)} style={{flex:1,padding:'9px 0',borderRadius:9,border:'none',background:journalTab===id?T.accent:'transparent',color:journalTab===id?'#000':T.textMuted,fontSize:13,fontWeight:journalTab===id?700:400,cursor:'pointer'}}>{label}</button>
            ))}
          </div>

          {journalTab==='premarket'&&(
            <div style={card}>
              <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:4}}>🌅 Pre-Market Notes</div>
              <div style={{fontSize:12,color:T.textMuted,marginBottom:14}}>Plan your trades before the market opens. What are you watching? What is your plan?</div>
              <textarea style={{...inp,height:180}} placeholder="Write your pre-market plan...&#10;&#10;- Key levels I'm watching:&#10;- Setups I'm looking for:&#10;- Max loss today: $300&#10;- News to watch:" value={preMarketNotes} onChange={e=>setPreMarketNotes(e.target.value)}/>
              <div style={{display:'flex',justifyContent:'flex-end',marginTop:12}}>
                <button onClick={handleSave} style={{padding:'9px 24px',borderRadius:8,border:'none',background:saved?T.green:T.accent,color:'#000',fontSize:13,fontWeight:700,cursor:'pointer'}}>{saved?'✓ Saved':'Save Notes'}</button>
              </div>
            </div>
          )}

          {journalTab==='postmarket'&&(
            <div style={card}>
              <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:4}}>🌇 Post-Market Review</div>
              <div style={{fontSize:12,color:T.textMuted,marginBottom:14}}>Review your session. What did you do well? What mistakes did you make? What did you learn?</div>
              <textarea style={{...inp,height:180}} placeholder="Write your post-market review...&#10;&#10;- What went well today:&#10;- Mistakes I made:&#10;- What I learned:&#10;- Rules I followed/broke:" value={postMarketNotes} onChange={e=>setPostMarketNotes(e.target.value)}/>
              <div style={{display:'flex',justifyContent:'flex-end',marginTop:12}}>
                <button onClick={handleSave} style={{padding:'9px 24px',borderRadius:8,border:'none',background:saved?T.green:T.accent,color:'#000',fontSize:13,fontWeight:700,cursor:'pointer'}}>{saved?'✓ Saved':'Save Notes'}</button>
              </div>
            </div>
          )}

          {journalTab==='diary'&&(
            <div style={card}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                <div style={{fontSize:14,fontWeight:700,color:T.text}}>📅 Trade Diary — {selectedDate}</div>
                <input style={{padding:'7px 12px',background:T.inputBg,border:`1px solid ${T.inputBorder}`,borderRadius:8,color:T.text,fontSize:13}} type="date" value={selectedDate} onChange={e=>setSelectedDate(e.target.value)}/>
              </div>
              {todayTrades.length === 0 ? (
                <div style={{textAlign:'center',padding:'40px 0',color:T.textMuted,fontSize:14}}>No trades on {selectedDate}</div>
              ) : (
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  <div style={{display:'flex',gap:16,marginBottom:8}}>
                    <div style={{flex:1,background:T.inputBg,borderRadius:10,padding:'12px 16px',textAlign:'center'}}>
                      <div style={{fontSize:10,color:T.textMuted,textTransform:'uppercase',marginBottom:4}}>Trades</div>
                      <div style={{fontSize:20,fontWeight:700,color:T.text}}>{todayTrades.length}</div>
                    </div>
                    <div style={{flex:1,background:T.inputBg,borderRadius:10,padding:'12px 16px',textAlign:'center'}}>
                      <div style={{fontSize:10,color:T.textMuted,textTransform:'uppercase',marginBottom:4}}>Wins</div>
                      <div style={{fontSize:20,fontWeight:700,color:T.green}}>{todayWins}</div>
                    </div>
                    <div style={{flex:1,background:T.inputBg,borderRadius:10,padding:'12px 16px',textAlign:'center'}}>
                      <div style={{fontSize:10,color:T.textMuted,textTransform:'uppercase',marginBottom:4}}>Day P&L</div>
                      <div style={{fontSize:20,fontWeight:700,color:todayPnl>=0?T.green:T.red}}>{todayPnl>=0?'+':''}${todayPnl.toFixed(2)}</div>
                    </div>
                  </div>
                  {todayTrades.map(t=>(
                    <div key={t.id} style={{background:T.inputBg,border:`1px solid ${T.inputBorder}`,borderRadius:10,padding:'12px 14px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <div style={{display:'flex',gap:12,alignItems:'center'}}>
                        <span style={{fontSize:14,fontWeight:700,color:T.accent}}>{t.ticker}</span>
                        {t.option_type&&<span style={{padding:'2px 7px',borderRadius:4,fontSize:10,fontWeight:700,background:t.option_type==='CALL'?T.greenBg:T.redBg,color:t.option_type==='CALL'?T.green:T.red}}>{t.option_type}</span>}
                        <span style={{fontSize:12,color:T.textMuted}}>{t.entry_time||''}</span>
                        {t.setup&&<span style={{fontSize:11,color:T.textMuted}}>{t.setup}</span>}
                      </div>
                      <div style={{display:'flex',gap:12,alignItems:'center'}}>
                        <span style={{padding:'2px 7px',borderRadius:4,fontSize:10,fontWeight:700,background:t.outcome==='WIN'?T.greenBg:t.outcome==='LOSS'?T.redBg:'rgba(107,114,128,0.12)',color:t.outcome==='WIN'?T.green:t.outcome==='LOSS'?T.red:T.textMuted}}>{t.outcome}</span>
                        <span style={{fontSize:14,fontWeight:700,color:parseFloat(t.pnl)>=0?T.green:T.red}}>{parseFloat(t.pnl)>=0?'+':''}${parseFloat(t.pnl||0).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Activity Heatmap */}
          <div style={card}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <div style={{fontSize:14,fontWeight:700,color:T.text}}>📊 Trading Activity — Last 12 Weeks</div>
              <div style={{display:'flex',gap:8,alignItems:'center',fontSize:11,color:T.textMuted}}>
                <span style={{width:10,height:10,borderRadius:2,background:T.green,display:'inline-block'}}/> Profitable
                <span style={{width:10,height:10,borderRadius:2,background:T.red,display:'inline-block',marginLeft:4}}/> Loss
                <span style={{width:10,height:10,borderRadius:2,background:T.glassBorder,display:'inline-block',marginLeft:4}}/> No trade
              </div>
            </div>
            <div style={{display:'flex',gap:2}}>
              <div style={{display:'flex',flexDirection:'column',gap:2,marginRight:4}}>
                {['S','M','T','W','T','F','S'].map((d,i)=>(
                  <div key={i} style={{height:14,fontSize:9,color:T.textMuted,lineHeight:'14px'}}>{d}</div>
                ))}
              </div>
              {heatmapData.map((week,wi)=>(
                <div key={wi} style={{display:'flex',flexDirection:'column',gap:2}}>
                  {week.map((day,di)=>{
                    const hasActivity = day.trades > 0;
                    const bg = !hasActivity ? T.inputBg : day.pnl > 0 ? `rgba(34,197,94,${Math.min(0.2+day.trades*0.15,0.9)})` : `rgba(239,68,68,${Math.min(0.2+day.trades*0.15,0.9)})`;
                    return (
                      <div key={di} title={`${day.date}: ${day.trades} trades, ${day.pnl>=0?'+':''}$${day.pnl.toFixed(0)}`} style={{width:14,height:14,borderRadius:3,background:bg,border:day.isToday?`1px solid ${T.accent}`:`1px solid transparent`,cursor:hasActivity?'pointer':'default',transition:'transform 0.1s'}}
                        onMouseEnter={e=>e.currentTarget.style.transform='scale(1.3)'}
                        onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}
                        onClick={()=>{if(hasActivity){setSelectedDate(day.date);setJournalTab('diary');}}}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right - Task Checklist */}
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          <div style={card}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
              <div style={{fontSize:14,fontWeight:700,color:T.text}}>✅ Today's Tasks</div>
              <div style={{fontSize:12,color:T.textMuted,background:T.inputBg,padding:'4px 10px',borderRadius:20,fontWeight:600}}>{completedTasks}/{totalTasks}</div>
            </div>
            <div style={{height:4,background:T.inputBg,borderRadius:2,marginBottom:16,overflow:'hidden'}}>
              <div style={{height:'100%',width:`${(completedTasks/totalTasks)*100}%`,background:T.accent,borderRadius:2,transition:'width 0.3s'}}/>
            </div>

            {[['premarket','🌅 Pre-Market'],['session','⚡ Session'],['postmarket','🌇 Post-Market']].map(([section,label])=>(
              <div key={section} style={{marginBottom:16}}>
                <div style={{fontSize:11,color:T.textMuted,textTransform:'uppercase',letterSpacing:'0.07em',fontWeight:600,marginBottom:8,display:'flex',justifyContent:'space-between'}}>
                  {label}
                  <span>{DEFAULT_TASKS[section].filter((_,i)=>checkedTasks[`${section}-${i}`]).length}/{DEFAULT_TASKS[section].length}</span>
                </div>
                {DEFAULT_TASKS[section].map((task,i)=>{
                  const key = `${section}-${i}`;
                  const checked = !!checkedTasks[key];
                  return (
                    <div key={i} onClick={()=>toggleTask(section,i)} style={{display:'flex',alignItems:'flex-start',gap:10,padding:'8px 10px',borderRadius:8,cursor:'pointer',marginBottom:4,background:checked?T.accentDim:'transparent',transition:'background 0.15s'}}
                      onMouseEnter={e=>{if(!checked)e.currentTarget.style.background=T.inputBg;}}
                      onMouseLeave={e=>{e.currentTarget.style.background=checked?T.accentDim:'transparent';}}>
                      <div style={{width:18,height:18,borderRadius:5,border:`2px solid ${checked?T.accent:T.inputBorder}`,background:checked?T.accent:'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:1,transition:'all 0.15s'}}>
                        {checked&&<svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </div>
                      <span style={{fontSize:13,color:checked?T.textMuted:T.text,textDecoration:checked?'line-through':'none',lineHeight:1.4,transition:'all 0.15s'}}>{task}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Session Stats */}
          <div style={card}>
            <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:14}}>📈 Session Stats</div>
            {[
              {label:'P&L',value:`${todayPnl>=0?'+':''}$${todayPnl.toFixed(2)}`,color:todayPnl>0?T.green:todayPnl<0?T.red:T.textMuted},
              {label:'Trades',value:todayTrades.length,color:T.text},
              {label:'Win Rate',value:todayTrades.length?`${Math.round(todayWins/todayTrades.length*100)}%`:'—',color:T.text},
              {label:'Session Time',value:sessionStarted?formatTime(sessionTime):'—',color:T.accent},
            ].map(s=>(
              <div key={s.label} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:`1px solid ${T.glassBorder}`}}>
                <span style={{fontSize:13,color:T.textMuted}}>{s.label}</span>
                <span style={{fontSize:15,fontWeight:700,color:s.color}}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── POSITION CALCULATOR ───────────────────────────────────────────────────────
function CalculatorTab({ T }) {
  const [mode, setMode] = useState('stocks');

  // Stocks calculator
  const [stockPrice, setStockPrice] = useState('');
  const [shares, setShares] = useState('');
  const [positionSize, setPositionSize] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [target, setTarget] = useState('');
  const [riskAmount, setRiskAmount] = useState('');

  // Options calculator
  const [optionPremium, setOptionPremium] = useState('');
  const [optionContracts, setOptionContracts] = useState('');
  const [optionCost, setOptionCost] = useState('');
  const [optionStrike, setOptionStrike] = useState('');
  const [optionStop, setOptionStop] = useState('');
  const [optionTarget, setOptionTarget] = useState('');
  const [optionType, setOptionType] = useState('CALL');
  const [underlyingPrice, setUnderlyingPrice] = useState('');

  // Stock calculations
  const calcStocks = useMemo(() => {
    const sp = parseFloat(stockPrice), sh = parseFloat(shares), ps = parseFloat(positionSize);
    const sl = parseFloat(stopLoss), tgt = parseFloat(target), risk = parseFloat(riskAmount);
    const results = {};

    if (sp && sh) results.positionSize = (sp * sh).toFixed(2);
    if (sp && ps) results.shares = Math.floor(ps / sp);
    if (sh && ps) results.stockPrice = (ps / sh).toFixed(2);

    if (sp && sl && sh) {
      results.riskPerShare = Math.abs(sp - sl).toFixed(2);
      results.totalRisk = (Math.abs(sp - sl) * (sh || results.shares || 0)).toFixed(2);
    }
    if (sp && tgt && sh) {
      results.rewardPerShare = Math.abs(tgt - sp).toFixed(2);
      results.totalReward = (Math.abs(tgt - sp) * (sh || 0)).toFixed(2);
    }
    if (sp && sl && tgt) {
      const r = Math.abs(sp - sl);
      const rwd = Math.abs(tgt - sp);
      results.rrRatio = r > 0 ? (rwd / r).toFixed(2) : '—';
    }
    if (risk && sp && sl) {
      results.sharesFromRisk = Math.floor(risk / Math.abs(sp - sl));
      results.positionFromRisk = (results.sharesFromRisk * sp).toFixed(2);
    }

    return results;
  }, [stockPrice, shares, positionSize, stopLoss, target, riskAmount]);

  // Options calculations
  const calcOptions = useMemo(() => {
    const p = parseFloat(optionPremium), c = parseFloat(optionContracts), cost = parseFloat(optionCost);
    const sl = parseFloat(optionStop), tgt = parseFloat(optionTarget);
    const results = {};

    if (p && c) results.totalCost = (p * c * 100).toFixed(2);
    if (p && cost) results.contracts = Math.floor(cost / (p * 100));
    if (c && cost) results.premium = (cost / (c * 100)).toFixed(2);

    if (p && sl) {
      results.stopLoss = (sl * c * 100).toFixed(2);
      results.riskAmount = ((p - sl) * c * 100).toFixed(2);
    }
    if (p && tgt) {
      results.targetPnl = ((tgt - p) * (c || 1) * 100).toFixed(2);
    }
    if (p && sl && tgt) {
      const r = Math.abs(p - sl);
      const rwd = Math.abs(tgt - p);
      results.rrRatio = r > 0 ? (rwd / r).toFixed(2) : '—';
    }
    // Break even
    if (optionStrike && p && optionType) {
      if (optionType === 'CALL') results.breakeven = (parseFloat(optionStrike) + parseFloat(p)).toFixed(2);
      else results.breakeven = (parseFloat(optionStrike) - parseFloat(p)).toFixed(2);
    }
    // ITM/OTM
    if (underlyingPrice && optionStrike) {
      const diff = parseFloat(underlyingPrice) - parseFloat(optionStrike);
      if (optionType === 'CALL') {
        results.moneyness = diff > 0 ? `ITM by $${diff.toFixed(2)}` : diff < 0 ? `OTM by $${Math.abs(diff).toFixed(2)}` : 'ATM';
        results.moneynessColor = diff > 0 ? '#22c55e' : diff < 0 ? '#ef4444' : '#f59e0b';
      } else {
        results.moneyness = diff < 0 ? `ITM by $${Math.abs(diff).toFixed(2)}` : diff > 0 ? `OTM by $${diff.toFixed(2)}` : 'ATM';
        results.moneynessColor = diff < 0 ? '#22c55e' : diff > 0 ? '#ef4444' : '#f59e0b';
      }
    }

    return results;
  }, [optionPremium, optionContracts, optionCost, optionStop, optionTarget, optionStrike, optionType, underlyingPrice]);

  const inp = { padding:'10px 14px', background:T.inputBg, border:`1px solid ${T.inputBorder}`, borderRadius:10, color:T.text, fontSize:14, outline:'none', width:'100%', fontFamily:'inherit' };
  const lbl = { display:'block', fontSize:11, color:T.textMuted, textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:600, marginBottom:6 };
  const card = { background:T.glassBg, backdropFilter:'blur(24px)', border:`1px solid ${T.glassBorder}`, borderRadius:16, padding:24, boxShadow:T.cardShadow };
  const resultRow = (label, value, color) => value ? (
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:`1px solid ${T.glassBorder}`}}>
      <span style={{fontSize:13,color:T.textMuted}}>{label}</span>
      <span style={{fontSize:15,fontWeight:700,color:color||T.accent,fontVariantNumeric:'tabular-nums'}}>{value}</span>
    </div>
  ) : null;

  return (
    <div style={{maxWidth:1000,margin:'0 auto'}}>
      <div style={{marginBottom:24}}>
        <h2 style={{fontSize:22,fontWeight:800,color:T.text,marginBottom:4}}>Position Calculator</h2>
        <p style={{color:T.textMuted,fontSize:14}}>Calculate position size, risk, reward, and R:R ratio before you trade.</p>
      </div>

      {/* Mode toggle */}
      <div style={{display:'flex',gap:0,background:T.inputBg,border:`1px solid ${T.inputBorder}`,borderRadius:12,padding:4,marginBottom:24,width:'fit-content'}}>
        {[['stocks','🏢 Stocks'],['options','📈 Options']].map(([id,label])=>(
          <button key={id} onClick={()=>setMode(id)} style={{padding:'10px 28px',borderRadius:9,border:'none',background:mode===id?T.accent:'transparent',color:mode===id?'#000':T.textMuted,fontSize:14,fontWeight:mode===id?700:500,cursor:'pointer',transition:'all 0.15s'}}>{label}</button>
        ))}
      </div>

      {mode==='stocks' && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
          {/* Left - Inputs */}
          <div style={{display:'flex',flexDirection:'column',gap:16}}>

            {/* Position Size Calculator */}
            <div style={card}>
              <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:16}}>📐 Position Size</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div><label style={lbl}>Stock Price ($)</label><input style={inp} type="number" step="0.01" placeholder="185.00" value={stockPrice} onChange={e=>setStockPrice(e.target.value)}/></div>
                <div><label style={lbl}>Shares</label><input style={inp} type="number" placeholder="100" value={shares} onChange={e=>setShares(e.target.value)}/></div>
                <div style={{gridColumn:'1/-1'}}><label style={lbl}>Position Size ($)</label><input style={inp} type="number" step="0.01" placeholder="18,500" value={positionSize} onChange={e=>setPositionSize(e.target.value)}/></div>
              </div>
              <div style={{marginTop:16,padding:'12px 0',borderTop:`1px solid ${T.glassBorder}`}}>
                {calcStocks.positionSize && resultRow('Total Position Value', `$${calcStocks.positionSize}`)}
                {calcStocks.shares && !shares && resultRow('Shares to Buy', calcStocks.shares)}
                {calcStocks.stockPrice && !stockPrice && resultRow('Stock Price', `$${calcStocks.stockPrice}`)}
              </div>
            </div>

            {/* Risk from Account */}
            <div style={card}>
              <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:16}}>💰 Risk from Account Size</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div><label style={lbl}>Risk Amount ($)</label><input style={inp} type="number" step="0.01" placeholder="300" value={riskAmount} onChange={e=>setRiskAmount(e.target.value)}/></div>
                <div><label style={lbl}>Stop Loss ($)</label><input style={inp} type="number" step="0.01" placeholder="183.00" value={stopLoss} onChange={e=>setStopLoss(e.target.value)}/></div>
              </div>
              {calcStocks.sharesFromRisk && (
                <div style={{marginTop:16,padding:'12px 0',borderTop:`1px solid ${T.glassBorder}`}}>
                  {resultRow('Max Shares', calcStocks.sharesFromRisk)}
                  {resultRow('Position Size', `$${calcStocks.positionFromRisk}`, T.accent)}
                </div>
              )}
            </div>
          </div>

          {/* Right - Risk/Reward */}
          <div style={{display:'flex',flexDirection:'column',gap:16}}>
            <div style={card}>
              <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:16}}>🎯 Risk / Reward Analysis</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div><label style={lbl}>Entry Price ($)</label><input style={inp} type="number" step="0.01" placeholder="185.00" value={stockPrice} onChange={e=>setStockPrice(e.target.value)}/></div>
                <div><label style={lbl}>Shares</label><input style={inp} type="number" placeholder="100" value={shares} onChange={e=>setShares(e.target.value)}/></div>
                <div><label style={lbl}>Stop Loss ($)</label><input style={inp} type="number" step="0.01" placeholder="183.00" value={stopLoss} onChange={e=>setStopLoss(e.target.value)}/></div>
                <div><label style={lbl}>Target ($)</label><input style={inp} type="number" step="0.01" placeholder="190.00" value={target} onChange={e=>setTarget(e.target.value)}/></div>
              </div>

              <div style={{marginTop:16,padding:'12px 0',borderTop:`1px solid ${T.glassBorder}`}}>
                {resultRow('Risk per Share', calcStocks.riskPerShare?`$${calcStocks.riskPerShare}`:null, T.red)}
                {resultRow('Reward per Share', calcStocks.rewardPerShare?`$${calcStocks.rewardPerShare}`:null, T.green)}
                {resultRow('Total Risk', calcStocks.totalRisk?`$${calcStocks.totalRisk}`:null, T.red)}
                {resultRow('Total Reward', calcStocks.totalReward?`$${calcStocks.totalReward}`:null, T.green)}
                {calcStocks.rrRatio && (
                  <div style={{marginTop:16,background:parseFloat(calcStocks.rrRatio)>=2?T.greenBg:parseFloat(calcStocks.rrRatio)>=1?T.accentDim:T.redBg,border:`1px solid ${parseFloat(calcStocks.rrRatio)>=2?T.green:parseFloat(calcStocks.rrRatio)>=1?T.accent:T.red}44`,borderRadius:10,padding:'14px 16px',textAlign:'center'}}>
                    <div style={{fontSize:11,color:T.textMuted,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:4}}>Risk / Reward Ratio</div>
                    <div style={{fontSize:32,fontWeight:900,color:parseFloat(calcStocks.rrRatio)>=2?T.green:parseFloat(calcStocks.rrRatio)>=1?T.accent:T.red}}>1 : {calcStocks.rrRatio}</div>
                    <div style={{fontSize:12,color:T.textMuted,marginTop:4}}>{parseFloat(calcStocks.rrRatio)>=3?'🔥 Excellent':parseFloat(calcStocks.rrRatio)>=2?'✅ Good':parseFloat(calcStocks.rrRatio)>=1?'⚠️ Minimum':' ❌ Poor — Skip this trade'}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {mode==='options' && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
          {/* Left */}
          <div style={{display:'flex',flexDirection:'column',gap:16}}>

            {/* Options Cost Calculator */}
            <div style={card}>
              <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:16}}>📐 Options Cost Calculator</div>
              <div style={{display:'flex',gap:0,background:T.inputBg,border:`1px solid ${T.inputBorder}`,borderRadius:8,padding:3,marginBottom:14,width:'fit-content'}}>
                {['CALL','PUT'].map(t=>(
                  <button key={t} onClick={()=>setOptionType(t)} style={{padding:'6px 20px',borderRadius:6,border:'none',background:optionType===t?(t==='CALL'?T.green:T.red):'transparent',color:optionType===t?'#000':T.textMuted,fontSize:13,fontWeight:optionType===t?700:400,cursor:'pointer'}}>{t}</button>
                ))}
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div><label style={lbl}>Premium ($)</label><input style={inp} type="number" step="0.01" placeholder="1.50" value={optionPremium} onChange={e=>setOptionPremium(e.target.value)}/></div>
                <div><label style={lbl}>Contracts</label><input style={inp} type="number" placeholder="2" value={optionContracts} onChange={e=>setOptionContracts(e.target.value)}/></div>
                <div style={{gridColumn:'1/-1'}}><label style={lbl}>Max Budget ($)</label><input style={inp} type="number" step="0.01" placeholder="500" value={optionCost} onChange={e=>setOptionCost(e.target.value)}/></div>
              </div>
              <div style={{marginTop:16,padding:'12px 0',borderTop:`1px solid ${T.glassBorder}`}}>
                {calcOptions.totalCost && resultRow('Total Cost', `$${calcOptions.totalCost}`, T.accent)}
                {calcOptions.contracts && !optionContracts && resultRow('Max Contracts', calcOptions.contracts)}
                {calcOptions.premium && !optionPremium && resultRow('Premium', `$${calcOptions.premium}`)}
              </div>
            </div>

            {/* Break Even */}
            <div style={card}>
              <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:16}}>📍 Break Even & Moneyness</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div><label style={lbl}>Strike Price ($)</label><input style={inp} type="number" step="0.01" placeholder="500" value={optionStrike} onChange={e=>setOptionStrike(e.target.value)}/></div>
                <div><label style={lbl}>Underlying Price ($)</label><input style={inp} type="number" step="0.01" placeholder="498" value={underlyingPrice} onChange={e=>setUnderlyingPrice(e.target.value)}/></div>
              </div>
              <div style={{marginTop:16,padding:'12px 0',borderTop:`1px solid ${T.glassBorder}`}}>
                {calcOptions.breakeven && resultRow('Break Even Price', `$${calcOptions.breakeven}`, T.accent)}
                {calcOptions.moneyness && (
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0'}}>
                    <span style={{fontSize:13,color:T.textMuted}}>Moneyness</span>
                    <span style={{fontSize:14,fontWeight:700,color:calcOptions.moneynessColor}}>{calcOptions.moneyness}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right - Options R:R */}
          <div style={{display:'flex',flexDirection:'column',gap:16}}>
            <div style={card}>
              <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:16}}>🎯 Options Risk / Reward</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div><label style={lbl}>Entry Premium ($)</label><input style={inp} type="number" step="0.01" placeholder="1.50" value={optionPremium} onChange={e=>setOptionPremium(e.target.value)}/></div>
                <div><label style={lbl}>Contracts</label><input style={inp} type="number" placeholder="2" value={optionContracts} onChange={e=>setOptionContracts(e.target.value)}/></div>
                <div><label style={lbl}>Stop (Exit at $)</label><input style={inp} type="number" step="0.01" placeholder="0.75" value={optionStop} onChange={e=>setOptionStop(e.target.value)}/></div>
                <div><label style={lbl}>Target (Exit at $)</label><input style={inp} type="number" step="0.01" placeholder="3.00" value={optionTarget} onChange={e=>setOptionTarget(e.target.value)}/></div>
              </div>

              <div style={{marginTop:16,padding:'12px 0',borderTop:`1px solid ${T.glassBorder}`}}>
                {resultRow('Max Cost', calcOptions.totalCost?`$${calcOptions.totalCost}`:null, T.accent)}
                {resultRow('Risk (Stop hit)', calcOptions.riskAmount?`$${calcOptions.riskAmount}`:null, T.red)}
                {resultRow('Target P&L', calcOptions.targetPnl?`+$${calcOptions.targetPnl}`:null, T.green)}
                {calcOptions.rrRatio && (
                  <div style={{marginTop:16,background:parseFloat(calcOptions.rrRatio)>=2?T.greenBg:parseFloat(calcOptions.rrRatio)>=1?T.accentDim:T.redBg,border:`1px solid ${parseFloat(calcOptions.rrRatio)>=2?T.green:parseFloat(calcOptions.rrRatio)>=1?T.accent:T.red}44`,borderRadius:10,padding:'14px 16px',textAlign:'center'}}>
                    <div style={{fontSize:11,color:T.textMuted,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:4}}>Risk / Reward Ratio</div>
                    <div style={{fontSize:32,fontWeight:900,color:parseFloat(calcOptions.rrRatio)>=2?T.green:parseFloat(calcOptions.rrRatio)>=1?T.accent:T.red}}>1 : {calcOptions.rrRatio}</div>
                    <div style={{fontSize:12,color:T.textMuted,marginTop:4}}>{parseFloat(calcOptions.rrRatio)>=3?'🔥 Excellent':parseFloat(calcOptions.rrRatio)>=2?'✅ Good':parseFloat(calcOptions.rrRatio)>=1?'⚠️ Minimum':'❌ Poor — Skip this trade'}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick reference */}
            <div style={{...card,background:T.accentDim,border:`1px solid ${T.accent}33`}}>
              <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:12}}>⚡ Quick Reference</div>
              {[
                ['Options Cost Formula', 'Premium × Contracts × 100'],
                ['Break Even (Call)', 'Strike + Premium'],
                ['Break Even (Put)', 'Strike − Premium'],
                ['Min R:R Target', '1:2 (risking $1 to make $2)'],
                ['Your Rule', '1:3 minimum, 1:5 ideal'],
              ].map(([label,val])=>(
                <div key={label} style={{display:'flex',justifyContent:'space-between',gap:12,marginBottom:8}}>
                  <span style={{fontSize:12,color:T.textMuted}}>{label}</span>
                  <span style={{fontSize:12,color:T.text,fontWeight:600,textAlign:'right'}}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── SUPPORT TAB ───────────────────────────────────────────────────────────────
function SupportTab({ T }) {
  const [openFaq, setOpenFaq] = useState(null);
  const faqs = [
    ['How do I log a trade?','Click "+ Add Trade" on the Trades tab. Select your asset type first — options, stocks, forex, futures, or crypto. Fields change based on what you pick. P&L calculates automatically.'],
    ['What asset types are supported?','Options, Stocks, Forex, Futu

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
function DashboardTab({ trades, strategies, T, onAddTrade }) {
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

  const card={background:T.glassBg,backdropFilter:'blur(20px)',border:`1px solid ${T.glassBorder}`,borderRadius:14,padding:20};

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

      {/* Equity curve + Recent trades */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        <div style={card}>
          <div style={{fontSize:13,fontWeight:600,color:T.text,marginBottom:12}}>Equity Curve</div>
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
          <div style={{overflowX:'auto',background:T.glassBg,backdropFilter:'blur(20px)',border:`1px solid ${T.glassBorder}`,borderRadius:14}}>
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
        <div style={{width:300,flexShrink:0,background:T.glassBg,backdropFilter:'blur(20px)',border:`1px solid ${T.glassBorder}`,borderRadius:14,padding:16,maxHeight:'80vh',overflowY:'auto'}}>
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
  const card={background:T.glassBg,backdropFilter:'blur(20px)',border:`1px solid ${T.glassBorder}`,borderRadius:14,padding:20};
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
  const card={background:T.glassBg,backdropFilter:'blur(20px)',border:`1px solid ${T.glassBorder}`,borderRadius:14,padding:20};
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

// ── LANDING PAGE ──────────────────────────────────────────────────────────────
function LandingPage({ T, d, onLogin, onSignup, onToggleDark }) {
  const [scrolled,setScrolled]=useState(false);
  useEffect(()=>{const fn=()=>setScrolled(window.scrollY>40);window.addEventListener('scroll',fn);return()=>window.removeEventListener('scroll',fn);},[]);
  const features=[
    {icon:'📸',title:'Chart Screenshot Upload',desc:'Attach your chart to every trade. No more going back to TradingView a month later.'},
    {icon:'📋',title:'Strategy Rule Tracking',desc:'Define your own rules. See P&L when you follow them vs when you break them.'},
    {icon:'📊',title:'Deep Analytics',desc:'Win rate by day, time, ticker, setup. Understand your edge with real data.'},
    {icon:'🤖',title:'AI Trade Coaching',desc:'AI reads your chart, identifies your setup, and reviews your session. Coming soon.'},
    {icon:'🔄',title:'IBKR Auto-Sync',desc:'Connect once. Every fill logged automatically. No manual entry needed.'},
    {icon:'📰',title:'News Feed',desc:'See what catalyst was in play. Tag news-driven vs technical setups.'},
    {icon:'🏆',title:'Monthly Challenge',desc:'Compete with other traders. Best win rate wins a free month.'},
    {icon:'🎓',title:'Learning Hub',desc:'Beginner to advanced. Stocks, options, futures, forex. Coming soon.'},
  ];
  return (
    <div style={{background:T.pageBg,color:T.text,fontFamily:"'IBM Plex Sans',system-ui,sans-serif",minHeight:'100vh',overflowX:'hidden'}}>
      <nav style={{position:'fixed',top:0,left:0,right:0,zIndex:100,background:scrolled?T.headerBg:'transparent',backdropFilter:scrolled?'blur(24px)':'none',borderBottom:scrolled?`1px solid ${T.glassBorder}`:'none',transition:'all 0.3s',padding:'0 32px',height:64,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <Logo light={!d}/>
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          <button onClick={onToggleDark} style={{background:T.glassBg,border:`1px solid ${T.glassBorder}`,borderRadius:8,padding:'7px 10px',cursor:'pointer',fontSize:14,color:T.textMuted,backdropFilter:'blur(10px)'}}>{d?'☀':'🌙'}</button>
          <button onClick={onLogin} style={{background:'transparent',color:T.text,border:`1px solid ${T.glassBorder}`,borderRadius:10,padding:'9px 20px',fontSize:14,fontWeight:500,cursor:'pointer'}}>Log In</button>
          <button onClick={onSignup} style={{background:T.accent,color:'#000',border:'none',borderRadius:10,padding:'9px 20px',fontSize:14,fontWeight:700,cursor:'pointer'}}>Get Started Free</button>
        </div>
      </nav>

      <section style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center',padding:'120px 24px 80px',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',width:700,height:700,borderRadius:'50%',background:T.orb1,filter:'blur(80px)',top:'-10%',left:'50%',transform:'translateX(-50%)',pointerEvents:'none'}}/>
        <div style={{position:'absolute',width:500,height:500,borderRadius:'50%',background:T.orb2,filter:'blur(80px)',bottom:'5%',right:'-10%',pointerEvents:'none'}}/>
        <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',opacity:d?0.03:0.04,pointerEvents:'none',userSelect:'none',fontSize:280,fontWeight:900,color:d?'#fff':'#000',letterSpacing:'-10px',fontFamily:"'IBM Plex Sans',system-ui,sans-serif"}}>J</div>
        <div style={{display:'inline-flex',alignItems:'center',gap:8,background:T.glassBg,backdropFilter:'blur(20px)',border:`1px solid ${T.glassBorder}`,borderRadius:30,padding:'7px 18px',fontSize:13,color:T.accent,fontWeight:600,marginBottom:32}}>
          <span style={{width:6,height:6,borderRadius:'50%',background:T.accent,display:'inline-block',animation:'pulse 2s infinite'}}/>
          Now live — built by a real trader
        </div>
        <div style={{marginBottom:24}}><Logo light={!d} size="lg"/></div>
        <h1 style={{fontSize:'clamp(36px,6vw,72px)',fontWeight:900,letterSpacing:'-2px',lineHeight:1.1,marginBottom:20,maxWidth:800,color:T.text}}>Your Financial Journey,<br/><span style={{color:T.accent}}>Tracked & Analyzed.</span></h1>
        <p style={{fontSize:'clamp(15px,2vw,20px)',color:T.textMuted,maxWidth:580,lineHeight:1.7,marginBottom:40}}>The only trading journal that tracks ALL your trades — stocks, options, forex, futures, crypto — analyzes your patterns, and holds you accountable to your own rules.</p>
        <div style={{display:'flex',gap:14,flexWrap:'wrap',justifyContent:'center',marginBottom:60}}>
          <button onClick={onSignup} style={{background:T.accent,color:'#000',border:'none',borderRadius:14,padding:'16px 36px',fontSize:17,fontWeight:800,cursor:'pointer',boxShadow:`0 0 40px ${T.accent}44`}}>Start Free — No Credit Card</button>
          <button onClick={onLogin} style={{background:T.glassBg,backdropFilter:'blur(20px)',color:T.text,border:`1px solid ${T.glassBorder}`,borderRadius:14,padding:'16px 32px',fontSize:17,fontWeight:600,cursor:'pointer'}}>Sign In →</button>
        </div>
        <div style={{display:'flex',gap:0,background:T.glassBg,backdropFilter:'blur(20px)',border:`1px solid ${T.glassBorder}`,borderRadius:20,overflow:'hidden',flexWrap:'wrap'}}>
          {[{value:'All Markets',label:'Stocks · Options · Forex · Futures · Crypto'},{value:'Rules Tracking',label:'Follow your strategy. See the P&L difference.'},{value:'AI Coaching',label:'Coming soon — your personal trading coach'},{value:'$0',label:'To get started'}].map((s,i,arr)=>(
            <div key={s.value} style={{padding:'18px 28px',borderRight:i<arr.length-1?`1px solid ${T.glassBorder}`:'none',textAlign:'center',minWidth:160}}>
              <div style={{fontSize:18,fontWeight:800,color:T.accent}}>{s.value}</div>
              <div style={{fontSize:11,color:T.textMuted,marginTop:4}}>{s.label}</div>
            </div>
          ))}
        </div>
        <div style={{position:'absolute',bottom:32,left:'50%',transform:'translateX(-50%)',opacity:0.4,animation:'bounce 2s infinite',textAlign:'center'}}>
          <div style={{fontSize:11,color:T.textMuted,letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:4}}>Scroll</div>
          <div style={{fontSize:18,color:T.textMuted}}>↓</div>
        </div>
      </section>

      <section style={{padding:'80px 24px',maxWidth:1100,margin:'0 auto'}}>
        <div style={{textAlign:'center',marginBottom:48}}>
          <div style={{display:'inline-block',background:T.accentDim,border:`1px solid ${T.accent}33`,borderRadius:30,padding:'5px 16px',fontSize:12,color:T.accent,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:20}}>Everything You Need</div>
          <h2 style={{fontSize:'clamp(28px,4vw,48px)',fontWeight:800,letterSpacing:'-1px',color:T.text}}>One platform. Every trading tool.</h2>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:16}}>
          {features.map((f,i)=>(
            <div key={i}
              style={{background:T.glassBg,backdropFilter:'blur(20px)',border:`1px solid ${T.glassBorder}`,borderRadius:16,padding:'24px 20px',transition:'all 0.25s',cursor:'default'}}
              onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-4px)';e.currentTarget.style.border=`1px solid ${T.accent}66`;e.currentTarget.style.boxShadow=`0 0 30px ${T.accent}22`;}}
              onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.border=`1px solid ${T.glassBorder}`;e.currentTarget.style.boxShadow='none';}}>
              <div style={{fontSize:28,marginBottom:12}}>{f.icon}</div>
              <h3 style={{fontSize:15,fontWeight:700,color:T.text,marginBottom:8}}>{f.title}</h3>
              <p style={{fontSize:13,color:T.textMuted,lineHeight:1.6}}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{padding:'80px 24px',maxWidth:1000,margin:'0 auto'}}>
        <div style={{background:`linear-gradient(135deg,${T.accent}10,${T.accent}05)`,border:`1px solid ${T.accent}30`,borderRadius:24,padding:'48px 40px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:40,alignItems:'center'}}>
          <div>
            <div style={{display:'inline-block',background:T.accentDim,border:`1px solid ${T.accent}33`,borderRadius:30,padding:'5px 16px',fontSize:12,color:T.accent,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:20}}>Signature Feature</div>
            <h2 style={{fontSize:'clamp(24px,3vw,36px)',fontWeight:800,letterSpacing:'-1px',color:T.text,marginBottom:16,lineHeight:1.2}}>See what following your rules is worth — in dollars.</h2>
            <p style={{color:T.textMuted,fontSize:15,lineHeight:1.8,marginBottom:24}}>Create your strategy. Define your rules. Journifi tracks whether you followed them and shows you the P&L difference.</p>
            <button onClick={onSignup} style={{background:T.accent,color:'#000',border:'none',borderRadius:12,padding:'13px 28px',fontSize:15,fontWeight:700,cursor:'pointer'}}>Try It Free →</button>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {[{label:'✅ All rules followed',trades:18,winRate:'78%',pnl:'+$1,840',color:T.green},{label:'⚠️ Some rules followed',trades:9,winRate:'44%',pnl:'-$210',color:'#f59e0b'},{label:'❌ Rules ignored',trades:6,winRate:'17%',pnl:'-$890',color:T.red}].map(row=>(
              <div key={row.label} style={{background:T.glassBg,backdropFilter:'blur(20px)',border:`1px solid ${T.glassBorder}`,borderRadius:12,padding:'16px 18px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div><div style={{fontSize:13,fontWeight:600,color:T.text,marginBottom:4}}>{row.label}</div><div style={{fontSize:11,color:T.textMuted}}>{row.trades} trades · {row.winRate} win rate</div></div>
                <div style={{fontSize:18,fontWeight:800,color:row.color}}>{row.pnl}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{padding:'80px 24px',maxWidth:1000,margin:'0 auto',textAlign:'center'}}>
        <h2 style={{fontSize:'clamp(28px,4vw,48px)',fontWeight:800,letterSpacing:'-1px',marginBottom:12,color:T.text}}>Start free. Upgrade when ready.</h2>
        <p style={{color:T.textMuted,fontSize:16,marginBottom:48}}>No credit card required. Cancel anytime.</p>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:16}}>
          {[{name:'Free',price:'$0',color:'#6b7280',features:['10 trades','Manual entry','Basic stats']},{name:'Pro',price:'$29.99',color:T.accent,popular:true,features:['Unlimited trades','All asset types','IBKR sync','Analytics','Strategy tracking','Learning Hub']},{name:'Elite',price:'$49.99',color:'#a78bfa',features:['Everything in Pro','AI chart analysis','AI coaching','Pre-market briefing']}].map(plan=>(
            <div key={plan.name}
              style={{background:plan.popular?`linear-gradient(135deg,${T.accent}12,${T.accent}06)`:T.glassBg,backdropFilter:'blur(20px)',border:`1px solid ${plan.popular?T.accent+'44':T.glassBorder}`,borderRadius:20,padding:'28px 24px',position:'relative',transition:'all 0.25s'}}
              onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-4px)';e.currentTarget.style.boxShadow=`0 0 30px ${T.accent}22`;}}
              onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='none';}}>
              {plan.popular&&<div style={{position:'absolute',top:-12,left:'50%',transform:'translateX(-50%)',background:T.accent,color:'#000',fontSize:11,fontWeight:700,padding:'4px 14px',borderRadius:20,whiteSpace:'nowrap'}}>MOST POPULAR</div>}
              <div style={{fontSize:12,fontWeight:700,color:plan.color,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:8}}>{plan.name}</div>
              <div style={{fontSize:36,fontWeight:800,color:T.text,letterSpacing:'-1px',marginBottom:20}}>{plan.price}<span style={{fontSize:14,fontWeight:400,color:T.textMuted}}>/mo</span></div>
              {plan.features.map(f=>(<div key={f} style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}><span style={{color:T.green}}>✓</span><span style={{color:T.text,fontSize:13}}>{f}</span></div>))}
              <button onClick={onSignup} style={{width:'100%',padding:'12px',background:plan.popular?T.accent:'transparent',color:plan.popular?'#000':T.text,border:`1px solid ${plan.popular?T.accent:T.glassBorder}`,borderRadius:10,fontSize:14,fontWeight:700,cursor:'pointer',marginTop:20}}>Get Started</button>
            </div>
          ))}
        </div>
      </section>

      <section style={{padding:'100px 24px',textAlign:'center',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',width:600,height:600,borderRadius:'50%',background:T.orb1,filter:'blur(80px)',top:'50%',left:'50%',transform:'translate(-50%,-50%)',pointerEvents:'none'}}/>
        <div style={{position:'relative',zIndex:1}}>
          <h2 style={{fontSize:'clamp(32px,5vw,60px)',fontWeight:900,letterSpacing:'-2px',color:T.text,marginBottom:20,lineHeight:1.1}}>Start your journey today.</h2>
          <p style={{color:T.textMuted,fontSize:16,marginBottom:40,maxWidth:500,margin:'0 auto 40px'}}>Join traders who are finally understanding their edge.</p>
          <button onClick={onSignup} style={{background:T.accent,color:'#000',border:'none',borderRadius:16,padding:'18px 48px',fontSize:18,fontWeight:800,cursor:'pointer',boxShadow:`0 0 60px ${T.accent}44`}}>Get Started — Free</button>
        </div>
      </section>

      <footer style={{borderTop:`1px solid ${T.glassBorder}`,padding:'32px 40px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:16,background:T.glassBg,backdropFilter:'blur(20px)'}}>
        <Logo light={!d}/>
        <div style={{color:T.textMuted,fontSize:13}}>© 2026 Journifi · Your financial journey, logged.</div>
        <div style={{display:'flex',gap:20}}>{['Privacy','Terms','Support'].map(l=>(<span key={l} style={{color:T.textMuted,fontSize:13,cursor:'pointer'}}>{l}</span>))}</div>
      </footer>
    </div>
  );
}

// ── AUTH PAGE ─────────────────────────────────────────────────────────────────
function AuthPage({ T, d, mode, onToggleDark, onBack }) {
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [authError,setAuthError]=useState('');
  const [showPassword,setShowPassword]=useState(false);
  const [showForgot,setShowForgot]=useState(false);
  const [forgotEmail,setForgotEmail]=useState('');
  const [forgotSent,setForgotSent]=useState(false);
  const [forgotLoading,setForgotLoading]=useState(false);
  async function handleGoogleLogin(){const sb=getSupabase();await sb.auth.signInWithOAuth({provider:'google',options:{redirectTo:'https://journifi-next.vercel.app'}});}
  async function handleSubmit(e){e.preventDefault();setAuthError('');const sb=getSupabase();const{error}=await sb.auth.signInWithPassword({email,password});if(error)setAuthError(error.message);}
  async function handleForgotPassword(e){e.preventDefault();setForgotLoading(true);setAuthError('');const sb=getSupabase();const{error}=await sb.auth.resetPasswordForEmail(forgotEmail,{redirectTo:'https://journifi-next.vercel.app'});setForgotLoading(false);if(error)setAuthError(error.message);else setForgotSent(true);}
  const inp={padding:'11px 14px',background:T.inputBg,border:`1px solid ${T.inputBorder}`,borderRadius:10,color:T.text,fontSize:14,outline:'none',width:'100%'};
  return (
    <div style={{minHeight:'100vh',background:T.pageBg,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:24,position:'relative',overflow:'hidden',fontFamily:"'IBM Plex Sans',system-ui,sans-serif"}}>
      <div style={{position:'absolute',width:600,height:600,borderRadius:'50%',background:T.orb1,filter:'blur(80px)',top:-100,right:-100,pointerEvents:'none'}}/>
      <div style={{position:'absolute',width:400,height:400,borderRadius:'50%',background:T.orb2,filter:'blur(80px)',bottom:-50,left:-50,pointerEvents:'none'}}/>
      <div style={{position:'absolute',top:0,left:0,right:0,padding:'16px 24px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <button onClick={onBack} style={{background:'transparent',border:'none',color:T.textMuted,fontSize:14,cursor:'pointer'}}>← Back</button>
        <button onClick={onToggleDark} style={{background:T.glassBg,border:`1px solid ${T.glassBorder}`,borderRadius:8,padding:'6px 10px',cursor:'pointer',fontSize:14,color:T.textMuted}}>{d?'☀':'🌙'}</button>
      </div>
      <div style={{marginBottom:32,textAlign:'center'}}>
        <Logo light={!d}/>
        <p style={{color:T.textMuted,fontSize:13,marginTop:10}}>Your financial journey, logged.</p>
      </div>
      <div style={{width:'100%',maxWidth:400,background:T.glassBg,backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',border:`1px solid ${T.glassBorder}`,borderRadius:20,padding:'28px 24px'}}>
        {showForgot?(
          <div>
            <button onClick={()=>{setShowForgot(false);setForgotSent(false);setAuthError('');}} style={{background:'transparent',border:'none',color:T.textMuted,fontSize:13,cursor:'pointer',marginBottom:16}}>← Back to login</button>
            <h2 style={{fontSize:20,fontWeight:700,color:T.text,marginBottom:16,textAlign:'center'}}>Reset Password</h2>
            {forgotSent?(<div style={{textAlign:'center',padding:'20px 0'}}><div style={{fontSize:40,marginBottom:12}}>✉️</div><p style={{color:T.green,fontWeight:600,fontSize:15,marginBottom:8}}>Check your inbox!</p><p style={{color:T.textMuted,fontSize:13,lineHeight:1.6}}>We sent a reset link to {forgotEmail}.</p></div>):(
              <form onSubmit={handleForgotPassword} style={{display:'flex',flexDirection:'column',gap:12}}>
                <p style={{color:T.textMuted,fontSize:13}}>Enter your email and we'll send a reset link.</p>
                <input style={inp} type="email" placeholder="Your email" value={forgotEmail} onChange={e=>setForgotEmail(e.target.value)} required/>
                {authError&&<p style={{color:T.red,fontSize:13}}>{authError}</p>}
                <button type="submit" style={{padding:'12px',background:T.accent,color:'#000',border:'none',borderRadius:10,fontSize:15,fontWeight:700,cursor:'pointer'}} disabled={forgotLoading}>{forgotLoading?'Sending...':'Send Reset Link'}</button>
              </form>
            )}
          </div>
        ):(
          <>
            <h2 style={{fontSize:20,fontWeight:700,color:T.text,marginBottom:20,textAlign:'center'}}>{mode==='login'?'Welcome back':'Create your account'}</h2>
            <button onClick={handleGoogleLogin} style={{width:'100%',padding:'12px 16px',background:d?'rgba(255,255,255,0.92)':'#fff',color:'#111',border:'none',borderRadius:12,fontSize:15,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:10,marginBottom:18}}>
              <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/></svg>
              Continue with Google
            </button>
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:18}}><div style={{flex:1,height:1,background:T.glassBorder}}/><span style={{color:T.textMuted,fontSize:12}}>or</span><div style={{flex:1,height:1,background:T.glassBorder}}/></div>
            <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:10}}>
              <input style={inp} type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required/>
              <div style={{position:'relative'}}>
                <input style={{...inp,paddingRight:44}} type={showPassword?'text':'password'} placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} required/>
                <button type="button" onClick={()=>setShowPassword(!showPassword)} style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'transparent',border:'none',cursor:'pointer',color:T.textMuted,padding:4,display:'flex',alignItems:'center'}}>
                  {showPassword?<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>:<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
                </button>
              </div>
              {authError&&<p style={{color:T.red,fontSize:13}}>{authError}</p>}
              {mode==='login'&&<button type="button" onClick={()=>{setShowForgot(true);setForgotEmail(email);setAuthError('');}} style={{background:'transparent',border:'none',color:T.accent,fontSize:13,cursor:'pointer',textAlign:'right',padding:0}}>Forgot password?</button>}
              <button type="submit" style={{padding:'12px',background:T.accent,color:'#000',border:'none',borderRadius:10,fontSize:15,fontWeight:700,cursor:'pointer',marginTop:4}}>{mode==='login'?'Sign In':'Create Account'}</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

// ── ROOT APP ──────────────────────────────────────────────────────────────────
export default function JournifiApp() {
  const [session,setSession]=useState(null);
  const [loading,setLoading]=useState(true);
  const [trades,setTrades]=useState([]);
  const [strategies,setStrategies]=useState([]);
  const [showTradeModal,setShowTradeModal]=useState(false);
  const [darkMode,setDarkMode]=useState(true);
  const [tab,setTab]=useState('dashboard');
  const [view,setView]=useState('landing');

  useEffect(()=>{
    const sb=getSupabase();if(!sb)return;
    sb.auth.getSession().then(({data:{session}})=>{setSession(session);setLoading(false);if(session){fetchAll(session.user.id);setView('app');}});
    const{data:{subscription}}=sb.auth.onAuthStateChange((_e,session)=>{setSession(session);if(session){fetchAll(session.user.id);setView('app');}else setView('landing');});
    return()=>subscription.unsubscribe();
  },[]);

  async function fetchAll(userId){
    const sb=getSupabase();
    const[{data:t},{data:s}]=await Promise.all([
      sb.from('trades').select('*').eq('user_id',userId).order('date',{ascending:false}),
      sb.from('strategies').select('*').eq('user_id',userId).order('created_at',{ascending:false}),
    ]);
    if(t)setTrades(t);if(s)setStrategies(s);
  }

  async function handleNoTrade(){
    const sb=getSupabase();
    const today=new Date().toISOString().split('T')[0];
    const{error}=await sb.from('trades').insert({user_id:session.user.id,date:today,asset_type:'options',ticker:'NO TRADE',direction:'LONG',pnl:0,outcome:'BREAKEVEN',notes:'Trading conditions did not meet criteria. Stayed out.',setup:'No setup — conditions not met'});
    if(!error)fetchAll(session.user.id);
  }

  async function handleDelete(id){
    if(!confirm('Delete this trade?'))return;
    const sb=getSupabase();
    await sb.from('trades').delete().eq('id',id);
    fetchAll(session.user.id);
  }

  async function handleLogout(){const sb=getSupabase();await sb.auth.signOut();setSession(null);setTrades([]);setStrategies([]);setView('landing');}

  const d=darkMode;
  const T={
    pageBg:d?'linear-gradient(135deg,#0a0c14 0%,#0d1117 50%,#0a0e1a 100%)':'linear-gradient(135deg,#e8edf5 0%,#f0f4fa 50%,#e4eaf3 100%)',
    glassBg:d?'rgba(255,255,255,0.04)':'rgba(255,255,255,0.65)',
    glassBorder:d?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.08)',
    headerBg:d?'rgba(10,12,20,0.9)':'rgba(255,255,255,0.9)',
    inputBg:d?'rgba(255,255,255,0.05)':'rgba(0,0,0,0.04)',
    inputBorder:d?'rgba(255,255,255,0.1)':'rgba(0,0,0,0.12)',
    modalBg:d?'rgba(13,15,24,0.97)':'rgba(255,255,255,0.97)',
    tableBorder:d?'rgba(255,255,255,0.04)':'rgba(0,0,0,0.05)',
    sidebarBg:d?'rgba(10,12,20,0.95)':'rgba(255,255,255,0.95)',
    text:d?'#e8edf5':'#0d1117',
    textMuted:d?'#6b7280':'#6b7280',
    textFaint:d?'#2d3748':'#e2e8f0',
    accent:'#00C4B4',
    accentDim:d?'rgba(0,196,180,0.1)':'rgba(0,196,180,0.08)',
    green:'#22c55e',greenBg:d?'rgba(34,197,94,0.12)':'rgba(34,197,94,0.1)',
    red:'#ef4444',redBg:d?'rgba(239,68,68,0.12)':'rgba(239,68,68,0.1)',
    orb1:d?'rgba(0,196,180,0.07)':'rgba(0,196,180,0.09)',
    orb2:d?'rgba(99,102,241,0.05)':'rgba(99,102,241,0.07)',
  };

  const css=`
    *{box-sizing:border-box;margin:0;padding:0;}body{margin:0;}
    ::-webkit-scrollbar{width:4px;height:4px;}::-webkit-scrollbar-track{background:transparent;}::-webkit-scrollbar-thumb{background:${T.textFaint};border-radius:2px;}
    input[type=date]::-webkit-calendar-picker-indicator{filter:${d?'invert(1)':'none'};opacity:.4;}
    input[type=time]::-webkit-calendar-picker-indicator{filter:${d?'invert(1)':'none'};opacity:.4;}
    select option{background:${d?'#0d1117':'#fff'};color:${T.text};}
    @keyframes spin{to{transform:rotate(360deg);}}
    @keyframes fadeIn{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
    @keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.4;}}
    @keyframes bounce{0%,100%{transform:translateX(-50%) translateY(0);}50%{transform:translateX(-50%) translateY(-8px);}}
    .trow:hover td{background:${d?'rgba(255,255,255,0.02)':'rgba(0,0,0,0.02)'};}
    .sidebar-item:hover{background:${d?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.05)'}!important;}
  `;

  if(loading) return(
    <><style>{css}</style>
    <div style={{display:'flex',justifyContent:'center',alignItems:'center',minHeight:'100vh',background:T.pageBg}}>
      <div style={{width:36,height:36,border:`3px solid ${T.textFaint}`,borderTop:`3px solid ${T.accent}`,borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
    </div></>
  );

  if(view==='landing') return <><style>{css}</style><LandingPage T={T} d={d} onLogin={()=>setView('login')} onSignup={()=>setView('signup')} onToggleDark={()=>setDarkMode(!d)}/></>;
  if(view==='login'||view==='signup') return <><style>{css}</style><AuthPage T={T} d={d} mode={view} onToggleDark={()=>setDarkMode(!d)} onBack={()=>setView('landing')}/></>;

  const TABS=[
    {id:'dashboard',icon:'🏠',label:'Dashboard'},
    {id:'trades',icon:'📈',label:'Trades'},
    {id:'pnl',icon:'💰',label:'P&L'},
    {id:'strategies',icon:'🎯',label:'Strategies'},
    {id:'pricing',icon:'💎',label:'Pricing'},
    {id:'about',icon:'✦',label:'About'},
    {id:'support',icon:'💬',label:'Support'},
  ];

  return (
    <><style>{css}</style>
    <div style={{display:'flex',minHeight:'100vh',background:T.pageBg,color:T.text,fontFamily:"'IBM Plex Sans',system-ui,sans-serif",position:'relative'}}>
      <div style={{position:'fixed',width:800,height:800,borderRadius:'50%',background:T.orb1,filter:'blur(100px)',top:-200,right:-200,pointerEvents:'none',zIndex:0}}/>
      <div style={{position:'fixed',width:500,height:500,borderRadius:'50%',background:T.orb2,filter:'blur(100px)',bottom:-100,left:-100,pointerEvents:'none',zIndex:0}}/>

      {/* LEFT SIDEBAR */}
      <aside style={{width:220,flexShrink:0,background:T.sidebarBg,backdropFilter:'blur(24px)',WebkitBackdropFilter:'blur(24px)',borderRight:`1px solid ${T.glassBorder}`,display:'flex',flexDirection:'column',position:'fixed',top:0,left:0,bottom:0,zIndex:50}}>
        {/* Logo */}
        <div style={{padding:'20px 16px 16px',borderBottom:`1px solid ${T.glassBorder}`}}>
          <Logo light={!d} size="sm"/>
          <p style={{fontSize:10,color:T.textMuted,marginTop:6,letterSpacing:'0.04em'}}>Your financial journey, logged.</p>
        </div>

        {/* Nav */}
        <nav style={{flex:1,padding:'12px 8px',display:'flex',flexDirection:'column',gap:2,overflowY:'auto'}}>
          {TABS.map(t=>(
            <button key={t.id} className="sidebar-item" onClick={()=>setTab(t.id)} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:10,border:'none',background:tab===t.id?T.accent:T.glassBg,color:tab===t.id?'#000':T.textMuted,fontSize:14,fontWeight:tab===t.id?700:400,cursor:'pointer',textAlign:'left',transition:'all 0.15s',width:'100%'}}>
              <span style={{fontSize:16}}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>

        {/* Bottom */}
        <div style={{padding:'12px 8px',borderTop:`1px solid ${T.glassBorder}`,display:'flex',flexDirection:'column',gap:8}}>
          <button onClick={()=>setDarkMode(!d)} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:10,border:'none',background:T.glassBg,color:T.textMuted,fontSize:13,cursor:'pointer',textAlign:'left',width:'100%'}}>
            <span>{d?'☀️':'🌙'}</span>{d?'Light Mode':'Dark Mode'}
          </button>
          <div style={{padding:'8px 12px',fontSize:11,color:T.textMuted,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{session?.user?.email}</div>
          <button onClick={handleLogout} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:10,border:`1px solid ${T.glassBorder}`,background:'transparent',color:T.textMuted,fontSize:13,cursor:'pointer',textAlign:'left',width:'100%'}}>
            <span>🚪</span>Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div style={{flex:1,marginLeft:220,display:'flex',flexDirection:'column',position:'relative',zIndex:1}}>


        {/* Page content */}
        <main style={{padding:'24px',flex:1}}>
          {tab==='dashboard'&&<DashboardTab trades={trades} strategies={strategies} T={T} onAddTrade={()=>setShowTradeModal(true)}/>}
          {tab==='trades'&&<TradesTab trades={trades} T={T} strategies={strategies} onAddTrade={()=>setShowTradeModal(true)} onNoTrade={handleNoTrade} onDelete={handleDelete}/>}
          {tab==='pnl'&&<PnlTab trades={trades} T={T}/>}
          {tab==='strategies'&&<StrategiesTab trades={trades} strategies={strategies} T={T} session={session} onRefresh={()=>fetchAll(session.user.id)}/>}
          {tab==='pricing'&&(
            <div style={{padding:'40px 0',maxWidth:1100,margin:'0 auto'}}>
              <div style={{textAlign:'center',marginBottom:40}}>
                <h1 style={{fontSize:36,fontWeight:800,color:T.text,letterSpacing:'-1px',marginBottom:12}}>Plans for every trader</h1>
                <p style={{color:T.textMuted,fontSize:16}}>Start free. Upgrade when ready. Cancel anytime.</p>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:20}}>
                {[{name:'Starter',price:'$19.99',color:'#6b7280',features:['Unlimited trades','All asset types','Basic analytics','Strategy tracking','Monthly challenge']},{name:'Pro',price:'$29.99',color:T.accent,popular:true,features:['Everything in Starter','IBKR auto-sync','Advanced analytics + charts','P&L calendar','Time of day breakdown','Learning Hub']},{name:'Elite',price:'$49.99',color:'#a78bfa',features:['Everything in Pro','AI chart analysis','AI trade coaching','Pre-market AI briefing','Weekly performance report','Priority support']}].map(plan=>(
                  <div key={plan.name} style={{background:plan.popular?`linear-gradient(135deg,${T.accent}15,${T.accent}08)`:T.glassBg,backdropFilter:'blur(20px)',border:`1px solid ${plan.popular?T.accent+'44':T.glassBorder}`,borderRadius:20,padding:28,position:'relative',display:'flex',flexDirection:'column'}}>
                    {plan.popular&&<div style={{position:'absolute',top:-12,left:'50%',transform:'translateX(-50%)',background:T.accent,color:'#000',fontSize:11,fontWeight:700,padding:'4px 14px',borderRadius:20,whiteSpace:'nowrap'}}>MOST POPULAR</div>}
                    <div style={{fontSize:12,fontWeight:700,color:plan.color,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:8}}>{plan.name}</div>
                    <div style={{fontSize:38,fontWeight:800,color:T.text,letterSpacing:'-1px',marginBottom:20}}>{plan.price}<span style={{fontSize:14,fontWeight:400,color:T.textMuted}}>/mo</span></div>
                    {plan.features.map(f=>(<div key={f} style={{display:'flex',gap:10,marginBottom:10}}><span style={{color:T.green,flexShrink:0}}>✓</span><span style={{color:T.text,fontSize:13}}>{f}</span></div>))}
                    <button style={{width:'100%',padding:'13px',background:plan.popular?T.accent:'transparent',color:plan.popular?'#000':T.text,border:`1px solid ${plan.popular?T.accent:T.glassBorder}`,borderRadius:12,fontSize:15,fontWeight:700,cursor:'pointer',marginTop:'auto',paddingTop:20}}>Get Started</button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {tab==='about'&&(
            <div style={{maxWidth:800,margin:'0 auto',padding:'40px 0'}}>
              <div style={{textAlign:'center',marginBottom:48}}>
                <h1 style={{fontSize:36,fontWeight:800,color:T.text,letterSpacing:'-1px',marginBottom:16}}>Built by a trader.<br/>For every trader.</h1>
                <p style={{color:T.textMuted,fontSize:16,lineHeight:1.8,maxWidth:600,margin:'0 auto'}}>Journifi was born from a simple frustration — when you're learning to trade, there's no single place that tracks ALL your trades, shows your patterns, holds you accountable to your rules, and teaches you at the same time.</p>
              </div>
              {[{icon:'📉',title:'The Problem',body:"Most traders lose money not because they don't have a strategy — but because they don't follow it. Revenge trades. Early exits. Broken rules. A month later you can't even remember what happened."},{icon:'💡',title:'The Idea',body:'Financial + Journey = Journifi. Every trade is a step in your financial journey. Journifi is the memory bank — the chart, the setup, the outcome, the lesson. All in one place.'},{icon:'🎯',title:'The Mission',body:'To give every trader — beginner to advanced, stocks to options to forex to crypto — the tools that professional prop firms give their traders. A structured journal. Real analytics. Honest feedback.'},{icon:'🚀',title:"Where We're Going",body:'AI chart analysis. Strategy rule tracking with P&L impact. Learning hub. Monthly challenges. IBKR auto-sync. A community. This is just the beginning.'}].map(item=>(
                <div key={item.title} style={{background:T.glassBg,backdropFilter:'blur(20px)',border:`1px solid ${T.glassBorder}`,borderRadius:16,padding:28,marginBottom:16}}>
                  <div style={{fontSize:28,marginBottom:12}}>{item.icon}</div>
                  <h3 style={{fontSize:18,fontWeight:700,color:T.text,marginBottom:10}}>{item.title}</h3>
                  <p style={{color:T.textMuted,fontSize:14,lineHeight:1.8}}>{item.body}</p>
                </div>
              ))}
              <div style={{background:`linear-gradient(135deg,${T.accent}15,${T.accent}05)`,border:`1px solid ${T.accent}33`,borderRadius:16,padding:'32px 28px',textAlign:'center'}}>
                <div style={{fontSize:32,marginBottom:12}}>👋</div>
                <h3 style={{fontSize:20,fontWeight:700,color:T.text,marginBottom:10}}>From the founder</h3>
                <p style={{color:T.textMuted,fontSize:14,lineHeight:1.8,maxWidth:540,margin:'0 auto'}}>"I'm Abhilash Rishi — AZ truck driver, day trader, and content creator. I built Journifi because I needed it myself. If it helps one trader stop repeating the same mistakes, it's worth it."</p>
                <p style={{color:T.accent,fontWeight:600,fontSize:14,marginTop:16}}>— Abhilash Rishi, Founder · Journifi</p>
              </div>
            </div>
          )}
          {tab==='support'&&(
            <div style={{maxWidth:700,margin:'0 auto',padding:'40px 0'}}>
              <div style={{textAlign:'center',marginBottom:40}}>
                <h1 style={{fontSize:36,fontWeight:800,color:T.text,letterSpacing:'-1px',marginBottom:12}}>Support Center</h1>
                <p style={{color:T.textMuted,fontSize:16}}>Find answers or reach out — we respond within 24 hours.</p>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:32}}>
                {[{icon:'✉️',title:'Email',desc:'support@journifi.app',sub:'24hr response'},{icon:'💬',title:'Discord',desc:'Community (coming soon)',sub:'Chat with traders'}].map(c=>(
                  <div key={c.title} style={{background:T.glassBg,backdropFilter:'blur(20px)',border:`1px solid ${T.glassBorder}`,borderRadius:14,padding:'20px',textAlign:'center'}}>
                    <div style={{fontSize:28,marginBottom:10}}>{c.icon}</div>
                    <div style={{fontWeight:700,color:T.text,fontSize:15,marginBottom:4}}>{c.title}</div>
                    <div style={{color:T.accent,fontSize:13,marginBottom:4}}>{c.desc}</div>
                    <div style={{color:T.textMuted,fontSize:12}}>{c.sub}</div>
                  </div>
                ))}
              </div>
              {[['How do I log a trade?','Click "+ Add Trade" on the Trades tab. Select your asset type first — options, stocks, forex, futures, or crypto. Fields change based on what you pick. P&L calculates automatically.'],['What asset types are supported?','Options, Stocks, Forex, Futures, and Crypto. All can be logged manually. IBKR auto-sync coming soon.'],['How do strategies work?','Go to Strategies tab. Create a strategy with your custom rules. Tag trades to it and see the P&L impact of following vs breaking your rules.'],['How do I delete a trade?','Click the 🗑 delete button on the right side of any trade row. You will be asked to confirm.'],["Is my data private?",'Yes. All data is encrypted via Supabase and never shared or sold.'],['How do I cancel?','Email support@journifi.app. Stripe billing management coming soon.']].map(([q,a],i)=>{
                const[open,setOpen]=useState(false);
                return(
                  <div key={q} style={{background:T.glassBg,backdropFilter:'blur(20px)',border:`1px solid ${open?T.accent+'44':T.glassBorder}`,borderRadius:12,marginBottom:8,overflow:'hidden'}}>
                    <button onClick={()=>setOpen(!open)} style={{width:'100%',padding:'16px 20px',background:'transparent',border:'none',color:T.text,fontSize:14,fontWeight:600,cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center',textAlign:'left'}}>
                      {q}<span style={{color:T.accent,fontSize:18,transform:open?'rotate(45deg)':'none',transition:'transform 0.2s',flexShrink:0,marginLeft:12}}>+</span>
                    </button>
                    {open&&<div style={{padding:'0 20px 16px',color:T.textMuted,fontSize:14,lineHeight:1.7}}>{a}</div>}
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {showTradeModal&&<TradeModal T={T} session={session} strategies={strategies} onClose={()=>setShowTradeModal(false)} onSaved={()=>fetchAll(session.user.id)}/>}
    </div></>
  );
}

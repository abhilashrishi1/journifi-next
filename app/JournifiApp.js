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

export default function JournifiApp() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [trades, setTrades] = useState([]);

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
      options: { redirectTo: window.location.origin }
    });
  }

  async function handleLogout() {
    const sb = getSupabase();
    await sb.auth.signOut();
    setSession(null);
    setTrades([]);
  }

  if (loading) return (
    <div style={styles.center}>
      <div style={styles.spinner} />
    </div>
  );

  if (!session) return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.logo}>Journifi</h1>
        <p style={styles.tagline}>Your options trade journal</p>

        <button onClick={handleGoogleLogin} style={styles.googleBtn}>
          Continue with Google
        </button>

        <div style={styles.divider}><span>or</span></div>

        <form onSubmit={handleEmailLogin}>
          <input
            style={styles.input}
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <input
            style={styles.input}
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          {authError && <p style={styles.error}>{authError}</p>}
          <button type="submit" style={styles.submitBtn}>Sign In</button>
        </form>
      </div>
    </div>
  );

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.logo}>Journifi</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={styles.userEmail}>{session.user.email}</span>
          <button onClick={handleLogout} style={styles.logoutBtn}>Sign Out</button>
        </div>
      </header>

      <main style={styles.main}>
        <h2 style={styles.sectionTitle}>Trade Journal</h2>
        {trades.length === 0 ? (
          <p style={styles.empty}>No trades yet. Add your first trade to get started.</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                {['Date','Ticker','Type','Strike','Expiry','P&L','Notes'].map(h => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trades.map(t => (
                <tr key={t.id} style={styles.tr}>
                  <td style={styles.td}>{t.date}</td>
                  <td style={styles.td}>{t.ticker}</td>
                  <td style={styles.td}>{t.option_type}</td>
                  <td style={styles.td}>{t.strike}</td>
                  <td style={styles.td}>{t.expiry}</td>
                  <td style={{...styles.td, color: t.pnl >= 0 ? '#4ade80' : '#f87171'}}>
                    {t.pnl >= 0 ? '+' : ''}{t.pnl}
                  </td>
                  <td style={styles.td}>{t.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: '#0F1117', color: '#fff', fontFamily: "'IBM Plex Sans', sans-serif" },
  center: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#0F1117' },
  spinner: { width: 36, height: 36, border: '3px solid #333', borderTop: '3px solid #00C4B4', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  card: { maxWidth: 400, margin: '0 auto', padding: '60px 32px', display: 'flex', flexDirection: 'column', gap: 16 },
  logo: { margin: 0, fontSize: 32, fontWeight: 700, color: '#00C4B4', letterSpacing: '-1px' },
  tagline: { margin: 0, color: '#888', fontSize: 14 },
  googleBtn: { background: '#fff', color: '#111', border: 'none', borderRadius: 8, padding: '12px 16px', fontSize: 15, fontWeight: 600, cursor: 'pointer', width: '100%' },
  divider: { textAlign: 'center', color: '#555', fontSize: 13 },
  input: { display: 'block', width: '100%', padding: '11px 14px', marginBottom: 10, background: '#1A1D27', border: '1px solid #2a2d3a', borderRadius: 8, color: '#fff', fontSize: 14, boxSizing: 'border-box' },
  submitBtn: { width: '100%', padding: '12px', background: '#00C4B4', color: '#000', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer' },
  error: { color: '#f87171', fontSize: 13, margin: '4px 0' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 32px', borderBottom: '1px solid #1e2030' },
  userEmail: { color: '#888', fontSize: 13 },
  logoutBtn: { background: 'transparent', color: '#888', border: '1px solid #333', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 13 },
  main: { padding: '32px' },
  sectionTitle: { fontSize: 20, fontWeight: 600, marginBottom: 20 },
  empty: { color: '#555', fontSize: 14 },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '10px 14px', borderBottom: '1px solid #1e2030', color: '#888', fontSize: 12, fontWeight: 500 },
  td: { padding: '12px 14px', borderBottom: '1px solid #111', fontSize: 14 },
  tr: { transition: 'background 0.15s' },
};

# Journifi — Next.js + Supabase

## Setup Steps

### 1. Run Supabase Schema
Go to Supabase → SQL Editor → paste contents of `supabase-schema.sql` → Run

### 2. Enable Google Auth in Supabase
Go to Supabase → Authentication → Providers → Google → Enable
Add your Google OAuth credentials (from console.cloud.google.com)

### 3. Environment Variables on Vercel
Add these in Vercel → Settings → Environment Variables:
```
NEXT_PUBLIC_SUPABASE_URL=https://wldkrgiojrustsmgzitk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
CRON_SECRET=any_random_string_you_choose
IBKR_FLEX_TOKEN=your_ibkr_flex_token
IBKR_FLEX_QUERY_ID=your_ibkr_flex_query_id
```

### 4. Deploy to Vercel
- Create new GitHub repo named "journifi-v2"
- Push this folder to it
- Import on Vercel → it auto-detects Next.js
- Add env vars above
- Deploy

### 5. IBKR Flex Query Setup
1. Log into IBKR → Reports → Flex Queries
2. Create new query → name "JournifiSync"
3. Add section: Trade Confirmations
4. Fields: Symbol, TradeDate, BuySell, Price, Quantity, IBOrderID
5. Delivery: On Demand
6. Save → note the Query ID and Token
7. Add both to Vercel env vars

### Auto-sync Schedule
`vercel.json` runs `/api/sync` every weekday at 9 PM UTC (after market close).

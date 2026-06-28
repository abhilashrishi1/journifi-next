-- Run this in Supabase SQL Editor

-- Users table (extends Supabase auth)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique,
  role text default 'user',
  max_loss numeric default 300,
  daily_goal numeric default 100,
  created_at timestamptz default now()
);

-- Trades table
create table if not exists public.trades (
  id text primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  date date not null,
  symbol text not null,
  exit_type text default 'MARKET',
  pnl numeric not null,
  created_at timestamptz default now()
);

-- Trade notes table
create table if not exists public.trade_notes (
  trade_id text references public.trades(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  setup text,
  psychology text,
  notes text,
  primary key (trade_id, user_id)
);

-- Checklist table
create table if not exists public.checklists (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  date date not null,
  items jsonb default '{}',
  unique(user_id, date)
);

-- Enable Row Level Security
alter table public.profiles enable row level security;
alter table public.trades enable row level security;
alter table public.trade_notes enable row level security;
alter table public.checklists enable row level security;

-- RLS Policies: users can only see their own data
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

create policy "Users can view own trades" on public.trades for select using (auth.uid() = user_id);
create policy "Users can insert own trades" on public.trades for insert with check (auth.uid() = user_id);
create policy "Users can delete own trades" on public.trades for delete using (auth.uid() = user_id);

create policy "Users can manage own notes" on public.trade_notes for all using (auth.uid() = user_id);
create policy "Users can manage own checklists" on public.checklists for all using (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.raw_user_meta_data->>'username');
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

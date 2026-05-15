create table if not exists public.historical_candles (
  id bigint generated always as identity primary key,
  exchange text not null,
  symbol_token text not null,
  interval text not null,
  candle_time timestamptz not null,
  open double precision not null,
  high double precision not null,
  low double precision not null,
  close double precision not null,
  volume double precision not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists historical_candles_unique_idx
  on public.historical_candles (exchange, symbol_token, interval, candle_time);

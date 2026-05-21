-- ============================================================
-- 0004 — Seed tickers + per-ticker chat rooms
-- ============================================================

insert into public.tickers (symbol, market, name) values
  -- US
  ('AAPL',  'US', 'Apple Inc.'),
  ('MSFT',  'US', 'Microsoft'),
  ('GOOGL', 'US', 'Alphabet'),
  ('AMZN',  'US', 'Amazon'),
  ('NVDA',  'US', 'NVIDIA'),
  ('META',  'US', 'Meta Platforms'),
  ('TSLA',  'US', 'Tesla'),
  ('AMD',   'US', 'AMD'),
  ('NFLX',  'US', 'Netflix'),
  ('BABA',  'US', 'Alibaba ADR'),
  -- A-shares
  ('600519','CN', '贵州茅台'),
  ('601318','CN', '中国平安'),
  ('000001','CN', '平安银行'),
  ('000858','CN', '五粮液'),
  ('600036','CN', '招商银行'),
  ('000333','CN', '美的集团'),
  ('300750','CN', '宁德时代'),
  ('600276','CN', '恒瑞医药')
on conflict (symbol) do nothing;

-- per-ticker chat rooms
insert into public.chat_rooms (slug, name, kind, ref_symbol)
select 'ticker:' || symbol, symbol, 'ticker', symbol from public.tickers
on conflict (slug) do nothing;

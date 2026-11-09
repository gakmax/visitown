-- Phase 2 5단계: Supabase SQL Editor에서 한 번 실행한다.
create table if not exists sites (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  domain text not null,
  allowed_origins text[] not null default '{}',
  created_at timestamptz not null default now()
);
create table if not exists page_mappings (
  id bigserial primary key,
  site_id text not null references sites(id) on delete cascade,
  path_pattern text not null,
  building_key text not null,
  building_name text not null,
  sort int not null default 0
);
create table if not exists events (
  id text primary key,                 -- event_id. 중복은 on conflict do nothing
  site_id text not null references sites(id) on delete cascade,
  session_id text not null,
  event_type text not null,
  page_path text not null,
  properties jsonb not null default '{}',
  is_bot boolean not null default false,
  occurred_at timestamptz not null
);
create index if not exists events_site_time on events (site_id, occurred_at desc);
create table if not exists page_daily (
  site_id text not null references sites(id) on delete cascade,
  day date not null,
  page_path text not null,
  views int not null default 0,
  sessions int not null default 0,
  bots int not null default 0,
  primary key (site_id, day, page_path)
);
alter table sites enable row level security;
alter table page_mappings enable row level security;
alter table events enable row level security;
alter table page_daily enable row level security;
create policy "owner reads sites" on sites for select using (owner_id = auth.uid());
create policy "owner writes sites" on sites for insert with check (owner_id = auth.uid());
create policy "owner reads mappings" on page_mappings for select using (exists (select 1 from sites s where s.id = site_id and s.owner_id = auth.uid()));
create policy "owner reads events" on events for select using (exists (select 1 from sites s where s.id = site_id and s.owner_id = auth.uid()));
create policy "owner reads daily" on page_daily for select using (exists (select 1 from sites s where s.id = site_id and s.owner_id = auth.uid()));
-- 서버는 service role 키로 쓰므로 RLS를 우회한다. 일별 집계와 원본 정리는 맨 아래 vt_rollup / vt_prune 함수(서버 타이머가 부른다).

-- 2026-10-27 건물 자리·종류 (설정 화면에서 건물 개수·종류를 바꾸려면 한 번 실행)
alter table page_mappings add column if not exists building_kind text;   -- plaza·shop·library·community·home·checkout·cafe·school·clinic·post·factory·park
alter table page_mappings add column if not exists slot int;             -- 0=광장, 1~5 안쪽 고리, 6~11 바깥 고리
update page_mappings set building_kind = case building_key when '/' then 'plaza' when '/products' then 'shop' when '/search' then 'library' when '/community' then 'community' when '/mypage' then 'home' when '/checkout' then 'checkout' else 'shop' end where building_kind is null;
-- 2026-10-27 임베드 키 (OBS·홈페이지 iframe용 읽기 전용 스트림 키. 대시보드 '임베드' 버튼에서 발급·회전)
alter table sites add column if not exists embed_key text unique;
update page_mappings set slot = case building_key when '/' then 0 when '/checkout' then 1 when '/products' then 2 when '/search' then 3 when '/mypage' then 4 when '/community' then 5 end where slot is null;
-- 2026-10-27 이벤트 표현 설정 (대시보드 '이벤트 설정'에서 저장: [{ type, label, effect, sound, notify, value, feed }])
alter table sites add column if not exists event_config jsonb not null default '[]';

-- 2026-10-27 일별 집계 + 원본 이벤트 정리. 서버가 켜질 때와 매시간 rpc로 부른다(server/index.js, 수동은 node server/rollup.js).
-- 원본 events는 EVENT_RETENTION_DAYS(기본 7일)만 두고 page_daily는 무기한. 하루 경계는 ROLLUP_TZ(기본 Asia/Seoul).
-- page_daily: views = 사람 page_view 수, sessions = 그 경로에 이벤트를 남긴 사람 세션 수, bots = 봇 page_view 수. page_path는 실제 경로(건물 매핑 전)
create or replace function vt_rollup(p_days int default 2, p_tz text default 'Asia/Seoul') returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  insert into page_daily (site_id, day, page_path, views, sessions, bots)
  select site_id, (occurred_at at time zone p_tz)::date, page_path,
         count(*) filter (where event_type = 'page_view' and not is_bot),
         count(distinct session_id) filter (where not is_bot),
         count(*) filter (where event_type = 'page_view' and is_bot)
  from events
  where occurred_at >= (((now() at time zone p_tz)::date - p_days)::timestamp at time zone p_tz)
  group by 1, 2, 3
  on conflict (site_id, day, page_path) do update set views = excluded.views, sessions = excluded.sessions, bots = excluded.bots;
  get diagnostics n = row_count; return n;
end $$;
create or replace function vt_prune(p_days int default 7) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  delete from events where occurred_at < now() - make_interval(days => greatest(p_days, 1));
  get diagnostics n = row_count; return n;
end $$;
revoke all on function vt_rollup(int, text) from public, anon, authenticated;  -- 서버(service role)만 부른다
revoke all on function vt_prune(int) from public, anon, authenticated;
create index if not exists page_daily_site_day on page_daily (site_id, day desc);

-- 2026-10-27 멤버 초대. 주인(sites.owner_id) 말고도 같이 보는 사람: viewer는 보기만, editor는 건물·이벤트 설정까지. 초대는 주인이 만든 링크(7일 만료)
create table if not exists site_members (
  site_id text not null references sites(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('viewer', 'editor')),
  name text not null default '',            -- 참여 당시 GitHub 이름(표시용)
  created_at timestamptz not null default now(),
  primary key (site_id, user_id)
);
create table if not exists site_invites (
  token text primary key,
  site_id text not null references sites(id) on delete cascade,
  role text not null check (role in ('viewer', 'editor')),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  uses int not null default 0
);
alter table site_members enable row level security;
alter table site_invites enable row level security;
create policy "member reads own rows" on site_members for select using (user_id = auth.uid());
-- 멤버도 사이트·매핑·이벤트·집계를 읽을 수 있게(대시보드는 서버를 거치지만 정책도 맞춰 둔다). 서브쿼리 안의 열 이름은 반드시 바깥 표로 한정한다
create policy "member reads sites" on sites for select using (exists (select 1 from site_members m where m.site_id = sites.id and m.user_id = auth.uid()));
create policy "member reads mappings" on page_mappings for select using (exists (select 1 from site_members m where m.site_id = page_mappings.site_id and m.user_id = auth.uid()));
create policy "member reads events" on events for select using (exists (select 1 from site_members m where m.site_id = events.site_id and m.user_id = auth.uid()));
create policy "member reads daily" on page_daily for select using (exists (select 1 from site_members m where m.site_id = page_daily.site_id and m.user_id = auth.uid()));
create index if not exists site_invites_site on site_invites (site_id);

-- 2026-10-28 테마 해금. 사이트에 실제로 일어난 일(한국 방문자, 새벽 방문, 나라 3곳 등)로 테마가 열린다. server/unlocks.js가 쓰고 읽는다:
-- { unlocked: { 테마: 열린 시각 }, gifts: [14일 선물로 연 테마], progress: { countries, days, office, pages, returning, stay, night } }
-- null이면 서버가 처음 켜질 때 남은 events·page_daily로 진행도를 채운다
alter table sites add column if not exists unlocks jsonb;

-- 2026-11-02 사이트 단위 일별 집계 site_daily (월간·연말 결산, 아침 요약, 이상 감지의 재료). page_daily는 경로별이라 사람 수를 합치면
-- 부풀어서 따로 둔다. 하루에 한 줄: 사람 세션 수·조회·재방문(revisits)·봇, 나라·기기·유입·캠페인(utm_campaign)별 세션 수, 커스텀 이벤트별 횟수,
-- '매출'을 켠 이벤트(sites.event_config의 value, 기본은 purchase)의 amount 합. vt_rollup이 page_daily와 같이 채운다. 리플레이 메모(note)는 세지 않는다
create table if not exists site_daily (
  site_id text not null references sites(id) on delete cascade,
  day date not null,
  sessions int not null default 0,
  views int not null default 0,
  revisits int not null default 0,
  bots int not null default 0,
  countries jsonb not null default '{}',
  devices jsonb not null default '{}',
  referrers jsonb not null default '{}',
  campaigns jsonb not null default '{}',
  events jsonb not null default '{}',
  revenue numeric not null default 0,
  primary key (site_id, day)
);
-- 2026-11-04 리텐션 코호트(로드맵 49): 그날 시작한 사람 세션을 첫 방문 날짜(SDK가 보내는 properties.first)별로 센다. { "2026-11-01": 12, ... }
-- 코호트 c의 D7 = site_daily[c+7].cohorts[c] ÷ site_daily[c].cohorts[c]. 방문자 ID 없이 날짜 하나로 세므로 세션 단위 근사치다
alter table site_daily add column if not exists cohorts jsonb not null default '{}';
alter table site_daily enable row level security;
create policy "owner reads site_daily" on site_daily for select using (exists (select 1 from sites s where s.id = site_daily.site_id and s.owner_id = auth.uid()));
create policy "member reads site_daily" on site_daily for select using (exists (select 1 from site_members m where m.site_id = site_daily.site_id and m.user_id = auth.uid()));
create or replace function vt_rollup(p_days int default 2, p_tz text default 'Asia/Seoul') returns int
language plpgsql security definer set search_path = public as $$
declare n int; m int; since timestamptz;
begin
  since := (((now() at time zone p_tz)::date - p_days)::timestamp at time zone p_tz);
  insert into page_daily (site_id, day, page_path, views, sessions, bots)
  select site_id, (occurred_at at time zone p_tz)::date, page_path,
         count(*) filter (where event_type = 'page_view' and not is_bot),
         count(distinct session_id) filter (where not is_bot),
         count(*) filter (where event_type = 'page_view' and is_bot)
  from events where occurred_at >= since and event_type <> 'note'
  group by 1, 2, 3
  on conflict (site_id, day, page_path) do update set views = excluded.views, sessions = excluded.sessions, bots = excluded.bots;
  get diagnostics n = row_count;
  with ev as (
    select site_id, (occurred_at at time zone p_tz)::date as day, session_id, event_type, properties, is_bot
    from events where occurred_at >= since and event_type <> 'note'),
  starts as (
    select distinct on (site_id, day, session_id) site_id, day, session_id, properties
    from ev where event_type = 'session_start' and not is_bot order by site_id, day, session_id),
  base as (
    select site_id, day,
           count(distinct session_id) filter (where not is_bot) as sessions,
           count(*) filter (where event_type = 'page_view' and not is_bot) as views,
           count(distinct session_id) filter (where is_bot) as bots
    from ev group by 1, 2),
  ret as (select site_id, day, count(*) filter (where (properties->>'returning')::boolean) as revisits from starts group by 1, 2),
  cty as (select site_id, day, jsonb_object_agg(k, c) as j from (select site_id, day, coalesce(properties->>'country', '?') as k, count(*) as c from starts group by 1, 2, 3) x group by 1, 2),
  dev as (select site_id, day, jsonb_object_agg(k, c) as j from (select site_id, day, coalesce(properties->>'device', '?') as k, count(*) as c from starts group by 1, 2, 3) x group by 1, 2),
  ref as (select site_id, day, jsonb_object_agg(k, c) as j from (select site_id, day, coalesce(properties->>'referrer', 'direct') as k, count(*) as c from starts group by 1, 2, 3) x group by 1, 2),
  cmp as (select site_id, day, jsonb_object_agg(k, c) as j from (select site_id, day, properties->>'utm_campaign' as k, count(*) as c from starts where properties->>'utm_campaign' is not null group by 1, 2, 3) x group by 1, 2),
  coh as (select site_id, day, jsonb_object_agg(k, c) as j from (select site_id, day, properties->>'first' as k, count(*) as c from starts where properties->>'first' ~ '^\d{4}-\d{2}-\d{2}$' group by 1, 2, 3) x group by 1, 2),
  cev as (select site_id, day, jsonb_object_agg(k, c) as j from (select site_id, day, event_type as k, count(*) as c from ev where not is_bot and event_type not in ('session_start', 'page_view', 'heartbeat', 'page_leave') group by 1, 2, 3) x group by 1, 2),
  rev as (
    select e.site_id, e.day, sum((e.properties->>'amount')::numeric) as revenue
    from ev e where not e.is_bot and (e.properties->>'amount') ~ '^-?[0-9]+(\.[0-9]+)?$'
      and coalesce((select (c->>'value')::boolean from sites s cross join jsonb_array_elements(s.event_config) c where s.id = e.site_id and c->>'type' = e.event_type limit 1), e.event_type = 'purchase')
    group by 1, 2)
  insert into site_daily (site_id, day, sessions, views, revisits, bots, countries, devices, referrers, campaigns, events, revenue, cohorts)
  select b.site_id, b.day, b.sessions, b.views, coalesce(r.revisits, 0), b.bots,
         coalesce(cty.j, '{}'), coalesce(dev.j, '{}'), coalesce(ref.j, '{}'), coalesce(cmp.j, '{}'), coalesce(cev.j, '{}'), coalesce(rev.revenue, 0), coalesce(coh.j, '{}')
  from base b
  left join ret r using (site_id, day) left join cty using (site_id, day) left join dev using (site_id, day)
  left join ref using (site_id, day) left join cmp using (site_id, day) left join cev using (site_id, day) left join rev using (site_id, day) left join coh using (site_id, day)
  on conflict (site_id, day) do update set sessions = excluded.sessions, views = excluded.views, revisits = excluded.revisits, bots = excluded.bots,
    countries = excluded.countries, devices = excluded.devices, referrers = excluded.referrers, campaigns = excluded.campaigns, events = excluded.events, revenue = excluded.revenue, cohorts = excluded.cohorts;
  get diagnostics m = row_count; return n + m;
end $$;
revoke all on function vt_rollup(int, text) from public, anon, authenticated;

-- 2026-11-02 웹훅 알림 + 방문자용 미니 위젯
alter table sites add column if not exists webhook jsonb;                       -- { url, events, quiet, anomaly, daily, online } 슬랙·디스코드 (server/alerts.js)
alter table sites add column if not exists widget boolean not null default false; -- 사이트 방문자에게 미니 위젯(마을 버튼)을 보여 줄지. 켜면 임베드 키가 방문자에게 공개된다

-- 2026-11-02 공개 마을 구경(로드맵 23): 주인이 켠 사이트만 GET /api/public/sites 목록에 오른다(이름·도메인·접속자 수·임베드 키). 기본 비공개
alter table sites add column if not exists public boolean not null default false;

-- 2026-11-04 수평 확장(로드맵 46): 인스턴스 여러 대 중 "한 번만" 할 일(일별 집계·원본 정리·웹훅·아침 요약)을 맡을 리더 임대.
-- 서버가 10초마다 vt_lease('leader', 인스턴스ID, 30)을 부르고 true를 받은 쪽이 리더. 임대가 30초 지나면 다른 인스턴스가 가져간다. 함수가 없으면 서버는 혼자라고 보고 리더로 돈다
create table if not exists vt_lease (name text primary key, holder text not null, until timestamptz not null);
alter table vt_lease enable row level security;
create or replace function vt_lease(p_name text, p_holder text, p_ttl int default 30) returns boolean
language plpgsql security definer set search_path = public as $$
declare r vt_lease;
begin
  insert into vt_lease (name, holder, until) values (p_name, p_holder, now() + make_interval(secs => p_ttl))
  on conflict (name) do update set holder = excluded.holder, until = excluded.until
    where vt_lease.holder = excluded.holder or vt_lease.until < now()
  returning * into r;
  return coalesce(r.holder = p_holder, false);
end $$;
revoke all on function vt_lease(text, text, int) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2026-11-09 보안 S-32·S-33 (docs/security.md): 대시보드·SDK·MCP는 Supabase REST(PostgREST)를 직접 부르지 않고 수집 서버(service role)만 표를 읽고 쓴다.
-- 그런데 Supabase 기본 권한은 anon·authenticated에게 public 스키마의 모든 표를 열어 두고, 위의 RLS 정책이 행을 걸러 줄 뿐 컬럼은 거르지 않는다.
--   S-33: 보기(viewer) 멤버가 익명 키 + 자기 로그인 토큰으로 GET /rest/v1/sites?select=webhook,embed_key 를 부르면 서버가 403으로 막는 웹훅 주소·임베드 키가 그대로 나온다.
--   S-32: "owner writes sites" 정책 때문에 로그인한 누구나 sites 행을 직접 INSERT 할 수 있어 서버의 웹훅 주소 검증·사이트 5개 제한을 건너뛴다.
-- 그래서 두 역할의 표 권한을 전부 거두고(RLS 정책은 심층 방어로 그대로 둔다), 직접 INSERT 정책을 지운다. 수집 서버는 service role이라 영향이 없다.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
drop policy if exists "owner writes sites" on sites;

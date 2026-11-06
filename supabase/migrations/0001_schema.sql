-- Elo: schema, RLS e views de privacidade.
-- Regra de ouro: tabelas pessoais (daily_logs, cycles, share_settings...) só o dono lê/escreve.
-- O parceiro lê dados pessoais do outro SOMENTE pelas views partner_* (security definer),
-- que aplicam share_settings, paused_at e confirmed_at do DONO dos dados.

create extension if not exists pgcrypto;

-- ============ núcleo ============
create table public.couples (
  id uuid primary key default gen_random_uuid(),
  invite_code text not null unique default encode(gen_random_bytes(9), 'hex'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  role text not null check (role in ('her','him')),
  name text not null default '',
  contraception text not null default 'none'
    check (contraception in ('none','hormonal_pill','iud_hormonal','other')),
  avg_cycle_length int not null default 28 check (avg_cycle_length between 15 and 60),
  timezone text not null default 'America/Sao_Paulo',
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  unique (couple_id, role)
);
create index on public.profiles(couple_id);

create table public.share_settings (
  user_id uuid primary key references public.profiles(user_id) on delete cascade,
  share_phase boolean not null default true,
  share_mood text not null default 'full' check (share_mood in ('full','simple','off')),
  share_symptoms text not null default 'category' check (share_symptoms in ('detailed','category','off')),
  paused_at timestamptz,
  -- só depois que ela VIU e confirmou a tela de compartilhamento algo dela chega ao parceiro
  confirmed_at timestamptz
);

create table public.reminder_settings (
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  kind text not null default 'checkin' check (kind in ('checkin','reaction')),
  weekday int not null check (weekday between 0 and 6),
  time time not null,
  enabled boolean not null default true,
  last_sent_on date,
  primary key (user_id, kind, weekday)
);

-- ============ dados pessoais ============
create table public.cycles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  start_date date not null,
  end_date date,
  length_days int,
  created_at timestamptz not null default now(),
  unique (user_id, start_date),
  check (end_date is null or end_date >= start_date)
);
create index on public.cycles(user_id, start_date desc);

create table public.daily_logs (
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  date date not null,
  mood int not null check (mood between 1 and 5),
  energy int check (energy between 1 and 5),
  wants text[] not null default '{}',
  symptoms text[] not null default '{}',
  self_esteem_low boolean not null default false,
  private_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

-- ============ casal ============
create table public.requests (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  from_user uuid not null references public.profiles(user_id) on delete cascade,
  to_user uuid not null references public.profiles(user_id) on delete cascade,
  type text not null,
  custom_text text check (char_length(custom_text) <= 280),
  status text not null default 'open' check (status in ('open','done')),
  done_at timestamptz,
  reaction text check (reaction in ('loved','thanks','next_time')),
  created_at timestamptz not null default now()
);
create index on public.requests(couple_id, status);

create table public.touches (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  from_user uuid not null references public.profiles(user_id) on delete cascade,
  to_user uuid not null references public.profiles(user_id) on delete cascade,
  kind text not null check (kind in ('saudade','pensando','bom_dia','orgulho','ronronar')),
  seen_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.touches(to_user, created_at desc);

create table public.context_items (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  created_by uuid not null references public.profiles(user_id) on delete cascade,
  category text not null check (category in
    ('comida','doce','restaurante','filme','lugar','presente','gesto','irrita','linguagem_amor')),
  title text not null check (char_length(title) between 1 and 120),
  details text,
  tags text[] not null default '{}',
  cost_level int not null default 1 check (cost_level between 1 and 3),
  preferred_by text not null default 'both' check (preferred_by in ('her','him','both')),
  created_at timestamptz not null default now()
);
create index on public.context_items(couple_id);

create table public.pets (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  name text not null,
  photo_path text,
  vaccine_due date,
  dewormer_due date,
  flea_due date,
  created_at timestamptz not null default now()
);

create table public.household (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  task text not null,
  default_owner text not null default 'both' check (default_owner in ('her','him','both')),
  frequency text not null default 'daily' check (frequency in ('daily','weekly','monthly','as_needed')),
  can_take_over boolean not null default true,
  pet_id uuid references public.pets(id) on delete set null,
  is_pet_task boolean not null default false,
  last_done_at timestamptz,
  last_done_by uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.care_actions (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  by_user uuid not null references public.profiles(user_id) on delete cascade,
  for_user uuid not null references public.profiles(user_id) on delete cascade,
  date date not null default current_date,
  suggestion_id uuid,
  context_item_id uuid references public.context_items(id) on delete set null,
  household_id uuid references public.household(id) on delete set null,
  description text not null check (char_length(description) <= 280),
  reaction text check (reaction in ('loved','thanks','next_time')),
  created_at timestamptz not null default now()
);
create index on public.care_actions(couple_id, date desc);

create table public.constraints (
  user_id uuid primary key references public.profiles(user_id) on delete cascade,
  monthly_budget int not null default 300,
  radius_km int not null default 10,
  free_slots jsonb not null default '{}'::jsonb
);

create table public.suggestions (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  for_user uuid not null references public.profiles(user_id) on delete cascade,
  date date not null default current_date,
  items jsonb not null,
  inputs_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index on public.suggestions(for_user, date desc);

create table public.vault_items (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  author uuid not null references public.profiles(user_id) on delete cascade,
  for_user uuid references public.profiles(user_id) on delete cascade,
  kind text not null check (kind in ('photo','phrase','compliment','message','moment')),
  content text,
  storage_path text,
  pet_id uuid references public.pets(id) on delete set null,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.vault_items(couple_id, created_at desc);

create table public.support_messages (
  id serial primary key,
  state text not null check (state in
    ('self_esteem','sad','irritated','tired','happy','him_low','partner_tip_self_esteem',
     'partner_tip_sad','partner_tip_irritated','partner_tip_tired','partner_tip_happy')),
  text text not null
);

create table public.support_shown (
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  message_id int not null references public.support_messages(id) on delete cascade,
  shown_on date not null default current_date,
  primary key (user_id, message_id, shown_on)
);

create table public.safety_net_shown (
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  cycle_start date not null,
  shown_at timestamptz not null default now(),
  primary key (user_id, cycle_start)
);

create table public.checkin_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  token_hash text not null unique,
  label text,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  endpoint text not null unique,
  keys jsonb not null,
  created_at timestamptz not null default now()
);

-- ============ Etapa B ============
create table public.outings (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  week date not null,
  title text not null,
  details text,
  context_item_id uuid references public.context_items(id) on delete set null,
  created_at timestamptz not null default now()
);
create table public.outing_swipes (
  outing_id uuid not null references public.outings(id) on delete cascade,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  yes boolean not null,
  created_at timestamptz not null default now(),
  primary key (outing_id, user_id)
);
create table public.daily_questions (
  id serial primary key,
  text text not null,
  options text[] not null
);
create table public.question_answers (
  question_id int not null references public.daily_questions(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  date date not null,
  option text not null,
  primary key (user_id, date)
);

-- ============ helpers ============
create or replace function public.my_couple_id() returns uuid
language sql stable security definer set search_path = public as $$
  select couple_id from public.profiles where user_id = auth.uid()
$$;

create or replace function public.my_partner_id() returns uuid
language sql stable security definer set search_path = public as $$
  select p.user_id from public.profiles p
  where p.couple_id = (select couple_id from public.profiles where user_id = auth.uid())
    and p.user_id <> auth.uid()
$$;

create or replace function public.symptom_category(s text) returns text
language sql immutable as $$
  select case
    when s in ('colica','dor_cabeca','dor_lombar','dor_corpo','seios_sensiveis','dor') then 'dor'
    when s in ('inchaco','enjoo','intestino') then 'desconforto'
    when s in ('cansaco','insonia','sono') then 'cansaco'
    when s in ('desejo_doce','fome') then 'apetite'
    when s in ('acne','pele') then 'pele'
    when s in ('ansiedade','irritacao','choro') then 'emocional'
    else 'outro' end
$$;

create or replace function public.mood_simple(m int) returns text
language sql immutable as $$
  select case when m is null then null when m <= 2 then 'dificil' when m = 3 then 'mais_ou_menos' else 'bem' end
$$;

-- ============ RLS ============
do $$ declare t text; begin
  foreach t in array array['couples','profiles','share_settings','reminder_settings','cycles','daily_logs',
    'requests','touches','context_items','pets','household','care_actions','constraints','suggestions',
    'vault_items','support_messages','support_shown','safety_net_shown','checkin_tokens','push_subscriptions',
    'outings','outing_swipes','daily_questions','question_answers']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;

-- couples
create policy couples_select on public.couples for select to authenticated using (id = public.my_couple_id());

-- profiles: próprio perfil; o do parceiro só pela view partner_profile
create policy profiles_own_select on public.profiles for select to authenticated using (user_id = auth.uid());
create policy profiles_own_update on public.profiles for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke insert, update, delete on public.profiles from authenticated;
grant update (name, contraception, avg_cycle_length, timezone, onboarded_at) on public.profiles to authenticated;

-- tabelas estritamente pessoais
do $$ declare t text; begin
  foreach t in array array['share_settings','reminder_settings','cycles','daily_logs','constraints',
                           'support_shown','safety_net_shown','push_subscriptions']
  loop
    execute format('create policy %I on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t || '_own', t);
  end loop;
end $$;

-- tokens: dono vê, cria e revoga; nunca troca o hash
create policy tokens_own_select on public.checkin_tokens for select to authenticated using (user_id = auth.uid());
create policy tokens_own_insert on public.checkin_tokens for insert to authenticated with check (user_id = auth.uid());
create policy tokens_own_update on public.checkin_tokens for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke update, delete on public.checkin_tokens from authenticated;
grant update (revoked_at) on public.checkin_tokens to authenticated;

-- pedidos
create policy req_select on public.requests for select to authenticated
  using (couple_id = public.my_couple_id() and auth.uid() in (from_user, to_user));
create policy req_insert on public.requests for insert to authenticated
  with check (from_user = auth.uid() and couple_id = public.my_couple_id() and to_user = public.my_partner_id());
create policy req_update on public.requests for update to authenticated
  using (couple_id = public.my_couple_id() and auth.uid() in (from_user, to_user))
  with check (couple_id = public.my_couple_id());
revoke update on public.requests from authenticated;
grant update (status, done_at, reaction) on public.requests to authenticated;
create policy req_delete on public.requests for delete to authenticated using (from_user = auth.uid());

-- carinhos
create policy touch_select on public.touches for select to authenticated
  using (couple_id = public.my_couple_id() and auth.uid() in (from_user, to_user));
create policy touch_insert on public.touches for insert to authenticated
  with check (from_user = auth.uid() and couple_id = public.my_couple_id() and to_user = public.my_partner_id());
create policy touch_update on public.touches for update to authenticated using (to_user = auth.uid()) with check (to_user = auth.uid());
revoke update, delete on public.touches from authenticated;
grant update (seen_at) on public.touches to authenticated;

-- contexto: os dois leem; só o autor edita
create policy ctx_select on public.context_items for select to authenticated using (couple_id = public.my_couple_id());
create policy ctx_insert on public.context_items for insert to authenticated
  with check (created_by = auth.uid() and couple_id = public.my_couple_id());
create policy ctx_update on public.context_items for update to authenticated
  using (created_by = auth.uid()) with check (created_by = auth.uid() and couple_id = public.my_couple_id());
create policy ctx_delete on public.context_items for delete to authenticated using (created_by = auth.uid());

-- pets e casa: objetos compartilhados do casal
create policy pets_all on public.pets for all to authenticated
  using (couple_id = public.my_couple_id()) with check (couple_id = public.my_couple_id());
create policy house_all on public.household for all to authenticated
  using (couple_id = public.my_couple_id()) with check (couple_id = public.my_couple_id());

-- diário de cuidado: autor cria; quem recebeu reage
create policy care_select on public.care_actions for select to authenticated
  using (couple_id = public.my_couple_id() and auth.uid() in (by_user, for_user));
create policy care_insert on public.care_actions for insert to authenticated
  with check (by_user = auth.uid() and couple_id = public.my_couple_id() and for_user = public.my_partner_id());
create policy care_update on public.care_actions for update to authenticated
  using (for_user = auth.uid()) with check (for_user = auth.uid());
revoke update on public.care_actions from authenticated;
grant update (reaction) on public.care_actions to authenticated;
create policy care_delete on public.care_actions for delete to authenticated using (by_user = auth.uid());

-- sugestões: de cada um
create policy sugg_own on public.suggestions for all to authenticated
  using (for_user = auth.uid()) with check (for_user = auth.uid() and couple_id = public.my_couple_id());

-- cofre: mensagens antecipadas ficam escondidas de quem recebe até serem entregues
create policy vault_select on public.vault_items for select to authenticated using (
  couple_id = public.my_couple_id() and (
    author = auth.uid()
    or (kind <> 'message' and (for_user is null or for_user = auth.uid()))
    or (kind = 'message' and for_user = auth.uid() and delivered_at is not null)
  ));
create policy vault_insert on public.vault_items for insert to authenticated
  with check (author = auth.uid() and couple_id = public.my_couple_id()
              and (for_user is null or for_user in (auth.uid(), public.my_partner_id())));
create policy vault_update on public.vault_items for update to authenticated
  using (author = auth.uid()) with check (author = auth.uid());
create policy vault_delete on public.vault_items for delete to authenticated using (author = auth.uid());

-- conteúdo
create policy support_read on public.support_messages for select to authenticated using (true);
create policy questions_read on public.daily_questions for select to authenticated using (true);
revoke insert, update, delete on public.support_messages, public.daily_questions from authenticated;

-- Etapa B
create policy outings_select on public.outings for select to authenticated using (couple_id = public.my_couple_id());
create policy outings_insert on public.outings for insert to authenticated with check (couple_id = public.my_couple_id());
create policy swipes_own on public.outing_swipes for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and exists (select 1 from public.outings o where o.id = outing_id and o.couple_id = public.my_couple_id()));
create or replace function public.i_answered_on(d date) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.question_answers where user_id = auth.uid() and date = d)
$$;
create policy answers_select on public.question_answers for select to authenticated using (
  user_id = auth.uid() or (couple_id = public.my_couple_id() and public.i_answered_on(date)));
create policy answers_insert on public.question_answers for insert to authenticated
  with check (user_id = auth.uid() and couple_id = public.my_couple_id());

-- ============ views de privacidade (security definer: rodam como dono e filtram explicitamente) ============
create or replace view public.partner_view_daily with (security_barrier = true) as
select
  dl.user_id,
  dl.date,
  case when ss.share_mood = 'full' then dl.mood end as mood,
  case when ss.share_mood in ('full','simple') then public.mood_simple(dl.mood) end as mood_simple,
  case when ss.share_mood = 'full' then dl.energy end as energy,
  case when ss.share_mood <> 'off' then dl.wants end as wants,
  case ss.share_symptoms
    when 'detailed' then dl.symptoms
    when 'category' then (select coalesce(array_agg(distinct public.symptom_category(s)), '{}') from unnest(dl.symptoms) s)
  end as symptoms,
  case when ss.share_mood = 'full' then dl.self_esteem_low end as self_esteem_low,
  dl.updated_at
from public.daily_logs dl
join public.profiles owner on owner.user_id = dl.user_id
join public.share_settings ss on ss.user_id = dl.user_id
where auth.uid() is not null
  and dl.user_id <> auth.uid()
  and owner.couple_id = public.my_couple_id()
  and ss.paused_at is null
  and ss.confirmed_at is not null
  and (ss.share_mood <> 'off' or ss.share_symptoms <> 'off');

create or replace view public.partner_view_cycles with (security_barrier = true) as
select c.user_id, c.start_date, c.end_date, c.length_days
from public.cycles c
join public.profiles owner on owner.user_id = c.user_id
join public.share_settings ss on ss.user_id = c.user_id
where auth.uid() is not null
  and c.user_id <> auth.uid()
  and owner.couple_id = public.my_couple_id()
  and ss.paused_at is null and ss.confirmed_at is not null and ss.share_phase;

create or replace view public.partner_profile with (security_barrier = true) as
select p.user_id, p.couple_id, p.role, p.name, p.timezone,
  case when ss.share_phase and ss.paused_at is null and ss.confirmed_at is not null then p.contraception end as contraception,
  case when ss.share_phase and ss.paused_at is null and ss.confirmed_at is not null then p.avg_cycle_length end as avg_cycle_length,
  (ss.paused_at is not null) as is_paused,
  (ss.confirmed_at is not null) as sharing_confirmed
from public.profiles p
left join public.share_settings ss on ss.user_id = p.user_id
where auth.uid() is not null and p.user_id <> auth.uid() and p.couple_id = public.my_couple_id();

create or replace view public.outing_matches with (security_barrier = true) as
select o.* from public.outings o
where o.couple_id = public.my_couple_id()
  and (select count(*) from public.outing_swipes s where s.outing_id = o.id and s.yes) = 2;

revoke all on public.partner_view_daily, public.partner_view_cycles, public.partner_profile, public.outing_matches from anon, public;
grant select on public.partner_view_daily, public.partner_view_cycles, public.partner_profile, public.outing_matches to authenticated;

-- ============ RPCs ============
create or replace function public.create_couple(p_name text, p_role text) returns public.couples
language plpgsql security definer set search_path = public as $$
declare c public.couples; uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if exists (select 1 from public.profiles where user_id = uid) then raise exception 'already in a couple'; end if;
  if p_role not in ('her','him') then raise exception 'invalid role'; end if;
  insert into public.couples(created_by) values (uid) returning * into c;
  perform public._init_member(uid, c.id, p_role, p_name);
  insert into public.household(couple_id, task, default_owner, frequency, can_take_over, is_pet_task) values
    (c.id, 'Comida dos gatos', 'both', 'daily', true, true),
    (c.id, 'Água fresca dos gatos', 'both', 'daily', true, true),
    (c.id, 'Caixa de areia', 'both', 'daily', true, true),
    (c.id, 'Louça', 'both', 'daily', true, false),
    (c.id, 'Tirar o lixo', 'both', 'daily', true, false),
    (c.id, 'Roupa pra lavar', 'both', 'weekly', true, false),
    (c.id, 'Mercado', 'both', 'weekly', true, false);
  return c;
end $$;

create or replace function public.join_couple(p_code text, p_name text) returns public.couples
language plpgsql security definer set search_path = public as $$
declare c public.couples; uid uuid := auth.uid(); other_role text;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if exists (select 1 from public.profiles where user_id = uid) then raise exception 'already in a couple'; end if;
  select * into c from public.couples where invite_code = p_code;
  if c.id is null then raise exception 'invalid invite'; end if;
  if (select count(*) from public.profiles where couple_id = c.id) >= 2 then raise exception 'couple full'; end if;
  select role into other_role from public.profiles where couple_id = c.id limit 1;
  perform public._init_member(uid, c.id, case when other_role = 'him' then 'her' else 'him' end, p_name);
  return c;
end $$;

create or replace function public._init_member(uid uuid, cid uuid, r text, n text) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(user_id, couple_id, role, name) values (uid, cid, r, coalesce(n, ''));
  -- ela começa com confirmed_at nulo: nada dela sai até ver a tela de compartilhamento
  insert into public.share_settings(user_id, confirmed_at) values (uid, case when r = 'him' then now() end);
  insert into public.constraints(user_id) values (uid);
  insert into public.reminder_settings(user_id, kind, weekday, time, enabled)
  select uid, 'checkin', d, case when d in (0,6) then time '11:00' else time '08:30' end, true from generate_series(0,6) d
  union all
  select uid, 'reaction', d, time '21:00', d not in (0,6) from generate_series(0,6) d;
end $$;
revoke execute on function public._init_member(uuid, uuid, text, text) from public, anon, authenticated;

-- pré-visualização do convite (anon pode ver se o código é válido, nada mais)
create or replace function public.invite_info(p_code text) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object('valid', true, 'inviter', (select name from public.profiles p where p.couple_id = c.id limit 1),
         'full', (select count(*) from public.profiles p where p.couple_id = c.id) >= 2)
  from public.couples c where c.invite_code = p_code
$$;
grant execute on function public.invite_info(text) to anon, authenticated;

-- devolve 1 item do cofre para dias ruins (marca mensagem antecipada como entregue)
create or replace function public.vault_pick() returns setof public.vault_items
language plpgsql security definer set search_path = public as $$
declare v public.vault_items; uid uuid := auth.uid();
begin
  select * into v from public.vault_items
   where couple_id = public.my_couple_id() and kind = 'message' and for_user = uid and delivered_at is null
   order by created_at limit 1;
  if v.id is not null then
    update public.vault_items set delivered_at = now() where id = v.id returning * into v;
    return next v; return;
  end if;
  return query select * from public.vault_items
   where couple_id = public.my_couple_id()
     and (author = uid or (kind <> 'message' and (for_user is null or for_user = uid))
          or (kind = 'message' and for_user = uid and delivered_at is not null))
   order by random() limit 1;
end $$;

-- exportar tudo o que é meu
create or replace function public.export_my_data() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'exported_at', now(),
    'profile', (select row_to_json(p) from public.profiles p where user_id = auth.uid()),
    'share_settings', (select row_to_json(s) from public.share_settings s where user_id = auth.uid()),
    'reminders', (select json_agg(r) from public.reminder_settings r where user_id = auth.uid()),
    'cycles', (select json_agg(c) from public.cycles c where user_id = auth.uid()),
    'daily_logs', (select json_agg(d) from public.daily_logs d where user_id = auth.uid()),
    'requests', (select json_agg(r) from public.requests r where auth.uid() in (from_user, to_user)),
    'touches', (select json_agg(t) from public.touches t where auth.uid() in (from_user, to_user)),
    'care_actions', (select json_agg(c) from public.care_actions c where auth.uid() in (by_user, for_user)),
    'context_items', (select json_agg(c) from public.context_items c where created_by = auth.uid()),
    'vault_items', (select json_agg(v) from public.vault_items v where author = auth.uid()),
    'constraints', (select row_to_json(c) from public.constraints c where user_id = auth.uid()),
    'suggestions', (select json_agg(s) from public.suggestions s where for_user = auth.uid())
  )
$$;

-- duração do ciclo anterior quando um novo começa
create or replace function public._cycle_lengths() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.cycles c set length_days = sub.len
  from (select id, (lead(start_date) over (order by start_date) - start_date) as len
        from public.cycles where user_id = coalesce(new.user_id, old.user_id)) sub
  where c.id = sub.id and c.length_days is distinct from sub.len;
  return null;
end $$;
create trigger cycles_lengths after insert or delete or update of start_date on public.cycles
for each row when (pg_trigger_depth() = 0) execute function public._cycle_lengths();

create or replace function public._touch_updated() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger daily_logs_updated before update on public.daily_logs for each row execute function public._touch_updated();

-- ============ realtime ============
alter publication supabase_realtime add table public.requests, public.touches;

-- ============ storage ============
insert into storage.buckets (id, name, public) values ('elo', 'elo', false) on conflict do nothing;
create policy elo_storage_select on storage.objects for select to authenticated
  using (bucket_id = 'elo' and (storage.foldername(name))[1] = public.my_couple_id()::text);
create policy elo_storage_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'elo' and (storage.foldername(name))[1] = public.my_couple_id()::text);
create policy elo_storage_delete on storage.objects for delete to authenticated
  using (bucket_id = 'elo' and owner_id = auth.uid()::text);

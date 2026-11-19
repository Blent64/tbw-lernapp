-- Einmalig im Supabase "SQL Editor" ausführen.
-- Freiwillige Rangliste: Jeder angemeldete Nutzer darf alle Einträge sehen,
-- aber nur seinen eigenen Eintrag anlegen, ändern oder löschen.

create table if not exists public.rangliste (
  user_id      uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  name         text not null check (char_length(name) between 2 and 20),
  sicher       integer not null default 0,
  gelernt      integer not null default 0,
  prozent      integer not null default 0,
  aktualisiert timestamptz not null default now()
);

alter table public.rangliste enable row level security;

grant select, insert, update, delete on public.rangliste to authenticated;

create policy "Rangliste lesen" on public.rangliste
  for select to authenticated using (true);

create policy "Eigenen Eintrag anlegen" on public.rangliste
  for insert to authenticated with check (auth.uid() = user_id);

create policy "Eigenen Eintrag ändern" on public.rangliste
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Eigenen Eintrag löschen" on public.rangliste
  for delete to authenticated using (auth.uid() = user_id);

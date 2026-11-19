-- Einmalig im Supabase "SQL Editor" ausführen.
-- Legt die Tabelle für den Lernfortschritt an. Jeder Nutzer darf nur seine eigene Zeile sehen und ändern.

create table if not exists public.fortschritt (
  user_id      uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  daten        jsonb not null default '{}'::jsonb,
  aktualisiert timestamptz not null default now()
);

alter table public.fortschritt enable row level security;

-- Angemeldete Nutzer dürfen die Tabelle über die App ansprechen (die Regeln unten begrenzen das auf die eigene Zeile)
grant select, insert, update on public.fortschritt to authenticated;

create policy "Eigenen Fortschritt lesen" on public.fortschritt
  for select using (auth.uid() = user_id);

create policy "Eigenen Fortschritt anlegen" on public.fortschritt
  for insert with check (auth.uid() = user_id);

create policy "Eigenen Fortschritt ändern" on public.fortschritt
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

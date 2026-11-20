-- Zwischenspeicher für "Einfach erklärt": Jede einfache Erklärung wird nur einmal von der KI erzeugt
-- und dann für alle wiederverwendet. Nur die Edge Function (Dienst-Schlüssel) darf lesen und schreiben.
create table if not exists public.erklaerungen (
  schluessel text primary key,
  text text not null,
  erstellt timestamptz not null default now()
);
alter table public.erklaerungen enable row level security;
revoke all on public.erklaerungen from anon, authenticated;

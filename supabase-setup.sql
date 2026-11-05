-- ════════════════════════════════════════════════════════════════
-- ARMATOR.PRO — Konfiguracja bezpieczeństwa Supabase
-- Tabela: sessions  (kolumny: id text, state jsonb)
--
-- Co robi ten skrypt:
--   1. Dodaje kolumnę created_at (potrzebną do wygasania) — bezpiecznie, z domyślną wartością
--   2. Włącza RLS i dodaje DOKŁADNIE te reguły, których używa apka:
--        • INSERT  — tworzenie nowej współdzielonej listy ("Udostępnij")
--        • SELECT  — wczytanie listy po ID (z linku)
--        • UPDATE  — synchronizacja zmian
--      DELETE pozostaje ZABLOKOWANE dla klientów (nikt nie skasuje cudzej listy).
--   3. (Opcjonalnie) Automatyczne sprzątanie starych sesji po 90 dniach
--
-- WAŻNE: Kolejność ma znaczenie. Reguły powstają RAZEM z włączeniem RLS,
-- więc nie ma ani sekundy przerwy — strona w sieci działa bez zmian.
-- ════════════════════════════════════════════════════════════════


-- ─── KROK 1: kolumna daty utworzenia (bezpieczne — ma domyślną wartość) ───
alter table public.sessions
  add column if not exists created_at timestamptz not null default now();


-- ─── KROK 2: włącz RLS + dodaj reguły ───
alter table public.sessions enable row level security;

-- Usuń ewentualne stare wersje reguł (żeby skrypt można było puścić ponownie)
drop policy if exists "armator insert" on public.sessions;
drop policy if exists "armator select" on public.sessions;
drop policy if exists "armator update" on public.sessions;

-- INSERT: każdy może utworzyć nową sesję (tak działa "Udostępnij")
create policy "armator insert"
  on public.sessions for insert
  to anon, authenticated
  with check (true);

-- SELECT: odczyt listy (apka zawsze pyta po konkretnym ID z linku)
create policy "armator select"
  on public.sessions for select
  to anon, authenticated
  using (true);

-- UPDATE: zapis zmian w istniejącej sesji
create policy "armator update"
  on public.sessions for update
  to anon, authenticated
  using (true)
  with check (true);

-- (Brak reguły DELETE = klienci NIE MOGĄ kasować wierszy. To zamierzone.)


-- ════════════════════════════════════════════════════════════════
-- KROK 3 (OPCJONALNIE): automatyczne wygasanie starych sesji
-- Kasuje współdzielone listy starsze niż 90 dni — raz dziennie o 3:00.
-- Uruchom tę część osobno, dopiero gdy KROK 1–2 zadziałał.
-- ════════════════════════════════════════════════════════════════

-- Włącz harmonogram zadań (jednorazowo)
create extension if not exists pg_cron;

-- Zaplanuj codzienne sprzątanie. Zmień '90 days' na inny okres, jeśli chcesz.
select cron.schedule(
  'armator-cleanup-sessions',
  '0 3 * * *',
  $$ delete from public.sessions where created_at < now() - interval '90 days' $$
);

-- Aby później ZMIENIĆ okres: zmień interval powyżej i puść select cron.schedule(...) ponownie.
-- Aby WYŁĄCZYĆ sprzątanie:  select cron.unschedule('armator-cleanup-sessions');

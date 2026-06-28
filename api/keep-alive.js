// api/keep-alive.js
// Armator PRO — Supabase Keep-Alive
// Darmowy plan Supabase usypia projekt po 7 dniach bez zapytań do bazy.
// Ten endpoint robi jedno lekkie zapytanie do bazy. Uruchamiany codziennie
// przez Vercel Cron (patrz vercel.json) — resetuje licznik bezczynności,
// nawet jeśli przez wiele dni nikt nie kliknął "Udostępnij".

const SUPABASE_URL = 'https://vdjtmngdbjacomfreuai.supabase.co';

export default async function handler(req, res) {
  try {
    // Lekkie zapytanie: pobierz 1 id z tabeli sessions.
    // To liczy się jako aktywność bazy → projekt nie zostaje uśpiony.
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/sessions?select=id&limit=1`,
      {
        headers: {
          'apikey': process.env.SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
        },
      }
    );

    if (!r.ok) {
      const text = await r.text();
      console.error('Keep-alive: zapytanie nieudane', r.status, text);
      return res.status(500).json({ ok: false, status: r.status });
    }

    console.log('Keep-alive: OK', new Date().toISOString());
    return res.status(200).json({ ok: true, at: new Date().toISOString() });
  } catch (err) {
    console.error('Keep-alive: błąd', err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
}

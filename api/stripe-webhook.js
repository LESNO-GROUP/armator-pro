// api/stripe-webhook.js
// Armator PRO — Stripe Webhook Handler
// Odbiera płatność → generuje klucz → zapisuje do Supabase → wysyła email przez Brevo

const crypto = require('crypto');

const SUPABASE_URL = 'https://vdjtmngdbjacomfreuai.supabase.co';

export const config = {
  api: { bodyParser: false },
};

// --- Helpers ---

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function verifyStripeSignature(rawBody, sig, secret) {
  const parts = sig.split(',').reduce((acc, part) => {
    const [k, v] = part.split('=');
    acc[k] = v;
    return acc;
  }, {});

  const timestamp = parts['t'];
  const v1 = parts['v1'];
  if (!timestamp || !v1) throw new Error('Invalid signature header');

  const tolerance = 300;
  if (Math.abs(Date.now() / 1000 - parseInt(timestamp)) > tolerance) {
    throw new Error('Timestamp too old');
  }

  const payload = `${timestamp}.${rawBody}`;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  if (expected !== v1) throw new Error('Signature mismatch');
  return true;
}

function generateLicenseKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `ARMATOR-${seg()}-${seg()}-${seg()}`;
}

async function saveLicense({ licenseKey, email, sessionId, currency, amount }) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/licenses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': process.env.SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({
      license_key: licenseKey,
      email,
      stripe_session_id: sessionId,
      currency,
      amount,
      status: 'active',
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase error: ${err}`);
  }
}

async function sendLicenseEmail({ email, licenseKey, currency }) {
  const isPL = currency === 'PLN';

  const subject = isPL
    ? 'Twój klucz licencyjny Armator PRO ⚓'
    : 'Your Armator PRO License Key ⚓';

  const htmlContent = isPL ? `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a1628;color:#fff;padding:40px;border-radius:12px;">
      <h1 style="color:#38bdf8;text-align:center;">⚓ Armator PRO</h1>
      <p>Cześć!</p>
      <p>Dziękujemy za zakup <strong>Armator PRO</strong>. Oto Twój klucz licencyjny:</p>
      <div style="background:#1e3a5f;padding:24px;border-radius:8px;text-align:center;margin:24px 0;">
        <code style="font-size:22px;color:#38bdf8;letter-spacing:3px;font-weight:bold;">${licenseKey}</code>
      </div>
      <p><strong>Jak aktywować:</strong></p>
      <ol style="line-height:1.8;">
        <li>Wejdź na <a href="https://armatorpro.com/app.html" style="color:#38bdf8;">armatorpro.com</a></li>
        <li>Kliknij menu (☰) → <strong>Aktywuj PRO</strong></li>
        <li>Wpisz klucz i kliknij <strong>Aktywuj</strong></li>
      </ol>
      <p style="color:#94a3b8;font-size:12px;margin-top:32px;border-top:1px solid #1e3a5f;padding-top:16px;">
        Klucz działa na wszystkich urządzeniach. Zachowaj go w bezpiecznym miejscu.<br>
        W razie problemów napisz na: <a href="mailto:kontakt@armatorpro.com" style="color:#38bdf8;">kontakt@armatorpro.com</a>
      </p>
    </div>
  ` : `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a1628;color:#fff;padding:40px;border-radius:12px;">
      <h1 style="color:#38bdf8;text-align:center;">⚓ Armator PRO</h1>
      <p>Hello!</p>
      <p>Thank you for purchasing <strong>Armator PRO</strong>. Here is your license key:</p>
      <div style="background:#1e3a5f;padding:24px;border-radius:8px;text-align:center;margin:24px 0;">
        <code style="font-size:22px;color:#38bdf8;letter-spacing:3px;font-weight:bold;">${licenseKey}</code>
      </div>
      <p><strong>How to activate:</strong></p>
      <ol style="line-height:1.8;">
        <li>Go to <a href="https://armatorpro.com/app.html" style="color:#38bdf8;">armatorpro.com</a></li>
        <li>Click menu (☰) → <strong>Activate PRO</strong></li>
        <li>Enter your key and click <strong>Activate</strong></li>
      </ol>
      <p style="color:#94a3b8;font-size:12px;margin-top:32px;border-top:1px solid #1e3a5f;padding-top:16px;">
        Your key works on all devices. Keep it in a safe place.<br>
        Need help? Contact us at: <a href="mailto:kontakt@armatorpro.com" style="color:#38bdf8;">kontakt@armatorpro.com</a>
      </p>
    </div>
  `;

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': process.env.BREVO_API_KEY,
    },
    body: JSON.stringify({
      sender: { name: 'Armator PRO', email: 'noreply@armatorpro.com' },
      to: [{ email }],
      subject,
      htmlContent,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Brevo error: ${err}`);
  }
}

// --- Handler ---

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rawBody = await getRawBody(req);
  const rawBodyStr = rawBody.toString();
  const sig = req.headers['stripe-signature'];

  // Wybierz właściwy sekret (test vs live)
  let event;
  try {
    event = JSON.parse(rawBodyStr);
  } catch (err) {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const isTestMode = event?.livemode === false;
  const webhookSecret = isTestMode
    ? process.env.STRIPE_WEBHOOK_SECRET_TEST
    : process.env.STRIPE_WEBHOOK_SECRET;

  try {
    verifyStripeSignature(rawBodyStr, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const email = session.customer_details?.email;
    const currency = (session.currency || 'pln').toUpperCase();
    const amount = session.amount_total || 0;
    const sessionId = session.id;

    if (!email) {
      console.error('No email in session:', sessionId);
      return res.status(200).json({ received: true });
    }

    const licenseKey = generateLicenseKey();

    try {
      await saveLicense({ licenseKey, email, sessionId, currency, amount });
      console.log(`License saved: ${licenseKey} for ${email}`);
    } catch (err) {
      console.error('Failed to save license:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }

    try {
      await sendLicenseEmail({ email, licenseKey, currency });
      console.log(`Email sent to: ${email}`);
    } catch (err) {
      console.error('Failed to send email:', err.message);
    }
  }

  return res.status(200).json({ received: true });
}

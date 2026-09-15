import http from 'node:http';

const PORT = 8098;
const emails = [];

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);

  if (req.method === 'POST' && url.pathname === '/emails') {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
      let body = {};
      try {
        body = JSON.parse(raw);
      } catch {
        // ignore malformed bodies
      }
      const email = { ...body, _receivedAt: new Date().toISOString() };
      emails.push(email);
      if (emails.length > 200) emails.splice(0, emails.length - 200);
      console.log(`[email-catcher] ${new Date().toLocaleString()} | to: ${String(email.to ?? '')} | subj: ${String(email.subject ?? '')}`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ id: `intercepted_${Date.now()}` }));
    });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/__last') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(emails[emails.length - 1] ?? null, null, 2));
    return;
  }

  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/__inbox')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderInbox());
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function extractOtp(html) {
  const match = String(html).match(/\b\d{6}\b/);
  return match ? match[0] : null;
}

function renderInbox() {
  const cards = [...emails]
    .reverse()
    .map((email) => {
      const otp = extractOtp(email.html);
      const html = escapeHtml(email.html ?? '');
      return `
        <article style="border:1px solid #e5e7eb;border-radius:10px;padding:14px 16px;margin-bottom:12px;background:#fff;">
          <div style="display:flex;justify-content:space-between;gap:16px;">
            <div>
              <strong>${escapeHtml(email.subject ?? '(no subject)')}</strong>
              <div style="color:#6b7280;font-size:13px;margin-top:2px;">To: ${escapeHtml(Array.isArray(email.to) ? email.to.join(', ') : email.to ?? '')} · ${escapeHtml(email._receivedAt ?? '')}</div>
            </div>
            ${otp ? `<div style="font-size:26px;font-weight:700;letter-spacing:4px;color:#111827;">${escapeHtml(otp)}</div>` : ''}
          </div>
          <pre style="margin:12px 0 0;padding:10px;background:#f9fafb;border-radius:8px;font-size:12px;white-space:pre-wrap;word-break:break-word;">${html}</pre>
        </article>`;
    })
    .join('');

  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>PayFlow email catcher</title></head>
<body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#f3f4f6;margin:0;padding:24px;color:#111827;">
  <h1 style="margin-top:0;">PayFlow email catcher</h1>
  <p style="color:#6b7280;margin-top:-8px;">${emails.length} email${emails.length === 1 ? '' : 's'} captured · the 6-digit code is shown in big letters when an OTP arrived.</p>
  ${cards.length ? cards : '<p style="color:#9ca3af;">No emails yet. Try registering a new user now.</p>'}
</body>
</html>`;
}

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[email-catcher] running at http://127.0.0.1:${PORT}  (open this in your browser to read captured emails)`);
});
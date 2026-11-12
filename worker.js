// Сайт doroshchukconsulting.com: отдаёт страницы как обычно,
// а адрес /api/e принимает события (просмотр, WhatsApp, Telegram, видео)
// и складывает счётчики за день в хранилище KV (привязка STATS).
// Утренний отчёт отправляет отдельный воркер pm-report.
const TYPES = ['view', 'wa', 'tg', 'video'];

async function track(request, env) {
  if (request.method !== 'POST') return new Response('method not allowed', { status: 405 });
  const origin = request.headers.get('Origin') || '';
  try {
    if (origin && !/doroshchukconsulting\.com$|\.pages\.dev$/.test(new URL(origin).hostname)) {
      return new Response('forbidden', { status: 403 });
    }
  } catch (e) { return new Response('forbidden', { status: 403 }); }

  let t = '';
  try { t = JSON.parse(await request.text()).t; } catch (e) {}
  if (!TYPES.includes(t) || !env.STATS) return new Response(null, { status: 204 });

  const key = 'd:' + new Date().toISOString().slice(0, 10);
  const country = (request.cf && request.cf.country) || 'XX';
  const mobile = /Mobi|Android|iPhone/i.test(request.headers.get('User-Agent') || '');

  const data = (await env.STATS.get(key, 'json')) || { view: 0, wa: 0, tg: 0, video: 0, mobile: 0, countries: {} };
  data[t] = (data[t] || 0) + 1;
  if (t === 'view') {
    data.countries[country] = (data.countries[country] || 0) + 1;
    if (mobile) data.mobile = (data.mobile || 0) + 1;
  }
  await env.STATS.put(key, JSON.stringify(data), { expirationTtl: 60 * 60 * 24 * 90 });
  return new Response(null, { status: 204 });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/e') return track(request, env);
    return env.ASSETS.fetch(request);
  },
};

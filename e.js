// Приём событий с сайта: просмотр, WhatsApp, Telegram, видео.
// Складывает счётчики за день в KV (привязка STATS). Отчёт раз в день отправляет воркер pm-report.
const TYPES = ['view', 'wa', 'tg', 'video'];

export async function onRequestPost({ request, env }) {
  const origin = request.headers.get('Origin') || '';
  if (origin && !/doroshchukconsulting\.com$|\.pages\.dev$/.test(new URL(origin).hostname)) {
    return new Response('forbidden', { status: 403 });
  }
  let t = '';
  try { t = JSON.parse(await request.text()).t; } catch (e) {}
  if (!TYPES.includes(t) || !env.STATS) return new Response(null, { status: 204 });

  const day = new Date().toISOString().slice(0, 10);
  const key = 'd:' + day;
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

export async function onRequest() {
  return new Response('method not allowed', { status: 405 });
}

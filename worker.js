// pm-report: каждое утро отправляет в Telegram итоги сайта doroshchukconsulting.com за вчера.
// Нужны: привязка KV STATS (то же хранилище, что у сайта), переменные TG_TOKEN (секрет) и TG_CHAT.

const NAMES = { UA: 'Украина', RU: 'Россия', KZ: 'Казахстан', BY: 'Беларусь', UZ: 'Узбекистан', KG: 'Кыргызстан',
  AZ: 'Азербайджан', GE: 'Грузия', AM: 'Армения', MD: 'Молдова', TJ: 'Таджикистан', TM: 'Туркменистан',
  AT: 'Австрия', DE: 'Германия', PL: 'Польша', US: 'США', XX: 'неизвестно' };
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0) + '%';

async function report(env, dayOffset) {
  const d = new Date(Date.now() + dayOffset * 86400000).toISOString().slice(0, 10);
  const s = (await env.STATS.get('d:' + d, 'json')) || { view: 0, wa: 0, tg: 0, video: 0, mobile: 0, countries: {} };
  const top = Object.entries(s.countries || {}).sort((a, b) => b[1] - a[1]);
  const shown = top.slice(0, 4).map(([c, n]) => (NAMES[c] || c) + ' ' + n);
  const rest = top.slice(4).reduce((sum, [, n]) => sum + n, 0);
  if (rest) shown.push('другие ' + rest);
  const contact = (s.wa || 0) + (s.tg || 0);
  const label = d.split('-').reverse().join('.');

  const text = [
    `<b>Сайт «Прибыльный менеджмент» · ${label}</b>`,
    '',
    `Посетители: <b>${s.view || 0}</b>` + (shown.length ? ` (${shown.join(', ')})` : ''),
    `С телефона: ${pct(s.mobile || 0, s.view || 0)}`,
    `Запустили видео: ${s.video || 0}`,
    `Нажали WhatsApp: ${s.wa || 0} · Telegram: ${s.tg || 0}`,
    `<b>Нажали кнопку связи: ${pct(contact, s.view || 0)} посетителей</b>`,
  ].join('\n');

  const r = await fetch(`https://api.telegram.org/bot${env.TG_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: env.TG_CHAT, text, parse_mode: 'HTML', disable_web_page_preview: true }),
  });
  return r.ok ? 'отправлено' : 'ошибка Telegram: ' + (await r.text());
}

export default {
  // Утренний отчёт за вчера (расписание задаётся в Settings → Triggers).
  async scheduled(event, env, ctx) { ctx.waitUntil(report(env, -1)); },
  // Проверка вручную: откройте адрес воркера с ?test=1 — придёт отчёт за сегодня.
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.searchParams.get('test') !== '1') return new Response('pm-report работает');
    return new Response(await report(env, 0), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  },
};

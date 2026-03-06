const TOKEN = '69670dad0016fd2bc2c00b31d30a854f';
const MARKER = '707949';

const TOP_DESTINATIONS = {
  'SVO': ['DXB','AYT','IST','BCN','FCO','AMS','VIE','PRG','ATH','LIS','HRG','SSH'],
  'LED': ['DXB','AYT','IST','BCN','FCO','AMS','VIE','PRG','ATH','LIS'],
  'SVX': ['DXB','AYT','IST','BCN','AMS','VIE','PRG','ATH','LIS','MAD'],
  'OVB': ['DXB','AYT','IST','BKK','AMS','VIE','PRG','ATH','SIN','DPS'],
  'KZN': ['DXB','AYT','IST','BCN','FCO','AMS','VIE','PRG','ATH','LIS'],
  'AER': ['IST','DXB','BCN','FCO','AMS','VIE','PRG','ATH','LIS','MAD'],
  'KRR': ['IST','DXB','BCN','FCO','AMS','VIE','PRG','ATH','LIS','MAD'],
};
const DEFAULT_DESTS = ['DXB','AYT','IST','BCN','FCO','AMS','VIE','PRG','ATH','LIS'];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { origin, depart_date } = req.query;
  if (!origin || !depart_date) {
    return res.status(400).json({ error: 'origin and depart_date required' });
  }

  const month = depart_date.substring(0, 7); // yyyy-mm

  try {
    // v1/prices/cheap — проверенный endpoint, возвращает дешёвые билеты за месяц
    const url = `https://api.travelpayouts.com/v1/prices/cheap?origin=${origin}&depart_date=${month}&currency=rub&token=${TOKEN}`;
    const r = await fetch(url);

    if (!r.ok) {
      const text = await r.text();
      return res.status(r.status).json({ error: text });
    }

    const data = await r.json();
    if (!data.success) {
      return res.status(400).json({ error: 'API returned success=false', raw: data });
    }

    const dests = TOP_DESTINATIONS[origin] || DEFAULT_DESTS;
    const tickets = [];

    for (const dest of dests) {
      const variants = data.data?.[dest];
      if (!variants) continue;
      // Берём самый дешёвый вариант
      const cheapest = Object.values(variants).sort((a,b) => a.price - b.price)[0];
      if (!cheapest?.price) continue;

      const durMin = cheapest.duration || 0;
      const dur = durMin ? `${Math.floor(durMin/60)}ч ${String(durMin%60).padStart(2,'0')}м` : null;

      tickets.push({
        destination: dest,
        toCity: dest,
        value: Math.round(cheapest.price).toLocaleString('ru'),
        rawPrice: cheapest.price,
        stops: cheapest.transfers || 0,
        depTime: cheapest.departure_at || null,
        duration: dur,
        airline: cheapest.airline || '',
        ticket_link: cheapest.link || null,
      });
    }

    tickets.sort((a, b) => a.rawPrice - b.rawPrice);
    res.status(200).json({ success: true, data: tickets });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

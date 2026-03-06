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

  // depart_months принимает yyyy-mm-01
  const month = depart_date.substring(0, 7) + '-01';
  const dests = (TOP_DESTINATIONS[origin] || DEFAULT_DESTS);

  // GraphQL: один запрос для каждого направления
  const queries = dests.map((dest, i) => `
    q${i}: prices_one_way(
      params: { origin: "${origin}", destination: "${dest}", depart_months: "${month}" }
      paging: { limit: 1, offset: 0 }
      sorting: VALUE_ASC
    ) {
      departure_at
      value
      trip_duration
      ticket_link
      origin
      destination
      number_of_changes
    }
  `).join('\n');

  const graphqlQuery = `{ ${queries} }`;

  try {
    const r = await fetch('https://api.travelpayouts.com/graphql/v1/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Access-Token': TOKEN,
      },
      body: JSON.stringify({ query: graphqlQuery }),
    });

    if (!r.ok) {
      const text = await r.text();
      return res.status(r.status).json({ error: text });
    }

    const data = await r.json();

    if (data.errors) {
      return res.status(400).json({ error: data.errors[0]?.message || 'GraphQL error' });
    }

    const tickets = [];
    const target = new Date(depart_date);

    for (const [key, results] of Object.entries(data.data || {})) {
      if (!results || !results.length) continue;
      const t = results[0];
      if (!t?.value) continue;

      // Фильтруем по дате ±7 дней
      if (t.departure_at) {
        const depDate = new Date(t.departure_at);
        if (Math.abs((depDate - target) / 86400000) > 7) continue;
      }

      const durMin = t.trip_duration || 0;
      const dur = durMin ? `${Math.floor(durMin/60)}ч ${String(durMin%60).padStart(2,'0')}м` : null;

      tickets.push({
        destination: t.destination,
        toCity: t.destination,
        value: Math.round(t.value).toLocaleString('ru'),
        rawPrice: t.value,
        stops: t.number_of_changes || 0,
        depTime: t.departure_at || null,
        duration: dur,
        ticket_link: t.ticket_link || null,
        airline: '',
      });
    }

    tickets.sort((a, b) => a.rawPrice - b.rawPrice);
    res.status(200).json({ success: true, data: tickets, marker: MARKER });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

const AMADEUS_KEY = 'tegvcBGdEZHK9KVU131v7Nl1BgUgFWGB';
const AMADEUS_SECRET = 'VvYjwuaQg94lC50p';

// Получаем access token
async function getToken() {
  const r = await fetch('https://test.api.amadeus.com/v1/security/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=client_credentials&client_id=${AMADEUS_KEY}&client_secret=${AMADEUS_SECRET}`
  });
  const d = await r.json();
  if (!d.access_token) throw new Error('Auth failed: ' + JSON.stringify(d));
  return d.access_token;
}

// Топ направлений по городу вылета
const TOP_DESTINATIONS = {
  'SVO': ['DXB','AYT','IST','BCN','FCO','AMS','VIE','PRG','ATH','LIS'],
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

  try {
    const token = await getToken();
    const dests = (TOP_DESTINATIONS[origin] || DEFAULT_DESTS).slice(0, 8);

    // Параллельный поиск по направлениям
    const searches = dests.map(dest =>
      fetch(
        `https://test.api.amadeus.com/v2/shopping/flight-offers` +
        `?originLocationCode=${origin}&destinationLocationCode=${dest}` +
        `&departureDate=${depart_date}&adults=1&max=1&currencyCode=RUB`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      .then(r => r.json())
      .then(d => ({ dest, data: d }))
      .catch(() => null)
    );

    const results = await Promise.all(searches);

    const tickets = [];
    for (const r of results) {
      if (!r?.data?.data?.[0]) continue;
      const offer = r.data.data[0];
      const seg = offer.itineraries?.[0]?.segments?.[0];
      if (!seg) continue;

      const price = parseFloat(offer.price?.total || 0);
      if (!price) continue;

      const durStr = offer.itineraries?.[0]?.duration || '';
      // PT2H30M → 2ч 30м
      const durMatch = durStr.match(/PT(\d+H)?(\d+M)?/);
      const hours = durMatch?.[1] ? parseInt(durMatch[1]) : 0;
      const mins = durMatch?.[2] ? parseInt(durMatch[2]) : 0;
      const durFormatted = hours || mins ? `${hours}ч ${String(mins).padStart(2,'0')}м` : null;

      const stops = (offer.itineraries?.[0]?.segments?.length || 1) - 1;

      tickets.push({
        destination: r.dest,
        toCity:      seg.arrival?.iataCode || r.dest,
        value:       Math.round(price).toLocaleString('ru'),
        rawPrice:    price,
        stops,
        depTime:     seg.departure?.at || null,
        arrTime:     seg.arrival?.at || null,
        duration:    durFormatted,
        airline:     seg.carrierCode || '',
        flightNum:   seg.carrierCode + (seg.number || ''),
      });
    }

    tickets.sort((a, b) => a.rawPrice - b.rawPrice);
    res.status(200).json({ success: true, data: tickets });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

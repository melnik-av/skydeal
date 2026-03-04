const RAPIDAPI_KEY = '232e99ceffmsh335f6c3066e28bcp1061aajsn7317504b6f2c';
const RAPIDAPI_HOST = 'sky-scrapper.p.rapidapi.com';

const AIRPORT_IDS = {
  'SVO': { skyId: 'SVO', entityId: '95673467' },
  'DME': { skyId: 'DME', entityId: '95673456' },
  'VKO': { skyId: 'VKO', entityId: '95673485' },
  'LED': { skyId: 'LED', entityId: '95673508' },
  'SVX': { skyId: 'SVX', entityId: '95673627' },
  'OVB': { skyId: 'OVB', entityId: '95673572' },
  'KZN': { skyId: 'KZN', entityId: '95673534' },
  'AER': { skyId: 'AER', entityId: '95673437' },
  'KRR': { skyId: 'KRR', entityId: '95673535' },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { origin, depart_date } = req.query;
  if (!origin || !depart_date) {
    return res.status(400).json({ error: 'origin and depart_date required' });
  }

  const headers = {
    'x-rapidapi-key': RAPIDAPI_KEY,
    'x-rapidapi-host': RAPIDAPI_HOST,
  };

  try {
    // Шаг 1: получаем entityId если нет в маппинге
    let originIds = AIRPORT_IDS[origin];
    if (!originIds) {
      const r = await fetch(
        `https://sky-scrapper.p.rapidapi.com/api/v1/flights/searchAirport?query=${origin}&locale=en-US`,
        { headers }
      );
      const d = await r.json();
      const a = d?.data?.[0];
      if (!a) return res.status(404).json({ error: 'Airport not found: ' + origin });
      originIds = { skyId: a.skyId, entityId: a.entityId };
    }

    // Шаг 2: searchFlightEverywhere
    const url = `https://sky-scrapper.p.rapidapi.com/api/v2/flights/searchFlightEverywhere` +
      `?originEntityId=${originIds.entityId}` +
      `&cabinClass=economy&journeyType=one_way&currency=RUB`;

    const r = await fetch(url, { headers });
    if (!r.ok) {
      const text = await r.text();
      return res.status(r.status).json({ error: text });
    }

    const data = await r.json();
    const results = data?.data?.everywhereDestination?.results || [];

    const tickets = results
      .filter(r => r?.content?.flightQuotes?.cheapest?.rawPrice)
      .map(r => ({
        destination: r.content.location?.skyCode || '',
        toCity:      r.content.location?.name || '',
        value:       r.content.flightQuotes.cheapest.price || '',
        rawPrice:    r.content.flightQuotes.cheapest.rawPrice || 0,
        direct:      r.content.flightQuotes.cheapest.direct || false,
        imageUrl:    r.content.image?.url || null,
      }))
      .sort((a, b) => a.rawPrice - b.rawPrice);

    res.status(200).json({ success: true, data: tickets });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

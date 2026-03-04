const RAPIDAPI_KEY = '232e99ceffmsh335f6c3066e28bcp1061aajsn7317504b6f2c';
const RAPIDAPI_HOST = 'sky-scrapper.p.rapidapi.com';

const headers = {
  'x-rapidapi-key': RAPIDAPI_KEY,
  'x-rapidapi-host': RAPIDAPI_HOST,
};

// IATA → skyId/entityId для популярных российских аэропортов
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

  try {
    // Шаг 1: получаем skyId и entityId
    let originIds = AIRPORT_IDS[origin];
    if (!originIds) {
      const searchRes = await fetch(
        `https://sky-scrapper.p.rapidapi.com/api/v1/flights/searchAirport?query=${origin}&locale=ru-RU`,
        { headers }
      );
      const searchData = await searchRes.json();
      const airport = searchData?.data?.[0];
      if (!airport) return res.status(404).json({ error: 'Airport not found: ' + origin });
      originIds = { skyId: airport.skyId, entityId: airport.entityId };
    }

    // Шаг 2: поиск рейсов по всем направлениям
    const flightsUrl =
      `https://sky-scrapper.p.rapidapi.com/api/v2/flights/searchFlightsEverywhere` +
      `?originSkyId=${originIds.skyId}&originEntityId=${originIds.entityId}` +
      `&cabinClass=economy&adults=1&currency=RUB&locale=ru-RU&market=RU&countryCode=RU` +
      `&date=${depart_date}`;

    const flightsRes = await fetch(flightsUrl, { headers });
    if (!flightsRes.ok) {
      const text = await flightsRes.text();
      return res.status(flightsRes.status).json({ error: text });
    }

    const flightsData = await flightsRes.json();
    const results = flightsData?.data?.everywhereDestination?.results || [];

    const tickets = results
      .filter(r => r?.content?.flightQuotes?.cheapest?.price)
      .map(r => ({
        destination:  r.content.location?.skyCode || '',
        toCity:       r.content.location?.name || '',
        value:        r.content.flightQuotes.cheapest.price,
        rawPrice:     r.content.flightQuotes.cheapest.rawPrice || 0,
        direct:       r.content.flightQuotes.cheapest.direct || false,
        imageUrl:     r.content.image?.url || null,
      }))
      .sort((a, b) => (a.rawPrice || a.value) - (b.rawPrice || b.value));

    res.status(200).json({ success: true, data: tickets });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

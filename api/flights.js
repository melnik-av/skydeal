const RAPIDAPI_KEY = '232e99ceffmsh335f6c3066e28bcp1061aajsn7317504b6f2c';
const RAPIDAPI_HOST = 'tripadvisor16.p.rapidapi.com';

const headers = {
  'x-rapidapi-key': RAPIDAPI_KEY,
  'x-rapidapi-host': RAPIDAPI_HOST,
};

const TOP_DESTINATIONS = {
  'SVO': ['DXB','AYT','IST','BCN','FCO'],
  'LED': ['DXB','AYT','IST','BCN','FCO'],
  'SVX': ['DXB','AYT','IST','BCN','AMS'],
  'OVB': ['DXB','AYT','IST','BKK','AMS'],
  'KZN': ['DXB','AYT','IST','BCN','FCO'],
  'AER': ['IST','DXB','MOW','LED','BCN'],
  'KRR': ['IST','DXB','MOW','LED','BCN'],
};

const DEFAULT_DESTS = ['DXB','AYT','IST','BCN','FCO'];

async function fetchWithTimeout(url, options, ms = 7000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const r = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return r;
  } catch(e) {
    clearTimeout(timer);
    throw e;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { origin, depart_date } = req.query;
  if (!origin || !depart_date) {
    return res.status(400).json({ error: 'origin and depart_date required' });
  }

  try {
    const dests = (TOP_DESTINATIONS[origin] || DEFAULT_DESTS).slice(0, 3);

    const searches = dests.map(dest =>
      fetchWithTimeout(
        `https://tripadvisor16.p.rapidapi.com/api/v1/flights/searchFlights` +
        `?sourceAirportCode=${origin}&destinationAirportCode=${dest}` +
        `&date=${depart_date}&itineraryType=ONE_WAY&sortOrder=ML_BEST_VALUE` +
        `&numAdults=1&numSeniors=0&classOfService=ECONOMY&pageNumber=1&currencyCode=RUB`,
        { headers }
      )
      .then(r => r.json())
      .then(d => ({ dest, data: d }))
      .catch(() => null)
    );

    const results = await Promise.all(searches);

    const tickets = [];
    for (const r of results) {
      if (!r?.data?.data?.flights) continue;
      const flight = r.data.data.flights[0];
      if (!flight) continue;
      const seg = flight.segments?.[0];
      const leg = seg?.legs?.[0];
      const price = flight.purchaseLinks?.[0]?.totalPrice;
      if (!price) continue;

      tickets.push({
        destination:  r.dest,
        toCity:       leg?.destinationStationCode || r.dest,
        value:        Math.round(price).toLocaleString('ru'),
        rawPrice:     price,
        direct:       (seg?.legs?.length || 1) === 1,
        stops:        (seg?.legs?.length || 1) - 1,
        depTime:      leg?.departureDateTime || null,
        arrTime:      leg?.arrivalDateTime || null,
        duration:     seg?.totalDurationMinutes || 0,
        airline:      leg?.marketingCarrier?.displayName || '',
        airlineCode:  leg?.marketingCarrier?.code || '',
      });
    }

    tickets.sort((a, b) => a.rawPrice - b.rawPrice);
    res.status(200).json({ success: true, data: tickets });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

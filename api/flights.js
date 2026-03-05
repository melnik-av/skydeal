const RAPIDAPI_KEY = '232e99ceffmsh335f6c3066e28bcp1061aajsn7317504b6f2c';
const RAPIDAPI_HOST = 'tripadvisor16.p.rapidapi.com';

const headers = {
  'x-rapidapi-key': RAPIDAPI_KEY,
  'x-rapidapi-host': RAPIDAPI_HOST,
};

// Топ направлений для поиска из популярных городов
const TOP_DESTINATIONS = {
  'SVO': ['DXB','AYT','IST','BCN','FCO','BKK','AMS','VIE','PRG','ATH','LIS','MAD','MXP','GVA','NRT'],
  'LED': ['DXB','AYT','IST','BCN','FCO','BKK','AMS','VIE','PRG','ATH'],
  'SVX': ['DXB','AYT','IST','BCN','AMS','VIE','PRG','ATH','LIS','MAD'],
  'OVB': ['DXB','AYT','IST','BKK','AMS','VIE','PRG','ATH','SIN','DPS'],
  'KZN': ['DXB','AYT','IST','BCN','FCO','AMS','VIE','PRG','ATH'],
  'AER': ['MOW','LED','SVX','KZN','OVB','IST','DXB'],
  'KRR': ['MOW','LED','SVX','KZN','OVB','IST','DXB'],
};

const DEFAULT_DESTS = ['DXB','AYT','IST','BCN','FCO','BKK','AMS','VIE','PRG','ATH','LIS','MAD'];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { origin, depart_date } = req.query;
  if (!origin || !depart_date) {
    return res.status(400).json({ error: 'origin and depart_date required' });
  }

  try {
    const dests = TOP_DESTINATIONS[origin] || DEFAULT_DESTS;

    // Ищем рейсы параллельно по топ-6 направлениям
    const searches = dests.slice(0, 6).map(dest =>
      fetch(
        `https://tripadvisor16.p.rapidapi.com/api/v1/flights/searchFlights` +
        `?sourceAirportCode=${origin}&destinationAirportCode=${dest}` +
        `&date=${depart_date}&itineraryType=ONE_WAY&sortOrder=ML_BEST_VALUE` +
        `&numAdults=1&numSeniors=0&classOfService=ECONOMY&pageNumber=1&currencyCode=RUB`,
        { headers }
      ).then(r => r.json()).then(d => ({ dest, data: d })).catch(() => null)
    );

    const results = await Promise.all(searches);

    const tickets = [];
    for (const r of results) {
      if (!r?.data?.data?.flights) continue;
      const flight = r.data.data.flights[0]; // берём самый дешёвый
      if (!flight) continue;

      const seg = flight.segments?.[0];
      const leg = seg?.legs?.[0];
      const price = flight.purchaseLinks?.[0]?.totalPrice;
      if (!price) continue;

      tickets.push({
        destination: r.dest,
        toCity: leg?.destinationStationCode || r.dest,
        value: `${Math.round(price).toLocaleString('ru')}`,
        rawPrice: price,
        direct: seg?.legs?.length === 1,
        depTime: leg?.departureDateTime || null,
        arrTime: leg?.arrivalDateTime || null,
        duration: seg?.totalDurationMinutes || 0,
        airline: leg?.marketingCarrier?.displayName || '',
        airlineCode: leg?.marketingCarrier?.code || '',
        stops: (seg?.legs?.length || 1) - 1,
        imageUrl: null,
      });
    }

    tickets.sort((a, b) => a.rawPrice - b.rawPrice);
    res.status(200).json({ success: true, data: tickets });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

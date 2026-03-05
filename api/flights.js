const RAPIDAPI_KEY = '232e99ceffmsh335f6c3066e28bcp1061aajsn7317504b6f2c';
const RAPIDAPI_HOST = 'tripadvisor16.p.rapidapi.com';

const headers = {
  'x-rapidapi-key': RAPIDAPI_KEY,
  'x-rapidapi-host': RAPIDAPI_HOST,
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { origin, depart_date } = req.query;

  try {
    const url = `https://tripadvisor16.p.rapidapi.com/api/v1/flights/searchFlights` +
      `?sourceAirportCode=${origin}&destinationAirportCode=DXB` +
      `&date=${depart_date}&itineraryType=ONE_WAY&sortOrder=ML_BEST_VALUE` +
      `&numAdults=1&numSeniors=0&classOfService=ECONOMY&pageNumber=1&currencyCode=RUB`;

    const r = await fetch(url, { headers });
    const text = await r.text();

    // Возвращаем сырой ответ для диагностики
    res.status(200).json({ status: r.status, raw: text.substring(0, 2000) });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

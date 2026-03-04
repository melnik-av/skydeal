export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { origin, depart_date } = req.query;
  if (!origin || !depart_date) {
    return res.status(400).json({ error: 'origin and depart_date required' });
  }

  // GraphQL запрос — цены на конкретный месяц, сортировка по цене
  const month = depart_date.substring(0, 7) + '-01'; // yyyy-mm-01

  const query = `{
    prices_one_way(
      params: {
        origin: "${origin}"
        depart_months: "${month}"
        one_way: true
      }
      paging: { limit: 30 offset: 0 }
      sorting: VALUE_ASC
    ) {
      departure_at
      value
      trip_duration
      ticket_link
      origin
      destination
      number_of_changes
      airline
    }
  }`;

  try {
    const r = await fetch('https://api.travelpayouts.com/graphql/v1/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Access-Token': '69670dad0016fd2bc2c00b31d30a854f'
      },
      body: JSON.stringify({ query })
    });

    const data = await r.json();

    if (data.errors) {
      return res.status(400).json({ error: data.errors[0].message });
    }

    const tickets = data?.data?.prices_one_way || [];

    // Фильтруем по дате ±2 дня
    const target = new Date(depart_date);
    const exact = tickets.filter(t => {
      const d = new Date(t.departure_at);
      return Math.abs((d - target) / 86400000) <= 2;
    });

    res.status(200).json({
      success: true,
      data: exact.length > 0 ? exact : tickets,
      exact_date: exact.length > 0
    });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

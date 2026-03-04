export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { origin, depart_date } = req.query;
  if (!origin || !depart_date) {
    return res.status(400).json({ error: 'origin and depart_date required' });
  }

  const month = depart_date.substring(0, 7); // yyyy-mm

  const url = `https://api.travelpayouts.com/v1/prices/cheap?origin=${origin}&depart_date=${month}&currency=rub&token=69670dad0016fd2bc2c00b31d30a854f`;

  try {
    const r = await fetch(url, {
      headers: { 'X-Access-Token': '69670dad0016fd2bc2c00b31d30a854f' }
    });

    if (!r.ok) {
      const text = await r.text();
      return res.status(r.status).json({ error: text });
    }

    const data = await r.json();

    // Преобразуем формат { destination: { 0: {ticket} } } в плоский массив
    const tickets = [];
    for (const [dest, variants] of Object.entries(data.data || {})) {
      for (const ticket of Object.values(variants)) {
        if (ticket && ticket.price) {
          tickets.push({
            destination: dest,
            value: ticket.price,
            airline: ticket.airline,
            departure_at: ticket.departure_at,
            return_at: ticket.return_at,
            number_of_changes: ticket.transfers || 0,
            trip_duration: ticket.duration || 0,
            ticket_link: ticket.link || null,
          });
        }
      }
    }

    // Сортируем по цене
    tickets.sort((a, b) => a.value - b.value);

    // Фильтруем по дате ±3 дня если есть departure_at
    const target = new Date(depart_date);
    const exact = tickets.filter(t => {
      if (!t.departure_at) return false;
      const d = new Date(t.departure_at);
      return Math.abs((d - target) / 86400000) <= 3;
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

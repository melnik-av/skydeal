export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { origin, depart_date } = req.query;
  if (!origin || !depart_date) {
    return res.status(400).json({ error: 'origin and depart_date required' });
  }

  const token = process.env.TP_TOKEN || '69670dad0016fd2bc2c00b31d30a854f';
  const month = depart_date.substring(0, 7);

  const url = `https://api.travelpayouts.com/v1/prices/cheap?origin=${origin}&destination=-&depart_date=${month}&currency=rub&token=${token}`;

  try {
    const r = await fetch(url);
    const data = await r.json();
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

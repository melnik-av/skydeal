export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { origin, depart_date } = req.query;
  const month = (depart_date || '').substring(0, 7);

  const url = `https://api.travelpayouts.com/v1/prices/cheap?origin=${origin}&destination=-&depart_date=${month}&currency=rub`;

  try {
    const r = await fetch(url, {
      headers: {
        'X-Access-Token': '69670dad0016fd2bc2c00b31d30a854f'
      }
    });
    const data = await r.json();
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

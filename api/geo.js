export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Vercel передаёт IP в заголовках
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
             req.headers['x-real-ip'] || '';

  try {
    const r = await fetch(`https://ipapi.co/${ip}/json/`);
    const j = await r.json();
    res.status(200).json({
      city: j.city || '',
      country: j.country_name || '',
      country_code: j.country_code || '',
    });
  } catch(e) {
    res.status(200).json({ city: 'Москва', country: 'Россия', country_code: 'RU' });
  }
}

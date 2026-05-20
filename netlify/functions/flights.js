exports.handler = async function(event) {
  const { lamin, lomin, lamax, lomax } = event.queryStringParameters || {};

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, s-maxage=15'
  };

  if (!lamin || !lomin || !lamax || !lomax) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing coordinates' }) };
  }

  const lat = ((parseFloat(lamax) + parseFloat(lamin)) / 2).toFixed(4);
  const lon = ((parseFloat(lomax) + parseFloat(lomin)) / 2).toFixed(4);
  const radiusNm = Math.min(Math.round((parseFloat(lamax) - parseFloat(lamin)) * 60), 250);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const url = `https://api.adsb.lol/v2/lat/${lat}/lon/${lon}/dist/${radiusNm}`;
    console.log('Fetching:', url);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json', 'User-Agent': 'SpotrHQ/1.0' }
    });
    clearTimeout(timer);

    if (!res.ok) throw new Error('adsb.lol returned ' + res.status);
    const data = await res.json();
    console.log('Aircraft count:', (data.ac || []).length);

    const states = (data.ac || []).map(a => [
      a.hex || '',
      (a.flight || '').trim() || 'N/A',
      a.r || '',
      null, null,
      parseFloat(a.lon) || null,
      parseFloat(a.lat) || null,
      a.alt_baro && a.alt_baro !== 'ground' ? parseFloat(a.alt_baro) * 0.3048 : null,
      false,
      a.gs ? parseFloat(a.gs) * 0.514444 : null,
      parseFloat(a.track) || null,
      null, null,
      a.t || '',
      a.dep || '',
      a.arr || '',
      a.desc || ''
    ]);

    return { statusCode: 200, headers, body: JSON.stringify({ states, time: Date.now() }) };

  } catch(e) {
    clearTimeout(timer);
    console.error('Primary fetch failed:', e.message);

    // Fallback: OpenSky anonymous
    try {
      const c2 = new AbortController();
      const t2 = setTimeout(() => c2.abort(), 6000);
      const osUrl = `https://opensky-network.org/api/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;
      console.log('Trying OpenSky fallback...');
      const osRes = await fetch(osUrl, { signal: c2.signal });
      clearTimeout(t2);
      if (osRes.ok) {
        const osData = await osRes.json();
        console.log('OpenSky fallback succeeded');
        return { statusCode: 200, headers, body: JSON.stringify(osData) };
      }
    } catch(e2) {
      console.error('OpenSky fallback failed:', e2.message);
    }

    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};

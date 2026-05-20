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

  // Try adsb.lol first
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);
    const url = `https://api.adsb.lol/v2/lat/${lat}/lon/${lon}/dist/${radiusNm}`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json', 'User-Agent': 'SpotrHQ/1.0' }
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error('adsb.lol status: ' + res.status);
    const data = await res.json();
    const ac = data.ac || [];
    console.log(`adsb.lol success: ${ac.length} aircraft`);
    const states = ac.map(a => [
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
    console.error('adsb.lol failed:', e.message);
  }

  // Fallback: OpenSky anonymous
  try {
    const controller2 = new AbortController();
    const timer2 = setTimeout(() => controller2.abort(), 6000);
    const osUrl = `https://opensky-network.org/api/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;
    const osRes = await fetch(osUrl, { signal: controller2.signal });
    clearTimeout(timer2);
    if (!osRes.ok) throw new Error('OpenSky status: ' + osRes.status);
    const osData = await osRes.json();
    console.log(`OpenSky fallback success: ${(osData.states||[]).length} aircraft`);
    return { statusCode: 200, headers, body: JSON.stringify(osData) };
  } catch(e2) {
    console.error('OpenSky fallback failed:', e2.message);
  }

  return { statusCode: 503, headers, body: JSON.stringify({ error: 'All flight data sources unavailable', states: [] }) };
};

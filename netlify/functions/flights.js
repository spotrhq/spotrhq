exports.handler = async function(event) {
  const { lamin, lomin, lamax, lomax } = event.queryStringParameters || {};

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  const lat = ((parseFloat(lamax) + parseFloat(lamin)) / 2).toFixed(4);
  const lon = ((parseFloat(lomax) + parseFloat(lomin)) / 2).toFixed(4);
  const radius = Math.min(Math.round((parseFloat(lamax) - parseFloat(lamin)) * 111 / 2), 250);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    // adsb.lol - free community API, no key needed
    const url = `https://api.adsb.lol/v2/lat/${lat}/lon/${lon}/dist/${radius}`;
    
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });

    clearTimeout(timer);

    if (!res.ok) throw new Error('adsb.lol error: ' + res.status);

    const data = await res.json();

    // Convert to OpenSky-compatible format
    const states = (data.ac || []).map(a => [
      a.hex || '',
      a.flight ? a.flight.trim() : 'N/A',
      a.r || '',
      null, null,
      parseFloat(a.lon) || null,
      parseFloat(a.lat) || null,
      a.alt_baro ? parseFloat(a.alt_baro) * 0.3048 : null,
      false,
      a.gs ? parseFloat(a.gs) * 0.514444 : null,
      parseFloat(a.track) || null,
      null, null,
      a.t || ''
    ]);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ states, time: Date.now() })
    };

  } catch(e) {
    clearTimeout(timer);
    console.error('adsb.lol error:', e.message);

    // Fallback: try OpenSky anonymous
    try {
      const controller2 = new AbortController();
      const timer2 = setTimeout(() => controller2.abort(), 6000);
      const osUrl = `https://opensky-network.org/api/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;
      const osRes = await fetch(osUrl, { signal: controller2.signal });
      clearTimeout(timer2);
      if (osRes.ok) {
        const osData = await osRes.json();
        return { statusCode: 200, headers, body: JSON.stringify(osData) };
      }
    } catch(e2) {
      console.error('OpenSky fallback also failed:', e2.message);
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: e.message })
    };
  }
};

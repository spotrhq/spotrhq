exports.handler = async function(event) {
  const { lamin, lomin, lamax, lomax } = event.queryStringParameters || {};

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, s-maxage=15'
  };

  const lat = ((parseFloat(lamax) + parseFloat(lamin)) / 2).toFixed(4);
  const lon = ((parseFloat(lomax) + parseFloat(lomin)) / 2).toFixed(4);
  const radiusNm = Math.min(Math.round((parseFloat(lamax) - parseFloat(lamin)) * 60), 250);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const url = `https://api.adsb.lol/v2/lat/${lat}/lon/${lon}/dist/${radiusNm}`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error('adsb.lol error: ' + res.status);
    const data = await res.json();

    // Enrich with airline and aircraft names, convert to unified format
    const states = (data.ac || []).map(a => {
      const callsign = a.flight ? a.flight.trim() : '';
      return [
        a.hex || '',
        callsign || 'N/A',
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
        a.dep || '',      // departure airport
        a.arr || '',      // arrival airport
        a.desc || ''      // aircraft description
      ];
    });

    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ states, time: Date.now() }) };

  } catch(e) {
    clearTimeout(timer);
    console.error('adsb.lol error:', e.message);
    // Fallback: OpenSky anonymous
    try {
      const c2 = new AbortController();
      const t2 = setTimeout(() => c2.abort(), 6000);
      const osUrl = `https://opensky-network.org/api/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;
      const osRes = await fetch(osUrl, { signal: c2.signal });
      clearTimeout(t2);
      if (osRes.ok) {
        const osData = await osRes.json();
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify(osData) };
      }
    } catch(e2) { console.error('OpenSky fallback failed:', e2.message); }
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: e.message }) };
  }
};

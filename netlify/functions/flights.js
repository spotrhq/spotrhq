exports.handler = async function(event) {
  const { lamin, lomin, lamax, lomax } = event.queryStringParameters || {};

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7000);

  try {
    // Try anonymous first - fastest, no auth roundtrip needed
    const apiUrl = `https://opensky-network.org/api/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;
    
    // Basic auth with credentials encoded directly
    const credentials = Buffer.from('spotrhq1:VQW5ctv7kvy6pxz@mhg').toString('base64');
    
    const res = await fetch(apiUrl, {
      signal: controller.signal,
      headers: { 
        'Authorization': 'Basic ' + credentials
      }
    });

    clearTimeout(timer);

    if (!res.ok) {
      console.error('OpenSky error:', res.status);
      // Try anonymous as fallback
      const anonRes = await fetch(apiUrl, { signal: controller.signal });
      if (!anonRes.ok) throw new Error('OpenSky API returned ' + anonRes.status);
      const anonData = await anonRes.json();
      return { statusCode: 200, headers, body: JSON.stringify(anonData) };
    }

    const data = await res.json();
    return { statusCode: 200, headers, body: JSON.stringify(data) };

  } catch(e) {
    clearTimeout(timer);
    console.error('Function error:', e.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: e.message })
    };
  }
};

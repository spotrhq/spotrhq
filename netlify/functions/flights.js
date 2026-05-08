exports.handler = async function(event) {
  const { lamin, lomin, lamax, lomax } = event.queryStringParameters || {};

  const CLIENT_ID = 'spotrhq1-api-client';
  const CLIENT_SECRET = 'IWZvVxmhKXg8O2TeHTtwHCIWKnfhY6PW';
  const TOKEN_URL = 'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token';

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  // Helper: fetch with timeout
  async function fetchWithTimeout(url, options={}, timeoutMs=8000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);
      return res;
    } catch(e) {
      clearTimeout(timer);
      throw new Error(e.name === 'AbortError' ? 'Request timed out after '+timeoutMs+'ms' : e.message);
    }
  }

  try {
    // Step 1: Get token
    let token = null;
    try {
      const tokenRes = await fetchWithTimeout(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET
        }).toString()
      }, 6000);

      if (tokenRes.ok) {
        const tokenData = await tokenRes.json();
        token = tokenData.access_token;
      } else {
        const errText = await tokenRes.text();
        console.error('Token error:', tokenRes.status, errText);
      }
    } catch(e) {
      console.error('Token fetch failed:', e.message);
    }

    // Step 2: Fetch flights (with or without token)
    const apiUrl = `https://opensky-network.org/api/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;
    const flightHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};

    const flightRes = await fetchWithTimeout(apiUrl, { headers: flightHeaders }, 8000);

    if (!flightRes.ok) {
      const errText = await flightRes.text();
      console.error('Flight API error:', flightRes.status, errText);
      return {
        statusCode: flightRes.status,
        headers,
        body: JSON.stringify({ error: 'OpenSky API error: ' + flightRes.status, detail: errText })
      };
    }

    const data = await flightRes.json();
    return { statusCode: 200, headers, body: JSON.stringify(data) };

  } catch(e) {
    console.error('Function error:', e.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: e.message })
    };
  }
};

exports.handler = async function(event) {
  const { lamin, lomin, lamax, lomax } = event.queryStringParameters || {};
  const CLIENT_ID = 'spotrhq1-api-client';
  const CLIENT_SECRET = 'IWZvVxmhKXg8O2TeHTtwHCIWKnfhY6PW';
  const TOKEN_URL = 'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token';
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };
  try {
    const tokenRes = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'client_credentials', client_id: CLIENT_ID, client_secret: CLIENT_SECRET }).toString()
    });
    if (!tokenRes.ok) throw new Error('Token failed: ' + tokenRes.status);
    const { access_token } = await tokenRes.json();
    const apiUrl = `https://opensky-network.org/api/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;
    const flightRes = await fetch(apiUrl, { headers: { 'Authorization': `Bearer ${access_token}` } });
    if (!flightRes.ok) throw new Error('Flight fetch failed: ' + flightRes.status);
    const data = await flightRes.json();
    return { statusCode: 200, headers, body: JSON.stringify(data) };
  } catch(e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};

exports.handler = async function(event) {
  const { callsign } = event.queryStringParameters || {};
  const AVIATIONSTACK_KEY = '0fbb30dc361c247714967c51701472ac';

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  if (!callsign) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing callsign' }) };

  try {
    const url = `http://api.aviationstack.com/v1/flights?access_key=${AVIATIONSTACK_KEY}&flight_iata=${encodeURIComponent(callsign.trim())}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error('AviationStack error: ' + res.status);
    const data = await res.json();
    if (data.error) throw new Error(data.error.message || 'API error');
    const flight = data.data?.[0];
    if (!flight) return { statusCode: 200, headers, body: JSON.stringify({ dep: null, arr: null }) };
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        dep: flight.departure?.iata || null,
        arr: flight.arrival?.iata || null,
        depCity: flight.departure?.airport || null,
        arrCity: flight.arrival?.airport || null,
        status: flight.flight_status || null,
        airline: flight.airline?.name || null,
        aircraft: flight.aircraft?.iata || null,
        depTime: flight.departure?.scheduled || null,
        arrTime: flight.arrival?.scheduled || null
      })
    };
  } catch(e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message, dep: null, arr: null }) };
  }
};

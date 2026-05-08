exports.handler = async function(event) {
  const { flight, date } = event.queryStringParameters || {};
  const AVIATIONSTACK_KEY = '0fbb30dc361c247714967c51701472ac';
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };
  if (!flight) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing flight number' }) };
  try {
    const url = `http://api.aviationstack.com/v1/flights?access_key=${AVIATIONSTACK_KEY}&flight_iata=${flight}${date ? '&flight_date='+date : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('AviationStack error: ' + res.status);
    const data = await res.json();
    return { statusCode: 200, headers, body: JSON.stringify(data) };
  } catch(e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};

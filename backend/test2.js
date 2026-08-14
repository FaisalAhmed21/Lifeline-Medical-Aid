const axios = require('axios');
async function test() {
  const overpassQuery = `[out:json][timeout:30];(node['amenity'='hospital'](around:10000,23.8103,90.4125););out center;`;
  const endpoints = [
    'https://overpass-api.de/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter'
  ];
  let data = null;
  let lastError = null;
  for (const endpoint of endpoints) {
    try {
      console.log('Trying', endpoint);
      const response = await axios.post(endpoint, `data=${encodeURIComponent(overpassQuery)}`, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'LifelineMedicalAid/1.0', 'Accept': '*/*' },
        timeout: 15000
      });
      if (response.data && response.data.elements) {
        data = response.data;
        console.log('Success with', endpoint, 'elements:', data.elements.length);
        break;
      }
    } catch (error) {
      console.log('Failed:', error.message);
      lastError = error;
    }
  }
}
test();

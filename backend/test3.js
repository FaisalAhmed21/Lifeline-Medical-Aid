const axios = require('axios');
async function test() {
  const lat = 23.8093;
  const lng = 90.3616;
  const radius = 10000;
  const overpassQuery = `
    [out:json][timeout:30];
    (
      node["amenity"="clinic"](around:${radius},${lat},${lng});
      way["amenity"="clinic"](around:${radius},${lat},${lng});
      node["healthcare"="hospital"](around:${radius},${lat},${lng});
      way["healthcare"="hospital"](around:${radius},${lat},${lng});
      node["amenity"="doctors"](around:${radius},${lat},${lng});
      way["amenity"="doctors"](around:${radius},${lat},${lng});
      node["healthcare"="clinic"](around:${radius},${lat},${lng});
    );
    out center;
  `;
  const endpoint = 'https://overpass-api.de/api/interpreter';
  try {
    const response = await axios.post(endpoint, `data=${encodeURIComponent(overpassQuery)}`, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'LifelineMedicalAid/1.0', 'Accept': '*/*' },
      timeout: 15000
    });
    console.log('Elements found:', response.data.elements ? response.data.elements.length : 0);
  } catch (error) {
    console.log('Failed:', error.message);
  }
}
test();

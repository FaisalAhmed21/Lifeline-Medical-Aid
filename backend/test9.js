const axios = require('axios');
async function test() {
  const lat = 23.8091;
  const lng = 90.3614;
  const radius = 10000;
  const overpassQuery = `
    [out:json][timeout:25];
    (
      nwr["amenity"="clinic"](around:${radius},${lat},${lng});
      nwr["amenity"="hospital"](around:${radius},${lat},${lng});
      nwr["amenity"="doctors"](around:${radius},${lat},${lng});
      nwr["healthcare"="clinic"](around:${radius},${lat},${lng});
      nwr["healthcare"="hospital"](around:${radius},${lat},${lng});
    );
    out center;
  `;
  const endpoints = [
    'https://overpass-api.de/api/interpreter',
    'https://lz4.overpass-api.de/api/interpreter',
    'https://z.overpass-api.de/api/interpreter'
  ];
  for (const endpoint of endpoints) {
    try {
      const response = await axios.post(endpoint, `data=${encodeURIComponent(overpassQuery)}`, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'LifelineMedicalAid/1.0', 'Accept': '*/*' },
        timeout: 15000
      });
      console.log(endpoint, 'returned elements:', response.data.elements ? response.data.elements.length : 'none');
    } catch (error) {
      console.log(endpoint, 'Failed:', error.message);
    }
  }
}
test();

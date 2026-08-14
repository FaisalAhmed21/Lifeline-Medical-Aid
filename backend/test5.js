const axios = require('axios');
async function test() {
  const lat = 23.8093;
  const lng = 90.3616;
  const radius = 10000;
  const overpassQuery = `
    [out:json][timeout:25];
    (
      nwr["amenity"~"clinic|doctors|hospital"](around:${radius},${lat},${lng});
      nwr["healthcare"~"clinic|hospital"](around:${radius},${lat},${lng});
    );
    out center;
  `;
  const endpoint = 'https://overpass-api.de/api/interpreter';
  try {
    const response = await axios.post(endpoint, `data=${encodeURIComponent(overpassQuery)}`, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'LifelineMedicalAid/1.0', 'Accept': '*/*' },
      timeout: 15000
    });
    console.log(response.data.elements[0]);
  } catch (error) {
    console.log('Failed:', error.message);
  }
}
test();

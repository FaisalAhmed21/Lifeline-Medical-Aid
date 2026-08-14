const axios = require('axios');
async function test() {
  const lat = 23.8091;
  const lng = 90.3614;
  const radius = 10000;
  
  const query1 = `
    [out:json][timeout:25];
    (
      nwr["amenity"="hospital"](around:${radius},${lat},${lng});
    );
    out center;
  `;
  
  console.time('Query1');
  try {
    const response = await axios.post('https://lz4.overpass-api.de/api/interpreter', `data=${encodeURIComponent(query1)}`, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    console.log('Query1 returned', response.data.elements.length);
  } catch (e) {
    console.log('Query1 failed', e.message);
  }
  console.timeEnd('Query1');
}
test();

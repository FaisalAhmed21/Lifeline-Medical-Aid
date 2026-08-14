const axios = require('axios');
async function test() {
  const lat = 23.8091;
  const lng = 90.3614;
  const radius = 10000;
  
  const query = `
    [out:json][timeout:15];
    (
      nwr["amenity"="hospital"](around:${radius},${lat},${lng});
      nwr["healthcare"="hospital"](around:${radius},${lat},${lng});
    );
    out center;
  `;
  
  console.time('QueryTime');
  try {
    const response = await axios.post('https://lz4.overpass-api.de/api/interpreter', `data=${encodeURIComponent(query)}`, {
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'LifelineMedicalAid/1.0',
        'Accept': '*/*'
      },
      timeout: 15000
    });
    console.log("Elements:", response.data.elements.length);
  } catch (e) { 
    console.log("Error status:", e.response ? e.response.status : e.message); 
  }
  console.timeEnd('QueryTime');
}
test();

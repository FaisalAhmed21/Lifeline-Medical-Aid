const axios = require('axios');
async function test() {
  const query = `[out:json][timeout:25];(nwr["amenity"="hospital"](around:10000,23.8091,90.3614););out center;`;
  try {
    const response = await axios.post('https://lz4.overpass-api.de/api/interpreter', `data=${encodeURIComponent(query)}`);
    console.log("Elements:", response.data.elements.length);
  } catch (e) { 
    console.log("Error status:", e.response ? e.response.status : e.message); 
    console.log("Error data:", e.response ? e.response.data : ""); 
  }
}
test();

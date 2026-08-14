const axios = require('axios');

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

async function test() {
  const lat = 23.8093;
  const lng = 90.3616;
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
  const endpoint = 'https://overpass-api.de/api/interpreter';
  try {
    const response = await axios.post(endpoint, `data=${encodeURIComponent(overpassQuery)}`, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'LifelineMedicalAid/1.0', 'Accept': '*/*' },
      timeout: 15000
    });
    
    const data = response.data;
    const processedIds = new Set();
    const osmHospitals = [];

    data.elements.forEach(element => {
      if (processedIds.has(element.id)) return;
      processedIds.add(element.id);

      const elLat = element.lat || (element.center && element.center.lat);
      const elLng = element.lon || (element.center && element.center.lon);
      if (!elLat || !elLng) return;

      const tags = element.tags || {};
      const name = tags.name || tags['name:en'] || 'Hospital/Clinic';
      if (!tags.name && !tags['name:en'] && !tags.operator) return;

      const distance = calculateDistance(lat, lng, elLat, elLng);

      osmHospitals.push({ name, distance });
    });
    
    console.log('Final parsed hospitals count:', osmHospitals.length);
  } catch (error) {
    console.log('Failed:', error.message);
  }
}
test();

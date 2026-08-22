const Hospital = require('../models/Hospital');
const axios = require('axios');

// Get nearby hospitals
exports.getNearbyHospitals = async (req, res) => {
  try {
    const { latitude, longitude, maxDistance = 50000, specialty } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    console.log('🔍 Searching hospitals:', {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      maxDistance: parseInt(maxDistance),
      specialty
    });

    const filters = {};
    if (specialty) {
      filters.specialties = specialty;
    }

    const hospitals = await Hospital.findNearby(
      parseFloat(longitude),
      parseFloat(latitude),
      parseInt(maxDistance),
      filters
    );

    console.log(`✅ Found ${hospitals.length} hospitals in database`);

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const radius = parseInt(maxDistance);

    // If DB is empty, use Overpass API as a proxy
    if (hospitals.length === 0) {
      console.log('MongoDB returned 0 hospitals. Fetching from OpenStreetMap API proxy...');
      
      const overpassQuery = `
        [out:json][timeout:20];
        (
          nwr["amenity"="hospital"](around:${radius},${lat},${lng});
          nwr["healthcare"="hospital"](around:${radius},${lat},${lng});
        );
        out center;
      `;

      const endpoints = [
        'https://overpass-api.de/api/interpreter',
        'https://lz4.overpass-api.de/api/interpreter',
        'https://z.overpass-api.de/api/interpreter'
      ];
      
      let data = null;

      try {
        // Fetch from all endpoints in parallel and take the first one that succeeds
        const requests = endpoints.map(endpoint => 
          axios.post(endpoint, `data=${encodeURIComponent(overpassQuery)}`, {
            headers: { 
              'Content-Type': 'application/x-www-form-urlencoded',
              'User-Agent': 'LifelineMedicalAid/1.0',
              'Accept': '*/*'
            },
            timeout: 15000 // 15 seconds max
          }).then(response => {
            if (response.data && response.data.elements) {
              return response.data;
            }
            throw new Error('Invalid response data');
          })
        );
        
        data = await Promise.any(requests);
      } catch (aggregateError) {
        console.error('All OSM API endpoints failed:', aggregateError.message);
        // Overpass is rate-limiting or down — fall back to whatever the
        // database has (cached from earlier fetches), with a wider radius,
        // instead of failing the request entirely.
        try {
          const fallbackRadius = Math.max(parseInt(maxDistance) * 5, 50000);
          const fallbackHospitals = await Hospital.findNearby(
            parseFloat(longitude),
            parseFloat(latitude),
            fallbackRadius,
            filters
          );
          const fallbackWithDistance = fallbackHospitals
            .filter(h => h.location && h.location.coordinates)
            .map(hospital => {
              const [hospLng, hospLat] = hospital.location.coordinates;
              const distance = calculateDistance(parseFloat(latitude), parseFloat(longitude), hospLat, hospLng);
              return { ...hospital.toObject(), distance: parseFloat(distance.toFixed(2)) };
            })
            .filter(h => h.distance <= parseInt(maxDistance) / 1000 + 5)
            .sort((a, b) => a.distance - b.distance);
          console.log(`⚠️ OSM unavailable, served ${fallbackWithDistance.length} cached hospitals from database`);
          return res.status(200).json({
            success: true,
            count: fallbackWithDistance.length,
            cached: true,
            data: fallbackWithDistance
          });
        } catch (dbError) {
          return res.status(503).json({
            success: false,
            error: 'Hospital search is temporarily unavailable. Please try again shortly.'
          });
        }
      }

      try {
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

          osmHospitals.push({
            _id: element.id.toString(),
            name: name,
            type: tags.amenity === 'clinic' || tags.healthcare === 'clinic' || tags.amenity === 'doctors' ? 'clinic' : 'hospital',
            address: {
              street: tags['addr:full'] || tags['addr:street'] || 'Address not available',
              city: tags['addr:city'] || '',
              state: '',
              zipCode: '',
              country: ''
            },
            fullAddress: tags['addr:full'] || `${tags['addr:street'] || ''} ${tags['addr:city'] || ''}`.trim() || 'Address not available',
            location: {
              type: 'Point',
              coordinates: [elLng, elLat]
            },
            contact: {
              phone: tags.phone || tags['contact:phone'] || 'N/A',
              email: tags.email || tags['contact:email'] || '',
              website: tags.website || tags['contact:website'] || null
            },
            operatingHours: {
              is24Hours: tags.emergency === 'yes' || tags.opening_hours === '24/7'
            },
            departments: [],
            services: [],
            amenities: {
              ambulance: tags.emergency === 'yes',
              emergencyRoom: tags.emergency === 'yes',
              wheelchairAccess: tags.wheelchair === 'yes'
            },
            capacity: {
              totalBeds: parseInt(tags.beds) || 0,
              availableBeds: 0
            },
            distance: parseFloat(distance.toFixed(2))
          });
        });
        
        osmHospitals.sort((a, b) => a.distance - b.distance);

        // Cache the fetched hospitals in the database so future searches in
        // this area don't depend on the rate-limited Overpass API.
        try {
          const ops = osmHospitals.map(h => {
            const { _id, distance, ...doc } = h;
            return {
              updateOne: {
                filter: { osmId: String(_id) },
                update: { $set: { ...doc, osmId: String(_id), isVerified: true, isActive: true } },
                upsert: true
              }
            };
          });
          if (ops.length > 0) {
            await Hospital.bulkWrite(ops, { ordered: false });
            console.log(`💾 Cached ${ops.length} hospitals in database`);
          }
        } catch (cacheError) {
          console.error('Failed to cache hospitals (non-fatal):', cacheError.message);
        }

        return res.status(200).json({
          success: true,
          count: osmHospitals.length,
          data: osmHospitals
        });
      } catch (osmError) {
        console.error('OSM API Proxy failed:', osmError.message);
        return res.status(500).json({
          success: false,
          error: 'OSM API failed to parse data. ' + osmError.message
        });
      }
    }

    // Calculate distance for each hospital
    const hospitalsWithDistance = hospitals.map(hospital => {
      const [hospLng, hospLat] = hospital.location.coordinates;
      const distance = calculateDistance(
        parseFloat(latitude),
        parseFloat(longitude),
        hospLat,
        hospLng
      );

      return {
        ...hospital.toObject(),
        distance: parseFloat(distance.toFixed(2))
      };
    });

    // Sort by distance
    hospitalsWithDistance.sort((a, b) => a.distance - b.distance);

    res.status(200).json({
      success: true,
      count: hospitalsWithDistance.length,
      data: hospitalsWithDistance
    });
  } catch (error) {
    console.error('Get nearby hospitals error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch nearby hospitals',
      error: error.message
    });
  }
};

// Get hospital by ID
exports.getHospitalById = async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id);

    if (!hospital) {
      return res.status(404).json({
        success: false,
        message: 'Hospital not found'
      });
    }

    res.status(200).json({
      success: true,
      data: hospital
    });
  } catch (error) {
    console.error('Get hospital by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch hospital',
      error: error.message
    });
  }
};

// Get all hospitals (with filters)
exports.getAllHospitals = async (req, res) => {
  try {
    const { specialty, hospitalType, hasAmbulance, minBeds } = req.query;

    const query = { isActive: true, isVerified: true };

    if (specialty) {
      query.specialties = specialty;
    }
    if (hospitalType) {
      query.hospitalType = hospitalType;
    }
    if (hasAmbulance === 'true') {
      query['facilities.hasAmbulance'] = true;
    }
    if (minBeds) {
      query['facilities.availableBeds'] = { $gte: parseInt(minBeds) };
    }

    const hospitals = await Hospital.find(query);

    res.status(200).json({
      success: true,
      count: hospitals.length,
      data: hospitals
    });
  } catch (error) {
    console.error('Get all hospitals error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch hospitals',
      error: error.message
    });
  }
};

// Create hospital (admin only)
exports.createHospital = async (req, res) => {
  try {
    const hospital = await Hospital.create(req.body);

    res.status(201).json({
      success: true,
      data: hospital
    });
  } catch (error) {
    console.error('Create hospital error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create hospital',
      error: error.message
    });
  }
};

// Update hospital (admin only)
exports.updateHospital = async (req, res) => {
  try {
    const hospital = await Hospital.findByIdAndUpdate(
      req.params.id,
      { ...req.body, lastUpdated: Date.now() },
      { new: true, runValidators: true }
    );

    if (!hospital) {
      return res.status(404).json({
        success: false,
        message: 'Hospital not found'
      });
    }

    res.status(200).json({
      success: true,
      data: hospital
    });
  } catch (error) {
    console.error('Update hospital error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update hospital',
      error: error.message
    });
  }
};

// Update bed availability
exports.updateBedAvailability = async (req, res) => {
  try {
    const { type, count } = req.body;
    const hospital = await Hospital.findById(req.params.id);

    if (!hospital) {
      return res.status(404).json({
        success: false,
        message: 'Hospital not found'
      });
    }

    await hospital.updateBedAvailability(type, count);

    res.status(200).json({
      success: true,
      data: hospital
    });
  } catch (error) {
    console.error('Update bed availability error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update bed availability',
      error: error.message
    });
  }
};

// Delete hospital (admin only)
exports.deleteHospital = async (req, res) => {
  try {
    const hospital = await Hospital.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!hospital) {
      return res.status(404).json({
        success: false,
        message: 'Hospital not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Hospital deactivated successfully'
    });
  } catch (error) {
    console.error('Delete hospital error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete hospital',
      error: error.message
    });
  }
};

// Helper function to calculate distance
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

module.exports = exports;

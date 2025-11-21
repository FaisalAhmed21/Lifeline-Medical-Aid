const mongoose = require('mongoose');
const Hospital = require('../models/Hospital');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

/**
 * Script to add hospitals for YOUR specific location
 * 
 * INSTRUCTIONS:
 * 1. Go to Google Maps
 * 2. Search for hospitals in your area
 * 3. Right-click on each hospital marker -> "What's here?"
 * 4. Copy the coordinates (latitude, longitude)
 * 5. Update the hospitals array below with YOUR local hospitals
 * 
 * COORDINATE FORMAT:
 * - GeoJSON uses [longitude, latitude] (X, Y)
 * - Google Maps shows [latitude, longitude]
 * - So SWAP them when copying from Google Maps!
 */

// REPLACE THIS WITH YOUR LOCAL HOSPITALS
const hospitals = [
  {
    name: "Your Local Hospital 1",
    address: {
      street: "123 Main Street",
      city: "Your City",
      state: "Your State",
      country: "Your Country",
      zipCode: "12345"
    },
    location: {
      type: "Point",
      coordinates: [90.4125, 23.7265] // [LONGITUDE, LATITUDE] - REPLACE WITH YOUR HOSPITAL'S COORDINATES!
    },
    contact: {
      phone: "+1-234-567-8900",
      emergencyLine: "+1-234-567-8911",
      email: "info@hospital.com",
      website: "www.hospital.com"
    },
    facilities: {
      totalBeds: 200,
      availableBeds: 45,
      icuBeds: 20,
      availableIcuBeds: 5,
      emergencyBeds: 30,
      availableEmergencyBeds: 8,
      hasAmbulance: true,
      ambulanceCount: 5,
      availableAmbulances: 2
    },
    specialties: [
      "Emergency Medicine",
      "Cardiology",
      "Surgery",
      "Pediatrics"
    ],
    doctorCount: 50,
    nurseCount: 100,
    hospitalType: "Private",
    isVerified: true,
    isActive: true,
    operatingHours: {
      is24x7: true
    },
    rating: {
      average: 4.5,
      count: 100
    }
  },
  // ADD MORE HOSPITALS HERE BY COPYING THE STRUCTURE ABOVE
];

const addHospitals = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/lifeline';
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Check current count
    const existingCount = await Hospital.countDocuments();
    console.log(`📊 Existing hospitals in database: ${existingCount}`);

    if (hospitals.length === 0) {
      console.log('⚠️  No hospitals to add. Please edit this script and add your local hospitals!');
      console.log('\nINSTRUCTIONS:');
      console.log('1. Open: backend/scripts/addHospitalsByLocation.js');
      console.log('2. Find hospitals near you on Google Maps');
      console.log('3. Get coordinates by right-clicking each hospital');
      console.log('4. Add them to the hospitals array in this script');
      console.log('5. Remember: coordinates should be [longitude, latitude]');
      process.exit(0);
    }

    // Add hospitals
    console.log(`\n📝 Adding ${hospitals.length} new hospital(s)...`);
    const added = await Hospital.insertMany(hospitals);
    console.log(`✅ Successfully added ${added.length} hospitals`);

    // Verify indexes
    const indexes = await Hospital.collection.getIndexes();
    console.log('\n📍 Geospatial indexes:', Object.keys(indexes).filter(k => k.includes('location')));

    // Test search from first hospital's location
    if (added.length > 0) {
      const testHospital = added[0];
      const [lng, lat] = testHospital.location.coordinates;
      console.log(`\n🔍 Testing search from ${testHospital.name} location...`);
      console.log(`   Coordinates: [${lat}, ${lng}]`);
      
      const nearby = await Hospital.findNearby(lng, lat, 50000);
      console.log(`   Found ${nearby.length} hospitals within 50km`);
      
      nearby.forEach((h, i) => {
        console.log(`   ${i + 1}. ${h.name} - ${h.address.city}`);
      });
    }

    console.log('\n✅ Done!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

// Function to help convert Google Maps coordinates
const convertGoogleMapsCoords = (lat, lng) => {
  console.log(`Google Maps coords: ${lat}, ${lng}`);
  console.log(`GeoJSON format: [${lng}, ${lat}]`);
  return [lng, lat];
};

// Example usage:
// convertGoogleMapsCoords(40.7128, -74.0060); // New York

addHospitals();

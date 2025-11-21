const mongoose = require('mongoose');
const Hospital = require('../models/Hospital');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const checkHospitals = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/lifeline';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    const count = await Hospital.countDocuments();
    console.log(`📊 Total hospitals in database: ${count}\n`);

    if (count > 0) {
      const hospitals = await Hospital.find({}).limit(20);
      console.log('🏥 Hospitals in database:\n');
      hospitals.forEach((h, i) => {
        const lat = h.location.coordinates[1];
        const lng = h.location.coordinates[0];
        console.log(`${i + 1}. ${h.name}`);
        console.log(`   Location: ${h.address.city}, ${h.address.country}`);
        console.log(`   Coordinates: [${lat}, ${lng}]`);
        console.log(`   Beds: ${h.facilities.availableBeds}/${h.facilities.totalBeds}`);
        console.log('');
      });
    } else {
      console.log('⚠️  No hospitals found in database!');
      console.log('\nTo add hospitals for YOUR location:');
      console.log('1. Edit: backend/scripts/addHospitalsByLocation.js');
      console.log('2. Add your local hospitals with their coordinates');
      console.log('3. Run: node backend/scripts/addHospitalsByLocation.js');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

checkHospitals();

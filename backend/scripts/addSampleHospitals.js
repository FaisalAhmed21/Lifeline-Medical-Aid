const mongoose = require('mongoose');
const Hospital = require('../models/Hospital');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const sampleHospitals = [
  {
    name: "Dhaka Medical College Hospital",
    address: {
      street: "Bakshi Bazar Road",
      city: "Dhaka",
      state: "Dhaka Division",
      country: "Bangladesh",
      zipCode: "1000"
    },
    location: {
      type: "Point",
      coordinates: [90.4125, 23.7265] // [longitude, latitude]
    },
    contact: {
      phone: "+880-2-8626812",
      emergencyLine: "+880-2-8626813",
      email: "info@dmch.gov.bd",
      website: "www.dmch.gov.bd"
    },
    facilities: {
      totalBeds: 2300,
      availableBeds: 450,
      icuBeds: 50,
      availableIcuBeds: 12,
      emergencyBeds: 200,
      availableEmergencyBeds: 45,
      hasAmbulance: true,
      ambulanceCount: 15,
      availableAmbulances: 8
    },
    specialties: [
      "Emergency Medicine",
      "Cardiology",
      "Neurology",
      "Surgery",
      "Pediatrics",
      "Orthopedics",
      "Critical Care",
      "Trauma Care",
      "Burn Unit"
    ],
    doctorCount: 450,
    nurseCount: 800,
    hospitalType: "Government",
    isVerified: true,
    isActive: true,
    operatingHours: {
      is24x7: true
    },
    rating: {
      average: 4.2,
      count: 523
    }
  },
  {
    name: "Square Hospital",
    address: {
      street: "18/F Bir Uttam Qazi Nuruzzaman Sarak",
      city: "Dhaka",
      state: "Dhaka Division",
      country: "Bangladesh",
      zipCode: "1205"
    },
    location: {
      type: "Point",
      coordinates: [90.3913, 23.7515]
    },
    contact: {
      phone: "+880-2-8159457",
      emergencyLine: "+880-2-8159458",
      email: "info@squarehospital.com",
      website: "www.squarehospital.com"
    },
    facilities: {
      totalBeds: 450,
      availableBeds: 85,
      icuBeds: 40,
      availableIcuBeds: 8,
      emergencyBeds: 50,
      availableEmergencyBeds: 12,
      hasAmbulance: true,
      ambulanceCount: 10,
      availableAmbulances: 5
    },
    specialties: [
      "Cardiology",
      "Neurology",
      "Oncology",
      "Orthopedics",
      "Pediatrics",
      "Surgery",
      "Emergency Medicine",
      "Critical Care"
    ],
    doctorCount: 280,
    nurseCount: 520,
    hospitalType: "Private",
    isVerified: true,
    isActive: true,
    operatingHours: {
      is24x7: true
    },
    rating: {
      average: 4.7,
      count: 892
    }
  },
  {
    name: "United Hospital",
    address: {
      street: "Plot 15, Road 71, Gulshan",
      city: "Dhaka",
      state: "Dhaka Division",
      country: "Bangladesh",
      zipCode: "1212"
    },
    location: {
      type: "Point",
      coordinates: [90.4152, 23.7925]
    },
    contact: {
      phone: "+880-2-8836000",
      emergencyLine: "+880-2-8836100",
      email: "info@uhlbd.com",
      website: "www.uhlbd.com"
    },
    facilities: {
      totalBeds: 500,
      availableBeds: 95,
      icuBeds: 50,
      availableIcuBeds: 10,
      emergencyBeds: 60,
      availableEmergencyBeds: 15,
      hasAmbulance: true,
      ambulanceCount: 12,
      availableAmbulances: 7
    },
    specialties: [
      "Cardiology",
      "Neurology",
      "Oncology",
      "Orthopedics",
      "Surgery",
      "Emergency Medicine",
      "Critical Care",
      "Trauma Care"
    ],
    doctorCount: 350,
    nurseCount: 650,
    hospitalType: "Private",
    isVerified: true,
    isActive: true,
    operatingHours: {
      is24x7: true
    },
    rating: {
      average: 4.8,
      count: 1024
    }
  },
  {
    name: "Apollo Hospitals Dhaka",
    address: {
      street: "Plot 81, Block E, Bashundhara R/A",
      city: "Dhaka",
      state: "Dhaka Division",
      country: "Bangladesh",
      zipCode: "1229"
    },
    location: {
      type: "Point",
      coordinates: [90.4271, 23.8208]
    },
    contact: {
      phone: "+880-2-8401661",
      emergencyLine: "+880-2-8401662",
      email: "info@apollodhaka.com",
      website: "www.apollodhaka.com"
    },
    facilities: {
      totalBeds: 430,
      availableBeds: 78,
      icuBeds: 35,
      availableIcuBeds: 7,
      emergencyBeds: 45,
      availableEmergencyBeds: 11,
      hasAmbulance: true,
      ambulanceCount: 8,
      availableAmbulances: 4
    },
    specialties: [
      "Cardiology",
      "Neurology",
      "Oncology",
      "Orthopedics",
      "Surgery",
      "Emergency Medicine",
      "Critical Care"
    ],
    doctorCount: 320,
    nurseCount: 580,
    hospitalType: "Private",
    isVerified: true,
    isActive: true,
    operatingHours: {
      is24x7: true
    },
    rating: {
      average: 4.6,
      count: 756
    }
  },
  {
    name: "Evercare Hospital Dhaka",
    address: {
      street: "Plot 81, Block E, Bashundhara R/A",
      city: "Dhaka",
      state: "Dhaka Division",
      country: "Bangladesh",
      zipCode: "1229"
    },
    location: {
      type: "Point",
      coordinates: [90.4285, 23.8198]
    },
    contact: {
      phone: "+880-10678911911",
      emergencyLine: "+880-9666710678",
      email: "info@evercaredhaka.com",
      website: "www.evercaredhaka.com"
    },
    facilities: {
      totalBeds: 450,
      availableBeds: 82,
      icuBeds: 42,
      availableIcuBeds: 9,
      emergencyBeds: 55,
      availableEmergencyBeds: 13,
      hasAmbulance: true,
      ambulanceCount: 10,
      availableAmbulances: 6
    },
    specialties: [
      "Cardiology",
      "Neurology",
      "Oncology",
      "Orthopedics",
      "Surgery",
      "Emergency Medicine",
      "Critical Care",
      "Pediatrics"
    ],
    doctorCount: 340,
    nurseCount: 620,
    hospitalType: "Private",
    isVerified: true,
    isActive: true,
    operatingHours: {
      is24x7: true
    },
    rating: {
      average: 4.7,
      count: 834
    }
  },
  {
    name: "Labaid Specialized Hospital",
    address: {
      street: "House 1, Road 4, Dhanmondi",
      city: "Dhaka",
      state: "Dhaka Division",
      country: "Bangladesh",
      zipCode: "1205"
    },
    location: {
      type: "Point",
      coordinates: [90.3742, 23.7461]
    },
    contact: {
      phone: "+880-2-9676767",
      emergencyLine: "+880-2-9676768",
      email: "info@labaidgroup.com",
      website: "www.labaidgroup.com"
    },
    facilities: {
      totalBeds: 350,
      availableBeds: 65,
      icuBeds: 28,
      availableIcuBeds: 6,
      emergencyBeds: 40,
      availableEmergencyBeds: 10,
      hasAmbulance: true,
      ambulanceCount: 7,
      availableAmbulances: 4
    },
    specialties: [
      "Cardiology",
      "Neurology",
      "Orthopedics",
      "Pediatrics",
      "Surgery",
      "Emergency Medicine"
    ],
    doctorCount: 220,
    nurseCount: 420,
    hospitalType: "Private",
    isVerified: true,
    isActive: true,
    operatingHours: {
      is24x7: true
    },
    rating: {
      average: 4.4,
      count: 612
    }
  },
  {
    name: "Popular Diagnostic Centre Hospital",
    address: {
      street: "House 16, Road 2, Dhanmondi",
      city: "Dhaka",
      state: "Dhaka Division",
      country: "Bangladesh",
      zipCode: "1205"
    },
    location: {
      type: "Point",
      coordinates: [90.3758, 23.7398]
    },
    contact: {
      phone: "+880-2-55028007",
      emergencyLine: "+880-2-55028008",
      email: "info@populardiagnostic.com",
      website: "www.populardiagnostic.com"
    },
    facilities: {
      totalBeds: 280,
      availableBeds: 52,
      icuBeds: 22,
      availableIcuBeds: 5,
      emergencyBeds: 35,
      availableEmergencyBeds: 9,
      hasAmbulance: true,
      ambulanceCount: 6,
      availableAmbulances: 3
    },
    specialties: [
      "Cardiology",
      "Neurology",
      "Orthopedics",
      "Pediatrics",
      "Emergency Medicine",
      "Laboratory"
    ],
    doctorCount: 180,
    nurseCount: 340,
    hospitalType: "Private",
    isVerified: true,
    isActive: true,
    operatingHours: {
      is24x7: true
    },
    rating: {
      average: 4.3,
      count: 487
    }
  },
  {
    name: "Ibn Sina Hospital",
    address: {
      street: "House 48, Road 9/A, Dhanmondi",
      city: "Dhaka",
      state: "Dhaka Division",
      country: "Bangladesh",
      zipCode: "1209"
    },
    location: {
      type: "Point",
      coordinates: [90.3721, 23.7512]
    },
    contact: {
      phone: "+880-2-9661034",
      emergencyLine: "+880-2-9661035",
      email: "info@ibnsinahospital.com",
      website: "www.ibnsinahospital.com"
    },
    facilities: {
      totalBeds: 320,
      availableBeds: 58,
      icuBeds: 25,
      availableIcuBeds: 5,
      emergencyBeds: 38,
      availableEmergencyBeds: 8,
      hasAmbulance: true,
      ambulanceCount: 6,
      availableAmbulances: 3
    },
    specialties: [
      "Cardiology",
      "Neurology",
      "Orthopedics",
      "Pediatrics",
      "Surgery",
      "Emergency Medicine"
    ],
    doctorCount: 200,
    nurseCount: 380,
    hospitalType: "Private",
    isVerified: true,
    isActive: true,
    operatingHours: {
      is24x7: true
    },
    rating: {
      average: 4.3,
      count: 542
    }
  }
];

const addSampleHospitals = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/lifeline';
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Clear existing hospitals (optional - comment out if you want to keep existing data)
    // await Hospital.deleteMany({});
    // console.log('🗑️  Cleared existing hospitals');

    // Check if hospitals already exist
    const existingCount = await Hospital.countDocuments();
    console.log(`📊 Existing hospitals in database: ${existingCount}`);

    // Add sample hospitals
    const hospitals = await Hospital.insertMany(sampleHospitals);
    console.log(`✅ Added ${hospitals.length} sample hospitals`);

    // Verify geospatial index
    const indexes = await Hospital.collection.getIndexes();
    console.log('📍 Indexes:', Object.keys(indexes));

    // Test a nearby search from central Dhaka
    const testLongitude = 90.4125;
    const testLatitude = 23.8103;
    const nearbyHospitals = await Hospital.findNearby(testLongitude, testLatitude, 50000);
    console.log(`🔍 Found ${nearbyHospitals.length} hospitals near Dhaka center (within 50km)`);

    nearbyHospitals.forEach((hospital, index) => {
      console.log(`   ${index + 1}. ${hospital.name} - ${hospital.address.street}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

addSampleHospitals();

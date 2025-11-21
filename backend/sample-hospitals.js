// Sample Hospital Data for Testing
// Use this file to add hospitals to your database via Postman or MongoDB Compass

const sampleHospitals = [
  {
    name: "Dhaka Medical College Hospital",
    address: {
      street: "Secretariat Road, Bakshibazar",
      city: "Dhaka",
      state: "Dhaka Division",
      country: "Bangladesh",
      zipCode: "1000"
    },
    location: {
      type: "Point",
      coordinates: [90.4125, 23.7261] // [longitude, latitude]
    },
    contact: {
      phone: "+880-2-8626812",
      emergencyLine: "999",
      email: "info@dmc.gov.bd"
    },
    facilities: {
      totalBeds: 500,
      availableBeds: 50,
      icuBeds: 100,
      availableIcuBeds: 10,
      emergencyBeds: 50,
      availableEmergencyBeds: 15,
      hasAmbulance: true,
      ambulanceCount: 10,
      availableAmbulances: 5
    },
    specialties: [
      "Emergency Medicine",
      "Cardiology",
      "Neurology",
      "Surgery",
      "Pediatrics",
      "Orthopedics"
    ],
    hospitalType: "Government",
    isVerified: true,
    operatingHours: {
      is24x7: true
    },
    rating: 4.2
  },
  {
    name: "Square Hospital",
    address: {
      street: "18/F, Bir Uttam Qazi Nuruzzaman Sarak",
      city: "Dhaka",
      state: "Dhaka Division",
      country: "Bangladesh",
      zipCode: "1205"
    },
    location: {
      type: "Point",
      coordinates: [90.4074, 23.7516]
    },
    contact: {
      phone: "+880-2-8159457",
      emergencyLine: "+880-2-8159458",
      email: "info@squarehospital.com"
    },
    facilities: {
      totalBeds: 400,
      availableBeds: 80,
      icuBeds: 80,
      availableIcuBeds: 20,
      emergencyBeds: 40,
      availableEmergencyBeds: 25,
      hasAmbulance: true,
      ambulanceCount: 15,
      availableAmbulances: 10
    },
    specialties: [
      "Emergency Medicine",
      "Cardiology",
      "Neurology",
      "Oncology",
      "Surgery",
      "ICU",
      "Pediatrics"
    ],
    hospitalType: "Private",
    isVerified: true,
    operatingHours: {
      is24x7: true
    },
    rating: 4.8
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
      coordinates: [90.4152, 23.7813]
    },
    contact: {
      phone: "+880-2-8836000",
      emergencyLine: "+880-2-8836444",
      email: "info@uhlbd.com"
    },
    facilities: {
      totalBeds: 350,
      availableBeds: 70,
      icuBeds: 70,
      availableIcuBeds: 15,
      emergencyBeds: 35,
      availableEmergencyBeds: 20,
      hasAmbulance: true,
      ambulanceCount: 12,
      availableAmbulances: 8
    },
    specialties: [
      "Emergency Medicine",
      "Cardiology",
      "Neurology",
      "Trauma Center",
      "Surgery",
      "ICU",
      "Burns Unit"
    ],
    hospitalType: "Private",
    isVerified: true,
    operatingHours: {
      is24x7: true
    },
    rating: 4.7
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
      coordinates: [90.4280, 23.8103]
    },
    contact: {
      phone: "+880-2-8401661",
      emergencyLine: "+880-2-8401881",
      email: "info@apollodhaka.com"
    },
    facilities: {
      totalBeds: 450,
      availableBeds: 90,
      icuBeds: 90,
      availableIcuBeds: 25,
      emergencyBeds: 45,
      availableEmergencyBeds: 30,
      hasAmbulance: true,
      ambulanceCount: 20,
      availableAmbulances: 15
    },
    specialties: [
      "Emergency Medicine",
      "Cardiology",
      "Neurology",
      "Oncology",
      "Surgery",
      "ICU",
      "Pediatrics",
      "Orthopedics"
    ],
    hospitalType: "Private",
    isVerified: true,
    operatingHours: {
      is24x7: true
    },
    rating: 4.9
  },
  {
    name: "Bangabandhu Sheikh Mujib Medical University",
    address: {
      street: "Shahbag",
      city: "Dhaka",
      state: "Dhaka Division",
      country: "Bangladesh",
      zipCode: "1000"
    },
    location: {
      type: "Point",
      coordinates: [90.3978, 23.7389]
    },
    contact: {
      phone: "+880-2-9668061",
      emergencyLine: "999",
      email: "info@bsmmu.edu.bd"
    },
    facilities: {
      totalBeds: 600,
      availableBeds: 40,
      icuBeds: 120,
      availableIcuBeds: 8,
      emergencyBeds: 60,
      availableEmergencyBeds: 10,
      hasAmbulance: true,
      ambulanceCount: 8,
      availableAmbulances: 3
    },
    specialties: [
      "Emergency Medicine",
      "Cardiology",
      "Neurology",
      "Surgery",
      "Pediatrics",
      "Orthopedics",
      "Trauma Center"
    ],
    hospitalType: "Government",
    isVerified: true,
    operatingHours: {
      is24x7: true
    },
    rating: 4.1
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
      coordinates: [90.3741, 23.7465]
    },
    contact: {
      phone: "+880-2-8616400",
      emergencyLine: "+880-2-8616666",
      email: "info@labaidgroup.com"
    },
    facilities: {
      totalBeds: 300,
      availableBeds: 60,
      icuBeds: 60,
      availableIcuBeds: 12,
      emergencyBeds: 30,
      availableEmergencyBeds: 18,
      hasAmbulance: true,
      ambulanceCount: 10,
      availableAmbulances: 7
    },
    specialties: [
      "Emergency Medicine",
      "Cardiology",
      "Neurology",
      "Surgery",
      "ICU",
      "Pediatrics"
    ],
    hospitalType: "Private",
    isVerified: true,
    operatingHours: {
      is24x7: true
    },
    rating: 4.5
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
      coordinates: [90.3710, 23.7507]
    },
    contact: {
      phone: "+880-2-8153547",
      emergencyLine: "+880-2-8153548",
      email: "info@ibnsinahospital.com"
    },
    facilities: {
      totalBeds: 280,
      availableBeds: 55,
      icuBeds: 50,
      availableIcuBeds: 10,
      emergencyBeds: 28,
      availableEmergencyBeds: 15,
      hasAmbulance: true,
      ambulanceCount: 8,
      availableAmbulances: 5
    },
    specialties: [
      "Emergency Medicine",
      "Cardiology",
      "Surgery",
      "Pediatrics",
      "Orthopedics"
    ],
    hospitalType: "Private",
    isVerified: true,
    operatingHours: {
      is24x7: true
    },
    rating: 4.3
  },
  {
    name: "Popular Medical College Hospital",
    address: {
      street: "House 2, Road 2, Dhanmondi",
      city: "Dhaka",
      state: "Dhaka Division",
      country: "Bangladesh",
      zipCode: "1205"
    },
    location: {
      type: "Point",
      coordinates: [90.3768, 23.7420]
    },
    contact: {
      phone: "+880-2-8613079",
      emergencyLine: "999",
      email: "info@popularmedicalcollege.edu.bd"
    },
    facilities: {
      totalBeds: 320,
      availableBeds: 45,
      icuBeds: 55,
      availableIcuBeds: 9,
      emergencyBeds: 32,
      availableEmergencyBeds: 12,
      hasAmbulance: true,
      ambulanceCount: 6,
      availableAmbulances: 3
    },
    specialties: [
      "Emergency Medicine",
      "Cardiology",
      "Neurology",
      "Surgery",
      "Pediatrics"
    ],
    hospitalType: "Private",
    isVerified: true,
    operatingHours: {
      is24x7: true
    },
    rating: 4.0
  }
];

// HOW TO ADD THESE HOSPITALS:

// METHOD 1: Using Postman (Recommended)
// =====================================
// 1. Login as admin to get token:
//    POST http://localhost:5000/api/auth/login
//    Body: { "email": "admin@example.com", "password": "your_password" }
//    Copy the token from response

// 2. For each hospital in the array above:
//    POST http://localhost:5000/api/hospitals
//    Headers: { "Authorization": "Bearer YOUR_TOKEN" }
//    Body: Paste one hospital object from above

// 3. Repeat for all 8 hospitals


// METHOD 2: Using MongoDB Compass
// ================================
// 1. Open MongoDB Compass
// 2. Connect to: mongodb://localhost:27017
// 3. Select database: lifeline
// 4. Select collection: hospitals
// 5. Click "Add Data" → "Insert Document"
// 6. Paste hospital objects one by one


// METHOD 3: Using MongoDB Shell
// ==============================
// 1. Open terminal
// 2. Run: mongosh
// 3. Run: use lifeline
// 4. Run: db.hospitals.insertMany([...paste array here...])


// QUICK TEST SCRIPT (Node.js)
// ============================
/*
const axios = require('axios');

// First login to get token
const login = async () => {
  const response = await axios.post('http://localhost:5000/api/auth/login', {
    email: 'admin@example.com',
    password: 'your_password'
  });
  return response.data.token;
};

// Then add all hospitals
const addHospitals = async () => {
  const token = await login();
  
  for (const hospital of sampleHospitals) {
    try {
      await axios.post('http://localhost:5000/api/hospitals', hospital, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log(`✅ Added: ${hospital.name}`);
    } catch (error) {
      console.error(`❌ Failed: ${hospital.name}`, error.response?.data);
    }
  }
};

addHospitals();
*/

module.exports = sampleHospitals;

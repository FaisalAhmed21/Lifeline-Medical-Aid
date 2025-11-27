import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { 
  FaAmbulance, 
  FaUserMd, 
  FaHandHoldingHeart, 
  FaMapMarkerAlt, 
  FaHospital, 
  FaClock,
  FaShieldAlt,
  FaUsers,
  FaCheckCircle,
  FaArrowRight
} from 'react-icons/fa';

const Home = () => {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const features = [
    {
      icon: <FaUserMd className="text-5xl text-blue-600" />,
      title: t('nearbyDoctors'),
      description: 'Connect with qualified doctors in your area instantly',
      color: 'blue'
    },
    {
      icon: <FaAmbulance className="text-5xl text-red-500" />,
      title: t('nearbyDrivers'),
      description: 'Get emergency ambulance services quickly when you need them most',
      color: 'red'
    },
    {
      icon: <FaHandHoldingHeart className="text-5xl text-green-500" />,
      title: t('nearbyVolunteers'),
      description: 'Connect with volunteers ready to help in your community',
      color: 'green'
    },
    {
      icon: <FaHospital className="text-5xl text-purple-600" />,
      title: 'Hospital Locator',
      description: 'Find nearby hospitals and medical facilities with real-time data',
      color: 'purple'
    }
  ];

  const stats = [
    { number: '1000+', label: 'Active Users' },
    { number: '500+', label: 'Verified Doctors' },
    { number: '24/7', label: 'Emergency Support' },
    { number: '50+', label: 'Districts Covered' }
  ];

  const benefits = [
    'Real-time GPS location tracking',
    'Verified healthcare professionals',
    'Emergency alert system',
    'Multi-language support',
    'Secure and private',
    '24/7 availability'
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-purple-600 text-white py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
              {t('appName')}
            </h1>
            <p className="text-xl md:text-2xl mb-4 opacity-95 max-w-3xl mx-auto">
              {t('tagline')}
            </p>
            <p className="text-lg mb-10 opacity-90 max-w-2xl mx-auto">
              Connecting rural communities with healthcare services through technology
            </p>
            {!isAuthenticated && (
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link
                  to="/register"
                  className="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition transform hover:scale-105 shadow-lg flex items-center justify-center gap-2"
                >
                  Get Started <FaArrowRight />
                </Link>
                <Link
                  to="/login"
                  className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition transform hover:scale-105"
                >
                  Sign In
                </Link>
              </div>
            )}
            {isAuthenticated && (
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <button
                  onClick={() => navigate('/nearby')}
                  className="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition transform hover:scale-105 shadow-lg flex items-center justify-center gap-2"
                >
                  <FaMapMarkerAlt /> Find Nearby Services
                </button>
                <button
                  onClick={() => navigate('/hospitals')}
                  className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition transform hover:scale-105 flex items-center justify-center gap-2"
                >
                  <FaHospital /> Locate Hospitals
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-white py-12 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl font-bold text-blue-600 mb-2">{stat.number}</div>
                <div className="text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Our Services
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Comprehensive healthcare coordination at your fingertips
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white p-8 rounded-xl shadow-md hover:shadow-2xl transition-all transform hover:-translate-y-2 duration-300 group"
              >
                <div className={`flex justify-center mb-6 transform group-hover:scale-110 transition-transform duration-300`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-3 text-gray-800 text-center">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-center">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                Why Choose Us?
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                We're dedicated to making healthcare accessible to everyone, especially in rural areas where medical services are limited.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <FaCheckCircle className="text-green-500 text-xl flex-shrink-0" />
                    <span className="text-gray-700">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl text-white text-center flex flex-col justify-center min-h-[180px]">
                <FaClock className="text-4xl mx-auto mb-3" />
                <h3 className="font-bold text-lg mb-2">Quick Response</h3>
                <p className="text-sm opacity-90">Average response time under 5 minutes</p>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-xl text-white text-center flex flex-col justify-center min-h-[180px]">
                <FaShieldAlt className="text-4xl mx-auto mb-3" />
                <h3 className="font-bold text-lg mb-2">Verified Providers</h3>
                <p className="text-sm opacity-90">All professionals are verified</p>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-xl text-white text-center flex flex-col justify-center min-h-[180px]">
                <FaMapMarkerAlt className="text-4xl mx-auto mb-3" />
                <h3 className="font-bold text-lg mb-2">GPS Tracking</h3>
                <p className="text-sm opacity-90">Real-time location updates</p>
              </div>
              <div className="bg-gradient-to-br from-red-500 to-red-600 p-6 rounded-xl text-white text-center flex flex-col justify-center min-h-[180px]">
                <FaUsers className="text-4xl mx-auto mb-3" />
                <h3 className="font-bold text-lg mb-2">Community Care</h3>
                <p className="text-sm opacity-90">Local volunteers ready to help</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="text-xl font-bold mb-4">{t('appName')}</h3>
              <p className="text-gray-400">
                Making healthcare accessible to everyone, everywhere.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-4">Quick Links</h3>
              <ul className="space-y-2">
                {isAuthenticated ? (
                  <>
                    <li><Link to="/nearby" className="text-gray-400 hover:text-white transition">Find Services</Link></li>
                    <li><Link to="/hospitals" className="text-gray-400 hover:text-white transition">Hospitals</Link></li>
                    <li><Link to="/profile" className="text-gray-400 hover:text-white transition">Profile</Link></li>
                  </>
                ) : (
                  <>
                    <li><Link to="/login" className="text-gray-400 hover:text-white transition">Login</Link></li>
                    <li><Link to="/register" className="text-gray-400 hover:text-white transition">Register</Link></li>
                  </>
                )}
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-4">Contact</h3>
              <p className="text-gray-400">
                Emergency: <span className="text-white font-semibold">999</span><br />
                Support: info@healthcoordination.com
              </p>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center">
            <p className="text-gray-400">
              © 2024 {t('appName')} - {t('tagline')}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Serving rural communities with better healthcare coordination
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;

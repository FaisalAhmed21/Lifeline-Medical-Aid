import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { FaGlobe, FaBars, FaTimes } from 'react-icons/fa';

const Navbar = () => {
  const { t } = useTranslation();
  const { user, logout, isAuthenticated } = useAuth();
  const { language, toggleLanguage } = useLanguage();
  const [isOpen, setIsOpen] = React.useState(false);

  const handleLogout = () => {
    logout();
    setIsOpen(false);
  };

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 flex-shrink-0">
            <span className="text-xl font-bold text-primary">{t('appName')}</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-5 flex-1 justify-start ml-12">
            <Link to="/" className="text-gray-700 hover:text-primary transition whitespace-nowrap">
              {t('home')}
            </Link>
            
            {isAuthenticated && (
              <>
                <Link to="/dashboard" className="text-gray-700 hover:text-primary transition whitespace-nowrap">
                  {t('dashboard')}
                </Link>
                <Link to="/emergencies" className="text-gray-700 hover:text-primary transition whitespace-nowrap">
                  {t('emergencies')}
                </Link>
                <Link to="/hospitals" className="text-gray-700 hover:text-primary transition whitespace-nowrap">
                  {t('hospitals')}
                </Link>
                {['doctor', 'volunteer', 'driver'].includes(user?.role) && (
                  <Link to="/availability" className="text-gray-700 hover:text-primary transition whitespace-nowrap">
                    {t('availability')}
                  </Link>
                )}
                {user?.role === 'patient' && (
                  <>
                    <Link to="/nearby" className="text-gray-700 hover:text-primary transition whitespace-nowrap">
                      {t('findNearby')}
                    </Link>
                    <Link to="/medical-records" className="text-gray-700 hover:text-primary transition whitespace-nowrap">
                      {t('medicalRecords')}
                    </Link>
                  </>
                )}
                <Link to="/profile" className="text-gray-700 hover:text-primary transition whitespace-nowrap">
                  {t('profile')}
                </Link>
              </>
            )}
          </div>

          {/* Right Side - Language & Auth */}
          <div className="hidden md:flex items-center gap-6 flex-shrink-0 ml-6">
            {/* Language Toggle */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1 text-gray-700 hover:text-primary transition px-2"
              title={t('preferredLanguage')}
            >
              <FaGlobe />
              <span className="text-sm font-medium">
                {language === 'en' ? 'EN' : 'বাং'}
              </span>
            </button>

            {/* Auth Buttons */}
            {isAuthenticated ? (
              <div className="flex items-center gap-6">
                <span className="text-sm text-gray-600">
                  {user?.name}
                  <span className="ml-1 text-xs text-primary">({t(user?.role)})</span>
                </span>
                <button
                  onClick={handleLogout}
                  className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
                >
                  {t('logout')}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Link
                  to="/login"
                  className="text-primary hover:text-blue-700 transition font-medium"
                >
                  {t('login')}
                </Link>
                <Link
                  to="/register"
                  className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  {t('register')}
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden text-gray-700 hover:text-primary"
          >
            {isOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden pb-4">
            <div className="flex flex-col space-y-3">
              <Link
                to="/"
                onClick={() => setIsOpen(false)}
                className="text-gray-700 hover:text-primary transition"
              >
                {t('home')}
              </Link>
              
              {isAuthenticated && (
                <>
                  <Link
                    to="/dashboard"
                    onClick={() => setIsOpen(false)}
                    className="text-gray-700 hover:text-primary transition"
                  >
                    {t('dashboard')}
                  </Link>
                  <Link
                    to="/emergencies"
                    onClick={() => setIsOpen(false)}
                    className="text-gray-700 hover:text-primary transition"
                  >
                    {t('emergencies')}
                  </Link>
                  <Link
                    to="/hospitals"
                    onClick={() => setIsOpen(false)}
                    className="text-gray-700 hover:text-primary transition"
                  >
                    {t('hospitals')}
                  </Link>
                  {['doctor', 'volunteer', 'driver'].includes(user?.role) && (
                    <Link
                      to="/availability"
                      onClick={() => setIsOpen(false)}
                      className="text-gray-700 hover:text-primary transition"
                    >
                      {t('availability')}
                    </Link>
                  )}
                  {user?.role === 'patient' && (
                    <>
                      <Link
                        to="/nearby"
                        onClick={() => setIsOpen(false)}
                        className="text-gray-700 hover:text-primary transition"
                      >
                        {t('findNearby')}
                      </Link>
                      <Link
                        to="/medical-records"
                        onClick={() => setIsOpen(false)}
                        className="text-gray-700 hover:text-primary transition"
                      >
                        {t('medicalRecords')}
                      </Link>
                    </>
                  )}
                  <Link
                    to="/profile"
                    onClick={() => setIsOpen(false)}
                    className="text-gray-700 hover:text-primary transition"
                  >
                    {t('profile')}
                  </Link>
                </>
              )}

              <button
                onClick={toggleLanguage}
                className="flex items-center space-x-2 text-gray-700 hover:text-primary transition"
              >
                <FaGlobe />
                <span>{language === 'en' ? 'বাংলা' : 'English'}</span>
              </button>

              {isAuthenticated ? (
                <button
                  onClick={handleLogout}
                  className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition text-left"
                >
                  {t('logout')}
                </button>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setIsOpen(false)}
                    className="text-primary hover:text-blue-700 transition font-medium"
                  >
                    {t('login')}
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setIsOpen(false)}
                    className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-center"
                  >
                    {t('register')}
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;

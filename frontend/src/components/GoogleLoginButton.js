import React from 'react';
import { useTranslation } from 'react-i18next';
import { FaGoogle } from 'react-icons/fa';

const GoogleLoginButton = () => {
  const { t } = useTranslation();

  const handleGoogleLogin = () => {
    // Redirect to backend Google OAuth route
    const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
    console.log('Redirecting to Google OAuth:', `${backendUrl}/auth/google`);
    window.location.href = `${backendUrl}/auth/google`;
  };

  return (
    <button
      onClick={handleGoogleLogin}
      className="w-full flex items-center justify-center gap-3 px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 font-semibold text-gray-700 hover:border-blue-500 hover:shadow-md"
    >
      <FaGoogle className="text-xl text-red-500" />
      {t('signInWithGoogle')}
    </button>
  );
};

export default GoogleLoginButton;

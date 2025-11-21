import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../utils/api';

const AuthCallback = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleCallback = async () => {
      const token = searchParams.get('token');
      
      if (token) {
        try {
          // Store token
          localStorage.setItem('token', token);
          
          // Fetch user data
          const response = await api.get('/auth/me');
          const userData = response.data.data;
          
          // Store user data
          localStorage.setItem('user', JSON.stringify(userData));
          
          // Redirect to profile page
          setTimeout(() => {
            navigate('/profile');
            window.location.reload(); // Reload to update auth context
          }, 500);
        } catch (error) {
          console.error('Authentication error:', error);
          setError('Authentication failed. Please try again.');
          setTimeout(() => {
            navigate('/login');
          }, 2000);
        }
      } else {
        setError('No authentication token found.');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    };
    
    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        {error ? (
          <>
            <div className="text-red-500 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-red-600 font-semibold">{error}</p>
            <p className="text-sm text-gray-500 mt-2">Redirecting to login...</p>
          </>
        ) : (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 font-semibold">{t('loading')}</p>
            <p className="text-sm text-gray-500 mt-2">Completing authentication...</p>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;

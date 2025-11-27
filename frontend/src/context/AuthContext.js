import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../utils/api';
import { toast } from 'react-toastify';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      loadUser();
    } else {
      setLoading(false);
    }
  }, []);

  const loadUser = async () => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data.data);
      localStorage.setItem('user', JSON.stringify(response.data.data));
    } catch (error) {
      console.error('Error loading user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      console.log('Registering user:', userData);
      const response = await api.post('/auth/register', userData);
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      
      toast.success('Registration successful!');
      return response.data;
    } catch (error) {
      console.error('Registration error:', error);
      const message = error.response?.data?.message || error.response?.data?.error || error.message || 'Registration failed. Please check your connection and try again.';
      toast.error(message);
      if (error.response?.data?.errors) {
        error.response.data.errors.forEach(err => {
          toast.error(err.msg || err.message);
        });
      }
      throw error;
    }
  };

  const login = async (email, password) => {
    try {
      console.log('Logging in user:', email);
      const response = await api.post('/auth/login', { email, password });
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      
      toast.success('Login successful!');
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      const message = error.response?.data?.message || error.response?.data?.error || error.message || 'Login failed. Please check your credentials and connection.';
      toast.error(message);
      if (error.response?.data?.errors) {
        error.response.data.errors.forEach(err => {
          toast.error(err.msg || err.message);
        });
      }
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    toast.info('Logged out successfully');
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await api.put('/auth/profile', profileData);
      setUser(response.data.data);
      localStorage.setItem('user', JSON.stringify(response.data.data));
      toast.success('Profile updated successfully!');
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Profile update failed';
      toast.error(message);
      throw error;
    }
  };

  const updateLocation = async (locationData) => {
    try {
      const response = await api.put('/auth/location', locationData);
      setUser(response.data.data);
      localStorage.setItem('user', JSON.stringify(response.data.data));
      toast.success('Location updated successfully!');
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Location update failed';
      toast.error(message);
      throw error;
    }
  };

  const uploadProfilePicture = async (file) => {
    try {
      const formData = new FormData();
      formData.append('profilePicture', file);

      const response = await api.post('/auth/profile-picture', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setUser(response.data.data);
      localStorage.setItem('user', JSON.stringify(response.data.data));
      toast.success('Profile picture uploaded successfully!');
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Profile picture upload failed';
      toast.error(message);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    register,
    login,
    logout,
    updateProfile,
    updateLocation,
    uploadProfilePicture,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

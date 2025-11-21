import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import VoiceCommand from './components/VoiceCommand';
import LifeBot from './components/LifeBot';
import Emergency999 from './components/Emergency999';
import io from 'socket.io-client';
import { toast } from 'react-toastify';
import CPRGuide from './components/CPRGuide';
import WoundCareTutorials from './components/WoundCareTutorials';
import OfflineGuides from './components/OfflineGuides';
import VideoLibrary from './components/VideoLibrary';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import NearbyUsers from './pages/NearbyUsers';
import EmergencyRequests from './pages/EmergencyRequests';
import LiveTracking from './pages/LiveTracking';
import LiveTrackingLeaflet from './pages/LiveTrackingLeaflet';
import LiveTrackingWithMap from './pages/LiveTrackingWithMap';
import HelperEmergencyView from './pages/HelperEmergencyView';
import ChatRoom from './pages/ChatRoom';
import HospitalLocator from './pages/HospitalLocator';
import AvailabilityScheduling from './pages/AvailabilityScheduling';
import MedicalRecords from './pages/MedicalRecords';
import AuthCallback from './pages/AuthCallback';
import NotFound from './pages/NotFound';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return isAuthenticated ? children : <Navigate to="/login" />;
};

function App() {
  const { isAuthenticated } = useAuth();

  // Initialize a global socket to receive order/payment notifications regardless of current page
  React.useEffect(() => {
    if (!isAuthenticated) return;
    try {
      const userJson = localStorage.getItem('user');
      const user = userJson ? JSON.parse(userJson) : null;
      if (!user || !user._id) return;
      const socket = io(process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000');
      socket.on('connect', () => {
        socket.emit('join', user._id);
      });

      socket.on('orderPaid', (payload) => {
        try {
          // Show a global toast for volunteers/patients/doctors
          if (payload && payload.orderId) {
            toast.success(`Payment received for order ${payload.orderId}`);
          } else {
            toast.success('A payment was received');
          }
          // Dispatch same-tab event for any component listeners
          try { window.dispatchEvent(new CustomEvent('orderPaid', { detail: payload })); } catch (e) {}
        } catch (err) {
          console.error('Error handling global orderPaid', err);
        }
      });

      return () => {
        socket.disconnect();
      };
    } catch (err) {
      console.error('Failed to initialize global socket in App', err);
    }
  }, [isAuthenticated]);
  
  return (
    <div className="App min-h-screen bg-gray-50">
      <Navbar />
      
      {/* Global components available when authenticated */}
      {isAuthenticated && (
        <>
          <LifeBot />
          <Emergency999 />
        </>
      )}
      
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        
        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/nearby"
          element={
            <ProtectedRoute>
              <NearbyUsers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/emergencies"
          element={
            <ProtectedRoute>
              <EmergencyRequests />
            </ProtectedRoute>
          }
        />
        <Route
          path="/emergency/:emergencyId"
          element={
            <ProtectedRoute>
              <HelperEmergencyView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/track/:emergencyId"
          element={
            <ProtectedRoute>
              <LiveTrackingLeaflet />
            </ProtectedRoute>
          }
        />
        <Route
          path="/track-google/:emergencyId"
          element={
            <ProtectedRoute>
              <LiveTrackingWithMap />
            </ProtectedRoute>
          }
        />
        <Route
          path="/track-simple/:emergencyId"
          element={
            <ProtectedRoute>
              <LiveTracking />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat/:emergencyId"
          element={
            <ProtectedRoute>
              <ChatRoom />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hospitals"
          element={
            <ProtectedRoute>
              <HospitalLocator />
            </ProtectedRoute>
          }
        />
        <Route
          path="/availability"
          element={
            <ProtectedRoute>
              <AvailabilityScheduling />
            </ProtectedRoute>
          }
        />
        <Route
          path="/medical-records"
          element={
            <ProtectedRoute>
              <MedicalRecords />
            </ProtectedRoute>
          }
        />
        
        {/* New Feature Routes */}
        <Route
          path="/cpr-guide"
          element={
            <ProtectedRoute>
              <CPRGuide />
            </ProtectedRoute>
          }
        />
        <Route
          path="/wound-care"
          element={
            <ProtectedRoute>
              <WoundCareTutorials />
            </ProtectedRoute>
          }
        />
        <Route
          path="/offline-guides"
          element={
            <ProtectedRoute>
              <OfflineGuides />
            </ProtectedRoute>
          }
        />
        <Route
          path="/video-library"
          element={
            <ProtectedRoute>
              <VideoLibrary />
            </ProtectedRoute>
          }
        />
        
        <Route path="*" element={<NotFound />} />
      </Routes>
      
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </div>
  );
}

export default App;

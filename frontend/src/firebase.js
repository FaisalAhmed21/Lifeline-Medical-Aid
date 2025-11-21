// Firebase configuration file - notifications disabledimport { initializeApp } from 'firebase/app';

import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// Export dummy functions for compatibility

export const requestNotificationPermission = async () => {// Firebase configuration

  return null;// To use push notifications:

};// 1. Go to Firebase Console (https://console.firebase.google.com)

// 2. Create a new project

export const onMessageListener = () => {// 3. Go to Project Settings > General

  return new Promise(() => {});// 4. Scroll down to "Your apps" and click "Web" icon

};// 5. Register your app and copy the config

// 6. Replace the placeholder config below with your actual Firebase config

export const isPushNotificationSupported = () => {

  return false;const firebaseConfig = {

};  apiKey: "Your API key",

  authDomain: "lifeline-medical-aid-fbc2e.firebaseapp.com",

export const getNotificationPermissionStatus = () => {  projectId: "lifeline-medical-aid-fbc2e",

  return 'unsupported';  storageBucket: "lifeline-medical-aid-fbc2e.firebasestorage.app",

};  messagingSenderId: "38663161682",

  appId: "1:38663161682:web:e2ad74230fb1c34ffd9c8b",
  measurementId: "G-N3FYH4LNTG"
};

// VAPID Key for push notifications (Web Push certificate public key)
const VAPID_KEY = "Your API key";

let app;
let messaging;
let isFirebaseConfigured = false;

try {
  // Check if Firebase is properly configured
  if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "Your API key") {
    app = initializeApp(firebaseConfig);
    messaging = getMessaging(app);
    isFirebaseConfigured = true;
    console.log('✅ Firebase initialized for push notifications');
  } else {
    console.log('⚠️  Firebase not configured. Push notifications disabled.');
    console.log('   Add Firebase config to .env file');
  }
} catch (error) {
  console.log('⚠️  Firebase initialization skipped:', error.message);
}

/**
 * Request notification permission and get FCM token
 * @returns {Promise<string|null>} FCM token or null
 */
export const requestNotificationPermission = async () => {
  if (!isFirebaseConfigured) {
    console.log('Push notifications not available (Firebase not configured)');
    return null;
  }

  try {
    // Request notification permission
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      console.log('✅ Notification permission granted');
      
      // Get FCM token
      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY
      });
      
      console.log('✅ FCM Token:', token);
      return token;
    } else {
      console.log('❌ Notification permission denied');
      return null;
    }
  } catch (error) {
    console.error('Error getting notification permission:', error);
    return null;
  }
};

/**
 * Listen for foreground messages
 * @returns {Promise} Promise that resolves with message payload
 */
export const onMessageListener = () => {
  if (!isFirebaseConfigured) {
    console.log('⚠️ Firebase not configured - notifications disabled');
    return new Promise(() => {});
  }

  console.log('👂 Setting up Firebase message listener...');
  
  return new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      console.log('� Firebase onMessage triggered!');
      console.log('📨 Raw payload:', JSON.stringify(payload, null, 2));
      
      // Show browser notification
      if (payload.notification && Notification.permission === 'granted') {
        console.log('🔔 Showing browser notification...');
        new Notification(payload.notification.title, {
          body: payload.notification.body,
          icon: '/logo192.png',
          badge: '/logo192.png',
          tag: payload.data?.emergencyId || payload.data?.chatId || 'lifeline-notification',
          data: payload.data
        });
      } else {
        console.log('⚠️ Browser notification not shown. Permission:', Notification.permission);
      }
      
      console.log('✅ Resolving promise with payload');
      resolve(payload);
    });
  });
};

/**
 * Check if push notifications are supported
 * @returns {boolean}
 */
export const isPushNotificationSupported = () => {
  return (
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    isFirebaseConfigured
  );
};

/**
 * Check notification permission status
 * @returns {string} 'granted' | 'denied' | 'default'
 */
export const getNotificationPermissionStatus = () => {
  if (!('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
};

export { messaging, isFirebaseConfigured };

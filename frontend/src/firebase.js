// src/firebase.js
// Clean, environment-friendly Firebase initialization and messaging helpers
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { getAnalytics } from 'firebase/analytics';

// VAPID Key for push notifications (Web Push certificate public key)
const VAPID_KEY = process.env.REACT_APP_FIREBASE_VAPID_KEY || 'BMnzgdbOpJ4CpQBdcRU9lnUKRAFp9x09O9I5c4GDBsizpr80QenWotnVVXXalDVS3YzLAI0rd2hjYsbQ86tDcjI';

// Use environment variables when available; fall back to the embedded values you provided.
// This keeps the project working immediately while encouraging safer practice.
const rawStorageBucket = process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || 'lifeline-medical-aid-fbc2e.firebasestorage.app';

// Auto-correct common mistaken storage bucket pattern (firebasestorage.app -> appspot.com)
const correctedStorageBucket = rawStorageBucket.includes('firebasestorage.app')
  ? rawStorageBucket.replace('firebasestorage.app', 'appspot.com')
  : rawStorageBucket;

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || 'AIzaSyANJmq4Zqp7hGEKvnR-jmZ7sHDW64GGs0s',
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || 'lifeline-medical-aid-fbc2e.firebaseapp.com',
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || 'lifeline-medical-aid-fbc2e',
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || correctedStorageBucket, // e.g. lifeline-medical-aid-fbc2e.appspot.com
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || '38663161682',
  appId: process.env.REACT_APP_FIREBASE_APP_ID || '1:38663161682:web:e2ad74230fb1c34ffd9c8b',
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || 'G-N3FYH4LNTG',
};

let app = null;
let messaging = null;
let analytics = null;
let isFirebaseConfigured = false;

try {
  // Basic sanity check: apiKey and projectId must be present
  if (firebaseConfig.apiKey && firebaseConfig.projectId) {
    app = initializeApp(firebaseConfig);

    // Initialize analytics only in the browser and when measurementId exists
    if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
      try {
        analytics = getAnalytics(app);
      } catch (err) {
        // Analytics may fail in some browser privacy modes; not fatal
        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.warn('Firebase analytics init failed:', err?.message || err);
        }
      }
    }

    // Messaging requires window (browser) and service worker support
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        messaging = getMessaging(app);
      } catch (err) {
        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.warn('Firebase messaging not initialized:', err?.message || err);
        }
      }
    }

    isFirebaseConfigured = true;
    // eslint-disable-next-line no-console
    console.log('✅ Firebase initialized');
  } else {
    // eslint-disable-next-line no-console
    console.warn('⚠️ Firebase configuration appears incomplete. Check your .env values.');
  }
} catch (error) {
  // eslint-disable-next-line no-console
  console.error('⚠️ Firebase initialization error:', error?.message || error);
}

/**
 * Request notification permission and get FCM token
 * @returns {Promise<string|null>} FCM token or null
 */
export const requestNotificationPermission = async () => {
  if (!isFirebaseConfigured || !messaging) {
    // eslint-disable-next-line no-console
    console.warn('Push notifications not available (Firebase/messaging not configured)');
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      // eslint-disable-next-line no-console
      console.log('Notification permission not granted:', permission);
      return null;
    }

    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    // eslint-disable-next-line no-console
    console.log('✅ FCM token obtained');
    return token;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error obtaining FCM token:', err);
    return null;
  }
};

/**
 * Listen for foreground messages
 * @returns {Promise} Promise that resolves with message payload
 */
export const onMessageListener = () => {
  if (!isFirebaseConfigured || !messaging) {
    // eslint-disable-next-line no-console
    console.warn('Firebase messaging not available - onMessage listener disabled');
    return new Promise(() => {});
  }

  return new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      // eslint-disable-next-line no-console
      console.log('📨 Firebase message received:', payload);
      // Optionally show a native Notification if permission granted
      if (payload?.notification && Notification.permission === 'granted') {
        try {
          /* eslint-disable no-new */
          new Notification(payload.notification.title, {
            body: payload.notification.body,
            icon: payload.notification.icon || '/logo192.png',
            badge: payload.notification.badge || '/logo192.png',
            data: payload.data,
          });
        } catch (e) {
          // ignore notification display errors
        }
      }
      resolve(payload);
    });
  });
};

/**
 * Check if push notifications are supported in this environment
 * @returns {boolean}
 */
export const isPushNotificationSupported = () => {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    !!messaging
  );
};

/**
 * Get current browser notification permission status
 * @returns {'granted'|'denied'|'default'|'unsupported'}
 */
export const getNotificationPermissionStatus = () => {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
};

export { app, messaging, analytics, isFirebaseConfigured };

// Push notifications via Firebase Cloud Messaging were removed from this project.
// Real-time in-app notifications continue to work through Socket.IO and the
// Notification model. These stubs keep the existing callers (notification,
// emergency, and chat controllers) working without the firebase-admin SDK.
const initializeFirebase = () => false;
const isInitialized = () => false;
const sendNotificationToDevice = async () => ({ success: false, reason: 'push notifications disabled' });
const sendNotificationToMultipleDevices = async () => ({ success: false, reason: 'push notifications disabled' });
const NotificationTemplates = { EMERGENCY_ASSIGNED: (n, u) => ({ title: 'Emergency', body: n + ' needs help' }), EMERGENCY_ACCEPTED: (n) => ({ title: 'Accepted', body: n + ' accepted' }), HELPER_ARRIVED: (n) => ({ title: 'Arrived', body: n + ' arrived' }), EMERGENCY_COMPLETED: () => ({ title: 'Completed', body: 'Emergency completed' }), NEW_MESSAGE: (n) => ({ title: 'Message', body: n + ' sent message' }), RATING_RECEIVED: (r) => ({ title: 'Rating', body: r + ' stars' }) };
module.exports = { initializeFirebase, isInitialized, sendNotificationToDevice, sendNotificationToMultipleDevices, NotificationTemplates };

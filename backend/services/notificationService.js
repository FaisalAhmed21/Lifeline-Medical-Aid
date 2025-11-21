const admin = require('firebase-admin');
let initialized = false;
const initializeFirebase = () => { if (initialized) return true; try { const serviceAccount = require('../firebase-service-account.json'); admin.initializeApp({ credential: admin.credential.cert(serviceAccount) }); initialized = true; return true; } catch (e) { return false; } };
const isInitialized = () => initialized;
const sendNotificationToDevice = async (token, notif, data = {}) => { if (!initialized) return { success: false }; try { const msg = { token, notification: notif, data }; const res = await admin.messaging().send(msg); return { success: true, messageId: res }; } catch (e) { return { success: false }; } };
const sendNotificationToMultipleDevices = async (tokens, notif, data = {}) => { if (!initialized || !tokens || tokens.length === 0) return { success: false }; try { const msg = { tokens, notification: notif, data }; const res = await admin.messaging().sendMulticast(msg); return { success: true, successCount: res.successCount }; } catch (e) { return { success: false }; } };
const NotificationTemplates = { EMERGENCY_ASSIGNED: (n, u) => ({ title: 'Emergency', body: n + ' needs help' }), EMERGENCY_ACCEPTED: (n) => ({ title: 'Accepted', body: n + ' accepted' }), HELPER_ARRIVED: (n) => ({ title: 'Arrived', body: n + ' arrived' }), EMERGENCY_COMPLETED: (n) => ({ title: 'Completed', body: 'Emergency completed' }), NEW_MESSAGE: (n) => ({ title: 'Message', body: n + ' sent message' }), RATING_RECEIVED: (r) => ({ title: 'Rating', body: r + ' stars' }) };
initializeFirebase();
module.exports = { initializeFirebase, isInitialized, sendNotificationToDevice, sendNotificationToMultipleDevices, NotificationTemplates };

import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { playSoundAlert } from './utils/soundAlert';
import { appAlert } from './utils/appAlert';

// Your Firebase config from console
const firebaseConfig = {
  apiKey: "AIzaSyAXLsiAH2un_GyftMQyGqaxiCTx_4thi0Q",
  authDomain: "service-hunt-98b9a.firebaseapp.com",
  projectId: "service-hunt-98b9a",
  storageBucket: "service-hunt-98b9a.firebasestorage.app",
  messagingSenderId: "805393578185",
  appId: "1:805393578185:web:993c0ecb942e1733c3f518",
  measurementId: "G-JFSPG60HD1"
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// Request permission and get device token
export async function requestNotificationPermission(userId, userType) {
    try {
        if (typeof Notification === 'undefined') return null;

        // Request permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.log('Notification permission denied');
            return null;
        }

        // Get FCM token with your VAPID key
        const token = await getToken(messaging, {
            vapidKey: "BMGc5rDmaJgB_SZGc9yVxalR94bA7SDCz_W0isS-FJvTrpSCrhYaXFZCDGt-GoREIwHFAGAwkX_OrxdCDGsMRxk"
        });

        if (token && userId) {
            // Save token to backend
            const response = await fetch('/api/users/save-fcm-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    token, 
                    userId, 
                    userType,
                    deviceInfo: navigator.userAgent 
                })
            });
            
            if (response.ok) {
                console.log('✅ FCM Token saved successfully');
            }
        }
        return token;
    } catch (error) {
        console.error('Error getting FCM token:', error);
        return null;
    }
}

const registeredCallbacks = new Set();
let isGlobalMessageListenerAttached = false;

// Setup persistent background and foreground listener
function setupGlobalOnMessage() {
    if (isGlobalMessageListenerAttached) return;
    isGlobalMessageListenerAttached = true;

    try {
        onMessage(messaging, (payload) => {
            console.log('📢 Notification received while app open:', payload);
            
            const bookingType = payload.data?.bookingType || '';
            const isAuto = bookingType === 'Automatic Booking' || 
                           (typeof bookingType === 'string' && bookingType.toLowerCase().includes('auto'));

            const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
            const isHelperOffline = currentUser?.isHelper && (
                localStorage.getItem('helperIsOnline') === 'false' || 
                currentUser?.isConnected === false
            );

            // Play audio alert for non-auto bookings when not offline
            if (!isAuto && !isHelperOffline) {
                playSoundAlert({ loop: false, maxDurationMs: 15000 });
            }

            // Show browser notification if permitted
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                try {
                    new Notification(payload.notification?.title || '📢 Service Alert!', {
                        body: payload.notification?.body || 'A new update has arrived',
                        icon: '/icon-192.png',
                        badge: '/icon-192.png',
                        vibrate: isAuto ? [] : [200, 100, 200]
                    });
                } catch (notifErr) {
                    console.log('Browser notification error:', notifErr);
                }
            }

            // Show app floating toast alert
            const title = payload.notification?.title || '📢 Service Alert!';
            const body = payload.notification?.body || 'A new update has arrived';
            appAlert.info(body, { title, duration: 6000 });

            // Dispatch custom window events
            window.dispatchEvent(new CustomEvent('fcmBookingReceived', { detail: payload }));
            window.dispatchEvent(new CustomEvent('fcmWorkAssigned', { detail: payload }));

            // Notify registered callbacks
            registeredCallbacks.forEach((cb) => {
                try { cb(payload); } catch (e) { console.error(e); }
            });
        });
    } catch (err) {
        console.log('Firebase onMessage setup error:', err);
    }
}

// Subscribe to messages continuously
export function registerNotificationCallback(callback) {
    setupGlobalOnMessage();
    if (typeof callback === 'function') {
        registeredCallbacks.add(callback);
        return () => registeredCallbacks.delete(callback);
    }
    return () => {};
}

// Backwards-compatible onMessageListener (resolves on first, also continues listening)
export function onMessageListener() {
    setupGlobalOnMessage();
    return new Promise((resolve) => {
        const handler = (payload) => {
            registeredCallbacks.delete(handler);
            resolve(payload);
        };
        registeredCallbacks.add(handler);
    });
}

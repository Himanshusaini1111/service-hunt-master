import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// Your Firebase config from console - ✅ NOW CORRECT
const firebaseConfig = {
  apiKey: "AIzaSyAXLsiAH2un_GyftMQyGqaxiCTx_4thi0Q",
  authDomain: "service-hunt-98b9a.firebaseapp.com",
  projectId: "service-hunt-98b9a",
  storageBucket: "service-hunt-98b9a.firebasestorage.app",
  messagingSenderId: "805393578185",
  appId: "1:805393578185:web:993c0ecb942e1733c3f518",
  measurementId: "G-JFSPG60HD1"  // Optional but good to have
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// Request permission and get device token
export async function requestNotificationPermission(userId, userType) {
    try {
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

        if (token) {
            // Save token to your backend
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

// Listen for notifications when app is OPEN
export function onMessageListener() {
    return new Promise((resolve) => {
        onMessage(messaging, (payload) => {
            console.log('📢 Notification received while app open:', payload);
            
         const audio = new Audio('/sounds/booking.mp3');
            audio.play().catch(e => console.log('Sound play failed:', e));
            
            // Show browser notification
            if (Notification.permission === 'granted') {
                new Notification(payload.notification?.title || 'New Booking!', {
                    body: payload.notification?.body || 'A new booking has arrived',
                    icon: '/icon-192.png',
                    badge: '/icon-192.png',
                    vibrate: [200, 100, 200]
                });
            }
            
            resolve(payload);
        });
    });
}
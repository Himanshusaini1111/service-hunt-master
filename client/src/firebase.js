// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

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
        // Request permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.log('Notification permission denied');
            return null;
        }

        // Register service worker FIRST
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        console.log('Service Worker registered:', registration);

        // Get FCM token with service worker
        const token = await getToken(messaging, {
            vapidKey: "BMGc5rDmaJgB_SZGc9yVxalR94bA7SDCz_W0isS-FJvTrpSCrhYaXFZCDGt-GoREIwHFAGAwkX_OrxdCDGsMRxk",
            serviceWorkerRegistration: registration
        });

        if (token) {
            console.log('✅ FCM Token obtained:', token);
            
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
            } else {
                console.error('Failed to save token');
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
            
            // Play sound for foreground notifications
            const audio = new Audio('/sounds/booking.mp3');
            audio.play().catch(e => console.log('Sound play failed:', e));
            
            // Show browser notification even when app is open
            if (Notification.permission === 'granted') {
                const notification = new Notification(payload.notification?.title || 'New Booking!', {
                    body: payload.notification?.body || 'A new booking has arrived',
                    icon: '/icon-192.png',
                    badge: '/icon-192.png',
                    vibrate: [200, 100, 200],
                    silent: false // Ensure sound plays
                });
                
                // Handle notification click
                notification.onclick = () => {
                    window.focus();
                    // Navigate to admin panel if needed
                    if (window.location.pathname !== '/admin') {
                        window.location.href = '/admin';
                    }
                };
            }
            
            resolve(payload);
        });
    });
}
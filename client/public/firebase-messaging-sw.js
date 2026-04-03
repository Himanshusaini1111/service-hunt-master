// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: "AIzaSyAXLsiAH2un_GyftMQyGqaxiCTx_4thi0Q",
    authDomain: "service-hunt-98b9a.firebaseapp.com",
    projectId: "service-hunt-98b9a",
    storageBucket: "service-hunt-98b9a.firebasestorage.app",
    messagingSenderId: "805393578185",
    appId: "1:805393578185:web:993c0ecb942e1733c3f518"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
    console.log('📢 Background notification received:', payload);
    
    const notificationTitle = payload.notification?.title || 'New Booking!';
    const notificationOptions = {
        body: payload.notification?.body || 'A new booking has arrived',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        vibrate: [200, 100, 200],
        sound: '/sounds/booking.mp3', // Absolute path from public
        data: {
            click_action: payload.data?.click_action,
            bookingId: payload.data?.bookingId,
            url: payload.fcmOptions?.link || '/admin'
        }
    };
    
    // Show notification with sound
    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    const urlToOpen = event.notification.data?.url || '/admin';
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(windowClients => {
                // Check if there's already a window/tab open with the target URL
                for (let client of windowClients) {
                    if (client.url.includes('/') && 'focus' in client) {
                        client.focus();
                        return client;
                    }
                }
                // If not, open a new window
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
    );
});
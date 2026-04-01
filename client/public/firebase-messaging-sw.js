// Firebase service worker for background notifications
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

// Handle background notifications (when app is CLOSED)
messaging.onBackgroundMessage((payload) => {
    console.log('📢 Background notification received:', payload);
    
    const notificationTitle = payload.notification?.title || 'New Booking!';
    const notificationOptions = {
        body: payload.notification?.body || 'A new booking has arrived',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        vibrate: [200, 100, 200],
        sound: '\booking.mp3',
        data: {
            click_action: payload.data?.click_action,
            bookingId: payload.data?.bookingId
        }
    };
    
    // This will show notification with sound even when app is CLOSED
    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    // Open app when notification is clicked
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(windowClients => {
                // If app is already open, focus it
                for (let client of windowClients) {
                    if (client.url.includes('/') && 'focus' in client) {
                        return client.focus();
                    }
                }
                // Otherwise open new window
                if (clients.openWindow) {
                    return clients.openWindow('/');
                }
            })
    );
});
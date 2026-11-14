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

// Handle background notifications (when app is CLOSED or IN BACKGROUND)
messaging.onBackgroundMessage((payload) => {
    console.log('📢 Background notification received:', payload);
    
    const notificationTitle = payload.notification?.title || '📢 Service Alert!';
    const isWork = payload.data?.type === 'work' || payload.data?.type === 'new_work';
    const targetUrl = isWork ? '/helperlogin' : '/admin';

    const notificationOptions = {
        body: payload.notification?.body || 'A new booking or assigned work has arrived',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        vibrate: [250, 100, 250, 100, 250],
        requireInteraction: true,
        tag: 'service-hunt-background-alert',
        sound: '/sounds/booking.mp3',
        data: {
            click_action: payload.data?.click_action || targetUrl,
            bookingId: payload.data?.bookingId,
            url: targetUrl
        }
    };
    
    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    const targetUrl = event.notification.data?.url || '/admin';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(windowClients => {
                for (let client of windowClients) {
                    if ('focus' in client) {
                        client.navigate(targetUrl);
                        return client.focus();
                    }
                }
                if (clients.openWindow) {
                    return clients.openWindow(targetUrl);
                }
            })
    );
});

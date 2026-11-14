// contexts/NotificationContext.js
import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const NotificationContext = createContext();

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        // Return a safe mock if used outside provider so app never crashes
        return {
            unreadCount: 0,
            notifications: [],
            newBookingsCount: 0,
            pendingBookings: [],
            soundEnabled: true,
            markAsRead: () => {},
            markAllAsRead: () => {},
            toggleSound: () => {},
            resetNotifications: () => {},
            triggerServiceVisibilityChange: () => {}
        };
    }
    return context;
};

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('sh_recent_notifications') || '[]');
        } catch {
            return [];
        }
    });

    const [soundEnabled, setSoundEnabled] = useState(() => {
        return localStorage.getItem('soundEnabled') !== 'false';
    });

    const [pendingBookings, setPendingBookings] = useState([]);
    const [newBookingsCount, setNewBookingsCount] = useState(0);
    const [serviceVisibilityChanged, setServiceVisibilityChanged] = useState(false);

    const notifiedIdsRef = useRef(new Set());
    const lastCheckedRef = useRef(Date.now() - 3600000); // 1 hour ago initially

    const toggleSound = useCallback(() => {
        setSoundEnabled((prev) => {
            const next = !prev;
            localStorage.setItem('soundEnabled', String(next));
            return next;
        });
    }, []);

    const markAsRead = useCallback((id) => {
        setNotifications((prev) => {
            const updated = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
            localStorage.setItem('sh_recent_notifications', JSON.stringify(updated.slice(0, 30)));
            return updated;
        });
    }, []);

    const markAllAsRead = useCallback(() => {
        setNotifications((prev) => {
            const updated = prev.map((n) => ({ ...n, read: true }));
            localStorage.setItem('sh_recent_notifications', JSON.stringify(updated.slice(0, 30)));
            return updated;
        });
        setNewBookingsCount(0);
    }, []);

    const addNotification = useCallback((item) => {
        setNotifications((prev) => {
            if (prev.some((n) => n.id === item.id)) return prev;
            const updated = [
                {
                    ...item,
                    read: false,
                    timestamp: item.timestamp || new Date().toISOString()
                },
                ...prev
            ].slice(0, 30);
            localStorage.setItem('sh_recent_notifications', JSON.stringify(updated));
            return updated;
        });
    }, []);

    // Check for new bookings / orders / tasks
    const checkUpdates = useCallback(async () => {
        const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
        if (!user || !user._id) return;

        try {
            const isAdminOrVendor = user.isAdmin || user.role === 'admin' || user.role === 'vendor' || user.role === 'superadmin';

            if (isAdminOrVendor) {
                const response = await axios.get(`/api/bookings/getallbookings?userid=${user._id}`);
                const bookings = Array.isArray(response.data) ? response.data : [];

                const pending = bookings.filter((b) =>
                    (b.status === 'pending' || b.status === 'confirmed' || b.status === 'booked') &&
                    b.status !== 'assigned' &&
                    b.status !== 'completed'
                );
                setPendingBookings(pending);

                // Check for bookings created after last check that haven't been notified
                bookings.forEach((b) => {
                    if (!notifiedIdsRef.current.has(b._id)) {
                        notifiedIdsRef.current.add(b._id);

                        const isRecent = new Date(b.createdAt).getTime() > lastCheckedRef.current;
                        if (isRecent) {
                            addNotification({
                                id: `booking_${b._id}`,
                                type: 'booking',
                                title: 'New Booking Received',
                                message: `${b.service || 'Service'} - ₹${b.totalAmount || 0}`,
                                link: '/admin',
                                timestamp: b.createdAt
                            });
                        }
                    }
                });

                lastCheckedRef.current = Date.now();
            } else if (user.isHelper) {
                // Check helper assigned works
                const token = localStorage.getItem('helperToken');
                if (token) {
                    const response = await axios.get('/api/helper/assigned-works', {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    const works = response.data?.works || [];
                    works.forEach((w) => {
                        if (!notifiedIdsRef.current.has(w._id)) {
                            notifiedIdsRef.current.add(w._id);
                            addNotification({
                                id: `work_${w._id}`,
                                type: 'work',
                                title: 'New Assigned Job',
                                message: `Job for ${w.service || 'service'} in ${w.location || ''}`,
                                link: '/helperlogin',
                                timestamp: w.createdAt || new Date().toISOString()
                            });
                        }
                    });
                }
            }
        } catch (error) {
            // Silently handle polling errors
        }
    }, [addNotification]);

    useEffect(() => {
        checkUpdates();
        const interval = setInterval(checkUpdates, 25000);

        const handleFcm = (event) => {
            const payload = event.detail;
            if (payload) {
                const title = payload.notification?.title || '📢 Update Received';
                const body = payload.notification?.body || '';
                addNotification({
                    id: 'fcm_' + Date.now(),
                    type: 'fcm',
                    title,
                    message: body,
                    link: '/admin',
                    timestamp: new Date().toISOString()
                });
            }
            checkUpdates();
        };

        window.addEventListener('fcmBookingReceived', handleFcm);
        window.addEventListener('fcmWorkAssigned', handleFcm);

        return () => {
            clearInterval(interval);
            window.removeEventListener('fcmBookingReceived', handleFcm);
            window.removeEventListener('fcmWorkAssigned', handleFcm);
        };
    }, [checkUpdates, addNotification]);

    const unreadCount = notifications.filter((n) => !n.read).length;

    const resetNotifications = useCallback(() => {
        setNewBookingsCount(0);
        markAllAsRead();
    }, [markAllAsRead]);

    const triggerServiceVisibilityChange = useCallback(() => {
        setServiceVisibilityChanged(true);
        setTimeout(() => setServiceVisibilityChanged(false), 3000);
    }, []);

    const value = {
        notifications,
        unreadCount,
        newBookingsCount: unreadCount || newBookingsCount,
        pendingBookings,
        serviceVisibilityChanged,
        soundEnabled,
        toggleSound,
        markAsRead,
        markAllAsRead,
        resetNotifications,
        triggerServiceVisibilityChange,
        addNotification
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};

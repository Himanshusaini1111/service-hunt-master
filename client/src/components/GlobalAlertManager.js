import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { playSoundAlert, stopSoundAlert } from '../utils/soundAlert';
import { appAlert } from '../utils/appAlert';
import { requestNotificationPermission } from '../firebase';
import { FaBell, FaExclamationTriangle, FaVolumeMute, FaExternalLinkAlt, FaTimes } from 'react-icons/fa';
import './GlobalAlertManager.css';

export default function GlobalAlertManager() {
    const navigate = useNavigate();
    const location = useLocation();

    const [activeAlert, setActiveAlert] = useState(null);
    const [isPlayingSound, setIsPlayingSound] = useState(false);

    const originalTitleRef = useRef(typeof document !== 'undefined' ? document.title : 'Service Hunt');
    const titleBlinkIntervalRef = useRef(null);
    const pollingIntervalRef = useRef(null);
    const notifiedIdsRef = useRef(new Set());
    const lastCheckedTimeRef = useRef(
        localStorage.getItem('sh_lastCheckedTime') || (Date.now() - 60000).toString()
    );

    // Stop flashing tab title
    const stopTitleBlink = useCallback(() => {
        if (titleBlinkIntervalRef.current) {
            clearInterval(titleBlinkIntervalRef.current);
            titleBlinkIntervalRef.current = null;
        }
        if (typeof document !== 'undefined') {
            document.title = originalTitleRef.current;
        }
    }, []);

    // Start flashing tab title (useful when tab is in background or minimized)
    const startTitleBlink = useCallback((flashText) => {
        stopTitleBlink();
        if (typeof document === 'undefined') return;

        let state = false;
        titleBlinkIntervalRef.current = setInterval(() => {
            document.title = state ? flashText : `⚠️ ${originalTitleRef.current}`;
            state = !state;
        }, 900);
    }, [stopTitleBlink]);

    // Stop sound
    const handleStopSound = useCallback(() => {
        stopSoundAlert();
        setIsPlayingSound(false);
    }, []);

    // Dismiss alert banner completely
    const handleDismiss = useCallback(() => {
        handleStopSound();
        stopTitleBlink();
        setActiveAlert(null);
    }, [handleStopSound, stopTitleBlink]);

    // Stop title blink when user returns to / focuses the tab
    useEffect(() => {
        const handleFocus = () => {
            if (!activeAlert) {
                stopTitleBlink();
            }
        };
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [activeAlert, stopTitleBlink]);

    // Request desktop notification permission on mount for logged-in admin / helper
    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
        if (user && (user.isAdmin || user.role === 'admin' || user.role === 'vendor' || user.isHelper)) {
            if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
                requestNotificationPermission(user._id, user.isHelper ? 'helper' : 'admin');
            }
        }
    }, []);

    // Dispatch system desktop notification
    const triggerDesktopNotification = useCallback(({ title, body, link }) => {
        if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

        try {
            const notif = new Notification(title, {
                body,
                icon: '/icon-192.png',
                badge: '/icon-192.png',
                requireInteraction: true,
                tag: 'service-hunt-live-alert',
                vibrate: [250, 100, 250, 100, 250]
            });

            notif.onclick = () => {
                window.focus();
                notif.close();
                handleDismiss();
                if (link) navigate(link);
            };
        } catch (e) {
            console.log('Desktop notification error:', e);
        }
    }, [navigate, handleDismiss]);

    // Core alert dispatcher for new bookings or assigned works
    const triggerGlobalAlert = useCallback(({
        roleType = 'admin',
        isNoHelperAlert = false,
        title = 'New Booking Alert!',
        body = 'A new booking has arrived',
        service = '',
        count = 1,
        link = '/admin'
    }) => {
        const soundEnabled = localStorage.getItem('soundEnabled') !== 'false';

        // Play loud looping audio alarm
        if (soundEnabled) {
            setIsPlayingSound(true);
            playSoundAlert({
                loop: true,
                maxDurationMs: 30000,
                onAutoStop: () => setIsPlayingSound(false)
            });
        }

        // Flash browser tab title (crucial when user is on another tab/browser window)
        startTitleBlink(`🔔 (${count}) ${isNoHelperAlert ? 'UNCLAIMED BOOKING!' : 'NEW BOOKING!'}`);

        // System Desktop Notification (triggers even if browser is in background/minimized)
        triggerDesktopNotification({
            title: isNoHelperAlert ? '⚠️ Urgent: Unclaimed Booking!' : title,
            body: `${body} ${service ? `[${service}]` : ''}`,
            link
        });

        // Set the active persistent top banner
        setActiveAlert({
            roleType,
            isNoHelperAlert,
            title,
            body,
            service,
            count,
            link
        });

        // Also trigger the toast notification system
        appAlert.bookingAlert({
            title,
            message: body,
            service,
            count,
            isNoHelperAlert,
            sound: false,
            onView: () => {
                handleDismiss();
                navigate(link);
            },
            onDismiss: () => {
                handleStopSound();
            }
        });
    }, [startTitleBlink, triggerDesktopNotification, handleDismiss, handleStopSound, navigate]);

    // Polling engine active everywhere across the web app
    useEffect(() => {
        // Load notified IDs from storage
        const savedAdminNotified = JSON.parse(localStorage.getItem('adminNotifiedBookings') || '[]');
        const savedHelperNotified = JSON.parse(localStorage.getItem('helperNotifiedWorks') || '[]');
        savedAdminNotified.forEach(id => notifiedIdsRef.current.add(id));
        savedHelperNotified.forEach(id => notifiedIdsRef.current.add(id));

        const checkLiveUpdates = async () => {
            const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
            if (!user) return;

            const isAdminOrVendor = user.isAdmin || user.role === 'admin' || user.role === 'vendor' || user.role === 'superadmin';
            const isHelper = Boolean(user.isHelper || localStorage.getItem('helperToken'));

            // 1. ADMIN / VENDOR / SUPERADMIN CHECK
            if (isAdminOrVendor) {
                try {
                    const response = await axios.get('/api/bookings/check-new', {
                        params: {
                            userid: user._id,
                            lastCheckedTime: lastCheckedTimeRef.current
                        }
                    });

                    const bookings = Array.isArray(response.data) ? response.data : [];
                    const trulyNew = bookings.filter(b => !notifiedIdsRef.current.has(b._id));

                    if (trulyNew.length > 0) {
                        trulyNew.forEach(b => notifiedIdsRef.current.add(b._id));
                        localStorage.setItem('adminNotifiedBookings', JSON.stringify([...notifiedIdsRef.current]));

                        const unacceptedAlertBookings = trulyNew.filter(b => 
                            (b.alertIfNoOneAccepts || b.serviceid?.alertIfNoOneAccepts || (!b.useOwn && (!b.assignedHelpers || b.assignedHelpers.length === 0))) && 
                            !b.claimedBy && 
                            !b.useOwn
                        );

                        const isNoHelper = unacceptedAlertBookings.length > 0;
                        const firstBooking = trulyNew[0];
                        const serviceName = firstBooking?.service || firstBooking?.serviceid?.name || 'Service Booking';

                        triggerGlobalAlert({
                            roleType: isNoHelper ? 'unclaimed' : 'admin',
                            isNoHelperAlert: isNoHelper,
                            title: isNoHelper ? '⚠️ Unclaimed Service Booking Alert!' : '📢 New Booking Received!',
                            body: isNoHelper
                                ? `No helper has accepted service for ${trulyNew.length} booking(s). Immediate action required!`
                                : `${trulyNew.length} new booking${trulyNew.length > 1 ? 's have' : ' has'} arrived.`,
                            service: serviceName,
                            count: trulyNew.length,
                            link: '/admin'
                        });
                    }

                    const nextTime = Date.now().toString();
                    lastCheckedTimeRef.current = nextTime;
                    localStorage.setItem('sh_lastCheckedTime', nextTime);
                } catch (err) {
                    // Ignore transient network errors
                }
            }

            // 2. HELPER CHECK
            if (isHelper) {
                const helperOnline = localStorage.getItem('helperIsOnline') !== 'false';
                const token = localStorage.getItem('helperToken');

                if (helperOnline && token) {
                    try {
                        const response = await axios.get('/api/helper/check-new-works', {
                            headers: { Authorization: `Bearer ${token}` }
                        });

                        const works = Array.isArray(response.data?.works) ? response.data.works : [];
                        const trulyNewWorks = works.filter(w => !notifiedIdsRef.current.has(w._id));

                        if (trulyNewWorks.length > 0) {
                            trulyNewWorks.forEach(w => notifiedIdsRef.current.add(w._id));
                            localStorage.setItem('helperNotifiedWorks', JSON.stringify([...notifiedIdsRef.current]));

                            const firstWork = trulyNewWorks[0];
                            const serviceName = firstWork?.service || firstWork?.serviceid?.name || 'Assigned Job';

                            triggerGlobalAlert({
                                roleType: 'helper',
                                isNoHelperAlert: false,
                                title: '📢 New Work Assigned!',
                                body: `${trulyNewWorks.length} new job${trulyNewWorks.length > 1 ? 's' : ''} assigned to you by your vendor.`,
                                service: serviceName,
                                count: trulyNewWorks.length,
                                link: '/helperlogin'
                            });
                        }
                    } catch (err) {
                        // Ignore transient network errors
                    }
                }
            }
        };

        // Run initial check and set polling interval (runs everywhere on all routes)
        checkLiveUpdates();
        pollingIntervalRef.current = setInterval(checkLiveUpdates, 8000);

        // Listen for Firebase Push Events in foreground
        const handleFcmBooking = (event) => {
            const payload = event.detail;
            const notif = payload?.notification || {};
            triggerGlobalAlert({
                roleType: 'admin',
                isNoHelperAlert: false,
                title: notif.title || '📢 New Booking Received!',
                body: notif.body || 'A new booking has arrived',
                service: payload?.data?.service || '',
                count: 1,
                link: '/admin'
            });
        };

        const handleFcmWork = (event) => {
            const payload = event.detail;
            const notif = payload?.notification || {};
            triggerGlobalAlert({
                roleType: 'helper',
                isNoHelperAlert: false,
                title: notif.title || '📢 New Work Assigned!',
                body: notif.body || 'A new job has been assigned to you',
                service: payload?.data?.service || '',
                count: 1,
                link: '/helperlogin'
            });
        };

        window.addEventListener('fcmBookingReceived', handleFcmBooking);
        window.addEventListener('fcmWorkAssigned', handleFcmWork);

        return () => {
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
            window.removeEventListener('fcmBookingReceived', handleFcmBooking);
            window.removeEventListener('fcmWorkAssigned', handleFcmWork);
        };
    }, [triggerGlobalAlert]);

    if (!activeAlert) return null;

    return (
        <div className="sh-global-alert-container">
            <div className={`sh-global-alert-card ${activeAlert.isNoHelperAlert ? 'unclaimed' : activeAlert.roleType}`}>
                <div className="sh-global-alert-left">
                    <div className="sh-global-alert-icon-pulse">
                        {activeAlert.isNoHelperAlert ? <FaExclamationTriangle /> : <FaBell />}
                    </div>
                    <div className="sh-global-alert-info">
                        <div className="sh-global-alert-title">
                            {activeAlert.title}
                        </div>
                        <div className="sh-global-alert-body">
                            {activeAlert.body}
                        </div>
                        {activeAlert.service && (
                            <span className="sh-global-alert-service-tag">
                                Service: {activeAlert.service}
                            </span>
                        )}
                    </div>
                </div>

                <div className="sh-global-alert-actions">
                    <button
                        type="button"
                        className="sh-global-btn sh-global-btn-primary"
                        onClick={() => {
                            const target = activeAlert.link;
                            handleDismiss();
                            if (location.pathname !== target) {
                                navigate(target);
                            }
                        }}
                    >
                        <FaExternalLinkAlt />
                        <span>{activeAlert.roleType === 'helper' ? 'View Job' : 'View Booking'}</span>
                    </button>

                    {isPlayingSound && (
                        <button
                            type="button"
                            className="sh-global-btn sh-global-btn-mute"
                            onClick={handleStopSound}
                            title="Mute alert sound"
                        >
                            <FaVolumeMute />
                            <span>Mute</span>
                        </button>
                    )}

                    <button
                        type="button"
                        className="sh-global-btn sh-global-btn-dismiss"
                        onClick={handleDismiss}
                        title="Dismiss notification"
                        aria-label="Dismiss"
                    >
                        <FaTimes />
                    </button>
                </div>
            </div>
        </div>
    );
}

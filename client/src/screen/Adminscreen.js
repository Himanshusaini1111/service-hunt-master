import React, { useState, useEffect, useRef } from "react";
import { Tabs, message, Card, Statistic, Table, Button } from "antd";
import Navbar from "../components/Navbar";
import axios from "axios";
import Error from "../components/Error";
import Loader from "../components/Loader";
import { Addservice } from "../components/Addservice.js";
import { VendorHelperInfo } from "../components/VendorHelperInfo";
import Calendar from "react-calendar";
import { VendorProfile } from "../components/VendorProfile .js";
import Payment from "../components/Payment";
import "react-calendar/dist/Calendar.css";
import "./Adminscreen.css";
import { Link } from 'react-router-dom';
import { requestNotificationPermission, onMessageListener } from '../firebase';
import { playSoundAlert, stopSoundAlert } from '../utils/soundAlert';
import { appAlert } from '../utils/appAlert';

const { TabPane } = Tabs;


// Helper functions to identify booking type
const isAutomaticBookingType = (type) => {
    if (!type) return true; // Default to automatic
    const lower = String(type).trim().toLowerCase();
    if (lower.includes('manual') || lower.includes('inqu')) {
        return false;
    }
    return true;
};

const isManualOrInquiryBookingType = (type) => {
    if (!type) return false;
    const lower = String(type).trim().toLowerCase();
    return lower.includes('manual') || lower.includes('inqu');
};

function Adminscreen() {
    const user = JSON.parse(localStorage.getItem("currentUser"));
    const isSuperAdmin = user?.email === 'himanshufa875@gmail.com' && (user?.role === 'superadmin' || user?.isAdmin);
    const isAdmin = user?.role === 'admin' || user?.isAdmin;
    const isVendor = user?.role === 'vendor' || user?.isVendor;

    const [activeTab, setActiveTab] = useState('1');
    const [editingService, setEditingService] = useState(null);
    const [activeBookingId, setActiveBookingId] = useState(null);

    const handleEditService = (service) => {
        setEditingService(service);
        setActiveTab('3');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    const [dashboardData, setDashboardData] = useState({
        totalBookings: 0,
        totalServices: 0,
        totalUsers: 0,
        totalVendors: 0,
        revenue: 0,
        recentBookings: []
    });
    const [dashboardLoading, setDashboardLoading] = useState(true);
    
    // ✅ Notification states
    const [, setLastCheckedTime] = useState(localStorage.getItem('adminLastCheckedTime') || Date.now().toString());
    const [soundEnabled, setSoundEnabled] = useState(localStorage.getItem('adminSoundEnabled') !== 'false');
    const [isPlayingSound, setIsPlayingSound] = useState(false);
    const [newBookingAlert, setNewBookingAlert] = useState(null);
    const [, setNotifiedBookingIds] = useState(
        new Set(JSON.parse(localStorage.getItem('adminNotifiedBookings') || '[]'))
    );
    const [refreshKey, setRefreshKey] = useState(0);

    // Refs to avoid stale closures in polling interval
    const lastCheckedTimeRef = useRef(localStorage.getItem('adminLastCheckedTime') || Date.now().toString());
    const notifiedBookingIdsRef = useRef(
        new Set(JSON.parse(localStorage.getItem('adminNotifiedBookings') || '[]'))
    );
    const newBookingAlertRef = useRef(null);
    const soundEnabledRef = useRef(soundEnabled);
    soundEnabledRef.current = soundEnabled;
    newBookingAlertRef.current = newBookingAlert;
    
    // Global service visibility control state
    const [allServices, setAllServices] = useState([]);
    const [isTogglingAllServices, setIsTogglingAllServices] = useState(false);
    
    // Audio ref for sound
    const audioRef = useRef(null);
    const pollingIntervalRef = useRef(null);

    // Stop sound function
    const stopSound = () => {
        stopSoundAlert();
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
        setIsPlayingSound(false);
    };

    // Dismiss alert banner and stop sound
    const dismissBookingAlert = () => {
        stopSound();
        setNewBookingAlert(null);
    };

    // Play notification sound with Web Audio chime fallback and auto-stop
    const playNotificationSound = (shouldLoop = true) => {
        if (!soundEnabled) return;
        setIsPlayingSound(true);

        playSoundAlert({
            loop: shouldLoop,
            maxDurationMs: 30000,
            onAutoStop: () => {
                setIsPlayingSound(false);
            }
        });
    };

    // Check new bookings function
    const checkNewBookings = async () => {
        try {
            const response = await axios.get(`/api/bookings/check-new`, {
                params: { 
                    userid: user._id, 
                    lastCheckedTime: lastCheckedTimeRef.current
                }
            });
            
            const newBookings = response.data || [];
            
            if (newBookings.length > 0) {
                // Filter truly new bookings that haven't been notified yet using ref
                const trulyNewBookings = newBookings.filter(booking => 
                    !notifiedBookingIdsRef.current.has(booking._id)
                );
                
                if (trulyNewBookings.length > 0) {
                    // Mark as notified in ref and localStorage so they are never notified again
                    trulyNewBookings.forEach(booking => {
                        notifiedBookingIdsRef.current.add(booking._id);
                    });
                    localStorage.setItem('adminNotifiedBookings', JSON.stringify([...notifiedBookingIdsRef.current]));
                    setNotifiedBookingIds(new Set(notifiedBookingIdsRef.current));
                    
                    const manualOrInquiryBookings = trulyNewBookings.filter(b => isManualOrInquiryBookingType(b.bookingType));
                    const unacceptedAlertBookings = trulyNewBookings.filter(b => 
                        (b.alertIfNoOneAccepts || b.serviceid?.alertIfNoOneAccepts || (!b.useOwn && (!b.assignedHelpers || b.assignedHelpers.length === 0))) && 
                        !b.claimedBy && 
                        !b.useOwn
                    );
                    const automaticBookings = trulyNewBookings.filter(b => isAutomaticBookingType(b.bookingType) && !unacceptedAlertBookings.includes(b));

                    // 1. For Manual/Inquiry Bookings OR bookings triggering the "alert if no one selected" option:
                    if (manualOrInquiryBookings.length > 0 || unacceptedAlertBookings.length > 0) {
                        const alertList = unacceptedAlertBookings.length > 0 ? unacceptedAlertBookings : manualOrInquiryBookings;
                        const currentAlertBookingIds = newBookingAlertRef.current?.bookings?.map(b => b._id) || [];
                        const isDuplicateAlert = alertList.some(b => 
                            currentAlertBookingIds.includes(b._id)
                        );
                        
                        if (!isDuplicateAlert) {
                            const isNoHelper = unacceptedAlertBookings.length > 0;
                            const newBookingInfo = {
                                count: alertList.length,
                                bookings: alertList,
                                timestamp: new Date(),
                                isNoHelperAlert: isNoHelper
                            };
                            
                            setNewBookingAlert(newBookingInfo);

                            // Trigger floating high-priority toast
                            appAlert.bookingAlert({
                                count: alertList.length,
                                service: alertList[0]?.service || '',
                                isNoHelperAlert: isNoHelper,
                                sound: false, // Audio handled by playNotificationSound below
                                onView: () => {
                                    dismissBookingAlert();
                                    setActiveTab('1');
                                },
                                onDismiss: () => {
                                    stopSound();
                                }
                            });
                            
                            if (soundEnabledRef.current) {
                                playNotificationSound(true);
                            }
                            
                            if (Notification.permission === 'granted') {
                                const notifTitle = isNoHelper ? `⚠️ Service Booking Unclaimed!` : `📢 New Booking${alertList.length > 1 ? 's' : ''}!`;
                                const notifBody = isNoHelper
                                    ? `No helper has selected or accepted service for booking!`
                                    : `${alertList.length} new booking${alertList.length > 1 ? 's have' : ' has'} been received`;
                                new Notification(notifTitle, {
                                    body: notifBody,
                                    icon: '/icon-192.png',
                                    vibrate: [200, 100, 200]
                                });
                            }
                            
                            if (isNoHelper) {
                                message.warning(`⚠️ Alert: Booking for service has not been selected/accepted by any helper!`, 6);
                            } else {
                                message.info(`${alertList.length} new booking${alertList.length > 1 ? 's' : ''} received!`);
                            }
                        }
                    }

                    // 2. For Automatic Bookings:
                    // Alert does NOT start (no sound, no alert banner)
                    // Message occurs only ONCE and never repeats
                    if (automaticBookings.length > 0 && manualOrInquiryBookings.length === 0) {
                        const autoCount = automaticBookings.length;
                        message.info(`${autoCount} new booking${autoCount > 1 ? 's' : ''} received!`);
                        
                        if (Notification.permission === 'granted') {
                            new Notification(`📢 New Booking${autoCount > 1 ? 's' : ''}!`, {
                                body: `${autoCount} new booking${autoCount > 1 ? 's have' : ' has'} been received`,
                                icon: '/icon-192.png'
                            });
                        }
                    }
                    
                    // Always refresh the bookings table so the admin sees the new booking
                    setRefreshKey(prev => prev + 1);
                }
            }
            
            const newCheckedTime = Date.now().toString();
            lastCheckedTimeRef.current = newCheckedTime;
            setLastCheckedTime(newCheckedTime);
            localStorage.setItem('adminLastCheckedTime', newCheckedTime);
            
        } catch (error) {
            console.log('Error checking new bookings:', error);
        }
    };

    // Function to toggle live availability without mutating isVisible
    const toggleAllServicesVisibility = async () => {
        if (allServices.length === 0) {
            message.warning("No services available to toggle");
            return;
        }

        const isCurrentlyLive = allServices.every(service => service.isLiveAvailable !== false);
        const newLiveState = !isCurrentlyLive;

        const confirm = window.confirm(`Are you sure you want to ${newLiveState ? 'enable' : 'disable'} live Availability?`);
        if (!confirm) return;

        try {
            setIsTogglingAllServices(true);

            const response = await axios.put(`/api/service/toggleliveavailability?userid=${user._id}`, {
                isLiveAvailable: newLiveState
            });

            if (response.data && response.data.success) {
                // Update local state isLiveAvailable without altering isVisible
                setAllServices(prevServices =>
                    prevServices.map(service => ({
                        ...service,
                        isLiveAvailable: newLiveState
                    }))
                );

                message.success(`Live availability ${newLiveState ? 'enabled' : 'disabled'} successfully`);
                setRefreshKey(prev => prev + 1);
            }
        } catch (error) {
            console.error("Toggle live availability error:", error);
            message.error("Error toggling live availability");
        } finally {
            setIsTogglingAllServices(false);
        }
    };

    useEffect(() => {
        // Fetch all services for visibility control
        const fetchAllServices = async () => {
            if (user?._id) {
                try {
                    const response = await axios.get(`/api/service/getvisible?userid=${user._id}`);
                    setAllServices(response.data);
                } catch (error) {
                    console.error("Error fetching services for visibility control:", error);
                }
            }
        };
        fetchAllServices();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?._id]);

    useEffect(() => {
        const handleBookingConfirmed = (event) => {
            const { bookingId } = event.detail || {};
            if (bookingId) {
                notifiedBookingIdsRef.current.delete(bookingId);
                localStorage.setItem('adminNotifiedBookings', JSON.stringify([...notifiedBookingIdsRef.current]));
                setNotifiedBookingIds(new Set(notifiedBookingIdsRef.current));
            }
        };
        
        window.addEventListener('bookingConfirmed', handleBookingConfirmed);
        
        return () => {
            window.removeEventListener('bookingConfirmed', handleBookingConfirmed);
        };
    }, []);

    useEffect(() => {
        const handleBookingUpdate = (event) => {
            const { status } = event.detail || {};
            
            if ((status === 'confirmed' || status === 'rejected' || status === 'assigned') && isPlayingSound) {
                stopSound();
            }
        };
        
        window.addEventListener('bookingStatusChanged', handleBookingUpdate);
        
        return () => {
            window.removeEventListener('bookingStatusChanged', handleBookingUpdate);
        };
    }, [isPlayingSound]);

    // Toggle sound function
    const toggleSound = () => {
        const newState = !soundEnabled;
        setSoundEnabled(newState);
        localStorage.setItem('adminSoundEnabled', newState);
        
        if (!newState && isPlayingSound) {
            stopSound();
        }
        
        message.info(`Sound notifications ${newState ? 'enabled' : 'disabled'}`);
    };

    useEffect(() => {
        const cleanOldNotifications = async () => {
            try {
                const storedIds = JSON.parse(localStorage.getItem('adminNotifiedBookings') || '[]');
                if (storedIds.length === 0) return;
                
                const response = await axios.get(`/api/bookings/check-status`, {
                    params: { bookingIds: storedIds.join(',') }
                });
                
                const activeBookingIds = response.data.activeIds || [];
                const cleanedIds = storedIds.filter(id => activeBookingIds.includes(id));
                
                if (cleanedIds.length !== storedIds.length) {
                    localStorage.setItem('adminNotifiedBookings', JSON.stringify(cleanedIds));
                    notifiedBookingIdsRef.current = new Set(cleanedIds);
                    setNotifiedBookingIds(new Set(cleanedIds));
                    console.log('Cleaned old notifications:', storedIds.length - cleanedIds.length, 'removed');
                }
            } catch (error) {
                console.log('Error cleaning notifications:', error);
            }
        };
        
        cleanOldNotifications();
    }, []);

    useEffect(() => {
        if (user?._id) {
            let userType = 'vendor';
            if (isSuperAdmin) userType = 'superadmin';
            else if (isAdmin) userType = 'admin';
            
            requestNotificationPermission(user._id, userType);
            
            onMessageListener().then(payload => {
                console.log('Foreground notification:', payload);
                checkNewBookings();
                setRefreshKey(prev => prev + 1);
            });

            const handleFcmBooking = () => {
                checkNewBookings();
                setRefreshKey(prev => prev + 1);
            };
            window.addEventListener('fcmBookingReceived', handleFcmBooking);
            
            pollingIntervalRef.current = setInterval(checkNewBookings, 60000);
            
            checkNewBookings();
            
            return () => {
                if (pollingIntervalRef.current) {
                    clearInterval(pollingIntervalRef.current);
                }
                window.removeEventListener('fcmBookingReceived', handleFcmBooking);
            };
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?._id]);

    // Fetch dashboard data
    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!user?._id) return;
            
            setDashboardLoading(true);
            try {
                const response = await axios.get(`/api/bookings/dashboard`, {
                    params: { userid: user._id }
                });
                
                if (response.data && response.data.stats) {
                    setDashboardData(response.data.stats);
                } else {
                    await fetchDashboardDataManually();
                }
            } catch (error) {
                console.error("Error fetching dashboard data:", error);
                await fetchDashboardDataManually();
            } finally {
                setDashboardLoading(false);
            }
        };
        
        const fetchDashboardDataManually = async () => {
            try {
                const bookingsRes = await axios.get(`/api/bookings/getallbookings?userid=${user._id}`);
                const bookings = bookingsRes.data || [];
                
                const servicesRes = await axios.get(`/api/service/getvisible?userid=${user._id}`);
                const services = servicesRes.data || [];
                
                const totalBookings = bookings.length;
                const totalServices = services.length;
                const revenue = bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
                const recentBookings = bookings.slice(0, 5);
                
                let totalUsers = 0;
                let totalVendors = 0;
                
                if (isSuperAdmin) {
                    try {
                        const usersRes = await axios.get('/api/users/getallusers');
                        const users = usersRes.data || [];
                        totalUsers = users.length;
                        totalVendors = users.filter(u => u.isAdmin || u.role === 'admin' || u.role === 'vendor').length;
                    } catch (e) {
                        console.error("Error fetching users:", e);
                    }
                }
                
                setDashboardData({
                    totalBookings,
                    totalServices,
                    totalUsers,
                    totalVendors,
                    revenue,
                    recentBookings
                });
            } catch (error) {
                console.error("Manual fetch error:", error);
                setDashboardData({
                    totalBookings: 0,
                    totalServices: 0,
                    totalUsers: 0,
                    totalVendors: 0,
                    revenue: 0,
                    recentBookings: []
                });
            }
        };
        
        fetchDashboardData();
    }, [user?._id, isSuperAdmin]);

    // Get display name based on role
    const getDashboardTitle = () => {
        if (isSuperAdmin) return "Super Admin Dashboard";
        if (isAdmin) return "Admin Dashboard";
        if (isVendor) return "Vendor Dashboard";
        return "Dashboard";
    };

    // Get button text and style based on services visibility
    const getVisibilityButtonConfig = () => {
        if (allServices.length === 0) {
            return {
                text: "No Services",
                icon: "bi-ban",
                variant: "btn-secondary",
                disabled: true
            };
        }
        
        const isLive = allServices.length > 0 && allServices.every(s => s.isLiveAvailable !== false);
        
     if (isLive) {
    return {
        text: "Disable Live Availability",
        icon: "bi-eye-slash",
        variant: "btn-danger",
        disabled: false,
        tooltip: "Live availability is active. Click to disable for today"
    };
} else {
    return {
        text: "Enable Live Availability",
        icon: "bi-eye",
        variant: "btn-success",
        disabled: false,
        tooltip: "Live availability is disabled. Click to enable"
    };
}
    };

    const visibilityConfig = getVisibilityButtonConfig();

    if (!isSuperAdmin && !isAdmin && !isVendor) {
        return <div className="access-denied">Access Denied: This panel is for admins/vendors only.</div>;
    }

    return (
        <div className="admin-page-wrapper">
            <Navbar />
            <div className="admin-container">
            {/* AUDIO ELEMENT FOR SOUND */}
            <audio ref={audioRef} preload="auto" style={{ display: 'none' }}>
                <source src="/sounds/booking.mp3" type="audio/mpeg" />
            </audio>
            
            {/* NEW BOOKING ALERT BANNER */}
            {newBookingAlert && (
                <div className="booking-alert-container">
                    <Card className={`booking-alert-card ${newBookingAlert.isNoHelperAlert ? 'border-danger' : ''}`} style={newBookingAlert.isNoHelperAlert ? { borderLeft: '6px solid #dc2626' } : {}}>
                        <div className="alert-content">
                            <div className="alert-info">
                                <div className="alert-title" style={{ color: newBookingAlert.isNoHelperAlert ? '#dc2626' : undefined }}>
                                    {newBookingAlert.isNoHelperAlert ? '⚠️' : '🔔'} <strong>{newBookingAlert.isNoHelperAlert ? 'Unclaimed Service Booking Alert!' : 'New Booking Alert!'}</strong>
                                </div>
                                <div className="alert-message">
                                    {newBookingAlert.isNoHelperAlert 
                                        ? `No helper has selected or accepted service for ${newBookingAlert.count} booking${newBookingAlert.count > 1 ? 's' : ''}! Immediate action needed.`
                                        : `${newBookingAlert.count} new booking${newBookingAlert.count > 1 ? 's have' : ' has'} been received`}
                                </div>
                                {newBookingAlert.bookings.length > 0 && (
                                    <div className="alert-service fw-bold text-primary mt-1">
                                        Service: {newBookingAlert.bookings[0].service}
                                    </div>
                                )}
                            </div>
                            <div className="d-flex align-items-center gap-2">
                                <Button
                                    type="primary"
                                    size="middle"
                                    onClick={() => {
                                        dismissBookingAlert();
                                        setActiveTab('1');
                                    }}
                                    style={{ background: '#2563eb', fontWeight: 600 }}
                                >
                                    View Bookings
                                </Button>
                                {isPlayingSound && (
                                    <Button
                                        danger
                                        size="middle"
                                        onClick={stopSound}
                                        icon={<span>🔇</span>}
                                        className="stop-sound-btn"
                                    >
                                        Stop Sound
                                    </Button>
                                )}
                                <Button
                                    size="middle"
                                    onClick={dismissBookingAlert}
                                >
                                    Dismiss
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* Admin Header with Visibility Toggle Button */}
            <header className="admin-header">
                <div className="header-container">
                    
                                            <div className="admin-title-area">
                        <div className="admin-avatar">
                            {user?.name ? user.name.slice(0, 2).toUpperCase() : 'AD'}
                        </div>
                        <h1 className="admin-title">{getDashboardTitle()}</h1>
                    </div>

                    <div className="user-info-section">
                        <div className="user-details">
                            <div className="welcome-text">
                                <span className="greeting">Welcome,</span>
                                <span className="user-name">{user.name}</span>
                            </div>
                            <span className={`role-badge ${user.role === 'superadmin' ? 'superadmin' : (user.role === 'admin' || user.isAdmin ? 'admin' : 'vendor')}`}>
                                {user.role === 'superadmin' ? 'Super Admin' : (user.role || (user.isAdmin ? 'Admin' : 'Vendor'))}
                            </span>
                        </div>
<div className="header-actions">
    {/* Left Section - Visibility Controls */}
    {(isAdmin || isSuperAdmin || isVendor) && (
     <button
    className={`visibility-toggle-btn ${visibilityConfig.variant}`}
    onClick={toggleAllServicesVisibility}
    disabled={isTogglingAllServices || visibilityConfig.disabled}
    aria-label={visibilityConfig.text}
    aria-busy={isTogglingAllServices}
>
    <span className="btn-content">
        {isTogglingAllServices ? (
            <>
                <span className="spinner-border spinner-border-sm" />
                <span>Processing...</span>
            </>
        ) : (
            <>
                <i className={visibilityConfig.icon}></i>
                <span>{visibilityConfig.text}</span>
            </>
        )}
    </span>
</button>
    )}

    {/* Right Section - Audio Controls */}
    <div className="audio-controls-group">
        <button
            onClick={toggleSound}
            className={`audio-btn sound-toggle-btn ${soundEnabled ? 'active' : ''}`}
            aria-label={soundEnabled ? "Disable sound" : "Enable sound"}
            aria-pressed={soundEnabled}
            title={soundEnabled ? "Sound On" : "Sound Off"}
        >
            <span className="audio-icon" aria-hidden="true">
                {soundEnabled ? '🔊' : '🔇'}
            </span>
            <span className="btn-label">
                {soundEnabled ? 'Sound On' : 'Sound Off'}
            </span>
        </button>
        
        {isPlayingSound && (
            <button
                onClick={stopSound}
                className="audio-btn stop-sound-btn"
                aria-label="Stop playback"
                title="Stop Sound"
            >
                <span className="audio-icon" aria-hidden="true">⏹️</span>
                <span className="btn-label">Stop</span>
            </button>
        )}
    </div>
</div>
                    </div>
                </div>
            </header>
            
            <div className="admin-content">
                <Tabs activeKey={activeTab} onChange={setActiveTab} className="custom-tabs" tabBarGutter={20}>
                    <TabPane tab="Dashboard" key="0">
                        <Dashboard
                            dashboardData={dashboardData}
                            dashboardLoading={dashboardLoading}
                            isSuperAdmin={isSuperAdmin}
                            userId={user._id}
                        />
                    </TabPane>
                    <TabPane tab="Bookings" key="1">
                        <Bookings
                            key={refreshKey}
                            setActiveTab={setActiveTab}
                            setActiveBookingId={setActiveBookingId}
                            userId={user._id}
                            isSuperAdmin={isSuperAdmin}
                            stopSound={stopSound}
                        />
                    </TabPane>
                    <TabPane tab="Services" key="2">
                        <Services 
                            key={refreshKey}
                            userId={user._id} 
                            isSuperAdmin={isSuperAdmin}
                            onServicesUpdate={setAllServices}
                            onEditService={handleEditService}
                        />
                    </TabPane>
                    <TabPane tab={editingService ? "✏️ Edit Service" : "Add Services"} key="3">
                        <Addservice 
                            userId={user._id} 
                            editingService={editingService}
                            onCancelEdit={() => {
                                setEditingService(null);
                                setActiveTab('2');
                            }}
                            onServiceUpdated={() => {
                                setEditingService(null);
                                setRefreshKey(prev => prev + 1);
                                setActiveTab('2');
                            }}
                        />
                    </TabPane>
                    <TabPane tab="Payment" key="4">
                        <Payment userId={user._id} isSuperAdmin={isSuperAdmin} />
                    </TabPane>
                    <TabPane tab="Vendor/Helper Info" key="7">
                        <VendorHelperInfo bookingId={activeBookingId} userId={user._id} />
                    </TabPane>
                    <TabPane tab="Vendor Profiles" key="8">
                        <VendorProfile userId={user._id} />
                    </TabPane>
                </Tabs>
            </div>

            </div>
        </div>
    );
}
// At the end of Adminscreen.js
export default Adminscreen;
export function Dashboard({ dashboardData, dashboardLoading, isSuperAdmin, userId }) {
    const stats = [
        { title: 'My Bookings', value: dashboardData?.totalBookings || 0, color: '#2563eb', bg: '#eff6ff', icon: '📅' },
        { title: 'My Services', value: dashboardData?.totalServices || 0, color: '#16a34a', bg: '#ecfdf5', icon: '🛠️' },
    ];

    if (isSuperAdmin) {
        stats.push(
            { title: 'Total Users', value: dashboardData?.totalUsers || 0, color: '#9333ea', bg: '#faf5ff', icon: '👥' },
            { title: 'Total Vendors', value: dashboardData?.totalVendors || 0, color: '#ea580c', bg: '#fff7ed', icon: '🏢' }
        );
    }

    stats.push({ title: 'Total Revenue', value: `₹${Number(dashboardData?.revenue || 0).toLocaleString('en-IN')}`, color: '#dc2626', bg: '#fef2f2', icon: '💰' });

    const columns = [
        {
            title: 'Booking ID',
            dataIndex: '_id',
            key: '_id',
            render: (text) => (
                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb', background: '#eff6ff', padding: '3px 8px', borderRadius: 6 }}>
                    #{text?.slice(-6)?.toUpperCase() || 'N/A'}
                </span>
            )
        },
        {
            title: 'Service',
            dataIndex: 'service',
            key: 'service',
            render: (text) => <span style={{ fontWeight: 600, color: '#0f172a' }}>{text || 'N/A'}</span>
        },
        {
            title: 'Amount',
            dataIndex: 'totalAmount',
            key: 'amount',
            render: (text) => <span style={{ fontWeight: 700, color: '#0f172a' }}>₹{Number(text || 0).toLocaleString('en-IN')}</span>
        },
        {
            title: 'Payment Method',
            dataIndex: 'paymentMethod',
            key: 'paymentMethod',
            render: (_, record) => {
                if (record.bookingType === 'Inquari Booking' || record.bookingType === 'inquiry' || record.paymentMethod === 'N/A') {
                    return <span style={{ color: '#64748b', fontSize: '11.5px' }}>N/A (Inquiry)</span>;
                }
                const method = record.paymentMethod || 'CASH_AFTER_SERVICE';
                if (method === 'FULL_ONLINE') {
                    return (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 6, background: '#ecfdf5', color: '#059669', fontSize: 11, fontWeight: 600, border: '1px solid #a7f3d0' }}>
                            💳 100% Online
                        </span>
                    );
                }
                if (method === 'PARTIAL_30_70') {
                    return (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 6, background: '#fffbeb', color: '#b45309', fontSize: 11, fontWeight: 600, border: '1px solid #fde68a' }}>
                            ⚡ 30% / 70% Split
                        </span>
                    );
                }
                return (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 6, background: '#f8fafc', color: '#475569', fontSize: 11, fontWeight: 600, border: '1px solid #cbd5e1' }}>
                        💵 Cash on Service
                    </span>
                );
            }
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (text) => (
                <span className={`status-badge status-${text || 'pending'}`}>
                    {text || 'Pending'}
                </span>
            )
        },
        {
            title: 'Date',
            dataIndex: 'createdAt',
            key: 'date',
            render: (text) => <span style={{ color: '#64748b' }}>{text ? new Date(text).toLocaleDateString('en-IN') : 'N/A'}</span>
        },
    ];

    return (
        <div className="dashboard-container">
            <div className="dash-stats-grid">
                {stats.map((stat, index) => (
                    <div key={index} className="dash-stat-card">
                        <div>
                            <div className="dash-stat-label">{stat.title}</div>
                            <div className="dash-stat-val" style={{ color: stat.color }}>
                                {stat.value}
                            </div>
                        </div>
                        <div className="dash-stat-icon-wrap" style={{ background: stat.bg, color: stat.color }}>
                            {stat.icon}
                        </div>
                    </div>
                ))}
            </div>

            <Card
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                        <span>📋</span> My Recent Bookings
                    </div>
                }
                loading={dashboardLoading}
                style={{ borderRadius: 18, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}
                extra={<Link to="#" onClick={() => {
                    const tabElement = document.querySelector('[data-node-key="1"]');
                    if (tabElement) tabElement.click();
                }} style={{ fontWeight: 600, color: '#2563eb' }}>View All Bookings →</Link>}
            >
                <Table
                    columns={columns}
                    dataSource={dashboardData?.recentBookings || []}
                    rowKey="_id"
                    pagination={{ pageSize: 5 }}
                    scroll={{ x: true }}
                    locale={{ emptyText: 'No recent bookings found' }}
                />
            </Card>
        </div>
    );
}

export function Bookings({ setActiveTab, setActiveBookingId, userId }) {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const [filterTab, setFilterTab] = useState('all');
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [showBillModal, setShowBillModal] = useState(false);
    const [showOnlyOwn, setShowOnlyOwn] = useState(false);
    const [readBookings, setReadBookings] = useState(() => {
        // Load read bookings from localStorage
        const saved = localStorage.getItem(`readBookings_${userId}`);
        return saved ? new Set(JSON.parse(saved)) : new Set();
    });

    // Fetch all bookings on mount
    useEffect(() => {
        const fetchBookings = async () => {
            setLoading(true);
            try {
                const response = await axios.get(`/api/bookings/getallbookings?userid=${userId}`);
                console.log('Bookings with helpers:', response.data);
                setBookings(response.data);
            } catch (err) {
                console.error('Error fetching bookings:', err);
                setError(true);
            } finally {
                setLoading(false);
            }
        };
        fetchBookings();
    }, [userId]);

    // Save read bookings to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem(`readBookings_${userId}`, JSON.stringify([...readBookings]));
    }, [readBookings, userId]);

    // Filter and sort bookings
    const filteredBookings = bookings
        .filter(booking => {
            if (filterTab !== 'all' && booking.bookingType !== filterTab) return false;
            if (showOnlyOwn) {
                const isOwnVendor = String(booking.vendorId) === String(userId) || String(booking.serviceid?.vendorId) === String(userId);
                const isOwnUse = booking.useOwn === true;
                return isOwnVendor || isOwnUse;
            }
            return true;
        })
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const serviceCounts = {
        total: bookings.length,
        pending: bookings.filter(b => b.status === 'pending').length,
        completed: bookings.filter(b => b.status === 'completed').length,
        assigned: bookings.filter(b => b.status === 'assigned').length,
        confirmed: bookings.filter(b => b.status === 'confirmed').length
    };

    // Calculate unread counts - ONLY for Manual and Inquari Bookings
    const getUnreadCount = (bookingType) => {
        if (bookingType === 'all') {
            // Count unread bookings only from Manual and Inquari
            return bookings.filter(b => 
                (b.bookingType === 'Manual Booking' || b.bookingType === 'Inquari Booking') && 
                !readBookings.has(b._id)
            ).length;
        }
        // For specific tabs, only show count if it's Manual or Inquari
        if (bookingType === 'Manual Booking' || bookingType === 'Inquari Booking') {
            return bookings.filter(b => b.bookingType === bookingType && !readBookings.has(b._id)).length;
        }
        // Automatic booking returns 0 (no badge)
        return 0;
    };

    // Mark a booking as read when viewed or action taken
    const markBookingAsRead = (bookingId) => {
        if (!readBookings.has(bookingId)) {
            setReadBookings(prev => new Set([...prev, bookingId]));
        }
    };

    // Handle row click to mark as read
    const handleRowClick = (booking) => {
        // Only mark as read for Manual and Inquari bookings
        if (booking.bookingType === 'Manual Booking' || booking.bookingType === 'Inquari Booking') {
            markBookingAsRead(booking._id);
        }
    };

    // Check if a booking is new (unread) - only for Manual and Inquari
    const isNewBooking = (bookingId, bookingType) => {
        if (bookingType === 'Manual Booking' || bookingType === 'Inquari Booking') {
            return !readBookings.has(bookingId);
        }
        return false; // Automatic bookings never show NEW badge
    };

    // Handle status update function - MODIFIED to mark as read when action taken
    const handleStatusUpdate = async (bookingId, newStatus) => {
        try {
            console.log('Updating booking:', bookingId, 'to status:', newStatus);
            
            const response = await axios.post('/api/bookings/updatestatus', {
                bookingId,
                status: newStatus,
                userId: userId
            }, {
                params: { userid: userId }
            });

            console.log('Update response:', response);

            if (response.status === 200) {
                setBookings(prevBookings =>
                    prevBookings.map(booking => 
                        booking._id === bookingId 
                            ? { ...booking, status: newStatus } 
                            : booking
                    )
                );
                message.success(`Booking ${newStatus} successfully`);
                
                // ✅ Mark booking as read when action is taken (Confirm/Reject/Assign)
                markBookingAsRead(bookingId);
                
                // IMPORTANT: Stop sound when status changes
                if (newStatus === 'confirmed' || newStatus === 'rejected' || newStatus === 'assigned') {
                    window.dispatchEvent(new CustomEvent('bookingStatusChanged', { 
                        detail: { bookingId, status: newStatus } 
                    }));
                    
                    const storedIds = JSON.parse(localStorage.getItem('adminNotifiedBookings') || '[]');
                    const updatedIds = storedIds.filter(id => id !== bookingId);
                    localStorage.setItem('adminNotifiedBookings', JSON.stringify(updatedIds));
                    
                    window.dispatchEvent(new CustomEvent('bookingConfirmed', { 
                        detail: { bookingId } 
                    }));
                }
            }
        } catch (err) {
            console.error("Detailed error:", {
                message: err.message,
                response: err.response?.data,
                status: err.response?.status
            });
            
            const errorMessage = err.response?.data?.message || "Failed to update booking status";
            message.error(errorMessage);
        }
    };                                                                                                                                                                   
    
    // Assign job and switch tab - MODIFIED to mark as read
    const handleJobAssign = (bookingId) => {
        // First find the booking to check its type
        const booking = bookings.find(b => b._id === bookingId);
        if (booking && (booking.bookingType === 'Manual Booking' || booking.bookingType === 'Inquari Booking')) {
            markBookingAsRead(bookingId);
        }
        handleStatusUpdate(bookingId, 'assigned');
        setActiveBookingId(bookingId);
        setActiveTab('7');
    };

    // Handle view bill
    const handleViewBill = (booking) => {
        setSelectedBooking(booking);
        setShowBillModal(true);
    };

    const renderPaymentBadge = (booking) => {
        const isInquiry = booking.bookingType === 'Inquari Booking' || booking.bookingType === 'inquiry' || booking.paymentMethod === 'N/A';
        if (isInquiry) {
            return (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', background: '#f8fafc', color: '#64748b', fontSize: '11px', fontWeight: 600, border: '1px solid #e2e8f0' }}>
                    N/A (Inquiry)
                </span>
            );
        }

        const method = booking.paymentMethod || 'CASH_AFTER_SERVICE';
        const status = booking.paymentStatus || 'unpaid';
        const advance = Number(booking.advancePaidAmount) || 0;
        const remaining = Number(booking.remainingCashAmount) || 0;

        if (method === 'FULL_ONLINE' || status === 'paid') {
            return (
                <div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', background: '#ecfdf5', color: '#059669', fontSize: '11.5px', fontWeight: 600, border: '1px solid #a7f3d0' }}>
                        <span>💳 Full Online</span>
                    </div>
                    <div style={{ fontSize: '10.5px', color: '#059669', marginTop: '2px', fontWeight: 600 }}>
                        Paid: ₹{advance || booking.totalAmount || 0}
                    </div>
                </div>
            );
        }

        if (method === 'PARTIAL_30_70' || status === 'partial_paid') {
            return (
                <div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', background: '#fffbeb', color: '#b45309', fontSize: '11.5px', fontWeight: 600, border: '1px solid #fde68a' }}>
                        <span>⚡ 30% / 70% Split</span>
                    </div>
                    <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '2px' }}>
                        Adv: <strong style={{ color: '#059669' }}>₹{advance}</strong> • Due: <strong style={{ color: '#dc2626' }}>₹{remaining}</strong>
                    </div>
                </div>
            );
        }

        return (
            <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', background: '#f8fafc', color: '#334155', fontSize: '11.5px', fontWeight: 600, border: '1px solid #cbd5e1' }}>
                    <span>💵 Cash on Service</span>
                </div>
                <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '2px' }}>
                    Due: <strong style={{ color: '#dc2626' }}>₹{remaining || booking.totalAmount || 0}</strong>
                </div>
            </div>
        );
    };

    const formatLocationDateTime = (loc) => {
        if (!loc) return 'N/A';

        // Extract dates
        let dates = [];
        if (Array.isArray(loc.selectedDates) && loc.selectedDates.length > 0) {
            dates = loc.selectedDates.filter(Boolean);
        } else if (loc.fromDate && loc.toDate && loc.fromDate !== loc.toDate) {
            dates = [loc.fromDate, loc.toDate];
        } else if (loc.fromDate) {
            dates = [loc.fromDate];
        } else if (loc.toDate) {
            dates = [loc.toDate];
        }

        const formatDateStr = (d) => {
            if (!d) return '';
            try {
                const parsed = new Date(d);
                if (isNaN(parsed.getTime())) return String(d);
                return parsed.toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                });
            } catch {
                return String(d);
            }
        };

        let dateStr = '';
        if (dates.length > 1) {
            dateStr = `${formatDateStr(dates[0])} to ${formatDateStr(dates[dates.length - 1])}`;
        } else if (dates.length === 1) {
            dateStr = formatDateStr(dates[0]);
        }

        // Extract time / slots
        let timeStr = '';
        if (Array.isArray(loc.slots) && loc.slots.length > 0) {
            const slotTexts = loc.slots.map(s => {
                if (typeof s === 'object' && s !== null) {
                    return s.slot || s.time || '';
                }
                return String(s);
            }).filter(Boolean);
            if (slotTexts.length > 0) {
                timeStr = slotTexts.join(', ');
            }
        }

        if (!timeStr && loc.time && loc.time !== 'N/A' && loc.time !== 'null' && loc.time !== 'undefined' && String(loc.time).trim() !== '') {
            timeStr = String(loc.time);
        }

        if (dateStr && timeStr) {
            return `${dateStr} (${timeStr})`;
        } else if (dateStr) {
            return dateStr;
        } else if (timeStr) {
            return timeStr;
        } else if (loc.createdAt) {
            return formatDateStr(loc.createdAt);
        }
        return 'N/A';
    };

    const ServiceLink = ({ serviceId, serviceName }) => (
        <Link
            to={`/service/${serviceId}`}
            className="service-link"
            onClick={e => e.stopPropagation()}
        >
            {serviceName}
        </Link>
    );

    const StatusBadge = ({ status }) => (
        <span className={`status-badge status-${status}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
    );

    const FormattedDate = ({ date }) => (
        <span className="booking-date">
            {new Date(date).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            })}
        </span>
    );

    const ActionButtons = ({ booking, onStatusUpdate, onJobAssign }) => (
        <td onClick={(e) => e.stopPropagation()}>
            <div className="d-flex flex-wrap gap-2">
                {/* Show Job Assign button only for confirmed or assigned status */}
                {(booking.status === "confirmed" || booking.status === "assigned") && (
                    <button
                        className="btn btn-info btn-sm px-3 py-1 rounded-pill"
                        onClick={() => {
                            onJobAssign(booking._id);
                            // Mark as read when Job Assign is clicked
                            if (booking.bookingType === 'Manual Booking' || booking.bookingType === 'Inquari Booking') {
                                markBookingAsRead(booking._id);
                            }
                        }}
                    >
                        Job Assign
                    </button>
                )}
                
                {/* Show Confirm/Reject buttons only for pending/booked status */}
                {(booking.status === "booked" || booking.status === "pending" || booking.status === "inquiry") && (
                    <>
                        <button
                            className="btn btn-success btn-sm px-3 py-1 rounded-pill"
                            onClick={() => {
                                onStatusUpdate(booking._id, "confirmed");
                                // Mark as read when Confirm is clicked
                                if (booking.bookingType === 'Manual Booking' || booking.bookingType === 'Inquari Booking') {
                                    markBookingAsRead(booking._id);
                                }
                            }}
                        >
                            Confirm
                        </button>
                        <button
                            className="btn btn-danger btn-sm px-3 py-1 rounded-pill"
                            onClick={() => {
                                onStatusUpdate(booking._id, "rejected");
                                // Mark as read when Reject is clicked
                                if (booking.bookingType === 'Manual Booking' || booking.bookingType === 'Inquari Booking') {
                                    markBookingAsRead(booking._id);
                                }
                            }}
                        >
                            Reject
                        </button>
                    </>
                )}
                
                {/* Show message for rejected bookings */}
                {booking.status === "rejected" && (
                    <button
                        className="btn btn-danger btn-sm px-3 py-1 rounded-pill"
                        disabled
                    >
                        Rejected
                    </button>
                )}
                
                {/* Show message for completed bookings */}
                {booking.status === "completed" && (
                    <button
                        className="btn btn-secondary btn-sm px-3 py-1 rounded-pill"
                        disabled
                    >
                        Completed
                    </button>
                )}
            </div>
        </td>
    );

    const bookingTabs = ['all', 'Automatic Booking', 'Manual Booking', 'Inquari Booking'];

    // Function to get tab display name with badge (only for Manual and Inquari)
    const getTabDisplay = (type) => {
        let displayName = type === 'all' ? 'All Bookings' : type.replace(' Booking', '');
        const unreadCount = getUnreadCount(type);
        
        // Show badge only for Manual Booking, Inquari Booking, and All tab (which shows combined count)
        if (unreadCount > 0 && (type === 'all' || type === 'Manual Booking' || type === 'Inquari Booking')) {
            return (
                <span className="tab-label-with-badge">
                    {displayName}
                    <span className="notification-badge">{unreadCount}</span>
                </span>
            );
        }
        return displayName;
    };

    return (
        <div className="bookings-container">
            {/* Statistics Section */}
            <div className="stats-header">
                <h1 className="page-title">Bookings Management</h1>
                {loading && <Loader />}
                {error && <Error />}

                <div className="stats-grid">
                    <Card className="stat-card">
                        <Statistic
                            title="Total Bookings"
                            value={serviceCounts.total}
                            valueStyle={{ color: '#1890ff' }}
                            prefix={<i className="fas fa-calendar-alt stat-icon"></i>}
                        />
                    </Card>
                    <Card className="stat-card">
                        <Statistic
                            title="Confirmed"
                            value={serviceCounts.confirmed}
                            valueStyle={{ color: '#52c41a' }}
                            prefix={<i className="fas fa-check-circle stat-icon"></i>}
                        />
                    </Card>
                    <Card className="stat-card">
                        <Statistic
                            title="Assigned"
                            value={serviceCounts.assigned}
                            valueStyle={{ color: '#a55eea' }}
                            prefix={<i className="fas fa-user-check stat-icon"></i>}
                        />
                    </Card>
                </div>
            </div>

            {/* Tabs Section with Notification Badges & Own Booking Filter */}
            <div className="tabs-container d-flex justify-content-between align-items-center flex-wrap gap-2">
                <div className="tabs-scroll-wrapper">
                    {bookingTabs.map(type => (
                        <button
                            key={type}
                            className={`tab-btn ${filterTab === type ? 'active' : ''}`}
                            onClick={() => setFilterTab(type)}
                        >
                            {getTabDisplay(type)}
                            <span className="tab-underline"></span>
                        </button>
                    ))}
                </div>
                <div className="d-flex align-items-center gap-2 ms-auto py-1">
                    <label 
                        className="d-flex align-items-center gap-2 small fw-semibold" 
                        style={{ 
                            cursor: 'pointer', 
                            userSelect: 'none', 
                            background: showOnlyOwn ? '#eff6ff' : '#f8fafc', 
                            padding: '6px 14px', 
                            borderRadius: '20px', 
                            border: showOnlyOwn ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                            transition: 'all 0.2s ease',
                            color: showOnlyOwn ? '#1d4ed8' : '#475569'
                        }}
                    >
                        <input 
                            type="checkbox" 
                            checked={showOnlyOwn} 
                            onChange={(e) => setShowOnlyOwn(e.target.checked)} 
                            className="form-check-input mt-0"
                            style={{ cursor: 'pointer' }}
                        />
                        <span>👤 Show only own bookings</span>
                    </label>
                </div>
            </div>

            {/* Table */}
            <div className="table-wrapper">
                <table className="bookings-table">
                    <thead>
                        <tr>
                            <th>Service</th>
                            <th>Location Info</th>
                            <th>Bill</th>
                            <th>Total</th>
                            <th>Payment Method</th>
                            <th>Status</th>
                            <th>Name</th>
                            <th>Booking Type</th>
                            <th>Date</th>
                            <th>Job Completed By</th>
                            {(filterTab === 'Manual Booking' || filterTab === 'Inquari Booking') && <th>Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredBookings.map(booking => (
                            <tr 
                                key={booking._id} 
                                onClick={() => handleRowClick(booking)}
                                className={isNewBooking(booking._id, booking.bookingType) ? 'new-booking-row' : ''}
                                style={{ cursor: 'pointer' }}
                            >
                                <td>
                                    <div className="service-cell">
                                        <ServiceLink serviceId={booking.serviceid} serviceName={booking.service} />
                                        {isNewBooking(booking._id, booking.bookingType) && (
                                            <span className="new-badge">NEW</span>
                                        )}
                                        {booking.optionalInputs && booking.optionalInputs.length > 0 && (
                                            <div style={{ fontSize: '11px', color: '#1d4ed8', marginTop: '3px', lineHeight: '1.3' }}>
                                                <strong>Options:</strong> {booking.optionalInputs.map(opt => `${opt.name}${opt.count > 1 ? ` (${opt.count})` : ''}`).join(', ')}
                                            </div>
                                        )}
                                        {booking.extraInputs && booking.extraInputs.length > 0 && (
                                            <div style={{ fontSize: '11px', color: '#c2410c', marginTop: '2px', lineHeight: '1.3' }}>
                                                <strong>Extra:</strong> {booking.extraInputs.map(ext => ext.name).join(', ')}
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td onClick={(e) => { e.stopPropagation(); setSelectedLocation(booking); }} style={{ textDecoration: 'underline', color: '#0d6efd', cursor: 'pointer' }}>
                                    {booking.locationType}
                                </td>
                                <td>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleViewBill(booking);
                                        }}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: '#28a745',
                                            textDecoration: 'underline',
                                            cursor: 'pointer',
                                            fontWeight: '500'
                                        }}
                                    >
                                        View Bill 📄
                                    </button>
                                </td>
                                <td className="amount-cell">
                                    {booking.bookingType === 'Inquari Booking' ? (
                                        <div>
                                            <span style={{ fontWeight: '600', color: '#16a34a' }}>₹{booking.rentperday || 0}</span>
                                            <span style={{ fontSize: '0.78em', color: '#64748b', display: 'block' }}>Main Price</span>
                                        </div>
                                    ) : (
                                        `₹${booking.totalAmount?.toFixed(2) ?? 0}`
                                    )}
                                </td>
                                <td className="payment-cell">
                                    {renderPaymentBadge(booking)}
                                </td>
                                <td><StatusBadge status={booking.status} /></td>
                                <td>
                                    <div className="contact-info">
                                        <div>{booking.name}</div>
                                        <div>{booking.phone}</div>
                                    </div>
                                </td>
                                <td>{booking.bookingType}</td>
                                <td><FormattedDate date={booking.createdAt} /></td>
                                {/* Job Completed By Column */}
                                <td>
                                    {booking.status === 'completed' && booking.jobCompletedBy ? (
                                        <div className="job-completed-by-badge">
                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 8px', borderRadius: '6px', background: '#ecfdf5', color: '#047857', fontWeight: 600, fontSize: '11.5px', border: '1px solid #a7f3d0' }}>
                                                <span>✓</span>
                                                <span>{booking.jobCompletedBy.name}</span>
                                            </div>
                                            {booking.jobCompletedBy.phone && (
                                                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                                    📞 {booking.jobCompletedBy.phone}
                                                </div>
                                            )}
                                        </div>
                                    ) : (booking.claimedBy || (booking.status === 'in-progress' && booking.jobCompletedBy)) ? (
                                        <div>
                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 8px', borderRadius: '6px', background: '#eff6ff', color: '#1d4ed8', fontWeight: 600, fontSize: '11px', border: '1px solid #bfdbfe' }}>
                                                <span>🛠️</span>
                                                <span>{booking.jobCompletedBy?.name || booking.claimedBy?.name || (booking.assignedHelpers && booking.assignedHelpers[0]?.name)}</span>
                                            </div>
                                            <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '2px' }}>
                                                In Progress {(booking.jobCompletedBy?.phone || booking.claimedBy?.phone) ? `(${booking.jobCompletedBy?.phone || booking.claimedBy?.phone})` : ''}
                                            </div>
                                        </div>
                                    ) : booking.useOwn ? (
                                        <span style={{ display: 'inline-block', padding: '4px 8px', borderRadius: '6px', background: '#f1f5f9', color: '#475569', fontSize: '11px', fontWeight: 600, border: '1px solid #e2e8f0' }}>
                                            👤 Admin (Own Staff)
                                        </span>
                                    ) : (booking.assignedHelpers && booking.assignedHelpers.length > 0) ? (
                                        <div>
                                            <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: '6px', background: '#fef3c7', color: '#b45309', fontSize: '11px', fontWeight: 600, border: '1px solid #fde68a' }}>
                                                ⏳ Waiting ({booking.assignedHelpers.length} helpers)
                                            </span>
                                            <div style={{ fontSize: '10px', color: '#64748b', marginTop: '3px', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={booking.assignedHelpers.map(h => h.name).join(', ')}>
                                                {booking.assignedHelpers.map(h => h.name).join(', ')}
                                            </div>
                                        </div>
                                    ) : (
                                        <span style={{ display: 'inline-block', padding: '4px 8px', borderRadius: '6px', background: '#fef2f2', color: '#dc2626', fontSize: '11px', fontWeight: 600, border: '1px solid #fecaca' }}>
                                            ⚠️ Not assigned
                                        </span>
                                    )}
                                </td>
                                {(filterTab === 'Manual Booking' || filterTab === 'Inquari Booking') && (
                                    <ActionButtons booking={booking} onStatusUpdate={handleStatusUpdate} onJobAssign={handleJobAssign} />
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Bill Modal */}
            {showBillModal && selectedBooking && (
                <BookingBillModal 
                    booking={selectedBooking} 
                    onClose={() => {
                        setShowBillModal(false);
                        setSelectedBooking(null);
                    }}
                />
            )}

            {/* Location Modal */}
            {selectedLocation && (
                <div className="modal-backdrop">
                    <div className="location-modal">
                        <div className="modal-header">
                            <h3 className="modal-title">Location Information</h3>
                            <button className="close-btn" onClick={() => setSelectedLocation(null)}>
                                &times;
                            </button>
                        </div>

                        <div className="modal-body">
                            <table className="info-table">
                                <tbody>
                                    {selectedLocation.name && (
                                        <tr>
                                            <td className="label-cell">Customer</td>
                                            <td className="value-cell">
                                                <span style={{ fontWeight: 600, color: '#0f172a' }}>
                                                    {selectedLocation.name}
                                                </span>
                                                {selectedLocation.phone && (
                                                    <span style={{ color: '#64748b', marginLeft: '8px', fontSize: '0.85em' }}>
                                                        ({selectedLocation.phone})
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    )}
                                    <tr>
                                        <td className="label-cell">Service Booked</td>
                                        <td className="value-cell">
                                            <span style={{ fontWeight: 600, color: '#0f172a' }}>
                                                {selectedLocation.service || 'N/A'}
                                            </span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="label-cell">Location Type</td>
                                        <td className="value-cell">
                                            <span className={`badge ${selectedLocation.locationType === 'Rental' ? 'badge-rental' : 'badge-simple'}`}>
                                                {selectedLocation.locationType}
                                            </span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="label-cell">From</td>
                                        <td className="value-cell">
                                            <div className="address-cell">
                                                <span className="address-icon">📍</span>
                                                {selectedLocation.locationType === 'Simple' 
                                                    ? (selectedLocation.address || 'N/A')
                                                    : (selectedLocation.pickupAddress || 'N/A')}
                                            </div>
                                        </td>
                                    </tr>
                                    {selectedLocation.locationType === 'Rental' && (
                                        <tr>
                                            <td className="label-cell">To</td>
                                            <td className="value-cell">
                                                <div className="address-cell">
                                                    <span className="address-icon">🎯</span>
                                                    {selectedLocation.dropAddress || 'N/A'}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                    <tr>
                                        <td className="label-cell">Date & Time</td>
                                        <td className="value-cell">
                                            <div className="datetime-cell">
                                                <span className="datetime-icon">📅</span>
                                                {formatLocationDateTime(selectedLocation)}
                                            </div>
                                        </td>
                                    </tr>
                                    {selectedLocation.locationType === 'Rental' && (
                                        <tr>
                                            <td className="label-cell">Return Trip</td>
                                            <td className="value-cell">
                                                <span className={`status-badge ${selectedLocation.returnTrip ? 'status-yes' : 'status-no'}`}>
                                                    {selectedLocation.returnTrip ? '✓ Yes' : '✗ No'}
                                                </span>
                                            </td>
                                        </tr>
                                    )}
                                    {selectedLocation.optionalInputs && selectedLocation.optionalInputs.length > 0 && (
                                        <tr>
                                            <td className="label-cell">Optional Services</td>
                                            <td className="value-cell">
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                    {selectedLocation.optionalInputs.map((opt, idx) => (
                                                        <span key={idx} style={{
                                                            background: '#eff6ff',
                                                            color: '#1d4ed8',
                                                            padding: '2px 8px',
                                                            borderRadius: '4px',
                                                            fontSize: '0.85em',
                                                            border: '1px solid #bfdbfe'
                                                        }}>
                                                            {opt.name} {opt.count > 1 ? `× ${opt.count}` : ''}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                    {selectedLocation.extraInputs && selectedLocation.extraInputs.length > 0 && (
                                        <tr>
                                            <td className="label-cell">Extra Services</td>
                                            <td className="value-cell">
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                    {selectedLocation.extraInputs.map((ext, idx) => (
                                                        <span key={idx} style={{
                                                            background: '#fff7ed',
                                                            color: '#c2410c',
                                                            padding: '2px 8px',
                                                            borderRadius: '4px',
                                                            fontSize: '0.85em',
                                                            border: '1px solid #fed7aa'
                                                        }}>
                                                            {ext.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                    <tr>
                                        <td className="label-cell">Customer Description</td>
                                        <td className="value-cell">
                                            <div style={{
                                                background: '#f8fafc',
                                                border: '1px solid #e2e8f0',
                                                borderRadius: '8px',
                                                padding: '10px 12px',
                                                color: selectedLocation.description ? '#0f172a' : '#64748b',
                                                fontSize: '0.88rem',
                                                lineHeight: 1.5,
                                                whiteSpace: 'pre-wrap',
                                                wordBreak: 'break-word',
                                                fontStyle: selectedLocation.description ? 'normal' : 'italic'
                                            }}>
                                                {selectedLocation.description ? (
                                                    <span>📝 {selectedLocation.description}</span>
                                                ) : (
                                                    'No description provided by customer'
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div className="modal-footer">
                            <button className="btn-close" onClick={() => setSelectedLocation(null)}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
const BookingBillModal = ({ booking, onClose }) => {
    if (!booking) return null;

    // Helper functions for unit detection
    const isHourUnit = (unit) => {
        if (!unit || typeof unit !== 'string') return false;
        const val = unit.toLowerCase().trim();
        return val.includes('hour') || val.includes('hr') || val.includes('hor') || val === 'h' || val.includes('slot') || val.includes('time');
    };

    const isDayOrLongerUnit = (unit) => {
        if (!unit || typeof unit !== 'string') return false;
        const val = unit.toLowerCase().trim();
        return val.includes('day') || val.includes('week') || val.includes('month') || val.includes('year');
    };

    // Calculate effective days count
    const getDaysCount = () => {
        if (booking.daysCount && Number(booking.daysCount) > 0) return Number(booking.daysCount);
        if (booking.selectedDates && Array.isArray(booking.selectedDates) && booking.selectedDates.length > 0) {
            return booking.selectedDates.length;
        }
        if (booking.fromDate && booking.toDate && booking.fromDate !== booking.toDate) {
            const start = new Date(booking.fromDate);
            const end = new Date(booking.toDate);
            const diffTime = Math.abs(end - start);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            if (!isNaN(diffDays) && diffDays > 0) return diffDays;
        }
        return 1;
    };

    // Calculate effective slot/hour count
    const getSlotCount = () => {
        if (booking.slots && Array.isArray(booking.slots) && booking.slots.length > 0) {
            return booking.slots.length;
        }
        return 1;
    };

    // Helper function to format date with time
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Format date without time
    const formatDateOnly = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    // Normalize selected dates
    const normalizedSelectedDates = (() => {
        if (booking.selectedDates && Array.isArray(booking.selectedDates)) 
            return booking.selectedDates.filter(Boolean);
        if (booking.fromDate && booking.toDate && booking.fromDate !== booking.toDate) 
            return [booking.fromDate, booking.toDate];
        if (booking.fromDate) return [booking.fromDate];
        if (booking.toDate) return [booking.toDate];
        return [];
    })();

    const daysCount = getDaysCount();
    const slotCount = getSlotCount();
    const quantity = (booking.isCountable !== false && Number(booking.quantity) > 0) ? Number(booking.quantity) : 1;
    const isMerged = !!booking.isMerged;
    const mergedUnit = (booking.mergedUnit || '').toLowerCase();
    const rawUnit = (booking.customUnit || booking.unit || 'per day').toLowerCase();
    const basePrice = Number(booking.rentperday) || 0;

    // Calculate base service pricing
    let baseTotal = basePrice;
    let baseDurationQtyText = '1 unit';
    let baseFormulaText = `₹${basePrice}`;

    if (isMerged) {
        const isHour = isHourUnit(mergedUnit) || (booking.slots && booking.slots.length > 0);
        if (isHour) {
            baseTotal = basePrice * (booking.isCountable ? quantity : 1) * slotCount;
            baseDurationQtyText = `${booking.isCountable && quantity > 1 ? `${quantity} qty × ` : ''}${slotCount} hr${slotCount > 1 ? 's' : ''}`;
            baseFormulaText = `₹${basePrice}${booking.isCountable && quantity > 1 ? ` × ${quantity}` : ''} × ${slotCount} hr${slotCount > 1 ? 's' : ''}`;
        } else {
            baseTotal = basePrice * (booking.isCountable ? quantity : 1) * daysCount;
            baseDurationQtyText = `${booking.isCountable && quantity > 1 ? `${quantity} qty × ` : ''}${daysCount} day${daysCount > 1 ? 's' : ''}`;
            baseFormulaText = `₹${basePrice}${booking.isCountable && quantity > 1 ? ` × ${quantity}` : ''} × ${daysCount} day${daysCount > 1 ? 's' : ''}`;
        }
    } else if (isHourUnit(rawUnit) || (booking.slots && booking.slots.length > 0 && !isDayOrLongerUnit(rawUnit))) {
        baseTotal = basePrice * (booking.isCountable ? quantity : 1) * slotCount;
        baseDurationQtyText = `${booking.isCountable && quantity > 1 ? `${quantity} qty × ` : ''}${slotCount} hr${slotCount > 1 ? 's' : ''}`;
        baseFormulaText = `₹${basePrice}${booking.isCountable && quantity > 1 ? ` × ${quantity}` : ''} × ${slotCount} hr${slotCount > 1 ? 's' : ''}`;
    } else if (isDayOrLongerUnit(rawUnit)) {
        baseTotal = basePrice * (booking.isCountable ? quantity : 1) * daysCount;
        baseDurationQtyText = `${booking.isCountable && quantity > 1 ? `${quantity} qty × ` : ''}${daysCount} day${daysCount > 1 ? 's' : ''}`;
        baseFormulaText = `₹${basePrice}${booking.isCountable && quantity > 1 ? ` × ${quantity}` : ''} × ${daysCount} day${daysCount > 1 ? 's' : ''}`;
    } else if (booking.isCountable && quantity > 1) {
        baseTotal = basePrice * quantity;
        baseDurationQtyText = `${quantity} qty`;
        baseFormulaText = `₹${basePrice} × ${quantity}`;
    } else {
        baseDurationQtyText = '1 unit';
        baseFormulaText = `₹${basePrice}`;
    }

    // Calculate optional services with proper day and hour multipliers
    const optionalItems = (booking.optionalInputs || []).map((input) => {
        const count = Number(input.count) || 1;
        const price = Number(input.price) || 0;
        const isOptMerged = !!input.isMerged;
        const optMergedUnit = (input.mergedUnit || '').toLowerCase();
        const inputUnit = (input.customUnit || input.unit || '').toLowerCase();

        let multiplier = 1;
        let timeLabel = '';
        let isTimeBased = false;

        if (isOptMerged) {
            if (isHourUnit(optMergedUnit)) {
                multiplier = slotCount;
                timeLabel = `${slotCount} hr${slotCount > 1 ? 's' : ''}`;
                isTimeBased = true;
            } else {
                multiplier = daysCount;
                timeLabel = `${daysCount} day${daysCount > 1 ? 's' : ''}`;
                isTimeBased = true;
            }
        } else if (isDayOrLongerUnit(inputUnit)) {
            multiplier = daysCount;
            timeLabel = `${daysCount} day${daysCount > 1 ? 's' : ''}`;
            isTimeBased = true;
        } else if (isHourUnit(inputUnit)) {
            multiplier = slotCount;
            timeLabel = `${slotCount} hr${slotCount > 1 ? 's' : ''}`;
            isTimeBased = true;
        }

        const itemTotal = count * price * multiplier;

        let durationQtyText = '';
        let formulaText = '';

        if (isTimeBased) {
            if (count > 1) {
                durationQtyText = `${count} qty × ${timeLabel}`;
                formulaText = `₹${price} × ${count} × ${timeLabel}`;
            } else {
                durationQtyText = timeLabel;
                formulaText = `₹${price} × ${timeLabel}`;
            }
        } else {
            if (count > 1) {
                durationQtyText = `${count} qty`;
                formulaText = `₹${price} × ${count}`;
            } else {
                durationQtyText = '1 unit';
                formulaText = `₹${price}`;
            }
        }

        let displayUnit = input.customUnit || input.unit || '';
        if (displayUnit.startsWith('per-')) {
            displayUnit = displayUnit.replace('per-', 'per ');
        }

        return {
            name: input.name || 'Optional Add-on',
            price,
            count,
            multiplier,
            timeLabel,
            isTimeBased,
            displayUnit,
            durationQtyText,
            formulaText,
            itemTotal
        };
    });

    // Calculate extra services with day/hour multipliers
    const extraItems = (booking.extraInputs || []).map((input) => {
        const price = Number(input.price) || 0;
        const extraUnit = (input.customUnit || input.unit || '').toLowerCase();

        let multiplier = 1;
        let timeLabel = '';
        let isTimeBased = false;

        if (isDayOrLongerUnit(extraUnit)) {
            multiplier = daysCount;
            timeLabel = `${daysCount} day${daysCount > 1 ? 's' : ''}`;
            isTimeBased = true;
        } else if (isHourUnit(extraUnit)) {
            multiplier = slotCount;
            timeLabel = `${slotCount} hr${slotCount > 1 ? 's' : ''}`;
            isTimeBased = true;
        }

        const itemTotal = price * multiplier;
        const durationQtyText = isTimeBased ? timeLabel : '1 unit';
        const formulaText = isTimeBased ? `₹${price} × ${timeLabel}` : `₹${price}`;

        let displayUnit = input.customUnit || input.unit || '';
        if (displayUnit.startsWith('per-')) {
            displayUnit = displayUnit.replace('per-', 'per ');
        }

        return {
            name: input.name || 'Extra Option',
            price,
            multiplier,
            timeLabel,
            isTimeBased,
            displayUnit,
            durationQtyText,
            formulaText,
            itemTotal
        };
    });

    const areaExtra = Number(booking.selectedServiceArea?.extraPrice) || 0;
    const optionalSubtotal = optionalItems.reduce((acc, item) => acc + item.itemTotal, 0);
    const extraSubtotal = extraItems.reduce((acc, item) => acc + item.itemTotal, 0);
    const calculatedGrandTotal = baseTotal + optionalSubtotal + extraSubtotal + areaExtra;

    const isInquiry = 
        booking.status === 'inquiry' || 
        booking.bookingType === 'inquiry' || 
        booking.bookingType === 'Inquari Booking' || 
        (typeof booking.bookingType === 'string' && booking.bookingType.toLowerCase().includes('inqu'));

    const displayTotal = !isInquiry 
        ? (booking.totalAmount != null ? Number(booking.totalAmount) : calculatedGrandTotal)
        : 0;

    return (
        <div className="modal-backdrop" onClick={onClose} style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1050,
            padding: '16px',
            backdropFilter: 'blur(3px)'
        }}>
            <div className="bill-modal" onClick={e => e.stopPropagation()} style={{
                background: '#ffffff',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '920px',
                maxHeight: '92vh',
                overflowY: 'auto',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
            }}>
                {/* Invoice Header */}
                <div className="bill-modal-header" style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: '#ffffff',
                    position: 'sticky',
                    top: 0,
                    zIndex: 20
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            background: isInquiry ? '#fef3c7' : '#eff6ff',
                            color: isInquiry ? '#d97706' : '#2563eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '20px',
                            fontWeight: 'bold',
                            flexShrink: 0
                        }}>
                            {isInquiry ? '📋' : '📄'}
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <h2 style={{ margin: 0, fontSize: 'clamp(1.1rem, 2.5vw, 1.35rem)', fontWeight: 700, color: '#0f172a' }}>
                                    {isInquiry ? 'Inquiry Booking Details' : 'Booking Invoice'}
                                </h2>
                                <span className={`status-badge status-${booking.status}`} style={{
                                    textTransform: 'capitalize',
                                    fontSize: '0.78rem',
                                    padding: '3px 9px',
                                    borderRadius: '12px'
                                }}>
                                    {booking.status}
                                </span>
                            </div>
                            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                ID: #{booking._id ? booking._id.slice(-8).toUpperCase() : 'N/A'} • Booked on {formatDate(booking.createdAt)}
                            </span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button
                            onClick={() => window.print()}
                            className="no-print"
                            style={{
                                padding: '8px 16px',
                                background: '#f1f5f9',
                                color: '#334155',
                                border: '1px solid #cbd5e1',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                transition: 'all 0.2s',
                                whiteSpace: 'nowrap'
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.background = '#e2e8f0'; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
                        >
                            🖨️ Print
                        </button>
                        <button 
                            onClick={onClose} 
                            className="no-print"
                            style={{
                                background: 'transparent',
                                border: 'none',
                                fontSize: '24px',
                                cursor: 'pointer',
                                color: '#94a3b8',
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s',
                                flexShrink: 0
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.color = '#0f172a'; e.currentTarget.style.background = '#f1f5f9'; }}
                            onMouseOut={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'transparent'; }}
                        >
                            &times;
                        </button>
                    </div>
                </div>

                <div className="bill-modal-body" style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Information Grid */}
                    <div className="bill-info-grid" style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                        gap: '16px'
                    }}>
                        {/* Customer & Location Card */}
                        <div className="bill-card" style={{
                            background: '#f8fafc',
                            borderRadius: '12px',
                            padding: '16px 18px',
                            border: '1px solid #e2e8f0'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                <span style={{ fontSize: '1.1rem' }}>👤</span>
                                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#334155' }}>
                                    Customer & Location
                                </h4>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', fontSize: '0.88rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                                    <span style={{ color: '#64748b' }}>Name:</span>
                                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{booking.name}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                                    <span style={{ color: '#64748b' }}>Phone:</span>
                                    <span style={{ fontWeight: 500, color: '#0f172a' }}>{booking.phone}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', flexWrap: 'wrap' }}>
                                    <span style={{ color: '#64748b', whiteSpace: 'nowrap' }}>Location Type:</span>
                                    <span style={{
                                        background: '#e0f2fe',
                                        color: '#0369a1',
                                        padding: '2px 8px',
                                        borderRadius: '6px',
                                        fontSize: '0.78rem',
                                        fontWeight: 600
                                    }}>
                                        {booking.locationType || 'Simple'}
                                    </span>
                                </div>
                                {booking.locationType === 'Rental' ? (
                                    <>
                                        <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: '6px', marginTop: '2px' }}>
                                            <div style={{ color: '#64748b', fontSize: '0.8rem' }}>Pickup:</div>
                                            <div style={{ fontWeight: 500, color: '#1e293b', wordBreak: 'break-word' }}>{booking.pickupAddress || 'N/A'}</div>
                                        </div>
                                        <div>
                                            <div style={{ color: '#64748b', fontSize: '0.8rem' }}>Drop-off:</div>
                                            <div style={{ fontWeight: 500, color: '#1e293b', wordBreak: 'break-word' }}>{booking.dropAddress || 'N/A'}</div>
                                        </div>
                                        {booking.returnTrip && (
                                            <div style={{ color: '#059669', fontWeight: 600, fontSize: '0.82rem' }}>
                                                ✓ Round Trip Included
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: '6px', marginTop: '2px' }}>
                                        <div style={{ color: '#64748b', fontSize: '0.8rem' }}>Address:</div>
                                        <div style={{ fontWeight: 500, color: '#1e293b', wordBreak: 'break-word' }}>
                                            {booking.address || 'N/A'}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Booking & Schedule Card */}
                        <div className="bill-card" style={{
                            background: '#f8fafc',
                            borderRadius: '12px',
                            padding: '16px 18px',
                            border: '1px solid #e2e8f0'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                <span style={{ fontSize: '1.1rem' }}>📅</span>
                                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#334155' }}>
                                    Service & Schedule
                                </h4>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', fontSize: '0.88rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                                    <span style={{ color: '#64748b' }}>Service:</span>
                                    <span style={{ fontWeight: 600, color: '#0f172a', textAlign: 'right' }}>{booking.service}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                                    <span style={{ color: '#64748b' }}>Booking Type:</span>
                                    <span style={{
                                        background: isInquiry ? '#fef3c7' : '#eff6ff',
                                        color: isInquiry ? '#92400e' : '#1d4ed8',
                                        padding: '2px 8px',
                                        borderRadius: '6px',
                                        fontSize: '0.78rem',
                                        fontWeight: 600
                                    }}>
                                        {booking.bookingType}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                                    <span style={{ color: '#64748b' }}>Base Rate:</span>
                                    <span style={{ fontWeight: 600, color: '#059669' }}>
                                        ₹{basePrice.toLocaleString('en-IN')} {booking.customUnit || booking.unit ? `/ ${booking.customUnit || booking.unit}` : ''}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #e2e8f0', paddingTop: '6px', gap: '8px', flexWrap: 'wrap' }}>
                                    <span style={{ color: '#64748b' }}>Scheduled Date:</span>
                                    <span style={{ fontWeight: 600, color: '#0f172a', textAlign: 'right' }}>
                                        {normalizedSelectedDates.length > 0 ? (
                                            normalizedSelectedDates.length > 1 ? (
                                                `${formatDateOnly(normalizedSelectedDates[0])} - ${formatDateOnly(normalizedSelectedDates[normalizedSelectedDates.length - 1])} (${daysCount} days)`
                                            ) : (
                                                formatDateOnly(normalizedSelectedDates[0])
                                            )
                                        ) : 'N/A'}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #e2e8f0', paddingTop: '6px', gap: '8px', flexWrap: 'wrap' }}>
                                    <span style={{ color: '#64748b' }}>Payment Method:</span>
                                    <span style={{ fontWeight: 600, color: '#0f172a' }}>
                                        {isInquiry ? 'N/A (Inquiry Service)' : (
                                            booking.paymentMethod === 'FULL_ONLINE' ? '💳 100% Online Payment' :
                                            booking.paymentMethod === 'PARTIAL_30_70' ? '⚡ 30% Advance + 70% Cash' :
                                            '💵 Cash on Service'
                                        )}
                                    </span>
                                </div>
                                {!isInquiry && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                                        <span style={{ color: '#64748b' }}>Payment Status:</span>
                                        <span style={{
                                            padding: '2px 8px',
                                            borderRadius: '6px',
                                            fontSize: '0.78rem',
                                            fontWeight: 700,
                                            textTransform: 'uppercase',
                                            background: (booking.paymentStatus === 'paid' || booking.paymentMethod === 'FULL_ONLINE') ? '#ecfdf5' : (booking.paymentStatus === 'partial_paid' || booking.paymentMethod === 'PARTIAL_30_70') ? '#fffbeb' : '#f1f5f9',
                                            color: (booking.paymentStatus === 'paid' || booking.paymentMethod === 'FULL_ONLINE') ? '#059669' : (booking.paymentStatus === 'partial_paid' || booking.paymentMethod === 'PARTIAL_30_70') ? '#b45309' : '#475569',
                                            border: (booking.paymentStatus === 'paid' || booking.paymentMethod === 'FULL_ONLINE') ? '1px solid #a7f3d0' : (booking.paymentStatus === 'partial_paid' || booking.paymentMethod === 'PARTIAL_30_70') ? '1px solid #fde68a' : '1px solid #cbd5e1'
                                        }}>
                                            {booking.paymentStatus === 'paid' ? 'Paid' : booking.paymentStatus === 'partial_paid' ? 'Partial Paid (30%)' : (booking.paymentStatus || 'Unpaid / Cash Due')}
                                        </span>
                                    </div>
                                )}
                                {booking.slots && Array.isArray(booking.slots) && booking.slots.length > 0 && (
                                    <div style={{ marginTop: '2px' }}>
                                        <div style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: '4px' }}>
                                            Time Slots ({booking.slots.length}):
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                            {booking.slots.map((slot, idx) => {
                                                const slotLabel = typeof slot === 'string' 
                                                    ? slot 
                                                    : (slot.slot || slot.date || `Slot ${idx + 1}`);
                                                return (
                                                    <span key={idx} style={{
                                                        background: '#fff7ed',
                                                        color: '#c2410c',
                                                        border: '1px solid #ffedd5',
                                                        padding: '2px 8px',
                                                        borderRadius: '6px',
                                                        fontSize: '0.78rem',
                                                        fontWeight: 500
                                                    }}>
                                                        {slotLabel}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Customer Description / Special Instructions */}
                    <div className="bill-card" style={{
                        background: '#f8fafc',
                        borderRadius: '12px',
                        padding: '16px 18px',
                        border: '1px solid #e2e8f0'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <span style={{ fontSize: '1.1rem' }}>📝</span>
                            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#334155' }}>
                                Customer Description / Special Requests
                            </h4>
                        </div>
                        <div style={{
                            background: '#ffffff',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            padding: '12px 14px',
                            color: booking.description ? '#0f172a' : '#64748b',
                            fontSize: '0.88rem',
                            lineHeight: '1.6',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            fontStyle: booking.description ? 'normal' : 'italic'
                        }}>
                            {booking.description ? (
                                booking.description
                            ) : (
                                'No special requests or description provided by customer.'
                            )}
                        </div>
                    </div>

                    {/* Inquiry Notice Banner (Only for Inquiry Booking) */}
                    {isInquiry && (
                        <div style={{
                            background: '#fffbeb',
                            border: '1px solid #fde68a',
                            borderRadius: '10px',
                            padding: '14px 18px',
                            display: 'flex',
                            gap: '12px',
                            alignItems: 'center'
                        }}>
                            <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>📋</span>
                            <div>
                                <div style={{ fontWeight: 600, color: '#92400e', fontSize: '0.92rem' }}>
                                    Inquiry-Based Booking (No Fixed Total)
                                </div>
                                <div style={{ color: '#b45309', fontSize: '0.84rem', marginTop: '2px' }}>
                                    This is an inquiry-based request. Base rates and requested quantities are shown below. Final quotation will be agreed upon discussion with the client.
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Itemized Service & Price Breakdown Table */}
                    <div className="bill-table-wrap" style={{
                        background: '#ffffff',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            padding: '14px 18px',
                            background: '#f8fafc',
                            borderBottom: '1px solid #e2e8f0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '8px'
                        }}>
                            <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>🧾</span> {isInquiry ? 'Requested Services & Options' : 'Itemized Price Breakdown'}
                            </h4>
                            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                Currency: INR (₹)
                            </span>
                        </div>

                        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                            <table className="bill-table" style={{
                                width: '100%',
                                minWidth: isInquiry ? '500px' : '560px',
                                borderCollapse: 'collapse',
                                textAlign: 'left',
                                fontSize: '0.88rem'
                            }}>
                                <thead>
                                    <tr style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        <th style={{ padding: '12px 14px', fontWeight: 600, width: '40px' }}>#</th>
                                        <th style={{ padding: '12px 14px', fontWeight: 600 }}>{isInquiry ? 'Requested Item' : 'Item & Description'}</th>
                                        <th style={{ padding: '12px 14px', fontWeight: 600, width: '130px' }}>{isInquiry ? 'Base Rate' : 'Unit Rate'}</th>
                                        <th style={{ padding: '12px 14px', fontWeight: 600, width: '160px' }}>{isInquiry ? 'Requested Qty' : 'Duration / Qty'}</th>
                                        <th style={{ padding: '12px 14px', fontWeight: 600, textAlign: 'right', width: '130px' }}>
                                            {isInquiry ? 'Status' : 'Total Amount'}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* Main Service Row */}
                                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '14px', color: '#64748b', fontWeight: 500 }}>1</td>
                                        <td style={{ padding: '14px' }}>
                                            <div style={{ fontWeight: 600, color: '#0f172a' }}>{booking.service}</div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                                                <span style={{
                                                    background: '#eff6ff',
                                                    color: '#2563eb',
                                                    fontSize: '0.74rem',
                                                    padding: '2px 7px',
                                                    borderRadius: '4px',
                                                    fontWeight: 600
                                                }}>
                                                    Main Service
                                                </span>
                                                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                                                    {booking.customUnit || booking.unit || 'per day'}
                                                </span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '14px', color: '#334155', fontWeight: 500 }}>
                                            ₹{basePrice.toLocaleString('en-IN')}
                                        </td>
                                        <td style={{ padding: '14px' }}>
                                            <div style={{ fontWeight: 600, color: '#0f172a' }}>{baseDurationQtyText}</div>
                                            {!isInquiry && (
                                                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                                                    {baseFormulaText}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ padding: '14px', textAlign: 'right' }}>
                                            {isInquiry ? (
                                                <span style={{
                                                    background: '#fef3c7',
                                                    color: '#92400e',
                                                    fontSize: '0.76rem',
                                                    padding: '3px 8px',
                                                    borderRadius: '4px',
                                                    fontWeight: 600,
                                                    display: 'inline-block'
                                                }}>
                                                    Pending Inquiry
                                                </span>
                                            ) : (
                                                <span style={{ fontWeight: 700, color: '#0f172a' }}>
                                                    ₹{baseTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            )}
                                        </td>
                                    </tr>

                                    {/* Optional Services Rows */}
                                    {optionalItems.map((item, idx) => (
                                        <tr key={`opt-${idx}`} style={{ borderBottom: '1px solid #f1f5f9', background: '#fafbfc' }}>
                                            <td style={{ padding: '14px', color: '#64748b', fontWeight: 500 }}>
                                                {idx + 2}
                                            </td>
                                            <td style={{ padding: '14px' }}>
                                                <div style={{ fontWeight: 600, color: '#0f172a' }}>{item.name}</div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                                                    <span style={{
                                                        background: '#f0fdf4',
                                                        color: '#15803d',
                                                        fontSize: '0.74rem',
                                                        padding: '2px 7px',
                                                        borderRadius: '4px',
                                                        fontWeight: 600
                                                    }}>
                                                        Optional Add-on
                                                    </span>
                                                    {item.displayUnit && (
                                                        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                                                            {item.displayUnit}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td style={{ padding: '14px', color: '#334155', fontWeight: 500 }}>
                                                ₹{item.price.toLocaleString('en-IN')}
                                                {item.displayUnit ? <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>/{item.displayUnit}</span> : ''}
                                            </td>
                                            <td style={{ padding: '14px' }}>
                                                <div style={{ fontWeight: 600, color: '#0f172a' }}>{item.durationQtyText}</div>
                                                {!isInquiry && (
                                                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                                                        {item.formulaText}
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ padding: '14px', textAlign: 'right' }}>
                                                {isInquiry ? (
                                                    <span style={{
                                                        background: '#fef3c7',
                                                        color: '#92400e',
                                                        fontSize: '0.76rem',
                                                        padding: '3px 8px',
                                                        borderRadius: '4px',
                                                        fontWeight: 600,
                                                        display: 'inline-block'
                                                    }}>
                                                        Quote on Inquiry
                                                    </span>
                                                ) : (
                                                    <span style={{ fontWeight: 700, color: '#15803d' }}>
                                                        ₹{item.itemTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}

                                    {/* Extra Services Rows */}
                                    {extraItems.map((item, idx) => (
                                        <tr key={`ext-${idx}`} style={{ borderBottom: '1px solid #f1f5f9', background: '#fafbfc' }}>
                                            <td style={{ padding: '14px', color: '#64748b', fontWeight: 500 }}>
                                                {optionalItems.length + idx + 2}
                                            </td>
                                            <td style={{ padding: '14px' }}>
                                                <div style={{ fontWeight: 600, color: '#0f172a' }}>{item.name}</div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                                                    <span style={{
                                                        background: '#fff7ed',
                                                        color: '#c2410c',
                                                        fontSize: '0.74rem',
                                                        padding: '2px 7px',
                                                        borderRadius: '4px',
                                                        fontWeight: 600
                                                    }}>
                                                        Extra Option
                                                    </span>
                                                    {item.displayUnit && (
                                                        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                                                            {item.displayUnit}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td style={{ padding: '14px', color: '#334155', fontWeight: 500 }}>
                                                ₹{item.price.toLocaleString('en-IN')}
                                            </td>
                                            <td style={{ padding: '14px' }}>
                                                <div style={{ fontWeight: 600, color: '#0f172a' }}>{item.durationQtyText}</div>
                                                {!isInquiry && (
                                                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                                                        {item.formulaText}
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ padding: '14px', textAlign: 'right' }}>
                                                {isInquiry ? (
                                                    <span style={{
                                                        background: '#fef3c7',
                                                        color: '#92400e',
                                                        fontSize: '0.76rem',
                                                        padding: '3px 8px',
                                                        borderRadius: '4px',
                                                        fontWeight: 600,
                                                        display: 'inline-block'
                                                    }}>
                                                        Quote on Inquiry
                                                    </span>
                                                ) : (
                                                    <span style={{ fontWeight: 700, color: '#c2410c' }}>
                                                        ₹{item.itemTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}

                                  
                                </tbody>
                            </table>
                        </div>

                        {/* Financial Summary Footer: SHOWN ONLY FOR AUTOMATIC & MANUAL BOOKINGS, NOT FOR INQUIRY */}
                        {!isInquiry ? (
                            <div className="bill-summary-container" style={{
                                padding: '18px 22px',
                                background: '#f8fafc',
                                borderTop: '1px solid #e2e8f0',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'flex-end',
                                gap: '8px'
                            }}>
                                <div className="bill-summary-box" style={{ width: '100%', maxWidth: '380px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: '#475569' }}>
                                        <span>Main Service Subtotal:</span>
                                        <span style={{ fontWeight: 600, color: '#0f172a' }}>
                                            ₹{baseTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>

                                    {optionalSubtotal > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: '#475569' }}>
                                            <span>Optional Add-ons Subtotal:</span>
                                            <span style={{ fontWeight: 600, color: '#15803d' }}>
                                                +₹{optionalSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    )}

                                    {extraSubtotal > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: '#475569' }}>
                                            <span>Extra Options Subtotal:</span>
                                            <span style={{ fontWeight: 600, color: '#c2410c' }}>
                                                +₹{extraSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    )}

                                 

                                    <div style={{ borderTop: '2px solid #cbd5e1', paddingTop: '10px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                                            Total Amount:
                                        </span>
                                        <span style={{
                                            fontSize: '1.45rem',
                                            fontWeight: 800,
                                            color: '#2563eb'
                                        }}>
                                            ₹{displayTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>

                                    {booking.paymentMethod === 'PARTIAL_30_70' && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', width: '100%', marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #cbd5e1' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem', color: '#15803d' }}>
                                                <span>⚡ 30% Online Advance Paid:</span>
                                                <span style={{ fontWeight: 700 }}>₹{Number(booking.advancePaidAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem', color: '#b45309' }}>
                                                <span>💵 70% Cash Due on Service:</span>
                                                <span style={{ fontWeight: 700 }}>₹{Number(booking.remainingCashAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            </div>
                                        </div>
                                    )}

                                    {booking.paymentMethod === 'FULL_ONLINE' && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem', color: '#15803d', width: '100%', marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #cbd5e1' }}>
                                            <span>💳 Fully Paid Online:</span>
                                            <span style={{ fontWeight: 700 }}>₹{Number(booking.advancePaidAmount || displayTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                    )}

                                    {(!booking.paymentMethod || booking.paymentMethod === 'CASH_AFTER_SERVICE') && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem', color: '#475569', width: '100%', marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #cbd5e1' }}>
                                            <span>💵 Cash Due on Service:</span>
                                            <span style={{ fontWeight: 700 }}>₹{Number(booking.remainingCashAmount || displayTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            /* Inquiry Footer: Explicitly Explains No Total Amount */
                            <div style={{
                                padding: '16px 20px',
                                background: '#fffbeb',
                                borderTop: '1px solid #fde68a',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap',
                                gap: '12px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '1.25rem' }}>📋</span>
                                    <div>
                                        <div style={{ fontWeight: 700, color: '#92400e', fontSize: '0.92rem' }}>
                                            Inquiry Service — No Total Amount
                                        </div>
                                        <div style={{ fontSize: '0.82rem', color: '#b45309', marginTop: '2px' }}>
                                            This booking is inquiry-based and does not have a fixed total amount. Final pricing and schedule will be confirmed directly after client consultation.
                                        </div>
                                    </div>
                                </div>
                                <span style={{
                                    background: '#fef3c7',
                                    color: '#b45309',
                                    border: '1px solid #fde68a',
                                    padding: '4px 12px',
                                    borderRadius: '20px',
                                    fontSize: '0.78rem',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.4px'
                                }}>
                                    No Total Amount
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Footer Note */}
                    <div style={{
                        textAlign: 'center',
                        color: '#94a3b8',
                        fontSize: '0.82rem',
                        padding: '6px 0',
                        borderTop: '1px solid #f1f5f9'
                    }}>
                        Thank you for using our service platform. For inquiries or support, please contact our help desk.
                    </div>
                </div>

                {/* Modal Actions Footer */}
                <div className="bill-modal-footer no-print" style={{
                    padding: '14px 24px',
                    background: '#f8fafc',
                    borderTop: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '12px',
                    position: 'sticky',
                    bottom: 0,
                    zIndex: 20
                }}>
                    <button
                        onClick={() => window.print()}
                        style={{
                            padding: '10px 22px',
                            background: '#2563eb',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                            transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.background = '#1d4ed8'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = '#2563eb'; }}
                    >
                        🖨️ Print Bill
                    </button>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '10px 22px',
                            background: '#ffffff',
                            color: '#334155',
                            border: '1px solid #cbd5e1',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = '#ffffff'; }}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};
// Add CSS for the bill modal
const billModalStyles = `
    @media print {
        body * {
            visibility: hidden;
        }
        .bill-modal, .bill-modal * {
            visibility: visible;
        }
        .bill-modal {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            max-width: 100% !important;
            max-height: none !important;
            background: white !important;
            padding: 20px !important;
            box-shadow: none !important;
            border-radius: 0 !important;
        }
        .bill-modal button, .no-print {
            display: none !important;
        }
        .modal-backdrop {
            background: white !important;
            padding: 0 !important;
            position: static !important;
        }
    }

    .bill-modal {
        animation: slideIn 0.3s ease-out;
    }

    @keyframes slideIn {
        from {
            transform: translateY(-30px);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }

    .status-badge {
        padding: 3px 8px;
        border-radius: 4px;
        font-size: 0.9em;
        font-weight: 500;
    }

    .status-booked, .status-confirmed {
        background: #e3f2fd;
        color: #1976d2;
    }

    .status-assigned {
        background: #fff3e0;
        color: #f57c00;
    }

    .status-completed {
        background: #e8f5e8;
        color: #2e7d32;
    }

    .status-rejected, .status-cancelled {
        background: #ffebee;
        color: #c62828;
    }

    .status-pending {
        background: #f3e5f5;
        color: #7b1fa2;
    }

    @media (max-width: 640px) {
        .modal-backdrop {
            padding: 8px !important;
            align-items: flex-end !important;
        }
        .bill-modal {
            width: 100% !important;
            max-height: 94vh !important;
            border-radius: 14px 14px 0 0 !important;
            margin: 0 !important;
        }
        .bill-modal-header {
            padding: 12px 14px !important;
        }
        .bill-modal-header h2 {
            font-size: 1.12rem !important;
        }
        .bill-modal-body {
            padding: 12px 10px !important;
            gap: 14px !important;
        }
        .bill-info-grid {
            grid-template-columns: 1fr !important;
            gap: 10px !important;
        }
        .bill-card {
            padding: 12px 14px !important;
        }
        .bill-table-wrap {
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch !important;
        }
        .bill-table {
            min-width: 480px !important;
            font-size: 0.8rem !important;
        }
        .bill-table th, .bill-table td {
            padding: 9px 8px !important;
        }
        .bill-summary-container {
            padding: 14px 12px !important;
            align-items: stretch !important;
        }
        .bill-summary-box {
            max-width: 100% !important;
            width: 100% !important;
        }
        .bill-modal-footer {
            padding: 12px 14px !important;
            flex-direction: column !important;
            gap: 8px !important;
        }
        .bill-modal-footer button {
            width: 100% !important;
            min-height: 42px !important;
            justify-content: center !important;
        }
    }
`;

// Add the styles to your component
const styleElement = document.createElement('style');
styleElement.textContent = billModalStyles;
document.head.appendChild(styleElement);

// Update the Services component to show area-wise pricing
export function Services({ userId, isSuperAdmin, onServicesUpdate, onEditService }) {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'hidden', 'blocked'

    // Calendar Modal State
    const [selectedService, setSelectedService] = useState(null);
    const [unavailableDates, setUnavailableDates] = useState([]);
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedSlots, setSelectedSlots] = useState([]);
    const [isFullDay, setIsFullDay] = useState(false);
    const [calendarMode, setCalendarMode] = useState('single'); // 'single' or 'range'
    const [rangeStartDate, setRangeStartDate] = useState('');
    const [rangeEndDate, setRangeEndDate] = useState('');

    // Assign Helpers Modal State
    const [helpers, setHelpers] = useState([]);
    const [selectedHelpers, setSelectedHelpers] = useState([]);
    const [useOwn, setUseOwn] = useState(false);
    const [showHelperModal, setShowHelperModal] = useState(false);
    const [alertIfNoOneAccepts, setAlertIfNoOneAccepts] = useState(false);
    const [helperSearchTerm, setHelperSearchTerm] = useState('');
    const [helperFilterTab, setHelperFilterTab] = useState('all'); // 'all', 'selected', 'online'
    const [isSavingHelperAssignment, setIsSavingHelperAssignment] = useState(false);
    const [currentService, setCurrentService] = useState(null);

    // Price expansion state
    const [expandedPriceRows, setExpandedPriceRows] = useState({});

    const timeSlots = Array.from({ length: 10 }, (_, i) => {
        const hour = i + 9;
        return `${hour}:00 - ${hour + 1}:00`;
    });

    // Format Date to YYYY-MM-DD in LOCAL timezone (fixes UTC offset backwards day shift)
    const formatDateLocal = (date) => {
        if (!date) return '';
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Safely format YYYY-MM-DD string to user-friendly local date display
    const formatDisplayDate = (ymdStr, options) => {
        if (!ymdStr) return '';
        const parts = String(ymdStr).split('-');
        if (parts.length === 3) {
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const day = parseInt(parts[2], 10);
            return new Date(year, month, day).toLocaleDateString('en-US', options || {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        }
        return ymdStr;
    };

    useEffect(() => {
        const fetchServices = async () => {
            try {
                setLoading(true);
                setError(null);
                const { data } = await axios.get(`/api/service/getvisible?userid=${userId}`);
                setServices(data || []);
                if (onServicesUpdate) {
                    onServicesUpdate(data || []);
                }
            } catch (error) {
                console.error("Fetch services error:", error);
                setError("Failed to load services. Please try again.");
            } finally {
                setLoading(false);
            }
        };
        fetchServices();
    }, [userId, onServicesUpdate]);

    useEffect(() => {
        if (onServicesUpdate && services.length > 0) {
            onServicesUpdate(services);
        }
    }, [services, onServicesUpdate]);

    const togglePriceExpansion = (serviceId) => {
        setExpandedPriceRows(prev => ({
            ...prev,
            [serviceId]: !prev[serviceId]
        }));
    };

    const getPricingPlans = (service) => {
        if (service?.pricingUnits && Array.isArray(service.pricingUnits) && service.pricingUnits.length > 0) {
            return service.pricingUnits;
        }
        return [{
            unit: service?.unit || 'per day',
            price: service?.rentperday !== undefined && service?.rentperday !== null ? service.rentperday : 0,
            customUnit: service?.customUnit || '',
            isDefault: true,
            isCountable: service?.isCountable || false,
            maxQuantityPerDay: service?.maxQuantityPerDay || null,
            maxUsersPerDay: service?.maxUsersPerDay || null,
            description: service?.description || ''
        }];
    };

    const formatPlanUnit = (plan) => {
        if (!plan) return 'per day';
        const u = plan.unit === "Other" ? (plan.customUnit || "per unit") : (plan.unit || "per day");
        if (typeof u === 'string') {
            const parts = u.split(/\s*(?:and|\/|\+|&)\s*/i);
            return parts[0].trim();
        }
        return u;
    };

    const renderServicePaymentMethods = (service) => {
        const isInquiry = String(service?.bookingType || '').toLowerCase().includes('inqu');
        if (isInquiry) {
            return (
                <span className="badge bg-light text-muted border" style={{ fontSize: '11px', fontWeight: 500 }}>
                    Inquiry (No Payment Required)
                </span>
            );
        }
        const methods = service?.allowedPaymentMethods && service.allowedPaymentMethods.length > 0 
            ? service.allowedPaymentMethods 
            : ['CASH_AFTER_SERVICE'];

        return (
            <div className="d-flex flex-wrap gap-1 align-items-center">
                {methods.includes('CASH_AFTER_SERVICE') && (
                    <span className="badge bg-light text-dark border" style={{ fontSize: '11px', padding: '4px 7px' }} title="Cash on Service">
                        💵 Cash
                    </span>
                )}
                {methods.includes('FULL_ONLINE') && (
                    <span className="badge bg-success-subtle text-success border border-success-subtle" style={{ fontSize: '11px', padding: '4px 7px' }} title="100% Online Payment">
                        💳 100% Online
                    </span>
                )}
                {methods.includes('PARTIAL_30_70') && (
                    <span className="badge bg-primary-subtle text-primary border border-primary-subtle" style={{ fontSize: '11px', padding: '4px 7px' }} title="30% Advance + 70% Cash">
                        ⚡ 30% / 70%
                    </span>
                )}
            </div>
        );
    };

    const deleteService = async (id) => {
        if (!window.confirm("Are you sure you want to delete this service?")) return;
        try {
            setLoading(true);
            await axios.delete(`/api/service/deleteservice/${id}`);
            setServices(prevServices => {
                const updatedServices = prevServices.filter(service => service._id !== id);
                if (onServicesUpdate) onServicesUpdate(updatedServices);
                return updatedServices;
            });
            if (selectedService?._id === id) {
                setSelectedService(null);
            }
            message.success("Service deleted successfully");
        } catch (error) {
            console.error("Delete service error:", error);
            setError("Failed to delete service. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const toggleVisibility = async (id, currentVisibility) => {
        try {
            await axios.put(`/api/service/togglevisibility/${id}`, {
                isVisible: !currentVisibility
            });
            setServices(prevServices => {
                const updatedServices = prevServices.map(service =>
                    service._id === id ? { ...service, isVisible: !currentVisibility } : service
                );
                if (onServicesUpdate) onServicesUpdate(updatedServices);
                return updatedServices;
            });
            message.success(`Visibility ${!currentVisibility ? 'enabled' : 'disabled'}`);
        } catch (error) {
            console.error("Toggle visibility error:", error);
            message.error("Error updating visibility");
        }
    };

    // Calendar Modal Open
    const handleCalendarOpen = (service) => {
        setSelectedService(service);
        setUnavailableDates(service.unavailableDates || []);
        setSelectedDate(null);
        setIsFullDay(false);
        setSelectedSlots([]);
        setCalendarMode('single');
        setRangeStartDate('');
        setRangeEndDate('');
    };

    // Handle single date click - Uses local date to prevent timezone backward day shift
    const handleDateClick = (date) => {
        const dateString = formatDateLocal(date);
        setSelectedDate(dateString);

        const existingDate = unavailableDates.find(d => d.date === dateString);
        setSelectedSlots(existingDate?.slots || []);
        setIsFullDay(existingDate?.fullDay || false);
    };

    const handleSlotToggle = (slot) => {
        if (isFullDay) return;
        setSelectedSlots(prev =>
            prev.includes(slot)
                ? prev.filter(s => s !== slot)
                : [...prev, slot]
        );
    };

    const handleSelectAllSlots = () => {
        setSelectedSlots([...timeSlots]);
    };

    const handleClearSlots = () => {
        setSelectedSlots([]);
    };

    // Save single date availability
    const saveSlots = async () => {
        if (!selectedService || !selectedDate) return;

        try {
            let updatedDates = unavailableDates.filter(d => d.date !== selectedDate);

            if (selectedSlots.length > 0 || isFullDay) {
                const newEntry = {
                    date: selectedDate,
                    slots: isFullDay ? timeSlots : selectedSlots,
                    fullDay: !!isFullDay
                };
                updatedDates.push(newEntry);
            }

            await axios.put(`/api/service/updateavailability/${selectedService._id}`, {
                unavailableDates: updatedDates
            });

            setUnavailableDates(updatedDates);
            setServices(prevServices =>
                prevServices.map(service =>
                    service._id === selectedService._id
                        ? { ...service, unavailableDates: updatedDates }
                        : service
                )
            );

            message.success(isFullDay || selectedSlots.length > 0 
                ? `Updated availability for ${formatDisplayDate(selectedDate)}` 
                : `Marked ${formatDisplayDate(selectedDate)} as fully available`
            );
        } catch (error) {
            console.error("Error updating availability:", error);
            message.error("Failed to update availability");
        }
    };

    // Remove block for a specific date (1-click unblock)
    const removeDateBlock = async (dateStr) => {
        if (!selectedService || !dateStr) return;
        try {
            const updatedDates = unavailableDates.filter(d => d.date !== dateStr);
            await axios.put(`/api/service/updateavailability/${selectedService._id}`, {
                unavailableDates: updatedDates
            });

            setUnavailableDates(updatedDates);
            setServices(prevServices =>
                prevServices.map(service =>
                    service._id === selectedService._id
                        ? { ...service, unavailableDates: updatedDates }
                        : service
                )
            );

            if (selectedDate === dateStr) {
                setSelectedDate(null);
                setIsFullDay(false);
                setSelectedSlots([]);
            }

            message.success(`Unblocked ${formatDisplayDate(dateStr)}`);
        } catch (error) {
            console.error("Error unblocking date:", error);
            message.error("Failed to unblock date");
        }
    };

    // Handle Date Range Multi-Day Block or Unblock
    const handleRangeBlock = async (shouldBlockFullDay = true) => {
        if (!selectedService || !rangeStartDate || !rangeEndDate) {
            message.warning("Please choose both Start Date and End Date");
            return;
        }
        if (rangeStartDate > rangeEndDate) {
            message.warning("Start Date cannot be after End Date");
            return;
        }

        try {
            const startParts = rangeStartDate.split('-').map(Number);
            const endParts = rangeEndDate.split('-').map(Number);
            const start = new Date(startParts[0], startParts[1] - 1, startParts[2]);
            const end = new Date(endParts[0], endParts[1] - 1, endParts[2]);

            const dateList = [];
            const cur = new Date(start);
            while (cur <= end) {
                dateList.push(formatDateLocal(cur));
                cur.setDate(cur.getDate() + 1);
            }

            let updatedDates = [...unavailableDates];
            const setOfDates = new Set(dateList);
            updatedDates = updatedDates.filter(d => !setOfDates.has(d.date));

            if (shouldBlockFullDay) {
                dateList.forEach(dStr => {
                    updatedDates.push({
                        date: dStr,
                        slots: timeSlots,
                        fullDay: true
                    });
                });
            }

            await axios.put(`/api/service/updateavailability/${selectedService._id}`, {
                unavailableDates: updatedDates
            });

            setUnavailableDates(updatedDates);
            setServices(prevServices =>
                prevServices.map(service =>
                    service._id === selectedService._id
                        ? { ...service, unavailableDates: updatedDates }
                        : service
                )
            );

            message.success(shouldBlockFullDay 
                ? `${dateList.length} days marked as Full Off`
                : `${dateList.length} days unblocked`
            );
            setRangeStartDate('');
            setRangeEndDate('');
        } catch (error) {
            console.error("Error setting date range availability:", error);
            message.error("Failed to update date range");
        }
    };

    // Clear all blocked dates
    const clearAllBlockedDates = async () => {
        if (!selectedService) return;
        if (!window.confirm(`Clear all blocked dates for "${selectedService.name}"? Service will be available on all dates.`)) return;

        try {
            await axios.put(`/api/service/updateavailability/${selectedService._id}`, {
                unavailableDates: []
            });
            setUnavailableDates([]);
            setServices(prevServices =>
                prevServices.map(service =>
                    service._id === selectedService._id
                        ? { ...service, unavailableDates: [] }
                        : service
                )
            );
            setSelectedDate(null);
            setIsFullDay(false);
            setSelectedSlots([]);
            message.success("All blocked dates cleared");
        } catch (error) {
            console.error("Error clearing blocked dates:", error);
            message.error("Failed to clear blocked dates");
        }
    };

    // Fetch helpers for job assignment
    useEffect(() => {
        const fetchHelpers = async () => {
            if (!userId) return;
            try {
                const { data } = await axios.get(`/api/vendor/helpers?userid=${userId}`);
                setHelpers(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error("Error fetching helpers:", error);
                setHelpers([]);
            }
        };
        fetchHelpers();
    }, [userId]);

    const handleHelperSelect = (helperId, isChecked) => {
        const idStr = String(helperId);
        setSelectedHelpers(prev =>
            isChecked
                ? [...prev.filter(id => String(id) !== idStr), idStr]
                : prev.filter(id => String(id) !== idStr)
        );
    };

    const handleSelectAllHelpers = () => {
        const visibleHelpers = helpers.filter(h => {
            if (helperFilterTab === 'selected' && !selectedHelpers.includes(String(h._id))) return false;
            if (helperFilterTab === 'online' && !h.isConnected) return false;
            if (helperSearchTerm.trim()) {
                const q = helperSearchTerm.trim().toLowerCase();
                const matchName = h.name && h.name.toLowerCase().includes(q);
                const matchSkills = h.skills && h.skills.toLowerCase().includes(q);
                const matchPhone = h.phone && h.phone.includes(q);
                if (!matchName && !matchSkills && !matchPhone) return false;
            }
            return true;
        });

        const targetList = visibleHelpers.length > 0 ? visibleHelpers : helpers;
        const targetIds = targetList.map(h => String(h._id));
        const allTargetSelected = targetIds.length > 0 && targetIds.every(id => selectedHelpers.includes(id));

        if (allTargetSelected) {
            setSelectedHelpers(prev => prev.filter(id => !targetIds.includes(id)));
        } else {
            setSelectedHelpers(prev => Array.from(new Set([...prev, ...targetIds])));
        }
    };

    const handleJobAssignment = (service) => {
        setCurrentService(service);
        const existingIds = (service.assignedHelpers || []).map(h => 
            typeof h === 'object' && h._id ? String(h._id) : String(h)
        );
        setSelectedHelpers(existingIds);
        setUseOwn(!!service.useOwn);
        setAlertIfNoOneAccepts(!!service.alertIfNoOneAccepts);
        setHelperSearchTerm('');
        setHelperFilterTab('all');
        setShowHelperModal(true);
    };

    const saveJobAssignment = async () => {
        if (!currentService) return;
        try {
            setIsSavingHelperAssignment(true);
            const payload = {
                assignedHelpers: useOwn ? [] : selectedHelpers,
                useOwn: !!useOwn,
                alertIfNoOneAccepts: !!alertIfNoOneAccepts
            };

            await axios.put(`/api/service/update/${currentService._id}`, payload);

            setServices(prevServices =>
                prevServices.map(service =>
                    service._id === currentService._id ? { ...service, ...payload } : service
                )
            );

            setShowHelperModal(false);
            message.success("Job assignment updated successfully");
        } catch (error) {
            console.error("Error updating job assignment:", error);
            message.error("Failed to update job assignment");
        } finally {
            setIsSavingHelperAssignment(false);
        }
    };

    // Filter services based on search and status
    const filteredServices = services.filter(service => {
        const query = searchTerm.trim().toLowerCase();
        const matchesSearch = !query || 
            service.name?.toLowerCase().includes(query) ||
            service.phonenumber?.includes(query) ||
            (service.locationPricing && service.locationPricing.some(l => l.locationName?.toLowerCase().includes(query)));

        if (!matchesSearch) return false;

        if (statusFilter === 'active') return service.isVisible !== false;
        if (statusFilter === 'hidden') return service.isVisible === false;
        if (statusFilter === 'blocked') return service.unavailableDates && service.unavailableDates.length > 0;
        return true;
    });

    const totalCount = services.length;
    const activeCount = services.filter(s => s.isVisible !== false).length;
    const hiddenCount = services.filter(s => s.isVisible === false).length;
    const blockedCount = services.filter(s => s.unavailableDates && s.unavailableDates.length > 0).length;

    return (
        <div className='services-card-wrap'>
            {/* Header & Quick Stats */}
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                <div>
                    <h1 className="mb-1 fw-bold text-dark">Services Management</h1>
                    <p className="text-muted small mb-0">
                        Manage your service offerings, rates, scheduled availability, and helper assignments.
                    </p>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="services-stats-grid">
                <div className="service-stat-card">
                    <div>
                        <div className="stat-label">Total Services</div>
                        <div className="stat-val">{totalCount}</div>
                    </div>
                    <i className="bi bi-grid-3x3-gap text-primary fs-3 opacity-75"></i>
                </div>
                <div className="service-stat-card">
                    <div>
                        <div className="stat-label">Active / Live</div>
                        <div className="stat-val text-success">{activeCount}</div>
                    </div>
                    <i className="bi bi-check-circle text-success fs-3 opacity-75"></i>
                </div>
                <div className="service-stat-card">
                    <div>
                        <div className="stat-label">Hidden / Draft</div>
                        <div className="stat-val text-secondary">{hiddenCount}</div>
                    </div>
                    <i className="bi bi-eye-slash text-secondary fs-3 opacity-75"></i>
                </div>
                <div className="service-stat-card">
                    <div>
                        <div className="stat-label">Dates Blocked</div>
                        <div className="stat-val text-warning">{blockedCount}</div>
                    </div>
                    <i className="bi bi-calendar-x text-warning fs-3 opacity-75"></i>
                </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="services-filter-bar">
                <div className="services-search-box">
                    <i className="bi bi-search search-icon"></i>
                    <input
                        type="text"
                        placeholder="Search services by name, phone or location..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="services-filter-pills">
                    <button
                        className={`filter-pill ${statusFilter === 'all' ? 'active' : ''}`}
                        onClick={() => setStatusFilter('all')}
                    >
                        All ({totalCount})
                    </button>
                    <button
                        className={`filter-pill ${statusFilter === 'active' ? 'active' : ''}`}
                        onClick={() => setStatusFilter('active')}
                    >
                        Active ({activeCount})
                    </button>
                    <button
                        className={`filter-pill ${statusFilter === 'hidden' ? 'active' : ''}`}
                        onClick={() => setStatusFilter('hidden')}
                    >
                        Hidden ({hiddenCount})
                    </button>
                    <button
                        className={`filter-pill ${statusFilter === 'blocked' ? 'active' : ''}`}
                        onClick={() => setStatusFilter('blocked')}
                    >
                        Has Blocked Dates ({blockedCount})
                    </button>
                </div>
            </div>

            {/* Loading State */}
            {loading && !error && (
                <div className="alert alert-info text-center py-4 rounded-3 border-0 shadow-sm">
                    <div className="spinner-border spinner-border-sm text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <span className="ms-2 fw-semibold">Loading services...</span>
                </div>
            )}

            {/* Error State */}
            {error && (
                <div className="alert alert-danger text-center py-3 rounded-3 shadow-sm">
                    <span>{error}</span>
                    <button
                        className="btn btn-sm btn-outline-danger ms-3 fw-semibold"
                        onClick={() => window.location.reload()}
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* Services Content */}
            {!error && !loading && (
                <>
                    {filteredServices.length === 0 ? (
                        <div className="text-center py-5 bg-light rounded-4 border border-dashed my-3">
                            <i className="bi bi-inbox fs-1 text-muted d-block mb-2"></i>
                            <h5 className="text-dark fw-bold mb-1">No services found</h5>
                            <p className="text-muted small mb-0">
                                {searchTerm || statusFilter !== 'all' 
                                    ? "Try adjusting your search query or status filter." 
                                    : "Add your first service to get started."}
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Desktop / Tablet Table View */}
                            <div className="table-responsive rounded-3 shadow-sm border d-none d-md-block">
                                <table className='services-modern-table mb-0'>
                                    <thead>
                                        <tr>
                                            <th>Service Details</th>
                                            <th>Pricing & Rates</th>
                                            <th>Payment Options</th>
                                            <th>Contact</th>
                                            <th className='text-center'>Visibility</th>
                                            <th className='text-center'>Schedule Status</th>
                                            <th className='text-center'>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredServices.map(service => {
                                            const plans = getPricingPlans(service);
                                            const hasLocations = service.locationPricing && service.locationPricing.length > 0;
                                            const isExpanded = !!expandedPriceRows[service._id];
                                            const canExpand = hasLocations || plans.length > 1;

                                            return (
                                                <React.Fragment key={service._id}>
                                                    <tr>
                                                        <td>
                                                            <div className="d-flex flex-column">
                                                                <Link
                                                                    to={`/book/${service._id}`}
                                                                    className="fw-bold text-dark text-decoration-none hover-primary"
                                                                    target="_blank"
                                                                    style={{ fontSize: '15px' }}
                                                                >
                                                                    {service.name}
                                                                    <i className="bi bi-box-arrow-up-right ms-1 text-muted" style={{ fontSize: '11px' }}></i>
                                                                </Link>
                                                                <small className="text-muted" style={{ fontSize: '11px' }}>
                                                                    ID: {service._id.substring(0, 10)}...
                                                                </small>
                                                            </div>
                                                        </td>
                                                        <td style={{ minWidth: '230px' }}>
                                                            <div className="d-flex align-items-center flex-wrap gap-1">
                                                                <span className="price-tag base fw-bold">₹{plans[0].price}</span>
                                                                <small className="text-muted">/{formatPlanUnit(plans[0])}</small>
                                                                {plans.length > 1 && (
                                                                    <span className="badge bg-light text-primary border ms-1" style={{ fontSize: '10px' }}>
                                                                        +{plans.length - 1} more plan{plans.length > 2 ? 's' : ''}
                                                                    </span>
                                                                )}
                                                                {hasLocations && (
                                                                    <span className="badge bg-light text-dark border ms-1" style={{ fontSize: '10px' }}>
                                                                        <i className="bi bi-geo-alt-fill text-primary me-1"></i>{service.locationPricing.length} locations
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {canExpand && (
                                                                <button
                                                                    className="expand-btn mt-1 text-primary p-0 text-decoration-none fw-semibold"
                                                                    onClick={() => togglePriceExpansion(service._id)}
                                                                    style={{ fontSize: '11.5px' }}
                                                                >
                                                                    {isExpanded ? '▲ Hide breakdown' : '▼ View plans & location rates'}
                                                                </button>
                                                            )}
                                                        </td>
                                                        <td style={{ minWidth: '150px' }}>
                                                            {renderServicePaymentMethods(service)}
                                                        </td>
                                                        <td>
                                                            <span className="text-dark small d-flex align-items-center">
                                                                <i className="bi bi-telephone text-muted me-1"></i>
                                                                {service.phonenumber || 'N/A'}
                                                            </span>
                                                        </td>
                                                        <td className='text-center'>
                                                            <button
                                                                className={`btn btn-sm px-3 fw-bold rounded-pill ${service.isVisible ? "btn-success" : "btn-outline-secondary"}`}
                                                                onClick={() => toggleVisibility(service._id, service.isVisible)}
                                                                disabled={loading}
                                                                style={{ fontSize: '11.5px' }}
                                                                title="Click to toggle visibility"
                                                            >
                                                                {service.isVisible ? "ACTIVE" : "HIDDEN"}
                                                            </button>
                                                        </td>
                                                        <td className='text-center align-middle'>
                                                            {service.unavailableDates && service.unavailableDates.length > 0 ? (
                                                                <button
                                                                    className="badge bg-white text-success border border-success-subtle py-2 px-3 rounded-pill fw-bold"
                                                                    style={{ fontSize: '11.5px', cursor: 'pointer' }}
                                                                    onClick={() => handleCalendarOpen(service)}
                                                                    title="Click to manage blocked dates"
                                                                >
                                                                    <i className="bi bi-calendar-x me-1"></i>
                                                                    {service.unavailableDates.length} Blocked Date{service.unavailableDates.length > 1 ? 's' : ''}
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    className="badge bg-white text-success border border-success-subtle py-2 px-3 rounded-pill fw-bold"
                                                                    style={{ fontSize: '11.5px', cursor: 'pointer' }}
                                                                    onClick={() => handleCalendarOpen(service)}
                                                                    title="Click to manage schedule"
                                                                >
                                                                    <i className="bi bi-calendar-check me-1"></i>
                                                                    Fully Available
                                                                </button>
                                                            )}
                                                        </td>
                                                        <td className='text-center'>
                                                            <div className="d-flex gap-1 justify-content-center">
                                                                <button
                                                                    className="btn btn-outline-warning btn-sm px-2 fw-semibold"
                                                                    onClick={() => onEditService && onEditService(service)}
                                                                    title="Edit this service"
                                                                    style={{ fontSize: '12px', whiteSpace: 'nowrap' }}
                                                                >
                                                                    <i className="bi bi-pencil-square me-1"></i>
                                                                    Edit
                                                                </button>
                                                                <button
                                                                    className="btn btn-outline-primary btn-sm px-2 fw-semibold"
                                                                    onClick={() => handleCalendarOpen(service)}
                                                                    title="Manage Availability & Off-Days"
                                                                    style={{ fontSize: '12px' }}
                                                                >
                                                                    <i className="bi bi-calendar-event me-1"></i>
                                                                    Calendar
                                                                </button>
                                                                <button
                                                                    className={`btn btn-sm px-2 fw-semibold ${service.useOwn ? 'btn-outline-indigo border-primary text-primary' : (service.assignedHelpers && service.assignedHelpers.length > 0 ? 'btn-info text-white' : 'btn-outline-secondary')}`}
                                                                    onClick={() => handleJobAssignment(service)}
                                                                    title="Assign helpers for this service"
                                                                    style={{ fontSize: '12px', whiteSpace: 'nowrap' }}
                                                                >
                                                                    <i className="bi bi-people me-1"></i>
                                                                    {service.useOwn 
                                                                        ? "Assign (Own)" 
                                                                        : (service.assignedHelpers && service.assignedHelpers.length > 0 
                                                                            ? `Assign (${service.assignedHelpers.length})` 
                                                                            : "Assign")}
                                                                </button>
                                                                <button
                                                                    className="btn btn-outline-danger btn-sm px-2"
                                                                    onClick={() => deleteService(service._id)}
                                                                    title="Delete service"
                                                                    style={{ fontSize: '12px' }}
                                                                >
                                                                    <i className="bi bi-trash"></i>
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>

                                                    {/* Expanded Row for Plans & Location Pricing */}
                                                    {isExpanded && (
                                                        <tr>
                                                            <td colSpan="7" style={{ padding: '12px 16px', background: '#f8fafc' }}>
                                                                <div className="expanded-pricing-light">
                                                                    {/* Section: Allowed Payment Methods */}
                                                                    <div className="mb-3">
                                                                        <div className="d-flex align-items-center justify-content-between mb-2">
                                                                            <h6 className="mb-0 fw-bold text-dark d-flex align-items-center">
                                                                                <i className="bi bi-credit-card-2-front text-primary me-2"></i>
                                                                                Allowed Payment Methods for <span className="text-primary ms-1">{service.name}</span>
                                                                            </h6>
                                                                        </div>
                                                                        <div className="p-3 bg-white rounded-2 border">
                                                                            {String(service.bookingType || '').toLowerCase().includes('inqu') ? (
                                                                                <span className="text-muted small">Inquiry-based service (Payment methods not applicable — pricing is finalized via custom quotation upon consultation).</span>
                                                                            ) : (
                                                                                <div className="d-flex flex-wrap gap-2">
                                                                                    {((service.allowedPaymentMethods && service.allowedPaymentMethods.length > 0) 
                                                                                        ? service.allowedPaymentMethods 
                                                                                        : ['CASH_AFTER_SERVICE']).map((m, idx) => {
                                                                                        if (m === 'FULL_ONLINE') {
                                                                                            return (
                                                                                                <div key={idx} className="p-2 px-3 rounded-2 border" style={{ background: '#ecfdf5', borderColor: '#a7f3d0' }}>
                                                                                                    <div className="fw-bold text-success" style={{ fontSize: '12.5px' }}>💳 100% Online Payment</div>
                                                                                                    <div className="text-muted" style={{ fontSize: '11px' }}>Full payment upfront online via Razorpay (UPI/Cards).</div>
                                                                                                </div>
                                                                                            );
                                                                                        }
                                                                                        if (m === 'PARTIAL_30_70') {
                                                                                            return (
                                                                                                <div key={idx} className="p-2 px-3 rounded-2 border" style={{ background: '#eff6ff', borderColor: '#bfdbfe' }}>
                                                                                                    <div className="fw-bold text-primary" style={{ fontSize: '12.5px' }}>⚡ 30% Advance + 70% Cash</div>
                                                                                                    <div className="text-muted" style={{ fontSize: '11px' }}>30% paid online upfront, remaining 70% in cash.</div>
                                                                                                </div>
                                                                                            );
                                                                                        }
                                                                                        return (
                                                                                            <div key={idx} className="p-2 px-3 rounded-2 border" style={{ background: '#f8fafc', borderColor: '#cbd5e1' }}>
                                                                                                <div className="fw-bold text-dark" style={{ fontSize: '12.5px' }}>💵 Cash on Service</div>
                                                                                                <div className="text-muted" style={{ fontSize: '11px' }}>Full payment in cash after service completion.</div>
                                                                                            </div>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    {/* Section 1: All Price Plans */}
                                                                    <div className="mb-3">
                                                                        <div className="d-flex align-items-center justify-content-between mb-2">
                                                                            <h6 className="mb-0 fw-bold text-dark d-flex align-items-center">
                                                                                <i className="bi bi-card-checklist text-success me-2"></i>
                                                                                Price Plans for <span className="text-primary ms-1">{service.name}</span>
                                                                            </h6>
                                                                            <span className="badge bg-secondary" style={{ fontSize: '10px' }}>
                                                                                {plans.length} {plans.length === 1 ? 'Plan' : 'Plans'}
                                                                            </span>
                                                                        </div>
                                                                        <div className="table-responsive rounded-2 border bg-white">
                                                                            <table className="table table-sm table-hover mb-0" style={{ fontSize: '12.5px' }}>
                                                                                <thead className="table-light">
                                                                                    <tr>
                                                                                        <th>#</th>
                                                                                        <th>Plan / Billing Unit</th>
                                                                                        <th>Base Price</th>
                                                                                        <th>Type</th>
                                                                                        <th>Capacity / Limits</th>
                                                                                        <th>Description</th>
                                                                                    </tr>
                                                                                </thead>
                                                                                <tbody>
                                                                                    {plans.map((p, idx) => (
                                                                                        <tr key={idx}>
                                                                                            <td>{idx + 1}</td>
                                                                                            <td className="fw-semibold text-dark">
                                                                                                {formatPlanUnit(p)}
                                                                                                {p.unit === 'Other' && p.customUnit && ` (${p.customUnit})`}
                                                                                            </td>
                                                                                            <td className="fw-bold text-success">
                                                                                                ₹{p.price} <small className="text-muted fw-normal">/{formatPlanUnit(p)}</small>
                                                                                            </td>
                                                                                            <td>
                                                                                                {p.isDefault ? (
                                                                                                    <span className="badge bg-success-subtle text-success border border-success-subtle">Default</span>
                                                                                                ) : (
                                                                                                    <span className="badge bg-light text-secondary border">Standard</span>
                                                                                                )}
                                                                                            </td>
                                                                                            <td>
                                                                                                {p.isCountable 
                                                                                                    ? `Countable (Max: ${p.maxQuantityPerDay || 'Unlimited'} qty/day)`
                                                                                                    : 'Fixed (Single unit)'}
                                                                                            </td>
                                                                                            <td className="text-muted">{p.description || '—'}</td>
                                                                                        </tr>
                                                                                    ))}
                                                                                </tbody>
                                                                            </table>
                                                                        </div>
                                                                    </div>

                                                                    {/* Section 2: Location Pricing */}
                                                                    {hasLocations && (
                                                                        <div>
                                                                            <h6 className="mb-2 fw-bold text-dark d-flex align-items-center">
                                                                                <i className="bi bi-geo-alt-fill text-primary me-2"></i>
                                                                                Location Pricing Breakdown
                                                                            </h6>
                                                                            <div className="table-responsive rounded-2 border bg-white">
                                                                                <table className="table table-sm table-hover mb-0" style={{ fontSize: '12.5px' }}>
                                                                                    <thead className="table-light">
                                                                                        <tr>
                                                                                            <th>Location</th>
                                                                                            <th>Address</th>
                                                                                            <th>Extra Fee</th>
                                                                                            <th>Total Rate (Base + Extra)</th>
                                                                                        </tr>
                                                                                    </thead>
                                                                                    <tbody>
                                                                                        {service.locationPricing.map((loc, lIdx) => (
                                                                                            <tr key={lIdx}>
                                                                                                <td className="fw-semibold text-primary">
                                                                                                    <i className="bi bi-geo-alt me-1"></i>{loc.locationName}
                                                                                                </td>
                                                                                                <td className="text-muted">{loc.locationAddress || '—'}</td>
                                                                                                <td className="text-warning fw-bold">+₹{loc.extraPrice || 0}</td>
                                                                                                <td>
                                                                                                    <div className="d-flex flex-column gap-1">
                                                                                                        {plans.map((p, pIdx) => {
                                                                                                            const total = (Number(p.price) || 0) + (Number(loc.extraPrice) || 0);
                                                                                                            return (
                                                                                                                <span key={pIdx} className="small">
                                                                                                                    <strong>{formatPlanUnit(p)}:</strong> ₹{total}
                                                                                                                </span>
                                                                                                            );
                                                                                                        })}
                                                                                                    </div>
                                                                                                </td>
                                                                                            </tr>
                                                                                        ))}
                                                                                    </tbody>
                                                                                </table>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Service Cards View (< 768px) */}
                            <div className="service-cards-mobile d-block d-md-none">
                                {filteredServices.map(service => {
                                    const plans = getPricingPlans(service);
                                    const hasLocations = service.locationPricing && service.locationPricing.length > 0;
                                    const isExpanded = !!expandedPriceRows[service._id];
                                    const canExpand = hasLocations || plans.length > 1;

                                    return (
                                        <div key={service._id} className="service-mobile-card">
                                            <div className="service-mobile-card-header">
                                                <div>
                                                    <Link
                                                        to={`/book/${service._id}`}
                                                        className="service-mobile-title d-block"
                                                        target="_blank"
                                                    >
                                                        {service.name}
                                                        <i className="bi bi-box-arrow-up-right ms-1 text-muted" style={{ fontSize: '12px' }}></i>
                                                    </Link>
                                                    <small className="text-muted">ID: {service._id.substring(0, 8)}...</small>
                                                </div>
                                                <button
                                                    className={`btn btn-sm px-3 fw-bold rounded-pill ${service.isVisible ? "btn-success" : "btn-outline-secondary"}`}
                                                    onClick={() => toggleVisibility(service._id, service.isVisible)}
                                                    disabled={loading}
                                                    style={{ fontSize: '11px' }}
                                                >
                                                    {service.isVisible ? "ACTIVE" : "HIDDEN"}
                                                </button>
                                            </div>

                                            <div className="service-mobile-body">
                                                <div className="d-flex justify-content-between align-items-center">
                                                    <span className="text-muted">Rate:</span>
                                                    <div>
                                                        <span className="fw-bold text-success">₹{plans[0].price}</span>
                                                        <small className="text-muted ms-1">/{formatPlanUnit(plans[0])}</small>
                                                    </div>
                                                </div>

                                                <div className="d-flex justify-content-between align-items-center">
                                                    <span className="text-muted">Payment:</span>
                                                    <div>
                                                        {renderServicePaymentMethods(service)}
                                                    </div>
                                                </div>

                                                <div className="d-flex justify-content-between align-items-center">
                                                    <span className="text-muted">Contact:</span>
                                                    <span className="text-dark fw-semibold">📞 {service.phonenumber || 'N/A'}</span>
                                                </div>

                                                <div className="d-flex justify-content-between align-items-center">
                                                    <span className="text-muted">Schedule:</span>
                                                    {service.unavailableDates && service.unavailableDates.length > 0 ? (
                                                        <span className="badge bg-danger rounded-pill">
                                                            {service.unavailableDates.length} Blocked Date{service.unavailableDates.length > 1 ? 's' : ''}
                                                        </span>
                                                    ) : (
                                                        <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill">
                                                            Fully Available
                                                        </span>
                                                    )}
                                                </div>

                                                {canExpand && (
                                                    <button
                                                        className="btn btn-sm btn-link text-primary p-0 text-start text-decoration-none fw-semibold mt-1"
                                                        onClick={() => togglePriceExpansion(service._id)}
                                                        style={{ fontSize: '12px' }}
                                                    >
                                                        {isExpanded ? '▲ Hide rate details' : `▼ View ${plans.length} plan(s) & locations`}
                                                    </button>
                                                )}

                                                {isExpanded && (
                                                    <div className="p-2 rounded bg-light border mt-2 small">
                                                        <div className="fw-bold text-dark mb-1">Pricing Plans:</div>
                                                        {plans.map((p, idx) => (
                                                            <div key={idx} className="d-flex justify-content-between py-1 border-bottom border-light">
                                                                <span>{formatPlanUnit(p)} {p.isDefault && <span className="badge bg-success ms-1" style={{ fontSize: '9px' }}>Default</span>}</span>
                                                                <span className="fw-bold text-success">₹{p.price}</span>
                                                            </div>
                                                        ))}
                                                        {hasLocations && (
                                                            <div className="mt-2">
                                                                <div className="fw-bold text-primary mb-1">Locations ({service.locationPricing.length}):</div>
                                                                {service.locationPricing.map((loc, lIdx) => (
                                                                    <div key={lIdx} className="d-flex justify-content-between py-1 text-muted" style={{ fontSize: '11px' }}>
                                                                        <span>{loc.locationName}</span>
                                                                        <span className="text-warning fw-semibold">+₹{loc.extraPrice}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                        <div className="mt-2 pt-2 border-top">
                                                            <div className="fw-bold text-dark mb-1">Payment Options:</div>
                                                            {renderServicePaymentMethods(service)}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="service-mobile-actions">
                                                <button
                                                    className="btn btn-outline-warning btn-sm fw-semibold"
                                                    onClick={() => onEditService && onEditService(service)}
                                                    title="Edit this service"
                                                >
                                                    <i className="bi bi-pencil-square me-1"></i> Edit
                                                </button>
                                                <button
                                                    className="btn btn-outline-primary btn-sm fw-semibold"
                                                    onClick={() => handleCalendarOpen(service)}
                                                >
                                                    <i className="bi bi-calendar-event me-1"></i> Cal
                                                </button>
                                                <button
                                                    className={`btn btn-sm fw-semibold ${service.useOwn ? 'btn-outline-primary' : (service.assignedHelpers && service.assignedHelpers.length > 0 ? 'btn-info text-white' : 'btn-outline-secondary')}`}
                                                    onClick={() => handleJobAssignment(service)}
                                                >
                                                    <i className="bi bi-people me-1"></i>
                                                    {service.useOwn ? 'Own' : (service.assignedHelpers?.length > 0 ? `Assign (${service.assignedHelpers.length})` : 'Assign')}
                                                </button>
                                                <button
                                                    className="btn btn-outline-danger btn-sm"
                                                    onClick={() => deleteService(service._id)}
                                                >
                                                    <i className="bi bi-trash"></i> Del
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </>
            )}

            {/* ========================================================================= */}
            {/* CALENDAR & AVAILABILITY MODAL */}
            {/* ========================================================================= */}
            {selectedService && (
                <div className="modal-overlay">
                    <div className="calendar-modal p-0">
                        {/* Modal Header */}
                        <div className="modal-modern-header">
                            <div>
                                <h4 className="modal-modern-title d-flex align-items-center">
                                    <i className="bi bi-calendar-week text-primary me-2"></i>
                                    Availability & Schedule
                                </h4>
                                <div className="modal-modern-subtitle">
                                    Service: <strong className="text-primary">{selectedService.name}</strong>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setSelectedService(null);
                                    setSelectedDate(null);
                                    setIsFullDay(false);
                                    setSelectedSlots([]);
                                }}
                                className="modal-close-btn"
                                aria-label="Close"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-3 p-md-4">
                            {/* Mode Tabs: Single Day vs Date Range */}
                            <div className="d-flex gap-2 mb-3 border-bottom pb-3">
                                <button
                                    className={`btn btn-sm px-3 fw-bold rounded-pill ${calendarMode === 'single' ? 'btn-primary' : 'btn-outline-secondary'}`}
                                    onClick={() => setCalendarMode('single')}
                                >
                                    <i className="bi bi-calendar-day me-1"></i>
                                    Single Day & Hourly Slots
                                </button>
                                <button
                                    className={`btn btn-sm px-3 fw-bold rounded-pill ${calendarMode === 'range' ? 'btn-primary' : 'btn-outline-secondary'}`}
                                    onClick={() => setCalendarMode('range')}
                                >
                                    <i className="bi bi-calendar-range me-1"></i>
                                    Quick Date Range Off
                                </button>
                            </div>

                            {/* MODE 1: Single Day & Slot Picker */}
                            {calendarMode === 'single' && (
                                <div className="row g-3">
                                    <div className="col-lg-6">
                                        <Calendar
                                            onClickDay={handleDateClick}
                                            tileClassName={({ date, view }) => {
                                                if (view !== 'month') return '';
                                                const dateStr = formatDateLocal(date);
                                                const unavailable = unavailableDates.find(d => d.date === dateStr);
                                                const isSelected = selectedDate === dateStr;
                                                const classes = [];
                                                if (isSelected) classes.push('calendar-tile-selected');
                                                if (unavailable) {
                                                    classes.push(unavailable.fullDay ? 'fully-unavailable' : 'partially-unavailable');
                                                }
                                                return classes.join(' ');
                                            }}
                                            className="availability-calendar w-100"
                                        />

                                        {/* Calendar Legend */}
                                        <div className="availability-legend mt-2">
                                            <div className="legend-item">
                                                <span className="legend-dot available"></span>
                                                Available
                                            </div>
                                            <div className="legend-item">
                                                <span className="legend-dot fullday"></span>
                                                Full Day Off
                                            </div>
                                            <div className="legend-item">
                                                <span className="legend-dot partial"></span>
                                                Partial Slots Off
                                            </div>
                                            <div className="legend-item">
                                                <span className="legend-dot selected"></span>
                                                Selected
                                            </div>
                                        </div>
                                    </div>

                                    <div className="col-lg-6">
                                        {selectedDate ? (
                                            <div className="p-3 bg-light rounded-3 border h-100 d-flex flex-column justify-content-between">
                                                <div>
                                                    <div className="d-flex justify-content-between align-items-start mb-2">
                                                        <div>
                                                            <h5 className="fw-bold text-dark mb-0">
                                                                {formatDisplayDate(selectedDate, {
                                                                    weekday: 'long',
                                                                    year: 'numeric',
                                                                    month: 'long',
                                                                    day: 'numeric'
                                                                })}
                                                            </h5>
                                                            <small className="text-muted">
                                                                Date Key: <code>{selectedDate}</code>
                                                            </small>
                                                        </div>
                                                        {unavailableDates.some(d => d.date === selectedDate) && (
                                                            <span className="badge bg-danger rounded-pill">
                                                                {unavailableDates.find(d => d.date === selectedDate)?.fullDay ? "Full Day Off" : "Slots Blocked"}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Full Day Toggle Card */}
                                                    <div className="p-3 my-3 bg-white rounded-3 border">
                                                        <div className="form-check form-switch mb-0">
                                                            <input
                                                                className="form-check-input"
                                                                type="checkbox"
                                                                role="switch"
                                                                id="fullDayToggle"
                                                                checked={isFullDay}
                                                                onChange={(e) => {
                                                                    const checked = e.target.checked;
                                                                    setIsFullDay(checked);
                                                                    setSelectedSlots(checked ? timeSlots : []);
                                                                }}
                                                                style={{ cursor: 'pointer', transform: 'scale(1.2)', marginRight: '10px' }}
                                                            />
                                                            <label className="form-check-label text-dark fw-bold" htmlFor="fullDayToggle" style={{ cursor: 'pointer' }}>
                                                                Full Day Unavailable (Full Day Off)
                                                            </label>
                                                        </div>
                                                        <small className="d-block text-muted mt-1">
                                                            {isFullDay 
                                                                ? "Service is completely OFF for this entire day. Customers cannot book any slot."
                                                                : "Toggle on to take the entire day off, or select individual unavailable slots below."}
                                                        </small>
                                                    </div>

                                                    {/* Hourly Slots Selection (if not full day) */}
                                                    {!isFullDay && (
                                                        <div>
                                                            <div className="d-flex justify-content-between align-items-center mb-2">
                                                                <span className="fw-bold text-dark small">Select Unavailable Time Slots:</span>
                                                                <div className="d-flex gap-1">
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-link btn-sm p-0 text-primary text-decoration-none fw-semibold"
                                                                        onClick={handleSelectAllSlots}
                                                                        style={{ fontSize: '11.5px' }}
                                                                    >
                                                                        Select All
                                                                    </button>
                                                                    <span className="text-muted">|</span>
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-link btn-sm p-0 text-danger text-decoration-none fw-semibold"
                                                                        onClick={handleClearSlots}
                                                                        style={{ fontSize: '11.5px' }}
                                                                    >
                                                                        Clear
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            <div className="time-slots-grid">
                                                                {timeSlots.map(slot => {
                                                                    const isSelected = selectedSlots.includes(slot);
                                                                    return (
                                                                        <button
                                                                            key={slot}
                                                                            type="button"
                                                                            className={`time-slot-btn ${isSelected ? 'selected-slot' : ''}`}
                                                                            onClick={() => handleSlotToggle(slot)}
                                                                        >
                                                                            <span>{slot}</span>
                                                                            {isSelected ? (
                                                                                <i className="bi bi-x-circle-fill text-white ms-1"></i>
                                                                            ) : (
                                                                                <i className="bi bi-circle text-muted ms-1" style={{ fontSize: '11px' }}></i>
                                                                            )}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Action Buttons for Date */}
                                                <div className="d-flex gap-2 mt-4 pt-3 border-top">
                                                    <button
                                                        className="btn btn-primary flex-grow-1 fw-bold"
                                                        onClick={saveSlots}
                                                    >
                                                        <i className="bi bi-check2-circle me-1"></i>
                                                        Save Availability
                                                    </button>
                                                    {unavailableDates.some(d => d.date === selectedDate) && (
                                                        <button
                                                            className="btn btn-outline-danger fw-semibold"
                                                            onClick={() => removeDateBlock(selectedDate)}
                                                            title="Remove block and make fully available"
                                                        >
                                                            <i className="bi bi-unlock me-1"></i>
                                                            Unblock Date
                                                        </button>
                                                    )}
                                                    <button
                                                        className="btn btn-outline-secondary"
                                                        onClick={() => {
                                                            setSelectedDate(null);
                                                            setIsFullDay(false);
                                                            setSelectedSlots([]);
                                                        }}
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="p-4 bg-light rounded-3 border text-center h-100 d-flex flex-column justify-content-center align-items-center">
                                                <i className="bi bi-calendar2-day fs-1 text-primary mb-2 opacity-75"></i>
                                                <h6 className="fw-bold text-dark">Select a date from calendar</h6>
                                                <p className="text-muted small mb-0" style={{ maxWidth: '280px' }}>
                                                    Click any day on the calendar to mark it as Full Day Off or block specific hourly slots.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* MODE 2: Date Range Multi-Day Off */}
                            {calendarMode === 'range' && (
                                <div className="p-3 bg-light rounded-3 border">
                                    <div className="d-flex align-items-center gap-2 mb-2">
                                        <i className="bi bi-calendar-range text-primary fs-4"></i>
                                        <div>
                                            <h6 className="fw-bold text-dark mb-0">Block Multiple Days (Date Range)</h6>
                                            <small className="text-muted">
                                                Take several days off at once (e.g., vacation, weekend off, holidays).
                                            </small>
                                        </div>
                                    </div>

                                    <div className="row g-3 my-2">
                                        <div className="col-md-6">
                                            <label className="form-label fw-bold text-dark small">From Date (Start):</label>
                                            <input
                                                type="date"
                                                className="form-control"
                                                value={rangeStartDate}
                                                onChange={(e) => setRangeStartDate(e.target.value)}
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fw-bold text-dark small">To Date (End):</label>
                                            <input
                                                type="date"
                                                className="form-control"
                                                value={rangeEndDate}
                                                onChange={(e) => setRangeEndDate(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    {rangeStartDate && rangeEndDate && (
                                        <div className="p-2 mb-3 bg-white rounded border small text-dark d-flex align-items-center justify-content-between">
                                            <span>
                                                Selected Range: <strong>{formatDisplayDate(rangeStartDate)}</strong> → <strong>{formatDisplayDate(rangeEndDate)}</strong>
                                            </span>
                                            <span className="badge bg-primary">
                                                {(() => {
                                                    const s = new Date(rangeStartDate);
                                                    const e = new Date(rangeEndDate);
                                                    const diffDays = Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
                                                    return diffDays > 0 ? `${diffDays} Day(s)` : 'Invalid range';
                                                })()}
                                            </span>
                                        </div>
                                    )}

                                    <div className="d-flex gap-2 flex-wrap">
                                        <button
                                            type="button"
                                            className="btn btn-danger fw-bold flex-grow-1"
                                            onClick={() => handleRangeBlock(true)}
                                            disabled={!rangeStartDate || !rangeEndDate}
                                        >
                                            <i className="bi bi-slash-circle me-1"></i>
                                            Mark All Selected Days Full Off
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-outline-success fw-bold flex-grow-1"
                                            onClick={() => handleRangeBlock(false)}
                                            disabled={!rangeStartDate || !rangeEndDate}
                                        >
                                            <i className="bi bi-check2-all me-1"></i>
                                            Unblock All Days in Range
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Currently Blocked Dates Overview */}
                            <div className="mt-4 pt-3 border-top">
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <h6 className="fw-bold text-dark mb-0 d-flex align-items-center">
                                        <i className="bi bi-clock-history text-secondary me-2"></i>
                                        Currently Blocked Dates ({unavailableDates.length})
                                    </h6>
                                    {unavailableDates.length > 0 && (
                                        <button
                                            className="btn btn-link btn-sm text-danger p-0 text-decoration-none fw-semibold"
                                            onClick={clearAllBlockedDates}
                                        >
                                            Clear All Blocked Dates
                                        </button>
                                    )}
                                </div>

                                {unavailableDates.length === 0 ? (
                                    <div className="p-3 bg-light rounded text-center text-muted small">
                                        <i className="bi bi-check-circle text-success me-1"></i>
                                        No blocked dates. This service is available on all dates.
                                    </div>
                                ) : (
                                    <div className="blocked-dates-container">
                                        {unavailableDates
                                            .slice()
                                            .sort((a, b) => a.date.localeCompare(b.date))
                                            .map((dateEntry, idx) => (
                                                <div 
                                                    key={idx} 
                                                    className={`blocked-date-chip ${dateEntry.fullDay ? '' : 'partial-chip'}`}
                                                    title={dateEntry.fullDay ? "Full day off" : `${dateEntry.slots?.length || 0} slots blocked`}
                                                >
                                                    <i className="bi bi-calendar-event"></i>
                                                    <span>{formatDisplayDate(dateEntry.date)}</span>
                                                    <small>({dateEntry.fullDay ? "Full Off" : `${dateEntry.slots?.length || 0} slots`})</small>
                                                    <button
                                                        type="button"
                                                        className="remove-chip-btn"
                                                        onClick={() => removeDateBlock(dateEntry.date)}
                                                        title={`Unblock ${formatDisplayDate(dateEntry.date)}`}
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-3 bg-light border-top d-flex justify-content-end">
                            <button
                                className="btn btn-secondary px-4 fw-semibold"
                                onClick={() => {
                                    setSelectedService(null);
                                    setSelectedDate(null);
                                    setIsFullDay(false);
                                    setSelectedSlots([]);
                                }}
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* JOB ASSIGNMENT & DISPATCH MODAL */}
            {/* ========================================================================= */}
            {showHelperModal && (
                <div className="modal-overlay">
                    <div className="helper-modal p-0 shadow-lg">
                        {/* Header */}
                        <div className="modal-modern-header border-bottom px-3 px-md-4 py-3 bg-white">
                            <div className="d-flex align-items-center gap-3">
                                <div className="rounded-circle bg-primary bg-opacity-10 text-primary d-flex align-items-center justify-content-center" style={{ width: '42px', height: '42px', flexShrink: 0 }}>
                                    <i className="bi bi-diagram-3-fill fs-5"></i>
                                </div>
                                <div>
                                    <h5 className="modal-modern-title mb-1 text-dark fw-bold">
                                        Job Assignment & Dispatch Rules
                                    </h5>
                                    <div className="d-flex align-items-center flex-wrap gap-2">
                                        <span className="text-secondary small">Service:</span>
                                        <span className="badge bg-primary-subtle text-primary border border-primary-subtle fw-semibold px-2 py-1">
                                            {currentService?.name}
                                        </span>
                                        {currentService?.category && (
                                            <span className="badge bg-light text-secondary border px-2 py-1">
                                                {currentService.category}
                                            </span>
                                        )}
                                        {currentService?.rate && (
                                            <span className="badge bg-light text-success border px-2 py-1 fw-bold">
                                                ₹{currentService.rate}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowHelperModal(false)}
                                className="modal-close-btn"
                                aria-label="Close"
                                title="Close Modal"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="helper-modal-body p-3 p-md-4 bg-light bg-opacity-50">
                            {/* Step 1: Select Fulfillment Strategy */}
                            <div className="mb-4">
                                <div className="d-flex align-items-center justify-content-between mb-2">
                                    <span className="text-uppercase fw-bold text-secondary" style={{ fontSize: '11px', letterSpacing: '0.6px' }}>
                                        Step 1: Choose Fulfillment Strategy
                                    </span>
                                    <span className="text-muted small">Select who fulfills bookings for this service</span>
                                </div>

                                <div className="row g-3">
                                    {/* Option 1: External Helpers */}
                                    <div className="col-md-6">
                                        <div 
                                            className={`dispatch-mode-card ${!useOwn ? 'active-external' : ''}`}
                                            onClick={() => setUseOwn(false)}
                                        >
                                            <div>
                                                <div className="d-flex justify-content-between align-items-start mb-2">
                                                    <div 
                                                        className="dispatch-mode-icon" 
                                                        style={{ 
                                                            background: !useOwn ? '#dbeafe' : '#f1f5f9', 
                                                            color: !useOwn ? '#2563eb' : '#64748b' 
                                                        }}
                                                    >
                                                        <i className="bi bi-people-fill"></i>
                                                    </div>
                                                    <div className="dispatch-mode-radio">
                                                        {!useOwn && <div className="dispatch-mode-radio-inner"></div>}
                                                    </div>
                                                </div>
                                                <h6 className="fw-bold mb-1 text-dark" style={{ fontSize: '14.5px' }}>
                                                    Dispatch to Helpers
                                                </h6>
                                                <p className="text-muted mb-3" style={{ fontSize: '12px', lineHeight: '1.45' }}>
                                                    Automatically alert & dispatch bookings to assigned helpers to accept and fulfill the job.
                                                </p>
                                            </div>
                                            <div>
                                                {!useOwn ? (
                                                    <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1">
                                                        <i className="bi bi-check2-circle me-1"></i> Active Mode • {selectedHelpers.length} Helper(s)
                                                    </span>
                                                ) : (
                                                    <span className="badge bg-light text-secondary border px-2 py-1">
                                                        Click to select
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Option 2: In-House Admin Direct */}
                                    <div className="col-md-6">
                                        <div 
                                            className={`dispatch-mode-card ${useOwn ? 'active-inhouse' : ''}`}
                                            onClick={() => {
                                                setUseOwn(true);
                                                setSelectedHelpers([]);
                                            }}
                                        >
                                            <div>
                                                <div className="d-flex justify-content-between align-items-start mb-2">
                                                    <div 
                                                        className="dispatch-mode-icon" 
                                                        style={{ 
                                                            background: useOwn ? '#d1fae5' : '#f1f5f9', 
                                                            color: useOwn ? '#10b981' : '#64748b' 
                                                        }}
                                                    >
                                                        <i className="bi bi-building-fill-check"></i>
                                                    </div>
                                                    <div className="dispatch-mode-radio">
                                                        {useOwn && <div className="dispatch-mode-radio-inner"></div>}
                                                    </div>
                                                </div>
                                                <h6 className="fw-bold mb-1 text-dark" style={{ fontSize: '14.5px' }}>
                                                    Admin In-House Team
                                                </h6>
                                                <p className="text-muted mb-3" style={{ fontSize: '12px', lineHeight: '1.45' }}>
                                                    Fulfilled directly by internal admin staff. Orders bypass external helper notifications.
                                                </p>
                                            </div>
                                            <div>
                                                {useOwn ? (
                                                    <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">
                                                        <i className="bi bi-shield-fill-check me-1"></i> Active Mode • In-House
                                                    </span>
                                                ) : (
                                                    <span className="badge bg-light text-secondary border px-2 py-1">
                                                        Click to select
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Step 2: Details / Helper Management based on Mode */}
                            {useOwn ? (
                                /* In-House Mode Reassurance Panel */
                                <div className="p-4 bg-white rounded-3 border text-start shadow-sm mb-2">
                                    <div className="d-flex align-items-center gap-3 mb-3">
                                        <div className="rounded-circle bg-success bg-opacity-10 text-success p-3 d-flex align-items-center justify-content-center" style={{ width: '50px', height: '50px' }}>
                                            <i className="bi bi-shield-check fs-3"></i>
                                        </div>
                                        <div>
                                            <h6 className="fw-bold text-dark mb-1">Admin In-House Fulfillment is Active</h6>
                                            <p className="text-muted small mb-0">Direct internal operations mode without external vendor dispatch.</p>
                                        </div>
                                    </div>
                                    <div className="row g-2 pt-2 border-top">
                                        <div className="col-md-4">
                                            <div className="p-2 rounded bg-light border-0">
                                                <div className="fw-bold text-dark small mb-1">
                                                    <i className="bi bi-folder2-open text-primary me-1"></i> Direct In-House Inbox
                                                </div>
                                                <div className="text-muted" style={{ fontSize: '11.5px' }}>
                                                    Bookings appear directly under Admin's Own Bookings.
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-md-4">
                                            <div className="p-2 rounded bg-light border-0">
                                                <div className="fw-bold text-dark small mb-1">
                                                    <i className="bi bi-bell-slash text-secondary me-1"></i> No Helper Alerts
                                                </div>
                                                <div className="text-muted" style={{ fontSize: '11.5px' }}>
                                                    External helpers will not receive claim requests or alerts.
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-md-4">
                                            <div className="p-2 rounded bg-light border-0">
                                                <div className="fw-bold text-dark small mb-1">
                                                    <i className="bi bi-person-badge text-success me-1"></i> Complete Control
                                                </div>
                                                <div className="text-muted" style={{ fontSize: '11.5px' }}>
                                                    Manage, complete, or reassign orders internally anytime.
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* External Helper Dispatch Section */
                                <div>
                                    {/* Escalation Alert Switch Card */}
                                    <div className={`escalation-alert-card mb-4 ${alertIfNoOneAccepts ? 'enabled' : ''}`}>
                                        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                                            <div className="d-flex align-items-center gap-3">
                                                <div className="rounded-circle bg-warning bg-opacity-20 text-warning d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', flexShrink: 0 }}>
                                                    <i className="bi bi-bell-fill fs-5"></i>
                                                </div>
                                                <div>
                                                    <div className="d-flex align-items-center gap-2">
                                                        <span className="fw-bold text-dark" style={{ fontSize: '13.5px' }}>
                                                            Urgent Screen Alert If Unaccepted
                                                        </span>
                                                        {alertIfNoOneAccepts ? (
                                                            <span className="badge bg-warning text-dark border fw-semibold" style={{ fontSize: '10px' }}>
                                                                Sound & Banner ON
                                                            </span>
                                                        ) : (
                                                            <span className="badge bg-light text-muted border" style={{ fontSize: '10px' }}>
                                                                Muted
                                                            </span>
                                                        )}
                                                    </div>
                                                    <small className="text-muted d-block" style={{ fontSize: '11.5px' }}>
                                                        Plays audio chime and flashes high-priority banner on Admin screen if no helper claims new booking promptly.
                                                    </small>
                                                </div>
                                            </div>
                                            <div className="form-check form-switch m-0">
                                                <input
                                                    className="form-check-input"
                                                    type="checkbox"
                                                    role="switch"
                                                    id="alertIfNoOneToggle"
                                                    checked={alertIfNoOneAccepts}
                                                    onChange={(e) => setAlertIfNoOneAccepts(e.target.checked)}
                                                    style={{ cursor: 'pointer', transform: 'scale(1.25)' }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Helper Assignment Toolbar */}
                                    <div className="p-3 bg-white rounded-3 border shadow-sm mb-3">
                                        <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                                            <div>
                                                <span className="text-uppercase fw-bold text-secondary" style={{ fontSize: '11px', letterSpacing: '0.6px' }}>
                                                    Step 2: Assign Qualified Helpers
                                                </span>
                                                <div className="fw-bold text-dark mt-1" style={{ fontSize: '14px' }}>
                                                    Select Helpers to Receive Dispatch Requests
                                                </div>
                                            </div>
                                            <div className="d-flex align-items-center gap-2">
                                                <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1 fw-semibold">
                                                    {selectedHelpers.length} of {helpers.length} Selected
                                                </span>
                                                <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1 fw-semibold">
                                                    {helpers.filter(h => h.isConnected).length} Online
                                                </span>
                                            </div>
                                        </div>

                                        {/* Filters and Search Bar */}
                                        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 pt-2 border-top">
                                            {/* Filter Pills */}
                                            <div className="d-flex gap-1 align-items-center">
                                                <button
                                                    type="button"
                                                    className={`helper-filter-pill ${helperFilterTab === 'all' ? 'active' : ''}`}
                                                    onClick={() => setHelperFilterTab('all')}
                                                >
                                                    All ({helpers.length})
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`helper-filter-pill ${helperFilterTab === 'selected' ? 'active' : ''}`}
                                                    onClick={() => setHelperFilterTab('selected')}
                                                >
                                                    Selected ({selectedHelpers.length})
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`helper-filter-pill ${helperFilterTab === 'online' ? 'active' : ''}`}
                                                    onClick={() => setHelperFilterTab('online')}
                                                >
                                                    <i className="bi bi-circle-fill text-success me-1" style={{ fontSize: '7px' }}></i>
                                                    Online ({helpers.filter(h => h.isConnected).length})
                                                </button>
                                            </div>

                                            {/* Search Input and Select All */}
                                            <div className="d-flex gap-2 align-items-center">
                                                <div className="position-relative" style={{ minWidth: '180px' }}>
                                                    <input
                                                        type="text"
                                                        className="form-control form-control-sm pe-4"
                                                        placeholder="Search helpers..."
                                                        value={helperSearchTerm}
                                                        onChange={(e) => setHelperSearchTerm(e.target.value)}
                                                        style={{ borderRadius: '8px', fontSize: '12px' }}
                                                    />
                                                    {helperSearchTerm ? (
                                                        <span
                                                            onClick={() => setHelperSearchTerm('')}
                                                            className="position-absolute end-0 top-50 translate-middle-y me-2 text-muted"
                                                            style={{ cursor: 'pointer', fontSize: '12px' }}
                                                        >
                                                            ✕
                                                        </span>
                                                    ) : (
                                                        <i className="bi bi-search position-absolute end-0 top-50 translate-middle-y me-2 text-muted" style={{ fontSize: '11px' }}></i>
                                                    )}
                                                </div>
                                                {helpers.length > 0 && (
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-outline-primary fw-semibold d-flex align-items-center gap-1"
                                                        onClick={handleSelectAllHelpers}
                                                        style={{ borderRadius: '8px', fontSize: '12px' }}
                                                    >
                                                        <i className="bi bi-check2-all"></i>
                                                        Toggle Visible
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Helpers List Grid */}
                                    {helpers.length === 0 ? (
                                        <div className="text-center p-4 bg-white rounded-3 border text-muted shadow-sm">
                                            <div className="rounded-circle bg-light d-inline-flex p-3 mb-2">
                                                <i className="bi bi-people fs-2 text-secondary"></i>
                                            </div>
                                            <p className="mb-1 text-dark fw-bold">No registered helpers found</p>
                                            <small className="text-muted d-block mb-2">Add or approve helpers from the "Vendor/Helper Info" tab to assign them to services.</small>
                                        </div>
                                    ) : (
                                        (() => {
                                            const filteredHelpers = helpers.filter(h => {
                                                if (helperFilterTab === 'selected' && !selectedHelpers.includes(String(h._id))) return false;
                                                if (helperFilterTab === 'online' && !h.isConnected) return false;
                                                if (helperSearchTerm.trim()) {
                                                    const q = helperSearchTerm.trim().toLowerCase();
                                                    const matchName = h.name && h.name.toLowerCase().includes(q);
                                                    const matchSkills = h.skills && h.skills.toLowerCase().includes(q);
                                                    const matchPhone = h.phone && h.phone.includes(q);
                                                    if (!matchName && !matchSkills && !matchPhone) return false;
                                                }
                                                return true;
                                            });

                                            if (filteredHelpers.length === 0) {
                                                return (
                                                    <div className="text-center p-4 bg-white rounded-3 border text-muted shadow-sm">
                                                        <i className="bi bi-search fs-3 text-secondary d-block mb-2"></i>
                                                        <p className="mb-1 text-dark fw-semibold">No helpers match your criteria</p>
                                                        <small className="text-muted">Try adjusting your search or tab filters.</small>
                                                        <div className="mt-2">
                                                            <button
                                                                type="button"
                                                                className="btn btn-sm btn-link text-decoration-none"
                                                                onClick={() => {
                                                                    setHelperSearchTerm('');
                                                                    setHelperFilterTab('all');
                                                                }}
                                                            >
                                                                Reset Filters
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            return (
                                                <div className="row g-2" style={{ maxHeight: '330px', overflowY: 'auto' }}>
                                                    {filteredHelpers.map(helper => {
                                                        const isSelected = selectedHelpers.includes(String(helper._id));
                                                        return (
                                                            <div key={helper._id} className="col-sm-6">
                                                                <div 
                                                                    className={`helper-card-item ${isSelected ? 'selected' : ''}`}
                                                                    onClick={() => handleHelperSelect(helper._id, !isSelected)}
                                                                >
                                                                    <div className="d-flex align-items-start gap-2">
                                                                        <div className={`helper-avatar-badge ${helper.isConnected ? 'online' : 'offline'}`}>
                                                                            {helper.name ? helper.name.charAt(0).toUpperCase() : 'H'}
                                                                        </div>
                                                                        <div className="flex-grow-1 min-w-0">
                                                                            <div className="d-flex justify-content-between align-items-center mb-1">
                                                                                <strong className="text-dark text-truncate d-block" style={{ fontSize: '13.5px' }}>
                                                                                    {helper.name}
                                                                                </strong>
                                                                                <div className="helper-check-badge">
                                                                                    {isSelected ? '✓' : ''}
                                                                                </div>
                                                                            </div>
                                                                            <div className="d-flex align-items-center gap-2 mb-1">
                                                                                <span 
                                                                                    className={`badge ${helper.isConnected ? 'bg-success-subtle text-success border border-success-subtle' : 'bg-light text-muted border'}`} 
                                                                                    style={{ fontSize: '10px', padding: '2px 6px' }}
                                                                                >
                                                                                    <i className={`bi bi-circle-fill me-1 ${helper.isConnected ? 'text-success' : 'text-secondary'}`} style={{ fontSize: '6px' }}></i>
                                                                                    {helper.isConnected ? 'Online' : 'Offline'}
                                                                                </span>
                                                                                <span className="text-muted small text-truncate" style={{ fontSize: '11px' }}>
                                                                                    <i className="bi bi-telephone me-1"></i>{helper.phone || 'No phone'}
                                                                                </span>
                                                                            </div>
                                                                            <div className="text-secondary small text-truncate" style={{ fontSize: '11px' }}>
                                                                                <i className="bi bi-tools me-1 text-primary"></i>Skills: {helper.skills || 'General'}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            );
                                        })()
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Modal Sticky Footer */}
                        <div className="p-3 bg-white border-top d-flex justify-content-between align-items-center flex-wrap gap-2">
                            <div>
                                {useOwn ? (
                                    <span className="badge bg-success-subtle text-success border border-success-subtle px-3 py-2 fw-semibold">
                                        <i className="bi bi-shield-check me-1"></i> Mode: Admin In-House Fulfillment
                                    </span>
                                ) : (
                                    <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-2 fw-semibold">
                                        <i className="bi bi-people-fill me-1"></i> Mode: External Dispatch ({selectedHelpers.length} Helper{selectedHelpers.length === 1 ? '' : 's'} Assigned)
                                    </span>
                                )}
                            </div>
                            <div className="d-flex gap-2">
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary px-3 fw-semibold"
                                    onClick={() => setShowHelperModal(false)}
                                    disabled={isSavingHelperAssignment}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary px-4 fw-bold d-flex align-items-center gap-2"
                                    onClick={saveJobAssignment}
                                    disabled={isSavingHelperAssignment}
                                >
                                    {isSavingHelperAssignment ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <i className="bi bi-check-lg"></i>
                                            Save Assignment
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
        </div>
    );
}

export function Users() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUsers = async () => {
            setLoading(true);
            try {
                const response = await axios.get('/api/users/getallusers');
                setUsers(response.data);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, []);

    return (
        <div className='row'>
            {loading && (<Loader />)}
            <div className="col-md-10">
                <table className='table table-bordered table-dark'>
                    <thead className='bs'>
                        <tr>
                            <th>Id</th>
                            <th>Name</th>
                            <th>Email</th>
                            <th>isAdmin</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user._id}>
                                <td>{user._id}</td>
                                <td>{user.name}</td>
                                <td>{user.email}</td>
                                <td>{user.isAdmin ? 'YES' : 'NO'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

        </div>

    );
}
export function Bid() {
    return (
        <div className="col-md-11">
            <h1>Hello</h1>
            <p>Welcome to the Bid Management Section!</p>
        </div>
    );
}


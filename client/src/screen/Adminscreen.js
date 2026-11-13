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
import "react-calendar/dist/Calendar.css";
import "./Adminscreen.css";
import { Link } from 'react-router-dom';
import { requestNotificationPermission, onMessageListener } from '../firebase';

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
    const [activeBookingId, setActiveBookingId] = useState(null);
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
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
        setIsPlayingSound(false);
        setNewBookingAlert(null);
    };

    // Play notification sound
    const playNotificationSound = (shouldLoop = true) => {
        if (!soundEnabled || !audioRef.current) return;
        
        try {
            audioRef.current.loop = shouldLoop;
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(e => {
                console.log('Sound play failed:', e);
            });
            setIsPlayingSound(true);
            
            // Auto-stop sound after 30 seconds
            setTimeout(() => {
                if (isPlayingSound) {
                    stopSound();
                }
            }, 30000);
        } catch (error) {
            console.log('Error playing sound:', error);
        }
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
            {newBookingAlert && isPlayingSound && (
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
                                        stopSound();
                                        setActiveTab('1');
                                    }}
                                    style={{ background: '#2563eb', fontWeight: 600 }}
                                >
                                    View Bookings
                                </Button>
                                <Button
                                    danger
                                    size="middle"
                                    onClick={stopSound}
                                    icon={<span>🔇</span>}
                                    className="stop-sound-btn"
                                >
                                    Stop Sound
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
                        />
                    </TabPane>
                    <TabPane tab="Add Services" key="3">
                        <Addservice userId={user._id} />
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

// Update the Services component to accept onServicesUpdate prop
// Update the Services component to show area-wise pricing
// Update the Services component to show area-wise pricing
export function Services({ userId, isSuperAdmin, onServicesUpdate }) {
    const [services, setServices] =useState([]);
    const [loading, setLoading] =useState(false);
    const [error, setError] = useState(null);
    const [selectedService, setSelectedService] = useState(null);
    const [unavailableDates, setUnavailableDates] = useState([]);
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedSlots, setSelectedSlots] = useState([]);
    const [helpers, setHelpers] = useState([]);
    const [selectedHelpers, setSelectedHelpers] = useState([]);
    const [useOwn, setUseOwn] = useState(false);
    const [showHelperModal, setShowHelperModal] = useState(false);
    const [alertIfNoOneAccepts, setAlertIfNoOneAccepts] = useState(false);
    const [helperSearchTerm, setHelperSearchTerm] = useState('');
    const [currentService, setCurrentService] = useState(null);
    const [isFullDay, setIsFullDay] = useState(false);
    const [expandedPriceRows, setExpandedPriceRows] = useState({}); // Track expanded rows

    const timeSlots = Array.from({ length: 10 }, (_, i) => {
        const hour = i + 9;
        return `${hour}:00 - ${hour + 1}:00`;
    });

    useEffect(() => {
        const fetchServices = async () => {
            try {
                setLoading(true);
                setError(null);
                console.log('Fetching services for userId:', userId);
                const { data } = await axios.get(`/api/service/getvisible?userid=${userId}`);
                console.log('Fetched services:', data);
                setServices(data);
                // Update parent component with services data for visibility toggle
                if (onServicesUpdate) {
                    onServicesUpdate(data);
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

    // Update parent when services change
    useEffect(() => {
        if (onServicesUpdate && services.length > 0) {
            onServicesUpdate(services);
        }
    }, [services, onServicesUpdate]);

    // Toggle expanded price view
    const togglePriceExpansion = (serviceId) => {
        setExpandedPriceRows(prev => ({
            ...prev,
            [serviceId]: !prev[serviceId]
        }));
    };

    // Helper function to format unit display (only first unit if merged)
    const formatUnit = (service) => {
        const u = service.unit === "Other" ? (service.customUnit || "per unit") : (service.unit || "per day");
        if (typeof u === 'string') {
            const parts = u.split(/\s*(?:and|\/|\+|&)\s*/i);
            return parts[0].trim();
        }
        return u;
    };

    // Helper function to get all pricing plans for a service
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

    // Helper function to format unit display for an individual plan
    const formatPlanUnit = (plan) => {
        if (!plan) return 'per day';
        const u = plan.unit === "Other" ? (plan.customUnit || "per unit") : (plan.unit || "per day");
        if (typeof u === 'string') {
            const parts = u.split(/\s*(?:and|\/|\+|&)\s*/i);
            return parts[0].trim();
        }
        return u;
    };

    // Delete service with proper error handling
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

    // Toggle individual service visibility
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

    // Handle calendar open
    const handleCalendarOpen = (service) => {
        setSelectedService(service);
        setUnavailableDates(service.unavailableDates || []);
        setSelectedDate(null);
        setIsFullDay(false);
        setSelectedSlots([]);
    };

    // Handle date click
    const handleDateClick = (date) => {
        const dateString = date.toISOString().split("T")[0];
        setSelectedDate(dateString);

        const existingDate = unavailableDates.find(d => d.date === dateString);
        setSelectedSlots(existingDate?.slots || []);
        setIsFullDay(existingDate?.fullDay || false);
    };

    // Handle slot toggle
    const handleSlotToggle = (slot) => {
        if (isFullDay) return;
        setSelectedSlots(prev =>
            prev.includes(slot)
                ? prev.filter(s => s !== slot)
                : [...prev, slot]
        );
    };

    // Save slots/availability
    const saveSlots = async () => {
        if (!selectedService || !selectedDate) return;

        try {
            const updatedDates = unavailableDates.filter(d => d.date !== selectedDate);

            if (selectedSlots.length > 0 || isFullDay) {
                const newEntry = {
                    date: selectedDate,
                    slots: isFullDay ? timeSlots : selectedSlots,
                    fullDay: isFullDay
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

            setSelectedDate(null);
            setIsFullDay(false);
            setSelectedSlots([]);

            message.success("Availability updated successfully");
        } catch (error) {
            console.error("Error updating availability:", error);
            message.error("Failed to update availability");
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

    // Handle helper selection
    const handleHelperSelect = (helperId, isChecked) => {
        const idStr = String(helperId);
        setSelectedHelpers(prev =>
            isChecked
                ? [...prev.filter(id => String(id) !== idStr), idStr]
                : prev.filter(id => String(id) !== idStr)
        );
    };

    // Handle select all helpers
    const handleSelectAllHelpers = () => {
        if (selectedHelpers.length === helpers.length) {
            setSelectedHelpers([]);
        } else {
            setSelectedHelpers(helpers.map(h => String(h._id)));
        }
    };

    // Handle job assignment modal open
    const handleJobAssignment = (service) => {
        setCurrentService(service);
        const existingIds = (service.assignedHelpers || []).map(h => 
            typeof h === 'object' && h._id ? String(h._id) : String(h)
        );
        setSelectedHelpers(existingIds);
        setUseOwn(!!service.useOwn);
        setAlertIfNoOneAccepts(!!service.alertIfNoOneAccepts);
        setHelperSearchTerm('');
        setShowHelperModal(true);
    };

    // Save job assignment
    const saveJobAssignment = async () => {
        if (!currentService) return;
        try {
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
        }
    };

    // Calendar and pricing styling moved to Adminscreen.css

    return (
        <div className='services-card-wrap'>
            <div className='d-flex justify-content-between align-items-center mb-4'>
                <h1 className="mb-0">Services Management</h1>
            </div>

                    {/* Loading State */}
                    {loading && !error && (
                        <div className="alert alert-info text-center">
                            <div className="spinner-border" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                            <span className="ms-2">Loading services...</span>
                        </div>
                    )}

                    {/* Error State */}
                    {error && (
                        <div className="alert alert-danger text-center">
                            {error}
                            <button
                                className="btn btn-sm btn-outline-light ms-3"
                                onClick={() => window.location.reload()}
                            >
                                Retry
                            </button>
                        </div>
                    )}

                    {/* Services Table */}
                    {!error && !loading && (
                        <div className="table-responsive rounded shadow">
                            <table className='table table-bordered table-hover table-dark mb-0'>
                                <thead className='bg-secondary'>
                                    <tr>
                                        {/* <th>Service ID</th> */}
                                        <th>Name</th>
                                        <th>Daily Rate & Location Pricing</th>
                                        <th>Contact</th>
                                        <th className='text-center'>Visibility</th>
                                        <th className='text-center'>Availability</th>
                                        <th className='text-center'>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {services.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="text-center py-4">
                                                No services found. Add your first service.
                                            </td>
                                        </tr>
                                    ) : (
                                        services.map(service => (
                                            <React.Fragment key={service._id}>
                                                <tr>
                                                    {/* <td>{service._id.substring(0, 8)}...</td> */}
                                                    <td>
                                                        <Link
                                                            to={`/book/${service._id}`}
                                                            className="text-white text-decoration-underline"
                                                            target="_blank"
                                                        >
                                                            {service.name}
                                                        </Link>
                                                    </td>
                                                    <td style={{ minWidth: '260px' }}>
                                                        {(() => {
                                                            const plans = getPricingPlans(service);
                                                            const hasLocations = service.locationPricing && service.locationPricing.length > 0;
                                                            const isExpanded = !!expandedPriceRows[service._id];
                                                            const canExpand = hasLocations || plans.length > 1;

                                                            return (
                                                                <div className="price-summary">
                                                                    {/* Price Plans Section */}
                                                                    <div className="price-plans-section">
                                                                        {plans.length === 1 ? (
                                                                            <div className="d-flex align-items-center flex-wrap gap-1">
                                                                                <span className="text-muted small"><strong>Rate:</strong></span>
                                                                                <span className="price-tag base fw-bold ms-1">₹{plans[0].price}</span>
                                                                                <small className="text-muted">/{formatPlanUnit(plans[0])}</small>
                                                                                <span className="badge bg-success ms-1" style={{ fontSize: '9px', padding: '2px 5px' }}>
                                                                                    Default
                                                                                </span>
                                                                                {plans[0].isCountable && (
                                                                                    <small className="text-warning ms-1" style={{ fontSize: '10px' }}>
                                                                                        (Countable{plans[0].maxQuantityPerDay ? `: max ${plans[0].maxQuantityPerDay}/day` : ''})
                                                                                    </small>
                                                                                )}
                                                                            </div>
                                                                        ) : (
                                                                            <div className="price-plans-list">
                                                                                <div className="d-flex align-items-center justify-content-between mb-1">
                                                                                    <span className="badge bg-info text-dark fw-bold" style={{ fontSize: '10px' }}>
                                                                                        <i className="bi bi-tags-fill me-1"></i>{plans.length} Price Plans
                                                                                    </span>
                                                                                </div>
                                                                                <div className="d-flex flex-column gap-1">
                                                                                    {plans.map((p, pIdx) => (
                                                                                        <div 
                                                                                            key={pIdx} 
                                                                                            className="d-flex align-items-center justify-content-between px-2 py-1 rounded"
                                                                                            style={{
                                                                                                background: '#282828',
                                                                                                borderLeft: p.isDefault ? '3px solid #16a34a' : '3px solid #6c757d',
                                                                                                fontSize: '11.5px'
                                                                                            }}
                                                                                        >
                                                                                            <div className="d-flex align-items-center flex-wrap">
                                                                                                <span className="price-tag base fw-bold">₹{p.price}</span>
                                                                                                <small className="text-light opacity-75 ms-1">/{formatPlanUnit(p)}</small>
                                                                                                {p.isDefault && (
                                                                                                    <span className="badge bg-success ms-1" style={{ fontSize: '8.5px', padding: '1px 4px' }}>
                                                                                                        Default
                                                                                                    </span>
                                                                                                )}
                                                                                            </div>
                                                                                            {p.isCountable && p.maxQuantityPerDay && (
                                                                                                <small className="text-secondary ms-1" style={{ fontSize: '10px' }}>
                                                                                                    Max: {p.maxQuantityPerDay}
                                                                                                </small>
                                                                                            )}
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {/* Location Pricing Summary & Expand Toggle */}
                                                                    <div className="d-flex align-items-center justify-content-between mt-2 pt-1 border-top border-secondary">
                                                                        {hasLocations ? (
                                                                            <span className="badge bg-primary" style={{ fontSize: '10px' }}>
                                                                                <i className="bi bi-geo-alt-fill me-1"></i>{service.locationPricing.length} {service.locationPricing.length === 1 ? 'Location' : 'Locations'}
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-muted small" style={{ fontSize: '11px' }}>
                                                                                <i className="bi bi-geo-alt me-1"></i>No location pricing
                                                                            </span>
                                                                        )}

                                                                        {canExpand && (
                                                                            <button
                                                                                className="expand-btn"
                                                                                onClick={() => togglePriceExpansion(service._id)}
                                                                                style={{ fontSize: '11px', padding: '2px 8px' }}
                                                                            >
                                                                                {isExpanded ? '▲ Hide Details' : '▼ View All Plans & Rates'}
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()}
                                                    </td>
                                                    <td>{service.phonenumber}</td>

                                                    {/* Visibility Status */}
                                                    <td className='text-center'>
                                                        <button
                                                            className={`btn ${service.isVisible ? "btn-success" : "btn-secondary"} btn-sm px-3`}
                                                            onClick={() => toggleVisibility(service._id, service.isVisible)}
                                                            disabled={loading}
                                                        >
                                                            {service.isVisible ? "ACTIVE" : "HIDDEN"}
                                                        </button>
                                                    </td>

                                                    {/* Availability Status */}
                                                    <td className='text-center align-middle'>
                                                        {service.unavailableDates && service.unavailableDates.length > 0 ? (
                                                            <span className="badge bg-warning">
                                                                {service.unavailableDates.length} blocked dates
                                                            </span>
                                                        ) : (
                                                            <span className="badge bg-success">Fully Available</span>
                                                        )}
                                                    </td>

                                                    {/* Action Buttons */}
                                                    <td className='text-center'>
                                                        <div className="d-flex gap-2 justify-content-center">
                                                            <button
                                                                className="btn btn-danger btn-sm"
                                                                onClick={() => deleteService(service._id)}
                                                                disabled={loading}
                                                            >
                                                                <i className="bi bi-trash"></i> Delete
                                                            </button>
                                                            <button
                                                                className="btn btn-primary btn-sm"
                                                                onClick={() => handleCalendarOpen(service)}
                                                                disabled={loading}
                                                            >
                                                                <i className="bi bi-calendar-event"></i> Calendar
                                                            </button>
                                                            <button
                                                                className={`btn btn-sm ${service.useOwn ? 'btn-outline-info' : (service.assignedHelpers && service.assignedHelpers.length > 0 ? 'btn-info' : 'btn-outline-secondary')}`}
                                                                onClick={() => handleJobAssignment(service)}
                                                                disabled={loading}
                                                                title="Assign helpers for this service"
                                                                style={{ whiteSpace: 'nowrap' }}
                                                            >
                                                                <i className="bi bi-people me-1"></i>
                                                                {service.useOwn 
                                                                    ? "Assign (Own)" 
                                                                    : (service.assignedHelpers && service.assignedHelpers.length > 0 
                                                                        ? `Assign (${service.assignedHelpers.length})` 
                                                                        : "Assign")}
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>

                                                {/* Expanded Price Plans & Location Pricing Row */}
                                                {expandedPriceRows[service._id] && (
                                                    <tr className="location-pricing-row">
                                                        <td colSpan="6" style={{ padding: 0 }}>
                                                            <div className="expanded-pricing-container p-3" style={{ background: '#1c1c1c', borderTop: '1px solid #333', borderBottom: '2px solid #444' }}>
                                                                {(() => {
                                                                    const plans = getPricingPlans(service);
                                                                    const hasLocations = service.locationPricing && service.locationPricing.length > 0;

                                                                    return (
                                                                        <div>
                                                                            {/* SECTION 1: All Price Plans */}
                                                                            <div className="mb-4">
                                                                                <div className="d-flex align-items-center justify-content-between mb-2">
                                                                                    <h6 className="text-light mb-0 d-flex align-items-center">
                                                                                        <i className="bi bi-card-checklist text-success me-2"></i>
                                                                                        <span>Price Plans for <strong className="text-info">{service.name}</strong></span>
                                                                                        <span className="badge bg-success ms-2" style={{ fontSize: '10px' }}>
                                                                                            {plans.length} {plans.length === 1 ? 'Plan' : 'Plans'} Available
                                                                                        </span>
                                                                                    </h6>
                                                                                </div>
                                                                                <div className="table-responsive">
                                                                                    <table className="table table-sm table-dark table-bordered mb-0" style={{ fontSize: '12px', background: '#252525' }}>
                                                                                        <thead style={{ background: '#181818' }}>
                                                                                            <tr>
                                                                                                <th style={{ width: '40px' }}>#</th>
                                                                                                <th>Plan / Billing Unit</th>
                                                                                                <th>Base Price</th>
                                                                                                <th>Status</th>
                                                                                                <th>Quantity / Capacity</th>
                                                                                                <th>Max Bookings / Day</th>
                                                                                                <th>Description</th>
                                                                                            </tr>
                                                                                        </thead>
                                                                                        <tbody>
                                                                                            {plans.map((p, idx) => (
                                                                                                <tr key={idx} style={{ background: p.isDefault ? '#222d22' : 'inherit' }}>
                                                                                                    <td>{idx + 1}</td>
                                                                                                    <td>
                                                                                                        <strong className="text-light">{formatPlanUnit(p)}</strong>
                                                                                                        {p.unit === 'Other' && p.customUnit && (
                                                                                                            <span className="text-muted ms-1">({p.customUnit})</span>
                                                                                                        )}
                                                                                                    </td>
                                                                                                    <td>
                                                                                                        <span className="price-tag base fw-bold">₹{p.price}</span>
                                                                                                        <small className="text-muted ms-1">/{formatPlanUnit(p)}</small>
                                                                                                    </td>
                                                                                                    <td>
                                                                                                        {p.isDefault ? (
                                                                                                            <span className="badge bg-success">Default Plan</span>
                                                                                                        ) : (
                                                                                                            <span className="badge bg-secondary">Standard Plan</span>
                                                                                                        )}
                                                                                                    </td>
                                                                                                    <td>
                                                                                                        {p.isCountable ? (
                                                                                                            <span className="text-warning">
                                                                                                                Countable {p.maxQuantityPerDay ? `(Max: ${p.maxQuantityPerDay} units/day)` : '(Unlimited qty)'}
                                                                                                            </span>
                                                                                                        ) : (
                                                                                                            <span className="text-muted">Fixed (Single Unit)</span>
                                                                                                        )}
                                                                                                    </td>
                                                                                                    <td>
                                                                                                        {p.maxUsersPerDay ? (
                                                                                                            <span>{p.maxUsersPerDay} users/day</span>
                                                                                                        ) : (
                                                                                                            <span className="text-muted">Unlimited</span>
                                                                                                        )}
                                                                                                    </td>
                                                                                                    <td>
                                                                                                        {p.description ? (
                                                                                                            <span>{p.description}</span>
                                                                                                        ) : (
                                                                                                            <span className="text-muted">—</span>
                                                                                                        )}
                                                                                                    </td>
                                                                                                </tr>
                                                                                            ))}
                                                                                        </tbody>
                                                                                    </table>
                                                                                </div>
                                                                            </div>

                                                                            {/* SECTION 2: Location-Based Pricing */}
                                                                            <div>
                                                                                <div className="d-flex align-items-center justify-content-between mb-2">
                                                                                    <h6 className="text-light mb-0 d-flex align-items-center">
                                                                                        <i className="bi bi-geo-alt-fill text-primary me-2"></i>
                                                                                        <span>Location Pricing & Rates Breakdown</span>
                                                                                        {hasLocations && (
                                                                                            <span className="badge bg-primary ms-2" style={{ fontSize: '10px' }}>
                                                                                                {service.locationPricing.length} {service.locationPricing.length === 1 ? 'Location' : 'Locations'}
                                                                                            </span>
                                                                                        )}
                                                                                    </h6>
                                                                                </div>

                                                                                {hasLocations ? (
                                                                                    <div className="table-responsive">
                                                                                        <table className="table table-sm table-dark table-bordered mb-0" style={{ fontSize: '12px', background: '#252525' }}>
                                                                                            <thead style={{ background: '#181818' }}>
                                                                                                <tr>
                                                                                                    <th>Location Name</th>
                                                                                                    <th>Address</th>
                                                                                                    <th>Extra Charge</th>
                                                                                                    <th>Rates Across All Price Plans (Base + Extra = Total)</th>
                                                                                                    <th>Optional Services Extra</th>
                                                                                                </tr>
                                                                                            </thead>
                                                                                            <tbody>
                                                                                                {service.locationPricing.map((location, lIdx) => (
                                                                                                    <tr key={lIdx}>
                                                                                                        <td className="location-name align-middle">
                                                                                                            <i className="bi bi-geo-alt-fill me-1" style={{ color: '#0d6efd' }}></i>
                                                                                                            {location.locationName}
                                                                                                        </td>
                                                                                                        <td className="text-muted small align-middle">
                                                                                                            {location.locationAddress}
                                                                                                        </td>
                                                                                                        <td className="align-middle">
                                                                                                            <span className="price-tag extra">
                                                                                                                +₹{location.extraPrice || 0}
                                                                                                            </span>
                                                                                                        </td>
                                                                                                        <td>
                                                                                                            <div className="d-flex flex-column gap-1">
                                                                                                                {plans.map((p, pIdx) => {
                                                                                                                    const baseVal = Number(p.price) || 0;
                                                                                                                    const extraVal = Number(location.extraPrice) || 0;
                                                                                                                    const totalVal = baseVal + extraVal;
                                                                                                                    return (
                                                                                                                        <div 
                                                                                                                            key={pIdx}
                                                                                                                            className="d-flex align-items-center justify-content-between px-2 py-1 rounded"
                                                                                                                            style={{ background: '#2b2b2b', fontSize: '11px' }}
                                                                                                                        >
                                                                                                                            <span>
                                                                                                                                <strong className="text-light">{formatPlanUnit(p)}:</strong>
                                                                                                                                <span className="text-muted ms-1">(Base: ₹{baseVal})</span>
                                                                                                                                {extraVal > 0 && <span className="price-tag extra ms-1">(Extra: +₹{extraVal})</span>}
                                                                                                                            </span>
                                                                                                                            <span className="ms-2">
                                                                                                                                <span className="price-tag total fw-bold">₹{totalVal}</span>
                                                                                                                                <small className="text-muted ms-1">/{formatPlanUnit(p)}</small>
                                                                                                                                {p.isDefault && (
                                                                                                                                    <span className="badge bg-success ms-1" style={{ fontSize: '8px', padding: '1px 4px' }}>
                                                                                                                                        Default
                                                                                                                                    </span>
                                                                                                                                )}
                                                                                                                            </span>
                                                                                                                        </div>
                                                                                                                    );
                                                                                                                })}
                                                                                                            </div>
                                                                                                        </td>
                                                                                                        <td className="align-middle">
                                                                                                            {location.optionalInputsExtra && location.optionalInputsExtra.length > 0 ? (
                                                                                                                <div className="small">
                                                                                                                    {location.optionalInputsExtra.map((opt, optIdx) => (
                                                                                                                        <div key={optIdx}>
                                                                                                                            <span>{opt.inputName}: </span>
                                                                                                                            <span className="price-tag extra">+₹{opt.extraPrice}</span>
                                                                                                                        </div>
                                                                                                                    ))}
                                                                                                                </div>
                                                                                                            ) : (
                                                                                                                <span className="text-muted">—</span>
                                                                                                            )}
                                                                                                        </td>
                                                                                                    </tr>
                                                                                                ))}
                                                                                            </tbody>
                                                                                        </table>
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className="p-3 text-center rounded" style={{ background: '#252525', color: '#888', fontSize: '12px' }}>
                                                                                        <i className="bi bi-info-circle me-1"></i>
                                                                                        No location-based pricing set for this service. Standard base price plans apply to all locations.
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })()}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Calendar Modal */}
                    {selectedService && (
                        <div className="modal-overlay">
                            <div className="calendar-modal bg-dark p-4 rounded">
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h4 className="mb-0 text-light">
                                        Availability for {selectedService.name}
                                    </h4>
                                    <button
                                        onClick={() => {
                                            setSelectedService(null);
                                            setSelectedDate(null);
                                            setIsFullDay(false);
                                            setSelectedSlots([]);
                                        }}
                                        className="btn btn-close btn-close-white"
                                    ></button>
                                </div>

                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <Calendar
                                            onClickDay={handleDateClick}
                                            tileClassName={({ date }) => {
                                                const dateStr = date.toISOString().split("T")[0];
                                                const unavailable = unavailableDates.find(d => d.date === dateStr);
                                                if (unavailable) {
                                                    return unavailable.fullDay
                                                        ? 'fully-unavailable'
                                                        : 'partially-unavailable';
                                                }
                                                return '';
                                            }}
                                            className="availability-calendar bg-secondary text-light w-100"
                                        />
                                    </div>

                                    <div className="col-md-6">
                                        {selectedDate ? (
                                            <div className="time-slots-section">
                                                <div className="d-flex justify-content-between align-items-center mb-3">
                                                    <h5 className="text-light mb-0">
                                                        {new Date(selectedDate).toLocaleDateString('en-US', {
                                                            weekday: 'long',
                                                            year: 'numeric',
                                                            month: 'long',
                                                            day: 'numeric'
                                                        })}
                                                    </h5>
                                                    <div className="form-check form-switch">
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
                                                        />
                                                        <label className="form-check-label text-light" htmlFor="fullDayToggle">
                                                            Full Day Unavailable
                                                        </label>
                                                    </div>
                                                </div>

                                                <p className="text-light mb-3">
                                                    {isFullDay
                                                        ? "Service will be completely unavailable for the entire day."
                                                        : "Select specific time slots that are unavailable:"}
                                                </p>

                                                <div className="time-slots-grid">
                                                    {timeSlots.map(slot => (
                                                        <button
                                                            key={slot}
                                                            className={`time-slot-btn btn btn-sm ${isFullDay
                                                                ? 'btn-dark disabled'
                                                                : selectedSlots.includes(slot)
                                                                    ? 'btn-danger'
                                                                    : 'btn-outline-light'
                                                                }`}
                                                            onClick={() => handleSlotToggle(slot)}
                                                            disabled={isFullDay}
                                                        >
                                                            {slot}
                                                            {selectedSlots.includes(slot) && (
                                                                <span className="selected-indicator">✓</span>
                                                            )}
                                                        </button>
                                                    ))}
                                                </div>

                                                <div className="d-flex gap-2 mt-4">
                                                    <button
                                                        className="btn btn-primary flex-grow-1"
                                                        onClick={saveSlots}
                                                        disabled={!selectedDate || (selectedSlots.length === 0 && !isFullDay)}
                                                    >
                                                        Save Changes
                                                    </button>
                                                    <button
                                                        className="btn btn-outline-light"
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
                                            <div className="text-center text-light h-100 d-flex flex-column justify-content-center">
                                                <i className="bi bi-calendar-check fs-1 mb-3"></i>
                                                <h5>Select a date to manage availability</h5>
                                                <p className="text-muted">
                                                    Click on any date in the calendar to mark it as unavailable
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-4">
                                    <h6 className="text-light mb-2">Current Blocked Dates:</h6>
                                    {unavailableDates.length === 0 ? (
                                        <p className="text-muted">No dates blocked yet</p>
                                    ) : (
                                        <div className="d-flex flex-wrap gap-2">
                                            {unavailableDates.map((dateEntry, index) => (
                                                <span key={index} className="badge bg-danger">
                                                    {new Date(dateEntry.date).toLocaleDateString()}
                                                    {dateEntry.fullDay ? " (Full Day)" : ` (${dateEntry.slots.length} slots)`}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Job Assignment Modal */}
                    {showHelperModal && (
                        <div className="modal-overlay">
                            <div className="helper-modal p-4 rounded shadow-lg" style={{ maxWidth: '820px', width: '95%', maxHeight: '90vh', overflowY: 'auto', background: '#1e293b', color: '#f8fafc' }}>
                                <div className="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom border-secondary">
                                    <div>
                                        <h4 className="mb-1 text-light fw-bold">
                                            <i className="bi bi-person-badge text-primary me-2"></i>
                                            Job Assignment for <span className="text-info">{currentService?.name}</span>
                                        </h4>
                                        <small className="text-muted">
                                            Assign helpers to automatically receive bookings for this service.
                                        </small>
                                    </div>
                                    <button
                                        onClick={() => setShowHelperModal(false)}
                                        className="btn btn-close btn-close-white"
                                        aria-label="Close"
                                    ></button>
                                </div>

                                {/* Option 1: Admin handles directly (Own booking) */}
                                <div className="p-3 mb-3 rounded" style={{ background: useOwn ? 'rgba(37, 99, 235, 0.15)' : '#334155', border: useOwn ? '1px solid #3b82f6' : '1px solid #475569' }}>
                                    <div className="form-check form-switch mb-0">
                                        <input
                                            className="form-check-input"
                                            type="checkbox"
                                            role="switch"
                                            id="useOwnToggle"
                                            checked={useOwn}
                                            onChange={(e) => {
                                                const checked = e.target.checked;
                                                setUseOwn(checked);
                                                if (checked) setSelectedHelpers([]);
                                            }}
                                            style={{ cursor: 'pointer' }}
                                        />
                                        <label className="form-check-label text-light fw-semibold ms-2" htmlFor="useOwnToggle" style={{ cursor: 'pointer' }}>
                                            Admin can only show in own booking (Admin handles directly)
                                        </label>
                                    </div>
                                    <small className="d-block text-muted ms-4 mt-1">
                                        When enabled, this service will be fulfilled by admin / own in-house staff only. It will show only in admin's own bookings and will not dispatch to external helpers.
                                    </small>
                                </div>

                                {/* Option 2: Alert if no one selected / accepted this service */}
                                <div className="p-3 mb-4 rounded" style={{ background: alertIfNoOneAccepts ? 'rgba(234, 88, 12, 0.15)' : '#334155', border: alertIfNoOneAccepts ? '1px solid #f97316' : '1px solid #475569' }}>
                                    <div className="form-check form-switch mb-0">
                                        <input
                                            className="form-check-input"
                                            type="checkbox"
                                            role="switch"
                                            id="alertIfNoOneToggle"
                                            checked={alertIfNoOneAccepts}
                                            onChange={(e) => setAlertIfNoOneAccepts(e.target.checked)}
                                            style={{ cursor: 'pointer' }}
                                        />
                                        <label className="form-check-label text-light fw-semibold ms-2" htmlFor="alertIfNoOneToggle" style={{ cursor: 'pointer' }}>
                                            Alert / Notification on Admin screen if no one selected or accepted this service
                                        </label>
                                    </div>
                                    <small className="d-block text-muted ms-4 mt-1">
                                        Sends sound alert and visual notification banner to admin screen when a customer books this service and no helper is assigned or has accepted yet.
                                    </small>
                                </div>

                                {!useOwn ? (
                                    <>
                                        <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                                            <h5 className="text-light mb-0 fw-bold">
                                                Select Helpers for this Service ({selectedHelpers.length} selected)
                                            </h5>
                                            <div className="d-flex gap-2">
                                                <input
                                                    type="text"
                                                    className="form-control form-control-sm bg-dark text-light border-secondary"
                                                    placeholder="Search helpers..."
                                                    value={helperSearchTerm}
                                                    onChange={(e) => setHelperSearchTerm(e.target.value)}
                                                    style={{ width: '180px' }}
                                                />
                                                {helpers.length > 0 && (
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-outline-info"
                                                        onClick={handleSelectAllHelpers}
                                                    >
                                                        {selectedHelpers.length === helpers.length ? "Deselect All" : "Select All"}
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {helpers.length === 0 ? (
                                            <div className="text-center p-4 rounded bg-dark border border-secondary text-muted">
                                                <i className="bi bi-people fs-2 d-block mb-2 text-secondary"></i>
                                                <p className="mb-1 text-light">No helpers found for your admin account.</p>
                                                <small>You can add and manage helpers from the "Vendor/Helper Info" tab.</small>
                                            </div>
                                        ) : (
                                            <div className="row g-3" style={{ maxHeight: '360px', overflowY: 'auto' }}>
                                                {helpers
                                                    .filter(h => !helperSearchTerm || 
                                                        h.name?.toLowerCase().includes(helperSearchTerm.toLowerCase()) || 
                                                        h.skills?.toLowerCase().includes(helperSearchTerm.toLowerCase()) ||
                                                        h.phone?.includes(helperSearchTerm)
                                                    )
                                                    .map(helper => {
                                                        const isSelected = selectedHelpers.includes(String(helper._id));
                                                        return (
                                                            <div key={helper._id} className="col-md-6">
                                                                <div 
                                                                    className={`card text-light h-100 ${isSelected ? 'border-primary' : 'border-secondary'}`}
                                                                    style={{ 
                                                                        background: isSelected ? '#1e3a5f' : '#1e293b', 
                                                                        cursor: 'pointer',
                                                                        transition: 'all 0.2s ease'
                                                                    }}
                                                                    onClick={() => handleHelperSelect(helper._id, !isSelected)}
                                                                >
                                                                    <div className="card-body p-3">
                                                                        <div className="d-flex align-items-start gap-3">
                                                                            <input
                                                                                className="form-check-input mt-1"
                                                                                type="checkbox"
                                                                                id={`helper-${helper._id}`}
                                                                                checked={isSelected}
                                                                                onChange={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handleHelperSelect(helper._id, e.target.checked);
                                                                                }}
                                                                                style={{ cursor: 'pointer' }}
                                                                            />
                                                                            <div className="flex-grow-1">
                                                                                <div className="d-flex align-items-center justify-content-between mb-1">
                                                                                    <h6 className="mb-0 fw-bold text-light">{helper.name}</h6>
                                                                                    <span className={`badge ${helper.isConnected ? 'bg-success' : 'bg-secondary'}`} style={{ fontSize: '10px' }}>
                                                                                        {helper.isConnected ? 'Online' : 'Offline'}
                                                                                    </span>
                                                                                </div>
                                                                                <small className="d-block text-info">📞 {helper.phone}</small>
                                                                                <small className="d-block text-muted">Skills: {helper.skills || 'General'}</small>
                                                                                <small className="d-block text-muted">Exp: {helper.experience || 'N/A'} yrs</small>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="p-4 rounded bg-dark border border-secondary text-center">
                                        <i className="bi bi-shield-check fs-2 text-primary d-block mb-2"></i>
                                        <h6 className="text-light fw-bold">Internal / Admin Booking Mode Active</h6>
                                        <p className="text-muted small mb-0">
                                            This service will be fulfilled by admin directly. Bookings will show in Admin's own bookings without external helper assignments.
                                        </p>
                                    </div>
                                )}

                                <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top border-secondary">
                                    <button
                                        type="button"
                                        className="btn btn-outline-light px-4"
                                        onClick={() => setShowHelperModal(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-primary px-4 fw-semibold"
                                        onClick={saveJobAssignment}
                                    >
                                        <i className="bi bi-check-lg me-1"></i> Save Assignment
                                    </button>
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


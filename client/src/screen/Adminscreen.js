import React, { useState, useEffect, useRef } from "react";
import { Tabs, message, Row, Col, Card, Statistic, Table, Button, Tag } from "antd";
import axios from "axios";
import Error from "../components/Error";
import Loader from "../components/Loader";
import { Addservice } from "../components/Addservice.js";
import { VendorHelperInfo } from "../components/VendorHelperInfo";
import Calendar from "react-calendar";
import { VendorProfile } from "../components/VendorProfile .js";
import "react-calendar/dist/Calendar.css";
import { Link } from 'react-router-dom';
import { requestNotificationPermission, onMessageListener } from '../firebase';

const { TabPane } = Tabs;


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
    const [lastCheckedTime, setLastCheckedTime] = useState(localStorage.getItem('adminLastCheckedTime') || Date.now().toString());
    const [soundEnabled, setSoundEnabled] = useState(localStorage.getItem('adminSoundEnabled') !== 'false');
    const [isPlayingSound, setIsPlayingSound] = useState(false);
    const [newBookingAlert, setNewBookingAlert] = useState(null);
    const [notifiedBookingIds, setNotifiedBookingIds] = useState(
        new Set(JSON.parse(localStorage.getItem('adminNotifiedBookings') || '[]'))
    );
    const [refreshKey, setRefreshKey] = useState(0);
    
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

   // Adminscreen mein checkNewBookings function update karo
const checkNewBookings = async () => {
    try {
        const response = await axios.get(`/api/bookings/check-new`, {
            params: { 
                userid: user._id, 
                lastCheckedTime: lastCheckedTime
            }
        });
        
        const newBookings = response.data || [];
        
        if (newBookings.length > 0) {
            // Filter out bookings that have already been notified
            const trulyNewBookings = newBookings.filter(booking => 
                !notifiedBookingIds.has(booking._id)
            );
            
            if (trulyNewBookings.length > 0) {
                // Add these booking IDs to notified set
                const newNotifiedIds = new Set(notifiedBookingIds);
                trulyNewBookings.forEach(booking => {
                    newNotifiedIds.add(booking._id);
                });
                setNotifiedBookingIds(newNotifiedIds);
                
                // Save to localStorage
                localStorage.setItem('adminNotifiedBookings', JSON.stringify([...newNotifiedIds]));
                
                const count = trulyNewBookings.length;
                
                // ✅ Only show alert if NOT already playing sound for same booking
                // Check if any of these bookings are already in current alert
                const currentAlertBookingIds = newBookingAlert?.bookings?.map(b => b._id) || [];
                const isDuplicateAlert = trulyNewBookings.some(b => 
                    currentAlertBookingIds.includes(b._id)
                );
                
                if (!isDuplicateAlert) {
                    const newBookingInfo = {
                        count: count,
                        bookings: trulyNewBookings,
                        timestamp: new Date()
                    };
                    
                    setNewBookingAlert(newBookingInfo);
                    
                    // Play sound if enabled
                    if (soundEnabled) {
                        playNotificationSound(true);
                    }
                    
                    // Browser notification
                    if (Notification.permission === 'granted') {
                        new Notification(`📢 New Booking${count > 1 ? 's' : ''}!`, {
                            body: `${count} new booking${count > 1 ? 's have' : ' has'} been received`,
                            icon: '/icon-192.png',
                            vibrate: [200, 100, 200]
                        });
                    }
                    
                    // Refresh bookings
                    setRefreshKey(prev => prev + 1);
                    
                    message.info(`${count} new booking${count > 1 ? 's' : ''} received!`);
                }
            }
        }
        
        // Update last checked time
        const newCheckedTime = Date.now().toString();
        setLastCheckedTime(newCheckedTime);
        localStorage.setItem('adminLastCheckedTime', newCheckedTime);
        
    } catch (error) {
        console.log('Error checking new bookings:', error);
    }
};

useEffect(() => {
    // Listen for booking confirmed events to remove from notified IDs
    const handleBookingConfirmed = (event) => {
        const { bookingId } = event.detail || {};
        if (bookingId) {
            setNotifiedBookingIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(bookingId);
                localStorage.setItem('adminNotifiedBookings', JSON.stringify([...newSet]));
                return newSet;
            });
        }
    };
    
    window.addEventListener('bookingConfirmed', handleBookingConfirmed);
    
    return () => {
        window.removeEventListener('bookingConfirmed', handleBookingConfirmed);
    };
}, []);
    useEffect(() => {
        const handleBookingUpdate = (event) => {
            const { bookingId, status } = event.detail || {};
            
            // If admin confirms or rejects a booking, stop the sound
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
            
            // Check which bookings are still in 'booked/pending/inquiry' status
            const response = await axios.get(`/api/bookings/check-status`, {
                params: { bookingIds: storedIds.join(',') }
            });
            
            const activeBookingIds = response.data.activeIds || [];
            const cleanedIds = storedIds.filter(id => activeBookingIds.includes(id));
            
            if (cleanedIds.length !== storedIds.length) {
                localStorage.setItem('adminNotifiedBookings', JSON.stringify(cleanedIds));
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
            // Determine user type
            let userType = 'vendor';
            if (isSuperAdmin) userType = 'superadmin';
            else if (isAdmin) userType = 'admin';
            
            // Register for push notifications
            requestNotificationPermission(user._id, userType);
            
            // Listen for foreground notifications
            onMessageListener().then(payload => {
                console.log('Foreground notification:', payload);
                // Immediately check for new bookings
                checkNewBookings();
                setRefreshKey(prev => prev + 1);
            });
            
            // Start polling for new bookings (60 seconds = 60000 ms)
            pollingIntervalRef.current = setInterval(checkNewBookings, 60000);
            
            // Initial check
            checkNewBookings();
            
            return () => {
                if (pollingIntervalRef.current) {
                    clearInterval(pollingIntervalRef.current);
                }
            };
        }
    }, [user?._id]);

    // Add this useEffect in your Adminscreen component (after the existing useEffect hooks)

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
                // Fallback: calculate data manually if endpoint doesn't work
                await fetchDashboardDataManually();
            }
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
            // Fallback to manual fetch
            await fetchDashboardDataManually();
        } finally {
            setDashboardLoading(false);
        }
    };
    
    const fetchDashboardDataManually = async () => {
        try {
            // Fetch bookings
            const bookingsRes = await axios.get(`/api/bookings/getallbookings?userid=${user._id}`);
            const bookings = bookingsRes.data || [];
            
            // Fetch services
            const servicesRes = await axios.get(`/api/service/getvisible?userid=${user._id}`);
            const services = servicesRes.data || [];
            
            // Calculate stats
            const totalBookings = bookings.length;
            const totalServices = services.length;
            const revenue = bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
            const recentBookings = bookings.slice(0, 5);
            
            let totalUsers = 0;
            let totalVendors = 0;
            
            // Only fetch users if super admin
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

    if (!isSuperAdmin && !isAdmin && !isVendor) {
        return <div className="access-denied">Access Denied: This panel is for admins/vendors only.</div>;
    }

    return (
        <div className="admin-container">
            {/* AUDIO ELEMENT FOR SOUND */}
            <audio ref={audioRef} preload="auto" style={{ display: 'none' }}>
                <source src="/sounds/booking.mp3" type="audio/mpeg" />
            </audio>
            
            {/* NEW BOOKING ALERT BANNER */}
            {newBookingAlert && isPlayingSound && (
                <div className="booking-alert-container">
                    <Card className="booking-alert-card">
                        <div className="alert-content">
                            <div className="alert-info">
                                <div className="alert-title">
                                    🔔 <strong>New Booking Alert!</strong>
                                </div>
                                <div className="alert-message">
                                    {newBookingAlert.count} new booking
                                    {newBookingAlert.count > 1 ? 's have' : ' has'} been received
                                </div>
                                {newBookingAlert.bookings.length > 0 && (
                                    <div className="alert-service">
                                        {newBookingAlert.bookings[0].service}
                                    </div>
                                )}
                            </div>
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
                    </Card>
                </div>
            )}

            {/* Admin Header */}
            <header className="admin-header">
                <div className="header-container">
                    <h1 className="admin-title">{getDashboardTitle()}</h1>
                    
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
                        
                        <div className="action-buttons">
                            <button
                                onClick={toggleSound}
                                className={`sound-toggle-btn ${soundEnabled ? 'sound-on' : 'sound-off'}`}
                                title={soundEnabled ? "Sound On" : "Sound Off"}
                            >
                                {soundEnabled ? '🔊' : '🔇'}
                                <span className="btn-label">{soundEnabled ? 'Sound On' : 'Sound Off'}</span>
                            </button>
                            
                            {isPlayingSound && (
                                <button
                                    onClick={stopSound}
                                    className="stop-sound-btn"
                                    title="Stop Sound"
                                >
                                    ⏹️
                                    <span className="btn-label">Stop</span>
                                </button>
                            )}
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
                        <Services userId={user._id} isSuperAdmin={isSuperAdmin} />
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
    );
}
// At the end of Adminscreen.js
export default Adminscreen;
export function Dashboard({ dashboardData, dashboardLoading, isSuperAdmin, userId }) {
    // Make sure dashboardData has the expected structure
    const stats = [
        { title: 'My Bookings', value: dashboardData?.totalBookings || 0, color: '#1890ff' },
        { title: 'My Services', value: dashboardData?.totalServices || 0, color: '#52c41a' },
    ];

    if (isSuperAdmin) {
        stats.push(
            { title: 'Total Users', value: dashboardData?.totalUsers || 0, color: '#722ed1' },
            { title: 'Total Vendors', value: dashboardData?.totalVendors || 0, color: '#fa8c16' }
        );
    }

    stats.push({ title: 'My Revenue', value: `₹${dashboardData?.revenue || 0}`, color: '#f5222d' });

    const columns = [
        { title: 'Booking ID', dataIndex: '_id', key: '_id', render: (text) => text?.slice(-6) || 'N/A' },
        { title: 'Service', dataIndex: 'service', key: 'service', render: (text) => text || 'N/A' },
        { title: 'Amount', dataIndex: 'totalAmount', key: 'amount', render: (text) => `₹${text || 0}` },
        { title: 'Status', dataIndex: 'status', key: 'status', render: (text) => text || 'N/A' },
        { title: 'Date', dataIndex: 'createdAt', key: 'date', render: (text) => text ? new Date(text).toLocaleDateString() : 'N/A' },
    ];

    return (
        <div className="dashboard-container">
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                {stats.map((stat, index) => (
                    <Col key={index} xs={24} sm={12} md={8} lg={6}>
                        <Card bordered={false}>
                            <Statistic
                                title={stat.title}
                                value={stat.value}
                                valueStyle={{ color: stat.color }}
                                loading={dashboardLoading}
                            />
                        </Card>
                    </Col>
                ))}
            </Row>

            <Card
                title="My Recent Bookings"
                loading={dashboardLoading}
                extra={<Link to="#" onClick={() => {
                    const tabElement = document.querySelector('[data-node-key="1"]');
                    if (tabElement) tabElement.click();
                }}>View All</Link>}
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
            if (filterTab === 'all') return true;
            return booking.bookingType === filterTab;
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
        <div className="bookings-container" style={{paddingLeft:"10px", paddingRight:"4px"}}>
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

            {/* Tabs Section with Notification Badges */}
            <div className="tabs-container">
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
                                <td className="amount-cell">₹{booking.totalAmount?.toFixed(2) ?? 0}</td>
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
                                    {booking.assignedHelpers && booking.assignedHelpers.length > 0 ? (
                                        <div className="assigned-helpers">
                                            {booking.assignedHelpers.map((helper, idx) => (
                                                <div key={helper._id || idx} style={{ marginBottom: '4px' }}>
                                                    <span style={{ fontWeight: '500', color: '#28a745' }}>✓</span>
                                                    <span style={{ marginLeft: '4px' }}>{helper.name}</span>
                                                    {helper.phone && (
                                                        <span style={{ fontSize: '0.85em', color: '#666', marginLeft: '4px' }}>
                                                            ({helper.phone})
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <span style={{ color: '#999', fontStyle: 'italic' }}>Not assigned</span>
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
                                                    ? selectedLocation.address 
                                                    : selectedLocation.pickupAddress}
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
                                                {selectedLocation.time 
                                                    ? new Date(selectedLocation.time).toLocaleString('en-US', {
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                      })
                                                    : 'N/A'}
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

    // Helper function to format date
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

    // Format time slots for display
    const formatTimeSlots = () => {
        if (!booking.slots || !Array.isArray(booking.slots) || booking.slots.length === 0) {
            return null;
        }

        return booking.slots.map((slot, index) => {
            let displayText = '';

            if (typeof slot === 'string') {
                displayText = slot;
            } else if (typeof slot === 'object' && slot !== null) {
                if (slot.date && slot.slot) {
                    const dateStr = formatDateOnly(slot.date);
                    displayText = `${dateStr}: ${slot.slot}`;
                } else if (slot.slot) {
                    displayText = slot.slot;
                } else if (slot.date) {
                    displayText = formatDateOnly(slot.date);
                } else {
                    displayText = JSON.stringify(slot);
                }
            }

            if (!displayText) {
                displayText = `Slot ${index + 1}`;
            }

            return (
                <span key={index} style={{
                    background: '#fff3e0',
                    color: '#f57c00',
                    padding: '5px 12px',
                    borderRadius: '20px',
                    fontSize: '14px',
                    fontWeight: '500',
                    margin: '4px',
                    display: 'inline-block'
                }}>
                    {displayText}
                </span>
            );
        });
    };

    // Calculate base price breakdown
    const renderBasePriceBreakdown = () => {
        if (!booking) return null;
        
        const basePrice = booking.rentperday || 0;
        const unit = booking.customUnit || booking.unit || 'per day';
        const quantity = booking.quantity || 1;
        const daysCount = booking.daysCount || 1;
        
        // Calculate base total
        let baseTotal = basePrice;
        let breakdownText = `₹${basePrice}`;
        
        if (unit.includes('day') && daysCount > 1) {
            baseTotal = basePrice * daysCount;
            breakdownText = `₹${basePrice} × ${daysCount} days`;
        }
        
        if (booking.isCountable && quantity > 1) {
            baseTotal = baseTotal * quantity;
            breakdownText += ` × ${quantity} qty`;
        }
        
        // Multiply by quantity if countable and not already multiplied
        if (booking.isCountable && quantity > 1 && !unit.includes('day')) {
            baseTotal = basePrice * quantity;
            breakdownText = `₹${basePrice} × ${quantity}`;
        }
        
        // For inquiry bookings, don't show breakdown
        if (booking.bookingType === 'Inquari Booking') {
            return (
                <div style={{
                    background: '#fff3e0',
                    padding: '25px',
                    borderRadius: '8px',
                    textAlign: 'center'
                }}>
                    <p style={{ margin: '0 0 10px 0', color: '#f57c00', fontSize: '1.2em', fontWeight: 'bold' }}>
                        📋 Inquiry Required
                    </p>
                    <p style={{ margin: '10px 0 0 0', color: '#666', fontSize: '1em' }}>
                        This is an inquiry-based booking. The final price will be discussed and confirmed after inquiry.
                        Our team will contact the customer shortly to provide the final quote.
                    </p>
                </div>
            );
        }

        return (
            <div style={{
                background: '#f8f9fa',
                padding: '20px',
                borderRadius: '8px'
            }}>
                {/* Base Price Breakdown */}
                <div style={{ marginBottom: '15px' }}>
                    <h5 style={{ color: '#444', marginBottom: '10px' }}>Price Breakdown</h5>
                    
                    {/* Service Name and Unit */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '8px 0',
                        borderBottom: '1px dashed #ddd'
                    }}>
                        <span><strong>Service:</strong> {booking.service}</span>
                        <span><strong>Unit:</strong> {booking.customUnit || booking.unit || 'per day'}</span>
                    </div>

                    {/* Base Price Calculation */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '8px 0',
                        borderBottom: '1px dashed #ddd',
                        backgroundColor: '#e8f4fd',
                        fontWeight: '500'
                    }}>
                        <span>
                            Base Price: ₹{booking.rentperday || 0} 
                            {booking.unit?.includes('day') && booking.daysCount > 1 && ` × ${booking.daysCount} day${booking.daysCount > 1 ? 's' : ''}`}
                            {booking.isCountable && booking.quantity > 1 && ` × ${booking.quantity} qty`}
                        </span>
                        <span style={{ fontWeight: 'bold', color: '#1976d2' }}>
                            ₹{(booking.rentperday || 0) * (booking.daysCount || 1) * (booking.isCountable ? (booking.quantity || 1) : 1)}
                        </span>
                    </div>

                    {/* Display unit and quantity info */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '5px 0',
                        fontSize: '0.9em',
                        color: '#666'
                    }}>
                        <span>Price per {booking.customUnit || booking.unit || 'unit'}:</span>
                        <span>₹{booking.rentperday || 0}</span>
                    </div>
                    
                    {booking.quantity > 1 && (
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: '5px 0',
                            fontSize: '0.9em',
                            color: '#666'
                        }}>
                            <span>Quantity:</span>
                            <span>{booking.quantity}</span>
                        </div>
                    )}
                    
                    {booking.daysCount > 1 && (
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: '5px 0',
                            fontSize: '0.9em',
                            color: '#666'
                        }}>
                            <span>Number of days:</span>
                            <span>{booking.daysCount}</span>
                        </div>
                    )}

                    {/* Optional Services Total */}
                    {booking.optionalInputs && booking.optionalInputs.length > 0 && (
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: '8px 0',
                            borderBottom: '1px dashed #ddd',
                            color: '#1976d2'
                        }}>
                            <span>Optional Services Total:</span>
                            <span>
                                ₹{booking.optionalInputs.reduce((sum, item) => 
                                    sum + ((item.count || 1) * (item.price || 0)), 0
                                )}
                            </span>
                        </div>
                    )}

                    {/* Extra Services Total */}
                    {booking.extraInputs && booking.extraInputs.length > 0 && (
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: '8px 0',
                            borderBottom: '1px dashed #ddd',
                            color: '#f57c00'
                        }}>
                            <span>Extra Services Total:</span>
                            <span>
                                ₹{booking.extraInputs.reduce((sum, item) => 
                                    sum + (item.price || 0), 0
                                )}
                            </span>
                        </div>
                    )}
                </div>

                {/* Grand Total */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: '15px',
                    paddingTop: '15px',
                    borderTop: '2px solid #1976d2',
                    fontSize: '1.3em',
                    fontWeight: 'bold',
                    color: '#1976d2'
                }}>
                    <span>Total Amount:</span>
                    <span>₹{(booking.totalAmount || 0).toFixed(2)}</span>
                </div>
            </div>
        );
    };

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="bill-modal" onClick={e => e.stopPropagation()} style={{
                background: 'white',
                borderRadius: '12px',
                padding: '30px',
                width: '90%',
                maxWidth: '900px',
                maxHeight: '90vh',
                overflowY: 'auto',
                position: 'relative',
                boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
            }}>
                {/* Header with close button */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '25px',
                    borderBottom: '2px solid #f0f0f0',
                    paddingBottom: '15px',
                    position: 'sticky',
                    top: 0,
                    background: 'white',
                    zIndex: 10
                }}>
                    <h2 style={{ margin: 0, color: '#333' }}>
                        {booking.bookingType === 'Inquari Booking' ? 'Inquiry Details' : 'Booking Invoice'}
                    </h2>
                    <button onClick={onClose} style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '24px',
                        cursor: 'pointer',
                        color: '#666',
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>&times;</button>
                </div>

                {/* Invoice Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '30px',
                    padding: '20px',
                    background: '#f8f9fa',
                    borderRadius: '8px',
                    flexWrap: 'wrap',
                    gap: '20px'
                }}>
                    <div>
                        <h4 style={{ margin: '0 0 10px 0', color: '#555' }}>Booking Details</h4>
                        <p style={{ margin: '5px 0' }}><strong>Booking ID:</strong> #{booking._id}</p>
                        <p style={{ margin: '5px 0' }}><strong>Booking Type:</strong>
                            <span style={{
                                background: booking.bookingType === 'Inquari Booking' ? '#fff3cd' : '#e3f2fd',
                                color: booking.bookingType === 'Inquari Booking' ? '#856404' : '#1976d2',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                marginLeft: '10px',
                                fontSize: '0.9em'
                            }}>
                                {booking.bookingType}
                            </span>
                        </p>
                        <p style={{ margin: '5px 0' }}><strong>Status:</strong>
                            <span className={`status-badge status-${booking.status}`} style={{ marginLeft: '10px' }}>
                                {booking.status}
                            </span>
                        </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <h4 style={{ margin: '0 0 10px 0', color: '#555' }}>Date Information</h4>
                        <p style={{ margin: '5px 0' }}><strong>Booked On:</strong> {formatDate(booking.createdAt)}</p>
                        <p style={{ margin: '5px 0' }}><strong>Service Date:</strong> {
                            normalizedSelectedDates.length > 0
                                ? (normalizedSelectedDates.length > 1
                                    ? `${formatDateOnly(normalizedSelectedDates[0])} to ${formatDateOnly(normalizedSelectedDates[normalizedSelectedDates.length - 1])}`
                                    : formatDateOnly(normalizedSelectedDates[0]))
                                : 'N/A'
                        }</p>
                    </div>
                </div>

                {/* Service Information */}
                <div style={{ marginBottom: '25px' }}>
                    <h4 style={{
                        borderBottom: '1px solid #ddd',
                        paddingBottom: '8px',
                        color: '#444',
                        marginBottom: '15px'
                    }}>Service Information</h4>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <tbody>
                            <tr>
                                <td style={{ padding: '8px 0', width: '150px', fontWeight: 'bold' }}>Service Name:</td>
                                <td style={{ padding: '8px 0' }}>{booking.service}</td>
                            </tr>
                            {booking.unit && (
                                <tr>
                                    <td style={{ padding: '8px 0', fontWeight: 'bold' }}>Unit:</td>
                                    <td style={{ padding: '8px 0' }}>{booking.customUnit || booking.unit}</td>
                                </tr>
                            )}
                            {booking.quantity > 1 && (
                                <tr>
                                    <td style={{ padding: '8px 0', fontWeight: 'bold' }}>Quantity:</td>
                                    <td style={{ padding: '8px 0' }}>{booking.quantity}</td>
                                </tr>
                            )}
                            {booking.daysCount > 1 && (
                                <tr>
                                    <td style={{ padding: '8px 0', fontWeight: 'bold' }}>Number of Days:</td>
                                    <td style={{ padding: '8px 0' }}>{booking.daysCount}</td>
                                </tr>
                            )}
                            {booking.slots && booking.slots.length > 0 && (
                                <tr>
                                    <td style={{ padding: '8px 0', fontWeight: 'bold' }}>Number of Slots:</td>
                                    <td style={{ padding: '8px 0' }}>{booking.slots.length}</td>
                                </tr>
                            )}
                            {booking.description && (
                                <tr>
                                    <td style={{ padding: '8px 0', fontWeight: 'bold' }}>Description:</td>
                                    <td style={{ padding: '8px 0' }}>{booking.description}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Selected Dates */}
                {normalizedSelectedDates.length > 0 && (
                    <div style={{ marginBottom: '25px' }}>
                        <h4 style={{
                            borderBottom: '1px solid #ddd',
                            paddingBottom: '8px',
                            color: '#444',
                            marginBottom: '15px'
                        }}>Selected Dates</h4>
                        <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '10px',
                            padding: '10px 0'
                        }}>
                            {normalizedSelectedDates.map((date, index) => (
                                <span key={index} style={{
                                    background: '#e3f2fd',
                                    color: '#1976d2',
                                    padding: '5px 12px',
                                    borderRadius: '20px',
                                    fontSize: '14px',
                                    fontWeight: '500'
                                }}>
                                    {formatDateOnly(date)}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Time Slots */}
                {booking.slots && Array.isArray(booking.slots) && booking.slots.length > 0 && (
                    <div style={{ marginBottom: '25px' }}>
                        <h4 style={{
                            borderBottom: '1px solid #ddd',
                            paddingBottom: '8px',
                            color: '#444',
                            marginBottom: '15px'
                        }}>Time Slots</h4>
                        <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            padding: '10px 0'
                        }}>
                            {formatTimeSlots()}
                        </div>
                    </div>
                )}

                {/* Location Information */}
                <div style={{ marginBottom: '25px' }}>
                    <h4 style={{
                        borderBottom: '1px solid #ddd',
                        paddingBottom: '8px',
                        color: '#444',
                        marginBottom: '15px'
                    }}>Location Information</h4>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <tbody>
                            <tr>
                                <td style={{ padding: '8px 0', width: '150px', fontWeight: 'bold' }}>Location Type:</td>
                                <td style={{ padding: '8px 0' }}>{booking.locationType}</td>
                            </tr>
                            {booking.locationType === 'Simple' && (
                                <tr>
                                    <td style={{ padding: '8px 0', fontWeight: 'bold' }}>Address:</td>
                                    <td style={{ padding: '8px 0' }}>{booking.address}</td>
                                </tr>
                            )}
                            {booking.locationType === 'Rental' && (
                                <>
                                    <tr>
                                        <td style={{ padding: '8px 0', fontWeight: 'bold' }}>Pickup:</td>
                                        <td style={{ padding: '8px 0' }}>{booking.pickupAddress}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ padding: '8px 0', fontWeight: 'bold' }}>Drop-off:</td>
                                        <td style={{ padding: '8px 0' }}>{booking.dropAddress}</td>
                                    </tr>
                                    {booking.returnTrip && (
                                        <tr>
                                            <td style={{ padding: '8px 0', fontWeight: 'bold' }}>Return Trip:</td>
                                            <td style={{ padding: '8px 0' }}>Yes</td>
                                        </tr>
                                    )}
                                </>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Optional Services - This is the detailed breakdown you want */}
                {booking.optionalInputs && booking.optionalInputs.length > 0 && booking.bookingType !== 'Inquari Booking' && (
                    <div style={{ marginBottom: '25px' }}>
                        <h4 style={{
                            borderBottom: '1px solid #ddd',
                            paddingBottom: '8px',
                            color: '#444',
                            marginBottom: '15px'
                        }}>Optional Services</h4>
                        <div style={{
                            background: '#f5f5f5',
                            padding: '15px',
                            borderRadius: '8px'
                        }}>
                            {booking.optionalInputs.map((input, index) => {
                                const count = input.count || 1;
                                const price = input.price || 0;
                                
                                // Get display unit
                                const getDisplayUnit = (input) => {
                                    if (input.customUnit) return input.customUnit;
                                    const unit = input.unit || 'per item';
                                    if (unit.startsWith('per-')) {
                                        return unit.replace('per-', '').replace(/-/g, ' ');
                                    }
                                    return unit;
                                };
                                
                                const displayUnit = getDisplayUnit(input);
                                
                                // Calculate multiplier based on booking data
                                let multiplier = 1;
                                const inputUnit = input.unit || '';
                                const mainUnit = booking.unit || 'per day';
                                
                                if ((inputUnit.includes('day') || inputUnit === 'per-day') &&
                                    (mainUnit.includes('day') || mainUnit === 'per-day')) {
                                    multiplier = (booking.daysCount || 1) * (booking.quantity || 1);
                                } else if ((inputUnit.includes('hour') || inputUnit === 'per-hour') &&
                                    (mainUnit.includes('hour') || mainUnit === 'per-hour')) {
                                    multiplier = ((booking.slots && booking.slots.length) || 1) * (booking.quantity || 1);
                                } else {
                                    multiplier = booking.quantity || 1;
                                }
                                
                                const itemTotal = count * price * multiplier;
                                
                                return (
                                    <div key={index} style={{
                                        marginTop: '8px',
                                        padding: '8px',
                                        background: 'white',
                                        borderRadius: '5px',
                                        border: '1px solid #eee'
                                    }}>
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            fontSize: '0.95em'
                                        }}>
                                            <span>
                                                <strong>{input.name || `Option ${index + 1}`}</strong>
                                                {displayUnit && <span style={{ color: '#666', fontSize: '0.9em', marginLeft: '5px' }}>({displayUnit})</span>}
                                            </span>
                                            <span style={{ fontWeight: 'bold', color: '#1976d2' }}>₹{itemTotal.toFixed(2)}</span>
                                        </div>
                                        
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            fontSize: '0.85em',
                                            color: '#666',
                                            marginTop: '4px'
                                        }}>
                                            <span>
                                                {count} × ₹{price}
                                                {displayUnit && ` /${displayUnit}`}
                                                {multiplier > 1 && ` × ${multiplier}`}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Extra Services */}
                {booking.extraInputs && booking.extraInputs.length > 0 && booking.bookingType !== 'Inquari Booking' && (
                    <div style={{ marginBottom: '25px' }}>
                        <h4 style={{
                            borderBottom: '1px solid #ddd',
                            paddingBottom: '8px',
                            color: '#444',
                            marginBottom: '15px'
                        }}>Extra Services</h4>
                        <div style={{
                            background: '#f5f5f5',
                            padding: '15px',
                            borderRadius: '8px'
                        }}>
                            {booking.extraInputs.map((input, index) => {
                                const price = input.price || 0;
                                
                                return (
                                    <div key={index} style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        padding: '8px',
                                        background: 'white',
                                        borderRadius: '5px',
                                        marginTop: '5px',
                                        border: '1px solid #eee'
                                    }}>
                                        <span>{input.name}</span>
                                        <span style={{ fontWeight: 'bold', color: '#f57c00' }}>₹{price.toFixed(2)}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Customer Information */}
                <div style={{ marginBottom: '25px' }}>
                    <h4 style={{
                        borderBottom: '1px solid #ddd',
                        paddingBottom: '8px',
                        color: '#444',
                        marginBottom: '15px'
                    }}>Customer Information</h4>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <tbody>
                            <tr>
                                <td style={{ padding: '8px 0', width: '120px', fontWeight: 'bold' }}>Name:</td>
                                <td style={{ padding: '8px 0' }}>{booking.name}</td>
                            </tr>
                            <tr>
                                <td style={{ padding: '8px 0', fontWeight: 'bold' }}>Phone:</td>
                                <td style={{ padding: '8px 0' }}>{booking.phone}</td>
                            </tr>
                            <tr>
                                <td style={{ padding: '8px 0', fontWeight: 'bold' }}>User ID:</td>
                                <td style={{ padding: '8px 0' }}>{booking.userid}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Price Summary - Using the renderBasePriceBreakdown function */}
                <div style={{
                    marginTop: '30px',
                    borderTop: '2px solid #f0f0f0',
                    paddingTop: '20px'
                }}>
                    <h4 style={{ marginBottom: '15px', color: '#444' }}>Payment Summary</h4>
                    {renderBasePriceBreakdown()}
                </div>

                {/* Footer */}
                <div style={{
                    marginTop: '30px',
                    textAlign: 'center',
                    color: '#888',
                    fontSize: '0.9em',
                    borderTop: '1px solid #f0f0f0',
                    paddingTop: '20px'
                }}>
                    <p>Thank you for choosing our service!</p>
                    <p>For any queries, please contact our support team.</p>
                </div>

                {/* Action buttons */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '10px',
                    marginTop: '20px',
                    position: 'sticky',
                    bottom: 0,
                    background: 'white',
                    padding: '20px 0 0 0',
                    borderTop: '1px solid #f0f0f0'
                }}>
                    <button
                        onClick={() => window.print()}
                        style={{
                            padding: '10px 25px',
                            background: '#1976d2',
                            color: 'white',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        🖨️ Print Bill
                    </button>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '10px 25px',
                            background: '#f5f5f5',
                            color: '#333',
                            border: '1px solid #ddd',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '500'
                        }}
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
            width: 100%;
            background: white;
            padding: 20px !important;
            box-shadow: none !important;
        }
        .bill-modal button {
            display: none !important;
        }
        .modal-backdrop {
            background: white !important;
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
`;

// Add the styles to your component
const styleElement = document.createElement('style');
styleElement.textContent = billModalStyles;
document.head.appendChild(styleElement);

export function Services({ userId }) {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedService, setSelectedService] = useState(null);
    const [unavailableDates, setUnavailableDates] = useState([]);
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedSlots, setSelectedSlots] = useState([]);
    const [helpers, setHelpers] = useState([]);
    const [selectedHelpers, setSelectedHelpers] = useState([]);
    const [useOwn, setUseOwn] = useState(false);
    const [showHelperModal, setShowHelperModal] = useState(false);
    const [currentService, setCurrentService] = useState(null);
    const [isFullDay, setIsFullDay] = useState(false);

    const timeSlots = Array.from({ length: 10 }, (_, i) => {
        const hour = i + 9;
        return `${hour}:00 - ${hour + 1}:00`;
    });


    // In Adminscreen.js, update the Services component's useEffect
    useEffect(() => {
        const fetchServices = async () => {
            try {
                setLoading(true);
                setError(null);
                console.log('Fetching services for userId:', userId); // Add for debugging
                const { data } = await axios.get(`/api/service/getvisible?userid=${userId}`);
                console.log('Fetched services:', data); // Add for debugging
                setServices(data); // Only user's services
            } catch (error) {
                console.error("Fetch services error:", error);
                setError("Failed to load services. Please try again.");
                // If 400 error, it might be due to missing userid - check console
            } finally {
                setLoading(false);
            }
        };
        fetchServices();
    }, [userId]);
    // Delete service with proper error handling
    const deleteService = async (id) => {
        if (!window.confirm("Are you sure you want to delete this service?")) return;

        try {
            setLoading(true);
            await axios.delete(`/api/service/deleteservice/${id}`);

            // Update state optimistically
            setServices(prevServices => prevServices.filter(service => service._id !== id));

            // Close modal if open
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
            const { data } = await axios.put(`/api/service/togglevisibility/${id}`, {
                isVisible: !currentVisibility
            });

            setServices(prevServices =>
                prevServices.map(service =>
                    service._id === id ? { ...service, isVisible: !currentVisibility } : service
                )
            );

            message.success(`Visibility ${!currentVisibility ? 'enabled' : 'disabled'}`);
        } catch (error) {
            console.error("Toggle visibility error:", error);
            message.error("Error updating visibility");
        }
    };

    // Toggle all services visibility
    const toggleAllVisibility = async () => {
        const confirm = window.confirm("Are you sure you want to toggle all services' visibility?");
        if (!confirm) return;

        try {
            setLoading(true);

            // Determine new state based on current services
            const allVisible = services.every(service => service.isVisible);
            const newVisibility = !allVisible;

            // Create array of update promises
            const promises = services.map(service =>
                axios.put(`/api/service/togglevisibility/${service._id}`, {
                    isVisible: newVisibility
                })
            );

            // Wait for all updates to complete
            await Promise.all(promises);

            // Update local state
            setServices(prevServices =>
                prevServices.map(service => ({
                    ...service,
                    isVisible: newVisibility
                }))
            );

            message.success(`All services ${newVisibility ? 'activated' : 'hidden'} successfully`);
        } catch (error) {
            console.error("Toggle all error:", error);
            message.error("Error toggling all services");
        } finally {
            setLoading(false);
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

        // Find existing slots for this date
        const existingDate = unavailableDates.find(d => d.date === dateString);
        setSelectedSlots(existingDate?.slots || []);
        setIsFullDay(existingDate?.fullDay || false);
    };

    // Handle slot toggle
    const handleSlotToggle = (slot) => {
        if (isFullDay) return; // Don't allow slot selection when full day is selected

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

            // Only add new entry if there are slots selected or full day is checked
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

            // Update local state
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
            try {
                const { data } = await axios.get("/api/vendor/helpers");
                setHelpers(data);
            } catch (error) {
                console.error("Error fetching helpers:", error);
            }
        };
        fetchHelpers();
    }, []);

    // Handle helper selection
    const handleHelperSelect = (helperId, isChecked) => {
        setSelectedHelpers(prev =>
            isChecked
                ? [...prev, helperId]
                : prev.filter(id => id !== helperId)
        );
    };

    // Handle job assignment modal open
    const handleJobAssignment = (service) => {
        setCurrentService(service);
        setSelectedHelpers(service.assignedHelpers || []);
        setUseOwn(service.useOwn || false);
        setShowHelperModal(true);
    };

    // Save job assignment
    const saveJobAssignment = async () => {
        try {
            const updatedService = {
                ...currentService,
                assignedHelpers: selectedHelpers,
                useOwn
            };

            await axios.put(`/api/service/update/${currentService._id}`, updatedService);

            setServices(prevServices =>
                prevServices.map(service =>
                    service._id === currentService._id ? updatedService : service
                )
            );

            setShowHelperModal(false);
            message.success("Job assignment updated successfully");
        } catch (error) {
            console.error("Error updating job assignment:", error);
            message.error("Failed to update job assignment");
        }
    };

    // Add CSS for calendar styling
    const calendarStyle = `
        .availability-calendar .react-calendar__tile {
            color: white;
            border-radius: 4px;
            margin: 2px;
        }
        .availability-calendar .react-calendar__tile--active {
            background-color: #0d6efd;
        }
        .fully-unavailable {
            background-color: #dc3545 !important;
            color: white !important;
        }
        .partially-unavailable {
            background: linear-gradient(135deg, #dc3545 50%, #6c757d 50%) !important;
            color: white !important;
        }
        .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1050;
        }
        .calendar-modal, .helper-modal {
            width: 90%;
            max-width: 1200px;
            max-height: 90vh;
            overflow-y: auto;
        }
        .time-slots-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
        }
        .time-slot-btn {
            position: relative;
            transition: all 0.2s;
        }
        .time-slot-btn:hover:not(:disabled) {
            transform: translateY(-2px);
        }
        .selected-slot {
            background-color: #dc3545;
            border-color: #dc3545;
        }
        .selected-indicator {
            position: absolute;
            top: 2px;
            right: 5px;
            font-size: 12px;
        }
    `;

    return (
        <div className='container-fluid'>
            <style>{calendarStyle}</style>

            <div className='row justify-content-center'>
                <div className='col-md-11'>
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <h1 className="mb-0">Services Management</h1>
                        <button
                            className={`btn btn-sm px-4 ${services.length === 0 ? "btn-secondary" :
                                    services.every(s => s.isVisible) ? "btn-danger" :
                                        "btn-success"
                                }`}
                            onClick={toggleAllVisibility}
                            disabled={loading || services.length === 0}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2"></span>
                                    Working...
                                </>
                            ) : services.length === 0 ? (
                                <>
                                    <i className="bi bi-ban me-2"></i>
                                    No Services
                                </>
                            ) : services.every(s => s.isVisible) ? (
                                <>
                                    <i className="bi bi-eye-slash me-2"></i>
                                    Hide All Services
                                </>
                            ) : (
                                <>
                                    <i className="bi bi-eye me-2"></i>
                                    Show All Services
                                </>
                            )}
                        </button>
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

                    {/* Services Table - Only show when no error and not loading */}
                    {!error && !loading && (
                        <div className="table-responsive rounded shadow">
                            <table className='table table-bordered table-hover table-dark mb-0'>
                                <thead className='bg-secondary'>
                                    <tr>
                                        <th>Service ID</th>
                                        <th>Name</th>
                                        <th>Daily Rate</th>
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
                                            <tr key={service._id}>
                                                <td>{service._id.substring(0, 8)}...</td>
                                                <td>
                                                    <Link
                                                        to={`/book/${service._id}`}
                                                        className="text-white text-decoration-underline"
                                                        target="_blank"
                                                    >
                                                        {service.name}
                                                    </Link>
                                                </td>
                                                <td>${service.rentperday}/day</td>
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
                                                    </div>
                                                </td>
                                            </tr>
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
                            <div className="helper-modal bg-dark p-4 rounded" style={{ maxWidth: '800px' }}>
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h4 className="mb-0 text-light">
                                        Job Assignment for {currentService?.name}
                                    </h4>
                                    <button
                                        onClick={() => setShowHelperModal(false)}
                                        className="btn btn-close btn-close-white"
                                    ></button>
                                </div>

                                <div className="form-check mb-3">
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        checked={useOwn}
                                        onChange={(e) => {
                                            setUseOwn(e.target.checked);
                                            if (e.target.checked) setSelectedHelpers([]);
                                        }}
                                        id="useOwn"
                                    />
                                    <label className="form-check-label text-light" htmlFor="useOwn">
                                        Use own staff (no external helpers)
                                    </label>
                                </div>

                                {!useOwn && (
                                    <>
                                        <h5 className="text-light mb-3">Select Helpers:</h5>
                                        <div className="row g-3">
                                            {helpers.map(helper => (
                                                <div key={helper._id} className="col-md-6">
                                                    <div className="card bg-secondary text-light">
                                                        <div className="card-body">
                                                            <div className="form-check">
                                                                <input
                                                                    className="form-check-input"
                                                                    type="checkbox"
                                                                    id={`helper-${helper._id}`}
                                                                    checked={selectedHelpers.includes(helper._id)}
                                                                    onChange={(e) =>
                                                                        handleHelperSelect(helper._id, e.target.checked)
                                                                    }
                                                                />
                                                                <label className="form-check-label w-100" htmlFor={`helper-${helper._id}`}>
                                                                    <h6 className="mb-1">{helper.name}</h6>
                                                                    <small className="d-block">Phone: {helper.phone}</small>
                                                                    <small className="d-block">Skills: {helper.skills}</small>
                                                                    <small className="d-block">Experience: {helper.experience} years</small>
                                                                </label>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}

                                <div className="d-flex gap-2 mt-4">
                                    <button
                                        className="btn btn-primary"
                                        onClick={saveJobAssignment}
                                    >
                                        Save Assignment
                                    </button>
                                    <button
                                        className="btn btn-outline-light"
                                        onClick={() => setShowHelperModal(false)}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
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


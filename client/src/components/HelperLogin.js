import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
    Card,
    Button,
    Table,
    Tag,
    message,
    Modal,
    Form,
    Spin,
    Input,
    Select,
    Space,
    Descriptions,
    Row,
    Col,
    Statistic,
    Typography,
    Grid
} from 'antd';
import { requestNotificationPermission, onMessageListener } from '../firebase';

const { useBreakpoint } = Grid;
const { Text } = Typography;
const { Option } = Select;


export function HelperLogin() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [helperData, setHelperData] = useState(null);
    const [loginCode, setLoginCode] = useState('');

    const handleLogin = async () => {
        try {
            const response = await axios.post('/api/helper/login', { code: loginCode });
            if (response.data.success) {
                setIsLoggedIn(true);
                setHelperData(response.data.helper);
                localStorage.setItem('helperToken', response.data.token);

                // ✅ Save FCM token for helper
                const token = await requestNotificationPermission(
                    response.data.helper._id,
                    'helper'
                );

                message.success('Login successful!');
            }
        } catch (error) {
            message.error(error.response?.data?.message || 'Login failed');
        }
    };



    const handleLogout = () => {
        setIsLoggedIn(false);
        setHelperData(null);
        localStorage.removeItem('helperToken');
        message.success('Logged out successfully');
    };

    if (!isLoggedIn) {
        return (
            <div className="helper-login-container" style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh',
                padding: '16px',
                background: '#f0f2f5'
            }}>
                <Card
                    title="Helper Login"
                    className="login-card"
                    style={{
                        width: '100%',
                        maxWidth: '400px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                >
                    <Form layout="vertical">
                        <Form.Item label="Enter Your Unique Code" required>
                            <Input
                                value={loginCode}
                                onChange={(e) => setLoginCode(e.target.value)}
                                placeholder="Enter your assigned code"
                                size="large"
                            />
                        </Form.Item>
                        <Button type="primary" onClick={handleLogin} block size="large">
                            Login as Helper
                        </Button>
                    </Form>
                </Card>
            </div>
        );
    }

    return <HelperDashboard helperData={helperData} onLogout={handleLogout} />;
}

// Updated HelperDashboard function with sound stop functionality

// HelperDashboard function ko replace karo with this updated version

function HelperDashboard({ helperData, onLogout }) {
    const screens = useBreakpoint();
    const [isOnline, setIsOnline] = useState(false);
    const [assignedWorks, setAssignedWorks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [showBookingDetails, setShowBookingDetails] = useState(false);
    
    // ✅ Updated notification states
    const [lastCheckedTime, setLastCheckedTime] = useState(localStorage.getItem('helperLastCheckedTime') || Date.now().toString());
    const [soundEnabled, setSoundEnabled] = useState(localStorage.getItem('helperSoundEnabled') !== 'false');
    const [isPlayingSound, setIsPlayingSound] = useState(false);
    const [newWorkAlert, setNewWorkAlert] = useState(null);
    const [notifiedWorkIds, setNotifiedWorkIds] = useState(
        new Set(JSON.parse(localStorage.getItem('helperNotifiedWorks') || '[]'))
    );
    
    // Audio ref for sound
    const audioRef = useRef(null);
    const pollingIntervalRef = useRef(null);
    const soundTimeoutRef = useRef(null);

    // ✅ Stop sound function
    const stopSound = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
        if (soundTimeoutRef.current) {
            clearTimeout(soundTimeoutRef.current);
            soundTimeoutRef.current = null;
        }
        setIsPlayingSound(false);
        setNewWorkAlert(null);
    };

    // ✅ Play notification sound
    const playNotificationSound = (shouldLoop = true) => {
        if (!soundEnabled || !audioRef.current) return;
        
        try {
            audioRef.current.loop = shouldLoop;
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(e => {
                console.log('Sound play failed:', e);
                message.warning('Click "Allow" to enable sound notifications', 3);
            });
            setIsPlayingSound(true);
            
            // Auto-stop sound after 30 seconds
            soundTimeoutRef.current = setTimeout(() => {
                if (isPlayingSound) {
                    stopSound();
                    message.info('Sound stopped automatically after 30 seconds', 2);
                }
            }, 30000);
        } catch (error) {
            console.log('Error playing sound:', error);
        }
    };

    // ✅ Listen for work status changes to stop sound
    useEffect(() => {
        const handleWorkUpdate = (event) => {
            const { workId, status } = event.detail || {};
            
            // If helper changes status to in-progress or completed, stop the sound
            if ((status === 'in-progress' || status === 'completed' || status === 'cancelled') && isPlayingSound) {
                stopSound();
            }
        };
        
        window.addEventListener('workStatusChanged', handleWorkUpdate);
        
        return () => {
            window.removeEventListener('workStatusChanged', handleWorkUpdate);
        };
    }, [isPlayingSound]);

    // ✅ Check for new works (60 second polling)
    const checkNewWorks = async () => {
        try {
            const token = localStorage.getItem('helperToken');
            if (!token) return;

            const response = await axios.get('/api/helper/check-new-works', {
                headers: { Authorization: `Bearer ${token}` },
                params: { lastCheckedTime: lastCheckedTime }
            });

            const newWorks = response.data.works || [];

            if (newWorks.length > 0) {
                // Filter out works that have already been notified
                const trulyNewWorks = newWorks.filter(work => 
                    !notifiedWorkIds.has(work._id)
                );
                
                if (trulyNewWorks.length > 0) {
                    // Add these work IDs to notified set
                    const newNotifiedIds = new Set(notifiedWorkIds);
                    trulyNewWorks.forEach(work => {
                        newNotifiedIds.add(work._id);
                    });
                    setNotifiedWorkIds(newNotifiedIds);
                    
                    // Save to localStorage
                    localStorage.setItem('helperNotifiedWorks', JSON.stringify([...newNotifiedIds]));
                    
                    const count = trulyNewWorks.length;
                    
                    // Check if duplicate alert
                    const currentAlertWorkIds = newWorkAlert?.works?.map(w => w._id) || [];
                    const isDuplicateAlert = trulyNewWorks.some(w => 
                        currentAlertWorkIds.includes(w._id)
                    );
                    
                    if (!isDuplicateAlert) {
                        const newWorkInfo = {
                            count: count,
                            works: trulyNewWorks,
                            timestamp: new Date()
                        };
                        
                        setNewWorkAlert(newWorkInfo);
                        
                        // Play sound if enabled
                        if (soundEnabled && audioRef.current) {
                            playNotificationSound(true);
                        }
                        
                        // Browser notification
                        if (Notification.permission === 'granted') {
                            new Notification(`📢 New Work Assigned!`, {
                                body: `${count} new work${count > 1 ? 's have' : ' has'} been assigned to you`,
                                icon: '/icon-192.png',
                                vibrate: [200, 100, 200]
                            });
                        }
                        
                        fetchAssignedWorks();
                        message.info(`${count} new work${count > 1 ? 's' : ''} assigned to you!`);
                    }
                }
            }
            
            // Update last checked time
            const newCheckedTime = Date.now().toString();
            setLastCheckedTime(newCheckedTime);
            localStorage.setItem('helperLastCheckedTime', newCheckedTime);
            
        } catch (error) {
            console.log('Error checking new works:', error);
        }
    };

    // ✅ Update work status with event dispatch
    const updateWorkStatus = async (workId, newStatus) => {
        try {
            const response = await axios.put(`/api/helper/update-status`,
                { bookingId: workId, status: newStatus },
                { headers: { Authorization: `Bearer ${localStorage.getItem('helperToken')}` } }
            );
            
            if (response.data.success) {
                message.success(`Work status updated to ${newStatus}`);
                fetchAssignedWorks();
                
                // ✅ Dispatch event to stop sound when status changes
                if (newStatus === 'in-progress' || newStatus === 'completed' || newStatus === 'cancelled') {
                    window.dispatchEvent(new CustomEvent('workStatusChanged', { 
                        detail: { workId, status: newStatus } 
                    }));
                    
                    // ✅ Remove from notified IDs in localStorage
                    const storedIds = JSON.parse(localStorage.getItem('helperNotifiedWorks') || '[]');
                    const updatedIds = storedIds.filter(id => id !== workId);
                    localStorage.setItem('helperNotifiedWorks', JSON.stringify(updatedIds));
                    
                    // Update state
                    setNotifiedWorkIds(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(workId);
                        return newSet;
                    });
                }
            }
        } catch (error) {
            message.error('Failed to update status');
        }
    };

    // Toggle sound function
    const toggleSound = () => {
        const newState = !soundEnabled;
        setSoundEnabled(newState);
        localStorage.setItem('helperSoundEnabled', newState);
        
        if (!newState && isPlayingSound) {
            stopSound();
        }
        
        message.info(`Sound notifications ${newState ? 'enabled' : 'disabled'}`);
    };

    // ✅ Listen for booking confirmed events to remove from notified IDs
    useEffect(() => {
        const handleWorkConfirmed = (event) => {
            const { workId } = event.detail || {};
            if (workId) {
                setNotifiedWorkIds(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(workId);
                    localStorage.setItem('helperNotifiedWorks', JSON.stringify([...newSet]));
                    return newSet;
                });
            }
        };
        
        window.addEventListener('workConfirmed', handleWorkConfirmed);
        
        return () => {
            window.removeEventListener('workConfirmed', handleWorkConfirmed);
        };
    }, []);

    useEffect(() => {
        if (helperData) {
            fetchAssignedWorks();
            checkConnectionStatus();

            // Listen for foreground notifications
            onMessageListener().then(payload => {
                console.log('📢 New work notification:', payload);
                checkNewWorks();
                fetchAssignedWorks();
            });

            // Start polling for new works (60 seconds = 60000 ms)
            pollingIntervalRef.current = setInterval(checkNewWorks, 60000);
            
            // Initial check
            checkNewWorks();
            
            return () => {
                if (pollingIntervalRef.current) {
                    clearInterval(pollingIntervalRef.current);
                }
                if (soundTimeoutRef.current) {
                    clearTimeout(soundTimeoutRef.current);
                }
            };
        }
    }, [helperData]);

    const fetchAssignedWorks = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('helperToken');
            console.log('Fetching assigned works with token:', token);

            const response = await axios.get('/api/helper/assigned-works', {
                headers: { Authorization: `Bearer ${token}` }
            });

            console.log('Assigned works response:', response.data);

            if (response.data.success) {
                setAssignedWorks(response.data.works || []);
            } else {
                message.error(response.data.message || 'Failed to load assigned works');
            }
        } catch (error) {
            console.error('Error fetching assigned works:', error);
            message.error(error.response?.data?.message || 'Failed to load assigned works');
        } finally {
            setLoading(false);
        }
    };

    const checkConnectionStatus = async () => {
        try {
            const response = await axios.get('/api/helper/status', {
                headers: { Authorization: `Bearer ${localStorage.getItem('helperToken')}` }
            });
            setIsOnline(response.data.isConnected);
        } catch (error) {
            console.error('Error checking status:', error);
        }
    };

    const toggleConnection = async () => {
        setLoading(true);
        try {
            const response = await axios.post('/api/helper/toggle-connection',
                { isConnected: !isOnline },
                { headers: { Authorization: `Bearer ${localStorage.getItem('helperToken')}` } }
            );
            setIsOnline(!isOnline);
            message.success(`You are now ${!isOnline ? 'Online' : 'Offline'}`);
        } catch (error) {
            message.error('Failed to update connection status');
        } finally {
            setLoading(false);
        }
    };

    const cancelWork = async (workId) => {
        Modal.confirm({
            title: 'Cancel Work',
            content: 'Are you sure you want to cancel this work?',
            onOk: async () => {
                try {
                    await axios.post('/api/helper/cancel-work',
                        { workId },
                        { headers: { Authorization: `Bearer ${localStorage.getItem('helperToken')}` } }
                    );
                    message.success('Work cancelled successfully');
                    fetchAssignedWorks();
                    
                    // ✅ Remove from notified IDs
                    const storedIds = JSON.parse(localStorage.getItem('helperNotifiedWorks') || '[]');
                    const updatedIds = storedIds.filter(id => id !== workId);
                    localStorage.setItem('helperNotifiedWorks', JSON.stringify(updatedIds));
                    
                    setNotifiedWorkIds(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(workId);
                        return newSet;
                    });
                } catch (error) {
                    message.error('Failed to cancel work');
                }
            }
        });
    };

    const handleViewDetails = (record) => {
        setSelectedBooking(record);
        setShowBookingDetails(true);
    };

    // Rest of your existing functions (formatDate, formatAddress, etc.) remain the same...
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return dateString;
        }
    };

    const formatDateOnly = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
        } catch (e) {
            return dateString;
        }
    };

    const formatAddress = (work) => {
        if (work.locationType === 'Simple') {
            return work.address || 'Address not provided';
        } else if (work.locationType === 'Rental') {
            let address = `Pickup: ${work.pickupAddress || 'N/A'}`;
            if (work.dropAddress) {
                address += ` → Drop: ${work.dropAddress}`;
            }
            if (work.returnTrip) {
                address += ' (Round Trip)';
            }
            return address;
        }
        return work.address || 'Address not provided';
    };

    const formatTimeSlots = (work) => {
        if (!work.slots || work.slots.length === 0) return 'No specific time slots';

        return work.slots.map(slot => {
            if (typeof slot === 'string') return slot;
            if (slot.date && slot.slot) return `${formatDateOnly(slot.date)}: ${slot.slot}`;
            if (slot.slot) return slot.slot;
            return JSON.stringify(slot);
        }).join(', ');
    };

    const formatOptionalServices = (work) => {
        if (!work.optionalInputs || work.optionalInputs.length === 0) return null;

        return work.optionalInputs.map((opt, i) => (
            <div key={i} style={{ marginBottom: '5px' }}>
                <Tag color="purple">{opt.name}</Tag>
                <span> ₹{opt.price} x {opt.count || 1}</span>
                {opt.unit && <small> ({opt.unit})</small>}
            </div>
        ));
    };

    // Calculate earnings
    const totalEarnings = assignedWorks
        .filter(w => w.status === 'completed')
        .reduce((sum, w) => sum + (w.price || 0), 0);

    const completedJobs = assignedWorks.filter(w => w.status === 'completed').length;
    const pendingJobs = assignedWorks.filter(w => w.status === 'assigned' || w.status === 'in-progress').length;

    // Table columns configuration
    const getTableColumns = () => {
        const baseColumns = [
            {
                title: 'Booking ID',
                dataIndex: 'bookingId',
                key: 'bookingId',
                render: (text) => <span style={{ fontFamily: 'monospace' }}>{text?.slice(-6)}</span>,
                responsive: ['md']
            },
            {
                title: 'Customer',
                key: 'customer',
                render: (_, record) => (
                    <div>
                        <div><strong>{record.customerName}</strong></div>
                        <div><small>{record.customerPhone}</small></div>
                    </div>
                )
            },
            {
                title: 'Service',
                dataIndex: 'serviceType',
                key: 'serviceType',
                responsive: ['sm']
            },
            {
                title: 'Address',
                key: 'address',
                render: (_, record) => formatAddress(record),
                ellipsis: true,
                responsive: ['lg']
            },
            {
                title: 'Date',
                dataIndex: 'scheduledDate',
                key: 'scheduledDate',
                render: (text) => formatDateOnly(text),
                responsive: ['md']
            },
            {
                title: 'Price',
                key: 'price',
                render: (_, record) => (
                    <Text strong>₹{(record.price || 0).toFixed(2)}</Text>
                ),
                responsive: ['sm']
            },
            {
                title: 'Status',
                key: 'status',
                render: (_, record) => (
                    <Select
                        value={record.status}
                        onChange={(value) => updateWorkStatus(record._id, value)}
                        style={{ width: screens.xs ? 90 : 120 }}
                        size="small"
                    >
                        <Option value="assigned">Assigned</Option>
                        <Option value="in-progress">In Progress</Option>
                        <Option value="completed">Completed</Option>
                    </Select>
                )
            },
            {
                title: 'Action',
                key: 'action',
                render: (_, record) => (
                    <Space direction={screens.xs ? "vertical" : "horizontal"} size={screens.xs ? 2 : 8}>
                        <Button
                            size="small"
                            type="primary"
                            onClick={() => handleViewDetails(record)}
                            style={{ marginBottom: screens.xs ? '4px' : 0 }}
                        >
                            Details
                        </Button>
                        {record.status === 'assigned' && (
                            <Button
                                size="small"
                                danger
                                onClick={() => cancelWork(record._id)}
                            >
                                Cancel
                            </Button>
                        )}
                    </Space>
                )
            }
        ];

        return baseColumns.filter(column => {
            if (!column.responsive) return true;
            return column.responsive.some(breakpoint => screens[breakpoint]);
        });
    };

    return (
        <div className="helper-dashboard" style={{
            padding: screens.xs ? '12px' : '20px',
            maxWidth: '100%',
            overflowX: 'hidden'
        }}>

            {/* ✅ Audio Element */}
            <audio ref={audioRef} preload="auto" style={{ display: 'none' }}>
                <source src="/sounds/booking.mp3" type="audio/mpeg" />
            </audio>

            {/* ✅ New Work Alert Banner */}
            {newWorkAlert && isPlayingSound && (
                <div style={{
                    position: 'fixed',
                    top: screens.xs ? '10px' : '20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 1000,
                    animation: 'slideDown 0.5s ease'
                }}>
                    <Card style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        border: 'none',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                        minWidth: screens.xs ? '280px' : '400px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                            <div>
                                <div style={{ color: 'white', fontSize: '20px', marginBottom: '8px' }}>
                                    🔔 <strong>New Work Alert!</strong>
                                </div>
                                <div style={{ color: 'white', fontSize: '14px' }}>
                                    {newWorkAlert.count} new work{newWorkAlert.count > 1 ? 's have' : ' has'} been assigned
                                </div>
                                {newWorkAlert.works.length > 0 && (
                                    <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: '12px', marginTop: '5px' }}>
                                        {newWorkAlert.works[0].serviceType}
                                    </div>
                                )}
                            </div>
                            <Button
                                danger
                                size={screens.xs ? "small" : "middle"}
                                onClick={stopSound}
                                icon={<span>🔇</span>}
                                style={{
                                    fontWeight: 'bold',
                                    animation: 'pulse 1s infinite'
                                }}
                            >
                                Stop Sound
                            </Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* CSS for animations */}
            <style jsx>{`
                @keyframes slideDown {
                    from {
                        opacity: 0;
                        transform: translateX(-50%) translateY(-100%);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(-50%) translateY(0);
                    }
                }
                
                @keyframes pulse {
                    0% {
                        transform: scale(1);
                    }
                    50% {
                        transform: scale(1.05);
                    }
                    100% {
                        transform: scale(1);
                    }
                }
            `}</style>

            {/* Header */}
            <div className="dashboard-header" style={{
                display: 'flex',
                flexDirection: screens.xs ? 'column' : 'row',
                justifyContent: 'space-between',
                alignItems: screens.xs ? 'stretch' : 'center',
                marginBottom: '20px',
                padding: screens.xs ? '16px' : '20px',
                background: '#fff',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                gap: screens.xs ? '16px' : 0,
                position: 'relative',
                zIndex: 1
            }}>
                <div className="helper-info">
                    <h2 style={{ margin: '0 0 10px 0', fontSize: screens.xs ? '20px' : '24px' }}>
                        Welcome, {helperData?.name}
                    </h2>
                    <p style={{ margin: '5px 0' }}>
                        <strong>Code:</strong> {helperData?.code}
                    </p>
                    {helperData?.vendor && (
                        <p style={{ margin: '5px 0', color: '#52c41a' }}>
                            <strong>Working for:</strong> {helperData.vendor.name}
                        </p>
                    )}
                </div>
                <div className="connection-status" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <Button
                        onClick={toggleSound}
                        style={{
                            fontSize: '18px',
                            background: soundEnabled ? '#52c41a' : '#d9d9d9',
                            color: 'white'
                        }}
                        title={soundEnabled ? "Sound On" : "Sound Off"}
                    >
                        {soundEnabled ? '🔊' : '🔇'}
                    </Button>
                    {isPlayingSound && (
                        <Button
                            danger
                            onClick={stopSound}
                            icon={<span>⏹️</span>}
                            style={{ fontWeight: 'bold' }}
                        >
                            Stop Sound
                        </Button>
                    )}
                    <Tag color={isOnline ? "green" : "red"}>
                        {isOnline ? "🟢 ONLINE" : "🔴 OFFLINE"}
                    </Tag>
                    <Button
                        type={isOnline ? "default" : "primary"}
                        loading={loading}
                        onClick={toggleConnection}
                        block={screens.xs}
                    >
                        {isOnline ? "Go Offline" : "Go Online"}
                    </Button>
                    <Button onClick={onLogout} danger block={screens.xs}>
                        Logout
                    </Button>
                </div>
            </div>

            {/* Assigned Works */}
            <Card
                title={`Assigned Works (${assignedWorks.length})`}
                className="works-card"
                style={{ marginBottom: '20px' }}
                bodyStyle={{ padding: screens.xs ? '12px' : '24px' }}
            >
                {loading ? (
                    <div style={{ textAlign: 'center', padding: screens.xs ? '20px' : '40px' }}>
                        <Spin size="large" />
                        <div style={{ marginTop: '10px' }}>Loading assigned works...</div>
                    </div>
                ) : assignedWorks.length > 0 ? (
                    <Table
                        dataSource={assignedWorks}
                        rowKey="_id"
                        pagination={{
                            pageSize: 5,
                            size: screens.xs ? 'small' : 'default',
                            showSizeChanger: !screens.xs
                        }}
                        scroll={{ x: true }}
                        size={screens.xs ? 'small' : 'middle'}
                        columns={getTableColumns()}
                    />
                ) : (
                    <div style={{ textAlign: 'center', padding: screens.xs ? '20px' : '40px' }}>
                        <Text type="secondary">No assigned work available.</Text>
                    </div>
                )}
            </Card>

            {/* Booking Details Modal - Keep your existing modal code */}
            <Modal
                title="Complete Booking Details"
                open={showBookingDetails}
                onCancel={() => setShowBookingDetails(false)}
                footer={[
                    <Button key="close" onClick={() => setShowBookingDetails(false)}>
                        Close
                    </Button>
                ]}
                width={screens.xs ? '95%' : 900}
                style={{ top: screens.xs ? 10 : 20 }}
            >
                {selectedBooking && (
                    <div>
                        <Descriptions
                            bordered
                            column={screens.xs ? 1 : 2}
                            size={screens.xs ? 'small' : 'default'}
                            layout={screens.xs ? 'vertical' : 'horizontal'}
                        >
                            <Descriptions.Item label="Booking ID" span={screens.xs ? 1 : 2}>
                                <Text strong>{selectedBooking.bookingId}</Text>
                            </Descriptions.Item>
                            <Descriptions.Item label="Service Type">{selectedBooking.serviceType}</Descriptions.Item>
                            <Descriptions.Item label="Booking Type">{selectedBooking.category}</Descriptions.Item>
                            <Descriptions.Item label="Customer Name">{selectedBooking.customerName}</Descriptions.Item>
                            <Descriptions.Item label="Phone">{selectedBooking.customerPhone}</Descriptions.Item>
                            <Descriptions.Item label="Location Type" span={screens.xs ? 1 : 2}>
                                {selectedBooking.locationType || 'Simple'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Address" span={screens.xs ? 1 : 2}>
                                {formatAddress(selectedBooking)}
                            </Descriptions.Item>

                            {selectedBooking.selectedDates && selectedBooking.selectedDates.length > 0 && (
                                <Descriptions.Item label="Selected Dates" span={screens.xs ? 1 : 2}>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                        {selectedBooking.selectedDates.map((d, i) => (
                                            <Tag key={i} color="blue" style={{ margin: '2px' }}>
                                                {formatDateOnly(d)}
                                            </Tag>
                                        ))}
                                    </div>
                                </Descriptions.Item>
                            )}

                            {selectedBooking.slots && selectedBooking.slots.length > 0 && (
                                <Descriptions.Item label="Time Slots" span={screens.xs ? 1 : 2}>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                        {selectedBooking.slots.map((slot, i) => (
                                            <Tag key={i} color="orange" style={{ margin: '2px' }}>
                                                {typeof slot === 'string' ? slot :
                                                    slot.slot ? slot.slot :
                                                        slot.date ? formatDateOnly(slot.date) : 'Time slot'}
                                            </Tag>
                                        ))}
                                    </div>
                                </Descriptions.Item>
                            )}

                            <Descriptions.Item label="Scheduled Date">
                                {formatDate(selectedBooking.scheduledDate)}
                            </Descriptions.Item>
                            <Descriptions.Item label="Duration">
                                {selectedBooking.duration}
                            </Descriptions.Item>

                            <Descriptions.Item label="Base Price" span={screens.xs ? 1 : 2}>
                                ₹{(selectedBooking.price || 0).toFixed(2)}
                            </Descriptions.Item>

                            {selectedBooking.optionalInputs && selectedBooking.optionalInputs.length > 0 && (
                                <Descriptions.Item label="Optional Services" span={screens.xs ? 1 : 2}>
                                    {formatOptionalServices(selectedBooking)}
                                </Descriptions.Item>
                            )}

                            {selectedBooking.extraInputs && selectedBooking.extraInputs.length > 0 && (
                                <Descriptions.Item label="Extra Services" span={screens.xs ? 1 : 2}>
                                    {selectedBooking.extraInputs.map((extra, i) => (
                                        <div key={i}>
                                            <Tag color="gold">{extra.name}</Tag>
                                            <span> ₹{extra.price}</span>
                                        </div>
                                    ))}
                                </Descriptions.Item>
                            )}

                            <Descriptions.Item label="Total Amount" span={screens.xs ? 1 : 2}>
                                <Text strong style={{ fontSize: screens.xs ? '16px' : '18px', color: '#52c41a' }}>
                                    ₹{(selectedBooking.price || 0).toFixed(2)}
                                </Text>
                            </Descriptions.Item>

                            {selectedBooking.specialInstructions && (
                                <Descriptions.Item label="Special Instructions" span={screens.xs ? 1 : 2}>
                                    {selectedBooking.specialInstructions}
                                </Descriptions.Item>
                            )}

                            <Descriptions.Item label="Current Status" span={screens.xs ? 1 : 2}>
                                <Tag color={
                                    selectedBooking.status === 'completed' ? 'green' :
                                        selectedBooking.status === 'cancelled' ? 'red' :
                                            selectedBooking.status === 'in-progress' ? 'orange' : 'blue'
                                }>
                                    {selectedBooking.status?.toUpperCase()}
                                </Tag>
                            </Descriptions.Item>
                        </Descriptions>
                    </div>
                )}
            </Modal>

            {/* Earnings Summary */}
            <Card
                title="Earnings Overview"
                bodyStyle={{ padding: screens.xs ? '12px' : '24px' }}
            >
                <Row gutter={[screens.xs ? 8 : 16, screens.xs ? 8 : 16]}>
                    <Col xs={24} sm={8}>
                        <Statistic
                            title="Total Earnings"
                            value={totalEarnings}
                            precision={2}
                            prefix="₹"
                            valueStyle={{ color: '#3f8600', fontSize: screens.xs ? '20px' : '24px' }}
                        />
                    </Col>
                    <Col xs={24} sm={8}>
                        <Statistic
                            title="Completed Jobs"
                            value={completedJobs}
                            valueStyle={{ color: '#1890ff', fontSize: screens.xs ? '20px' : '24px' }}
                        />
                    </Col>
                    <Col xs={24} sm={8}>
                        <Statistic
                            title="Pending Jobs"
                            value={pendingJobs}
                            valueStyle={{ color: '#faad14', fontSize: screens.xs ? '20px' : '24px' }}
                        />
                    </Col>
                </Row>
            </Card>
        </div>
    );
}

export default HelperDashboard;
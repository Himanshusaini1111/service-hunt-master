import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import {
    Button,
    Table,
    Tag,
    message,
    Modal,
    Spin,
    Select,
    Space,
    Descriptions,
    Typography,
    Grid,
    Empty
} from 'antd';
import {
    LogoutOutlined,
    SyncOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    InfoCircleOutlined
} from '@ant-design/icons';
import {
    FaKey,
    FaUserTie,
    FaVolumeUp,
    FaVolumeMute,
    FaTasks,
    FaRupeeSign,
    FaCheckCircle,
    FaClock,
    FaPhoneAlt,
    FaMapMarkerAlt,
    FaArrowRight,
    FaShieldAlt,
    FaBell,
    FaCalendarCheck,
    FaWallet
} from 'react-icons/fa';
import Navbar from './Navbar';
import { requestNotificationPermission, onMessageListener } from '../firebase';
import './HelperLogin.css';

const { useBreakpoint } = Grid;
const { Text } = Typography;
const { Option } = Select;

export function HelperLogin() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [helperData, setHelperData] = useState(null);
    const [loginCode, setLoginCode] = useState('');
    const [loginLoading, setLoginLoading] = useState(false);

    // Auto-restore helper session if already authenticated
    useEffect(() => {
        const token = localStorage.getItem('helperToken');
        const savedUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
        if (token && savedUser && savedUser.isHelper) {
            setIsLoggedIn(true);
            setHelperData(savedUser);
        }
    }, []);

    const handleLogin = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        const codeClean = loginCode.trim();
        if (!codeClean) {
            message.warning('Please enter your helper code');
            return;
        }

        try {
            setLoginLoading(true);
            const response = await axios.post('/api/helper/login', { code: codeClean });
            if (response.data.success) {
                const helper = response.data.helper;
                const token = response.data.token;

                setIsLoggedIn(true);
                setHelperData(helper);
                localStorage.setItem('helperToken', token);

                // Synchronize currentUser so Navbar and /helperpanel recognize the helper
                const helperUser = {
                    _id: helper._id,
                    name: helper.name,
                    email: helper.email,
                    phone: helper.phone,
                    isHelper: true,
                    helperId: helper._id,
                    code: helper.code,
                    isConnected: helper.isConnected,
                    vendor: helper.vendor
                };
                localStorage.setItem('currentUser', JSON.stringify(helperUser));

                // Save FCM token for helper notifications
                try {
                    await requestNotificationPermission(helper._id, 'helper');
                } catch (notifErr) {
                    console.log('Notification permission request error:', notifErr);
                }

                message.success('Helper workstation unlocked successfully!');
            } else {
                message.error(response.data?.message || 'Login failed');
            }
        } catch (error) {
            message.error(error.response?.data?.message || 'Invalid or inactive helper code');
        } finally {
            setLoginLoading(false);
        }
    };

    const handleLogout = () => {
        setIsLoggedIn(false);
        setHelperData(null);
        localStorage.removeItem('helperToken');
        localStorage.removeItem('currentUser');
        message.success('Logged out successfully');
    };

    if (!isLoggedIn) {
        return (
            <div className="helper-auth-page">
                <Navbar />

                <div className="helper-login-hero-wrap">
                    <div className="helper-login-grid">
                        {/* Left Info Column */}
                        <div className="helper-login-info">
                            <div className="helper-login-pill">
                                <FaShieldAlt /> Service Hunt Field Operations
                            </div>

                            <h1 className="helper-hero-heading">
                                Professional <span>Helper & Staff</span> Workstation
                            </h1>

                            <p className="helper-hero-desc">
                                Access your scheduled field appointments, receive live dispatch sirens, update task progress, and track daily earnings in real-time.
                            </p>

                            <div className="helper-feature-list">
                                <div className="helper-feature-item">
                                    <div className="helper-feature-icon">
                                        <FaCalendarCheck />
                                    </div>
                                    <div>
                                        <h4 className="helper-feature-title">Real-Time Job Queue</h4>
                                        <p className="helper-feature-desc">
                                            Instant notifications as soon as your partner vendor assigns a new customer service request.
                                        </p>
                                    </div>
                                </div>

                                <div className="helper-feature-item">
                                    <div className="helper-feature-icon">
                                        <FaBell />
                                    </div>
                                    <div>
                                        <h4 className="helper-feature-title">Audible Alert Dispatch</h4>
                                        <p className="helper-feature-desc">
                                            Loud audio alarms & push notices keep you alert so you never miss an urgent assignment.
                                        </p>
                                    </div>
                                </div>

                                <div className="helper-feature-item">
                                    <div className="helper-feature-icon">
                                        <FaWallet />
                                    </div>
                                    <div>
                                        <h4 className="helper-feature-title">Transparent Earnings</h4>
                                        <p className="helper-feature-desc">
                                            Review total completed jobs, pending payments, and reconciled partner disbursements.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Login Card Column */}
                        <div className="helper-login-card">
                            <div className="helper-card-badge">
                                <FaCheckCircle /> Authorized Personnel
                            </div>

                            <h2 className="helper-login-title">Helper Workstation</h2>
                            <p className="helper-login-subtitle">
                                Enter your assigned helper code to unlock your shift dashboard.
                            </p>

                            <form onSubmit={handleLogin}>
                                <div className="helper-input-group">
                                    <label className="helper-input-label" htmlFor="helperCodeInput">
                                        Unique Helper Security Code
                                    </label>
                                    <div className="helper-code-input-wrap">
                                        <FaKey className="helper-input-icon" />
                                        <input
                                            id="helperCodeInput"
                                            type="text"
                                            value={loginCode}
                                            onChange={(e) => setLoginCode(e.target.value.toUpperCase())}
                                            placeholder="e.g. HLP789"
                                            autoComplete="off"
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="helper-btn-primary"
                                    disabled={loginLoading}
                                >
                                    {loginLoading ? (
                                        <>
                                            <SyncOutlined spin /> Authenticating...
                                        </>
                                    ) : (
                                        <>
                                            Enter Workstation <FaArrowRight />
                                        </>
                                    )}
                                </button>
                            </form>

                            <div className="helper-login-footer-notes">
                                <p style={{ margin: '0 0 8px 0' }}>
                                    Helper codes are assigned by your registered vendor agency.
                                </p>
                                <Link to="/pathner" style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>
                                    Register your agency as a Service Partner →
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="helper-auth-page">
            <Navbar />
            <HelperDashboard helperData={helperData} onLogout={handleLogout} />
        </div>
    );
}

function HelperDashboard({ helperData, onLogout }) {
    const screens = useBreakpoint();
    const [isOnline, setIsOnline] = useState(false);
    const [assignedWorks, setAssignedWorks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [showBookingDetails, setShowBookingDetails] = useState(false);

    // Notification states
    const [lastCheckedTime, setLastCheckedTime] = useState(
        localStorage.getItem('helperLastCheckedTime') || Date.now().toString()
    );
    const [soundEnabled, setSoundEnabled] = useState(
        localStorage.getItem('helperSoundEnabled') !== 'false'
    );
    const [isPlayingSound, setIsPlayingSound] = useState(false);
    const [newWorkAlert, setNewWorkAlert] = useState(null);
    const [notifiedWorkIds, setNotifiedWorkIds] = useState(
        new Set(JSON.parse(localStorage.getItem('helperNotifiedWorks') || '[]'))
    );

    const audioRef = useRef(null);
    const pollingIntervalRef = useRef(null);
    const soundTimeoutRef = useRef(null);
    const lastCheckedTimeRef = useRef(lastCheckedTime);
    const notifiedWorkIdsRef = useRef(notifiedWorkIds);
    const soundEnabledRef = useRef(soundEnabled);
    const isPlayingSoundRef = useRef(isPlayingSound);

    // Keep refs synchronized
    useEffect(() => {
        lastCheckedTimeRef.current = lastCheckedTime;
    }, [lastCheckedTime]);

    useEffect(() => {
        notifiedWorkIdsRef.current = notifiedWorkIds;
    }, [notifiedWorkIds]);

    useEffect(() => {
        soundEnabledRef.current = soundEnabled;
    }, [soundEnabled]);

    useEffect(() => {
        isPlayingSoundRef.current = isPlayingSound;
    }, [isPlayingSound]);

    const stopSound = useCallback(() => {
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
    }, []);

    const playNotificationSound = useCallback((shouldLoop = true) => {
        if (!soundEnabledRef.current || !audioRef.current) return;

        try {
            audioRef.current.loop = shouldLoop;
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch((e) => {
                console.log('Sound play failed:', e);
                message.warning('Click "Allow" in browser to enable audio alerts', 3);
            });
            setIsPlayingSound(true);

            // Auto-stop sound after 30 seconds
            soundTimeoutRef.current = setTimeout(() => {
                stopSound();
                message.info('Sound alert auto-silenced after 30 seconds', 2);
            }, 30000);
        } catch (error) {
            console.log('Error playing sound:', error);
        }
    }, [stopSound]);

    const fetchAssignedWorks = useCallback(async (isSilent = false) => {
        if (!isSilent) {
            setLoading(true);
        } else {
            setIsRefreshing(true);
        }
        try {
            const token = localStorage.getItem('helperToken');
            if (!token) return;
            const response = await axios.get('/api/helper/assigned-works', {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                setAssignedWorks(response.data.works || []);
            } else {
                if (!isSilent) message.error(response.data.message || 'Failed to load assigned jobs');
            }
        } catch (error) {
            console.error('Error fetching assigned jobs:', error);
            if (!isSilent) message.error(error.response?.data?.message || 'Failed to load assigned jobs');
        } finally {
            if (!isSilent) setLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    // Check for new works
    const checkNewWorks = useCallback(async () => {
        try {
            const token = localStorage.getItem('helperToken');
            if (!token) return;

            const response = await axios.get('/api/helper/check-new-works', {
                headers: { Authorization: `Bearer ${token}` },
                params: { lastCheckedTime: lastCheckedTimeRef.current }
            });

            const newWorks = response.data.works || [];

            if (newWorks.length > 0) {
                const trulyNewWorks = newWorks.filter(
                    (work) => !notifiedWorkIdsRef.current.has(work._id)
                );

                if (trulyNewWorks.length > 0) {
                    const newNotifiedIds = new Set(notifiedWorkIdsRef.current);
                    trulyNewWorks.forEach((work) => {
                        newNotifiedIds.add(work._id);
                    });
                    notifiedWorkIdsRef.current = newNotifiedIds;
                    setNotifiedWorkIds(newNotifiedIds);
                    localStorage.setItem('helperNotifiedWorks', JSON.stringify([...newNotifiedIds]));

                    const count = trulyNewWorks.length;
                    const currentAlertWorkIds = newWorkAlert?.works?.map((w) => w._id) || [];
                    const isDuplicateAlert = trulyNewWorks.some((w) =>
                        currentAlertWorkIds.includes(w._id)
                    );

                    if (!isDuplicateAlert) {
                        const newWorkInfo = {
                            count,
                            works: trulyNewWorks,
                            timestamp: new Date()
                        };

                        setNewWorkAlert(newWorkInfo);

                        if (soundEnabledRef.current && audioRef.current) {
                            playNotificationSound(true);
                        }

                        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                            new Notification(`📢 New Work Assigned!`, {
                                body: `${count} new work${count > 1 ? 's have' : ' has'} been assigned to you`,
                                icon: '/icon-192.png',
                                vibrate: [200, 100, 200]
                            });
                        }

                        fetchAssignedWorks(true);
                        message.info(`${count} new job${count > 1 ? 's' : ''} assigned to you!`);
                    }
                }
            }

            const newCheckedTime = Date.now().toString();
            lastCheckedTimeRef.current = newCheckedTime;
            setLastCheckedTime(newCheckedTime);
            localStorage.setItem('helperLastCheckedTime', newCheckedTime);
        } catch (error) {
            console.log('Error checking new jobs:', error);
        }
    }, [fetchAssignedWorks, newWorkAlert, playNotificationSound]);

    // Work status changes listener
    useEffect(() => {
        const handleWorkUpdate = (event) => {
            const { status } = event.detail || {};
            if ((status === 'in-progress' || status === 'completed' || status === 'cancelled') && isPlayingSound) {
                stopSound();
            }
        };

        window.addEventListener('workStatusChanged', handleWorkUpdate);
        return () => {
            window.removeEventListener('workStatusChanged', handleWorkUpdate);
        };
    }, [isPlayingSound, stopSound]);

    // Work confirmed listener
    useEffect(() => {
        const handleWorkConfirmed = (event) => {
            const { workId } = event.detail || {};
            if (workId) {
                setNotifiedWorkIds((prev) => {
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

    const checkConnectionStatus = useCallback(async () => {
        try {
            const token = localStorage.getItem('helperToken');
            if (!token) return;
            const response = await axios.get('/api/helper/status', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setIsOnline(response.data.isConnected);
        } catch (error) {
            console.error('Error checking status:', error);
        }
    }, []);

    // 1-minute combined auto-refresh
    const refreshAll = useCallback(async (isSilent = true) => {
        await Promise.all([
            fetchAssignedWorks(isSilent),
            checkNewWorks(),
            checkConnectionStatus()
        ]);
    }, [fetchAssignedWorks, checkNewWorks, checkConnectionStatus]);

    // Auto-refresh interval set to exactly 1 minute (60,000 ms)
    useEffect(() => {
        if (helperData) {
            refreshAll(false);

            try {
                onMessageListener().then((payload) => {
                    console.log('📢 New work notification received:', payload);
                    refreshAll(true);
                }).catch(() => {});
            } catch (notifErr) {
                console.log('Push listener error:', notifErr);
            }

            // In 1 min it refreshes (60,000 ms)
            const ONE_MINUTE = 60000;
            pollingIntervalRef.current = setInterval(() => {
                refreshAll(true);
            }, ONE_MINUTE);

            return () => {
                if (pollingIntervalRef.current) {
                    clearInterval(pollingIntervalRef.current);
                }
                if (soundTimeoutRef.current) {
                    clearTimeout(soundTimeoutRef.current);
                }
            };
        }
    }, [helperData, refreshAll]);

    const handleAcceptJob = async (workId) => {
        try {
            const response = await axios.post(
                '/api/helper/accept-job',
                { bookingId: workId },
                { headers: { Authorization: `Bearer ${localStorage.getItem('helperToken')}` } }
            );

            if (response.data.success) {
                message.success(response.data.message || 'Job accepted! You are now doing this service.');
                stopSound();
                fetchAssignedWorks();
            }
        } catch (error) {
            const errMsg = error.response?.data?.message || 'Failed to accept job. Another helper may have taken it.';
            message.warning(errMsg);
            fetchAssignedWorks();
        }
    };

    const updateWorkStatus = async (workId, newStatus) => {
        try {
            const response = await axios.put(
                '/api/helper/update-status',
                { bookingId: workId, status: newStatus },
                { headers: { Authorization: `Bearer ${localStorage.getItem('helperToken')}` } }
            );

            if (response.data.success) {
                message.success(`Status updated to "${newStatus}"`);
                fetchAssignedWorks();

                if (newStatus === 'in-progress' || newStatus === 'completed' || newStatus === 'cancelled') {
                    window.dispatchEvent(
                        new CustomEvent('workStatusChanged', {
                            detail: { workId, status: newStatus }
                        })
                    );

                    const storedIds = JSON.parse(localStorage.getItem('helperNotifiedWorks') || '[]');
                    const updatedIds = storedIds.filter((id) => id !== workId);
                    localStorage.setItem('helperNotifiedWorks', JSON.stringify(updatedIds));

                    setNotifiedWorkIds((prev) => {
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

    const toggleSound = () => {
        const newState = !soundEnabled;
        setSoundEnabled(newState);
        localStorage.setItem('helperSoundEnabled', newState);

        if (!newState && isPlayingSound) {
            stopSound();
        }

        message.info(`Audio alerts ${newState ? 'enabled' : 'silenced'}`);
    };

    const toggleConnection = async () => {
        setLoading(true);
        try {
            await axios.post(
                '/api/helper/toggle-connection',
                { isConnected: !isOnline },
                { headers: { Authorization: `Bearer ${localStorage.getItem('helperToken')}` } }
            );
            setIsOnline(!isOnline);
            message.success(`You are now ${!isOnline ? 'Online (Accepting Jobs)' : 'Offline'}`);
        } catch (error) {
            message.error('Failed to update connection status');
        } finally {
            setLoading(false);
        }
    };

    const cancelWork = async (workId) => {
        Modal.confirm({
            title: 'Cancel Work Assignment',
            content: 'Are you sure you want to release and cancel this assigned job?',
            okText: 'Yes, Cancel',
            cancelText: 'Keep Job',
            okButtonProps: { danger: true },
            onOk: async () => {
                try {
                    await axios.post(
                        '/api/helper/cancel-work',
                        { workId },
                        { headers: { Authorization: `Bearer ${localStorage.getItem('helperToken')}` } }
                    );
                    message.success('Work cancelled successfully');
                    fetchAssignedWorks();

                    const storedIds = JSON.parse(localStorage.getItem('helperNotifiedWorks') || '[]');
                    const updatedIds = storedIds.filter((id) => id !== workId);
                    localStorage.setItem('helperNotifiedWorks', JSON.stringify(updatedIds));

                    setNotifiedWorkIds((prev) => {
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

    const formatOptionalServices = (work) => {
        if (!work.optionalInputs || work.optionalInputs.length === 0) return null;

        return work.optionalInputs.map((opt, i) => (
            <div key={i} style={{ marginBottom: '6px' }}>
                <Tag color="purple">{opt.name}</Tag>
                <span style={{ fontWeight: 600 }}> ₹{opt.price} x {opt.count || 1}</span>
                {opt.unit && <small style={{ color: '#64748b' }}> ({opt.unit})</small>}
            </div>
        ));
    };

    // Calculate earnings & jobs count
    const totalEarnings = assignedWorks
        .filter((w) => w.status === 'completed')
        .reduce((sum, w) => sum + (w.price || 0), 0);

    const completedJobs = assignedWorks.filter((w) => w.status === 'completed').length;
    const pendingJobs = assignedWorks.filter(
        (w) => w.status === 'assigned' || w.status === 'in-progress'
    ).length;

    // Table columns
    const getTableColumns = () => {
        const baseColumns = [
            {
                title: 'Booking ID',
                dataIndex: 'bookingId',
                key: 'bookingId',
                render: (text) => (
                    <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#2563eb' }}>
                        #{text?.slice(-6)?.toUpperCase() || text}
                    </span>
                ),
                responsive: ['md']
            },
            {
                title: 'Customer',
                key: 'customer',
                render: (_, record) => (
                    <div>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>
                            {record.customerName || 'Customer'}
                        </div>
                        {record.customerPhone && (
                            <div style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                <FaPhoneAlt style={{ fontSize: 10, color: '#10b981' }} />
                                <a href={`tel:${record.customerPhone}`} style={{ color: 'inherit' }}>
                                    {record.customerPhone}
                                </a>
                            </div>
                        )}
                    </div>
                )
            },
            {
                title: 'Service',
                dataIndex: 'serviceType',
                key: 'serviceType',
                render: (text) => (
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{text}</span>
                ),
                responsive: ['sm']
            },
            {
                title: 'Address',
                key: 'address',
                render: (_, record) => (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#475569' }}>
                        <FaMapMarkerAlt style={{ color: '#ef4444', fontSize: 12, flexShrink: 0 }} />
                        {formatAddress(record)}
                    </span>
                ),
                ellipsis: true,
                responsive: ['lg']
            },
            {
                title: 'Scheduled Date',
                dataIndex: 'scheduledDate',
                key: 'scheduledDate',
                render: (text) => formatDateOnly(text),
                responsive: ['md']
            },
            {
                title: 'Payout',
                key: 'price',
                render: (_, record) => (
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>
                        ₹{(record.price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                ),
                responsive: ['sm']
            },
            {
                title: 'Duty Status',
                key: 'status',
                render: (_, record) => {
                    const isCompleted = record.status === 'completed';
                    const isUnclaimed = !record.isClaimed && (record.status === 'assigned' || record.status === 'booked');

                    if (isCompleted) {
                        return (
                            <Tag color="green" icon={<CheckCircleOutlined />}>
                                Completed
                            </Tag>
                        );
                    }

                    if (isUnclaimed) {
                        return (
                            <Button
                                type="primary"
                                size="small"
                                style={{ background: '#16a34a', borderColor: '#16a34a', fontWeight: 600, borderRadius: 6 }}
                                icon={<CheckCircleOutlined />}
                                onClick={() => handleAcceptJob(record._id)}
                            >
                                Accept Job
                            </Button>
                        );
                    }

                    return (
                        <Select
                            value={record.status}
                            onChange={(value) => updateWorkStatus(record._id, value)}
                            style={{ width: screens.xs ? 110 : 135 }}
                            size="small"
                        >
                            <Option value="assigned">
                                <ClockCircleOutlined style={{ color: '#f59e0b', marginRight: 4 }} />
                                Assigned
                            </Option>
                            <Option value="in-progress">
                                <SyncOutlined spin style={{ color: '#2563eb', marginRight: 4 }} />
                                In Progress
                            </Option>
                            <Option value="completed">
                                <CheckCircleOutlined style={{ color: '#16a34a', marginRight: 4 }} />
                                Completed
                            </Option>
                        </Select>
                    );
                }
            },
            {
                title: 'Actions',
                key: 'action',
                render: (_, record) => (
                    <Space size={6}>
                        {(!record.isClaimed && (record.status === 'assigned' || record.status === 'booked')) && (
                            <Button
                                size="small"
                                type="primary"
                                style={{ background: '#16a34a', borderColor: '#16a34a', borderRadius: 6, fontWeight: 600 }}
                                onClick={() => handleAcceptJob(record._id)}
                            >
                                Accept
                            </Button>
                        )}
                        {record.status === 'in-progress' && (
                            <Button
                                size="small"
                                style={{ background: '#059669', color: '#fff', borderColor: '#059669', borderRadius: 6 }}
                                onClick={() => updateWorkStatus(record._id, 'completed')}
                            >
                                Complete
                            </Button>
                        )}
                        <Button
                            size="small"
                            type="default"
                            icon={<InfoCircleOutlined />}
                            onClick={() => handleViewDetails(record)}
                            style={{ borderRadius: 6 }}
                        >
                            Details
                        </Button>
                        {record.status === 'assigned' && !record.isClaimed && (
                            <Button
                                size="small"
                                danger
                                onClick={() => cancelWork(record._id)}
                                style={{ borderRadius: 6 }}
                            >
                                Cancel
                            </Button>
                        )}
                    </Space>
                )
            }
        ];

        return baseColumns.filter((column) => {
            if (!column.responsive) return true;
            return column.responsive.some((breakpoint) => screens[breakpoint]);
        });
    };

    const helperInitials = helperData?.name
        ? helperData.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
        : 'HL';

    return (
        <div className="helper-dash-container">
            {/* Audio Alert Element */}
            <audio ref={audioRef} preload="auto" style={{ display: 'none' }}>
                <source src="/sounds/booking.mp3" type="audio/mpeg" />
            </audio>

            {/* Floating Alert Toast */}
            {newWorkAlert && isPlayingSound && (
                <div className="helper-alert-toast">
                    <div className="helper-alert-pulse" style={{ fontSize: 24 }}>🔔</div>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: 16 }}>New Work Assigned!</div>
                        <div style={{ fontSize: 13, opacity: 0.9 }}>
                            {newWorkAlert.count} new job{newWorkAlert.count > 1 ? 's' : ''} assigned by your vendor
                        </div>
                    </div>
                    <Button
                        danger
                        size="small"
                        onClick={stopSound}
                        style={{ fontWeight: 700, borderRadius: 8 }}
                    >
                        Mute Sound
                    </Button>
                </div>
            )}

            {/* Header Surface */}
            <div className="helper-dash-header">
                <div className="helper-dash-info">
                    <div className="helper-dash-avatar">
                        {helperInitials}
                    </div>
                    <div>
                        <h2 className="helper-dash-welcome">
                            Welcome, {helperData?.name || 'Helper Partner'}
                        </h2>
                        <div className="helper-dash-meta">
                            <span style={{ fontFamily: 'monospace', fontWeight: 600, background: '#f1f5f9', padding: '2px 8px', borderRadius: 6 }}>
                                CODE: {helperData?.code}
                            </span>
                            {helperData?.vendor && (
                                <Tag color="green" style={{ borderRadius: 12 }}>
                                    Vendor: {helperData.vendor.name}
                                </Tag>
                            )}
                        </div>
                    </div>
                </div>

                <div className="helper-dash-controls">
                    <button
                        type="button"
                        className={`helper-sound-btn ${soundEnabled ? 'active' : ''}`}
                        onClick={toggleSound}
                        title={soundEnabled ? 'Audio alerts enabled' : 'Audio alerts muted'}
                    >
                        {soundEnabled ? <FaVolumeUp /> : <FaVolumeMute />}
                        <span>{soundEnabled ? 'Sound On' : 'Sound Muted'}</span>
                    </button>

                    {isPlayingSound && (
                        <Button
                            danger
                            onClick={stopSound}
                            style={{ fontWeight: 600, borderRadius: 8 }}
                        >
                            Stop Alert
                        </Button>
                    )}

                    <span className={`helper-online-badge ${isOnline ? 'online' : 'offline'}`}>
                        <span className={`helper-status-dot ${isOnline ? 'online' : 'offline'}`} />
                        {isOnline ? 'ONLINE' : 'OFFLINE'}
                    </span>

                    <Button
                        type={isOnline ? 'default' : 'primary'}
                        loading={loading}
                        onClick={toggleConnection}
                        style={{ borderRadius: 8, fontWeight: 600 }}
                    >
                        {isOnline ? 'Go Offline' : 'Go Online'}
                    </Button>

                    <Button
                        danger
                        icon={<LogoutOutlined />}
                        onClick={onLogout}
                        style={{ borderRadius: 8 }}
                    >
                        Logout
                    </Button>
                </div>
            </div>

            {/* Statistics Row */}
            <div className="helper-stats-grid">
                <div className="helper-stat-card">
                    <div>
                        <div className="helper-stat-label">Total Earnings</div>
                        <div className="helper-stat-val" style={{ color: '#16a34a' }}>
                            ₹{Number(totalEarnings || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                    </div>
                    <div className="helper-stat-icon-wrap" style={{ background: '#ecfdf5', color: '#16a34a' }}>
                        <FaRupeeSign />
                    </div>
                </div>

                <div className="helper-stat-card">
                    <div>
                        <div className="helper-stat-label">Completed Jobs</div>
                        <div className="helper-stat-val" style={{ color: '#2563eb' }}>
                            {completedJobs}
                        </div>
                    </div>
                    <div className="helper-stat-icon-wrap" style={{ background: '#eff6ff', color: '#2563eb' }}>
                        <FaCheckCircle />
                    </div>
                </div>

                <div className="helper-stat-card">
                    <div>
                        <div className="helper-stat-label">Pending / Active Jobs</div>
                        <div className="helper-stat-val" style={{ color: '#f59e0b' }}>
                            {pendingJobs}
                        </div>
                    </div>
                    <div className="helper-stat-icon-wrap" style={{ background: '#fffbeb', color: '#f59e0b' }}>
                        <FaClock />
                    </div>
                </div>
            </div>

            {/* Assigned Works Table */}
            <div className="helper-content-card">
                <div className="helper-content-header">
                    <h3 className="helper-content-title">
                        <FaTasks style={{ color: '#2563eb' }} />
                        Assigned Tasks & Work Orders ({assignedWorks.length})
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <Tag color="blue" style={{ margin: 0, borderRadius: 12, padding: '2px 10px', fontSize: 12 }}>
                            <SyncOutlined spin={isRefreshing} style={{ marginRight: 5 }} />
                            Auto-refreshes every 1 min
                        </Tag>
                        <Button
                            size="small"
                            icon={<SyncOutlined spin={loading || isRefreshing} />}
                            onClick={() => refreshAll(false)}
                            disabled={loading || isRefreshing}
                            style={{ borderRadius: 8 }}
                        >
                            Refresh Queue
                        </Button>
                    </div>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '50px 0' }}>
                        <Spin size="large" tip="Refreshing assignments..." />
                    </div>
                ) : assignedWorks.length > 0 ? (
                    <div className="helper-table-container">
                        <Table
                            dataSource={assignedWorks}
                            rowKey="_id"
                            pagination={{
                                pageSize: 6,
                                size: screens.xs ? 'small' : 'default',
                                showTotal: (total) => `Total ${total} jobs`
                            }}
                            scroll={{ x: true }}
                            size={screens.xs ? 'small' : 'middle'}
                            columns={getTableColumns()}
                        />
                    </div>
                ) : (
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={
                            <div>
                                <div style={{ fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                                    No Assigned Jobs Currently
                                </div>
                                <div style={{ fontSize: 13, color: '#94a3b8' }}>
                                    Make sure your status is set to ONLINE to receive direct job assignments.
                                </div>
                            </div>
                        }
                    />
                )}
            </div>

            {/* Booking Details Modal */}
            <Modal
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 18 }}>
                        <FaUserTie style={{ color: '#2563eb' }} />
                        Booking Specification Details
                    </div>
                }
                open={showBookingDetails}
                onCancel={() => setShowBookingDetails(false)}
                footer={[
                    <Button key="close" type="primary" onClick={() => setShowBookingDetails(false)} style={{ borderRadius: 8 }}>
                        Done
                    </Button>
                ]}
                width={screens.xs ? '95%' : 840}
                style={{ top: screens.xs ? 10 : 30 }}
            >
                {selectedBooking && (
                    <Descriptions
                        bordered
                        column={screens.xs ? 1 : 2}
                        size={screens.xs ? 'small' : 'default'}
                        layout={screens.xs ? 'vertical' : 'horizontal'}
                    >
                        <Descriptions.Item label="Booking ID" span={screens.xs ? 1 : 2}>
                            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>
                                {selectedBooking.bookingId}
                            </span>
                        </Descriptions.Item>
                        <Descriptions.Item label="Service Type">{selectedBooking.serviceType}</Descriptions.Item>
                        <Descriptions.Item label="Category / Booking Type">{selectedBooking.category || 'Standard'}</Descriptions.Item>
                        <Descriptions.Item label="Customer Name">{selectedBooking.customerName}</Descriptions.Item>
                        <Descriptions.Item label="Customer Contact">
                            {selectedBooking.customerPhone ? (
                                <a href={`tel:${selectedBooking.customerPhone}`} style={{ color: '#2563eb', fontWeight: 600 }}>
                                    {selectedBooking.customerPhone}
                                </a>
                            ) : 'N/A'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Location Type" span={screens.xs ? 1 : 2}>
                            {selectedBooking.locationType || 'Simple'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Full Address" span={screens.xs ? 1 : 2}>
                            {formatAddress(selectedBooking)}
                        </Descriptions.Item>

                        {selectedBooking.selectedDates && selectedBooking.selectedDates.length > 0 && (
                            <Descriptions.Item label="Scheduled Dates" span={screens.xs ? 1 : 2}>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    {selectedBooking.selectedDates.map((d, i) => (
                                        <Tag key={i} color="blue">
                                            {formatDateOnly(d)}
                                        </Tag>
                                    ))}
                                </div>
                            </Descriptions.Item>
                        )}

                        {selectedBooking.slots && selectedBooking.slots.length > 0 && (
                            <Descriptions.Item label="Time Slots" span={screens.xs ? 1 : 2}>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    {selectedBooking.slots.map((slot, i) => (
                                        <Tag key={i} color="orange">
                                            {typeof slot === 'string'
                                                ? slot
                                                : slot.slot
                                                    ? slot.slot
                                                    : slot.date
                                                        ? formatDateOnly(slot.date)
                                                        : 'Time slot'}
                                        </Tag>
                                    ))}
                                </div>
                            </Descriptions.Item>
                        )}

                        <Descriptions.Item label="Scheduled Date">
                            {formatDate(selectedBooking.scheduledDate)}
                        </Descriptions.Item>
                        <Descriptions.Item label="Duration">
                            {selectedBooking.duration || 'Standard Session'}
                        </Descriptions.Item>

                        <Descriptions.Item label="Base Amount" span={screens.xs ? 1 : 2}>
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
                                    <div key={i} style={{ marginBottom: 4 }}>
                                        <Tag color="gold">{extra.name}</Tag>
                                        <span style={{ fontWeight: 600 }}> ₹{extra.price}</span>
                                    </div>
                                ))}
                            </Descriptions.Item>
                        )}

                        <Descriptions.Item label="Total Amount" span={screens.xs ? 1 : 2}>
                            <Text strong style={{ fontSize: 18, color: '#16a34a' }}>
                                ₹{(selectedBooking.price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </Text>
                        </Descriptions.Item>

                        {selectedBooking.specialInstructions && (
                            <Descriptions.Item label="Special Instructions" span={screens.xs ? 1 : 2}>
                                {selectedBooking.specialInstructions}
                            </Descriptions.Item>
                        )}

                        <Descriptions.Item label="Current Status" span={screens.xs ? 1 : 2}>
                            <Tag
                                color={
                                    selectedBooking.status === 'completed'
                                        ? 'green'
                                        : selectedBooking.status === 'cancelled'
                                            ? 'red'
                                            : selectedBooking.status === 'in-progress'
                                                ? 'orange'
                                                : 'blue'
                                }
                                style={{ borderRadius: 12, padding: '2px 10px', fontWeight: 600 }}
                            >
                                {selectedBooking.status?.toUpperCase()}
                            </Tag>
                        </Descriptions.Item>
                    </Descriptions>
                )}
            </Modal>
        </div>
    );
}

export default HelperLogin;

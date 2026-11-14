import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './SuperAdminDashboard.css';

// Material Icons
import {
    Person, Business, BookOnline, Groups,
    Receipt, Delete, Refresh, ArrowBack, Payments,
    Work, AccountBalance, AccountBalanceWallet
} from '@mui/icons-material';

const SuperAdminDashboard = () => {
    const navigate = useNavigate();

    // Current Logged-in User
    const [currentUser] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('currentUser')) || null;
        } catch (e) {
            return null;
        }
    });

    const superAdminUserId = currentUser?._id || currentUser?.id || '';

    // Main States
    const [activeTab, setActiveTab] = useState(0);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState(null);
    const [entities, setEntities] = useState({ data: [], pagination: {} });
    const [categories, setCategories] = useState([]);
    
    // Filters & Pagination
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');

    // Notification Messages
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    // Drill-Down Modals
    const [selectedAdminDetails, setSelectedAdminDetails] = useState(null);
    const [adminModalLoading, setAdminModalLoading] = useState(false);
    const [adminSubTab, setAdminSubTab] = useState('services'); // 'services' | 'helpers' | 'payments' | 'bookings'

    const [selectedServiceSpecs, setSelectedServiceSpecs] = useState(null);
    const [payoutToApprove, setPayoutToApprove] = useState(null);
    const [approvalUTR, setApprovalUTR] = useState('');
    const [approvalNotes, setApprovalNotes] = useState('');
    const [payoutToReject, setPayoutToReject] = useState(null);
    const [rejectionReason, setRejectionReason] = useState('');

    // Fetch Dashboard Statistics
    const fetchDashboardStats = useCallback(async () => {
        try {
            const res = await fetch(`/api/superadmin/dashboard?userid=${superAdminUserId}`);
            const data = await res.json();
            if (data.success) {
                setStats(data.stats);
            }
        } catch (err) {
            console.error('Error fetching dashboard stats:', err);
        }
    }, [superAdminUserId]);

    // Fetch Entities based on active tab
    const fetchEntities = useCallback(async () => {
        setLoading(true);
        const endpoints = [
            'vendors',   // 0: Admins / Providers
            'services',  // 1: Services Directory
            'helpers',   // 2: Helpers Directory
            'payouts',   // 3: Payouts & Escrow Settlements
            'bookings',  // 4: Bookings Hub
            'users',     // 5: Users
            'pathners'   // 6: Partner Applications
        ];

        const endpoint = endpoints[activeTab];
        let url = `/api/superadmin/${endpoint}?userid=${superAdminUserId}&page=${page}&limit=${limit}`;

        if (search.trim()) {
            url += `&search=${encodeURIComponent(search.trim())}`;
        }
        if (statusFilter !== 'all') {
            url += `&status=${encodeURIComponent(statusFilter)}`;
        }
        if (categoryFilter !== 'all' && activeTab === 1) {
            url += `&category=${encodeURIComponent(categoryFilter)}`;
        }

        try {
            const res = await fetch(url);
            const data = await res.json();
            if (data.success) {
                setEntities({
                    data: data[endpoint] || data.data || [],
                    pagination: data.pagination || {}
                });
                if (data.categories) {
                    setCategories(data.categories);
                }
            } else {
                setErrorMsg(data.message || `Failed to fetch ${endpoint}`);
            }
        } catch (err) {
            console.error(`Error fetching ${endpoint}:`, err);
            setErrorMsg(`Server communication error while fetching ${endpoint}`);
        } finally {
            setLoading(false);
        }
    }, [activeTab, page, limit, search, statusFilter, categoryFilter, superAdminUserId]);

    useEffect(() => {
        fetchDashboardStats();
    }, [fetchDashboardStats]);

    useEffect(() => {
        fetchEntities();
    }, [fetchEntities]);

    // Inspect a Particular Admin / Vendor
    const handleInspectAdmin = async (adminId) => {
        setAdminModalLoading(true);
        setSelectedAdminDetails(null);
        setAdminSubTab('services');
        try {
            const res = await fetch(`/api/superadmin/vendor/${adminId}/details?userid=${superAdminUserId}`);
            const data = await res.json();
            if (data.success) {
                setSelectedAdminDetails(data);
            } else {
                setErrorMsg(data.message || 'Failed to fetch admin details');
            }
        } catch (err) {
            console.error('Error fetching admin details:', err);
            setErrorMsg('Error loading admin details');
        } finally {
            setAdminModalLoading(false);
        }
    };

    // Toggle Service Visibility
    const handleToggleServiceVisibility = async (serviceId, e) => {
        if (e) e.stopPropagation();
        try {
            const res = await fetch(`/api/superadmin/services/${serviceId}/toggle-visibility?userid=${superAdminUserId}`, {
                method: 'PUT'
            });
            const data = await res.json();
            if (data.success) {
                setSuccessMsg(data.message);
                fetchEntities();
                if (selectedAdminDetails) {
                    handleInspectAdmin(selectedAdminDetails.vendor._id);
                }
            } else {
                setErrorMsg(data.message || 'Failed to toggle visibility');
            }
        } catch (err) {
            console.error('Error toggling service visibility:', err);
            setErrorMsg('Failed to update service visibility');
        }
    };

    // Convert Partner Application to Vendor / Admin
    const handleConvertPartner = async (partnerId) => {
        if (!window.confirm("Approve and convert this partner application to an official Admin/Vendor account?")) return;
        try {
            const res = await fetch(`/api/superadmin/pathner-to-vendor/${partnerId}?userid=${superAdminUserId}`, {
                method: 'POST'
            });
            const data = await res.json();
            if (data.success) {
                setSuccessMsg(data.message);
                fetchEntities();
                fetchDashboardStats();
            } else {
                setErrorMsg(data.message || 'Failed to convert partner');
            }
        } catch (err) {
            console.error('Error converting partner:', err);
            setErrorMsg('Error processing conversion');
        }
    };

    // Approve Payout Request with UTR
    const handleApprovePayout = async () => {
        if (!payoutToApprove) return;
        if (!approvalUTR.trim()) {
            setErrorMsg("Please enter the Bank UTR / IMPS Transaction Reference Number.");
            return;
        }

        try {
            const res = await fetch(`/api/superadmin/payouts/${payoutToApprove._id}/approve?userid=${superAdminUserId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transactionRef: approvalUTR.trim(),
                    transferNotes: approvalNotes.trim()
                })
            });
            const data = await res.json();
            if (data.success) {
                setSuccessMsg(data.message);
                setPayoutToApprove(null);
                setApprovalUTR('');
                setApprovalNotes('');
                fetchEntities();
                fetchDashboardStats();
                if (selectedAdminDetails) {
                    handleInspectAdmin(selectedAdminDetails.vendor._id);
                }
            } else {
                setErrorMsg(data.message || 'Failed to approve payout');
            }
        } catch (err) {
            console.error('Error approving payout:', err);
            setErrorMsg('Server error approving payout');
        }
    };

    // Reject Payout Request
    const handleRejectPayout = async () => {
        if (!payoutToReject) return;
        try {
            const res = await fetch(`/api/superadmin/payouts/${payoutToReject._id}/reject?userid=${superAdminUserId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rejectedReason: rejectionReason.trim() || 'Declined by Super Admin'
                })
            });
            const data = await res.json();
            if (data.success) {
                setSuccessMsg(data.message);
                setPayoutToReject(null);
                setRejectionReason('');
                fetchEntities();
                fetchDashboardStats();
                if (selectedAdminDetails) {
                    handleInspectAdmin(selectedAdminDetails.vendor._id);
                }
            } else {
                setErrorMsg(data.message || 'Failed to reject payout');
            }
        } catch (err) {
            console.error('Error rejecting payout:', err);
            setErrorMsg('Server error rejecting payout');
        }
    };

    // Generic Delete
    const handleDeleteEntity = async (entityType, id, name) => {
        if (!window.confirm(`Are you sure you want to delete ${name || entityType}? This action cannot be undone.`)) return;
        try {
            const res = await fetch(`/api/superadmin/${entityType}/${id}?userid=${superAdminUserId}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (data.success) {
                setSuccessMsg(data.message);
                fetchEntities();
                fetchDashboardStats();
                if (selectedAdminDetails && selectedAdminDetails.vendor._id === id) {
                    setSelectedAdminDetails(null);
                }
            } else {
                setErrorMsg(data.message || `Failed to delete ${entityType}`);
            }
        } catch (err) {
            console.error(`Error deleting ${entityType}:`, err);
            setErrorMsg(`Failed to delete ${entityType}`);
        }
    };

    const tabs = [
        { label: 'Admins (Vendors)', count: stats?.totalVendors || 0, icon: <Business fontSize="small" /> },
        { label: 'All Services', count: stats?.totalServices || 0, icon: <Work fontSize="small" /> },
        { label: 'Helpers Directory', count: stats?.totalHelpers || 0, icon: <Groups fontSize="small" /> },
        { label: 'Payouts & Settlements', count: stats?.pendingPayoutsCount || 0, icon: <Payments fontSize="small" /> },
        { label: 'Bookings Hub', count: stats?.totalBookings || 0, icon: <BookOnline fontSize="small" /> },
        { label: 'Registered Users', count: stats?.totalUsers || 0, icon: <Person fontSize="small" /> },
        { label: 'Partner Applications', count: stats?.totalPathners || 0, icon: <Receipt fontSize="small" /> }
    ];

    return (
        <div className="sad-wrapper">
            <div className="sad-container">
                
                {/* Notification Toasts */}
                {errorMsg && (
                    <div style={{
                        background: '#ef4444', color: '#fff', padding: '12px 18px',
                        borderRadius: 10, marginBottom: 16, display: 'flex',
                        alignItems: 'center', justifyContent: 'space-between',
                        boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)'
                    }}>
                        <span>⚠️ {errorMsg}</span>
                        <button onClick={() => setErrorMsg('')} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
                    </div>
                )}
                {successMsg && (
                    <div style={{
                        background: '#10b981', color: '#fff', padding: '12px 18px',
                        borderRadius: 10, marginBottom: 16, display: 'flex',
                        alignItems: 'center', justifyContent: 'space-between',
                        boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
                    }}>
                        <span>✅ {successMsg}</span>
                        <button onClick={() => setSuccessMsg('')} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
                    </div>
                )}

                {/* Topbar Header */}
                <header className="sad-topbar">
                    <div className="sad-brand">
                        <div className="sad-brand-icon">🛡️</div>
                        <div className="sad-brand-text">
                            <h1>
                                Super Admin Control Center
                                <span className="sad-badge-super">Superadmin Master</span>
                            </h1>
                            <p>Global oversight of Services, Admins (Vendors), Helper affiliations, Payments & Escrow settlements</p>
                        </div>
                    </div>
                    <div className="sad-topbar-actions">
                        <button className="sad-btn sad-btn-secondary" onClick={() => navigate('/home')}>
                            <ArrowBack fontSize="small" /> Back to App
                        </button>
                        <button className="sad-btn sad-btn-primary" onClick={() => { fetchDashboardStats(); fetchEntities(); }}>
                            <Refresh fontSize="small" /> Refresh Data
                        </button>
                    </div>
                </header>

                {/* Statistics Cards Grid */}
                <div className="sad-stats-grid">
                    <div className="sad-stat-card">
                        <div className="sad-stat-top">
                            <span className="sad-stat-title">Admins / Providers</span>
                            <div className="sad-stat-icon" style={{ background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8' }}>
                                <Business />
                            </div>
                        </div>
                        <div className="sad-stat-val">{stats?.totalVendors || 0}</div>
                        <div className="sad-stat-sub">Active service providers</div>
                    </div>

                    <div className="sad-stat-card">
                        <div className="sad-stat-top">
                            <span className="sad-stat-title">Live Services</span>
                            <div className="sad-stat-icon" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399' }}>
                                <Work />
                            </div>
                        </div>
                        <div className="sad-stat-val">{stats?.totalServices || 0}</div>
                        <div className="sad-stat-sub">Marketplace offerings</div>
                    </div>

                    <div className="sad-stat-card">
                        <div className="sad-stat-top">
                            <span className="sad-stat-title">Field Helpers</span>
                            <div className="sad-stat-icon" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa' }}>
                                <Groups />
                            </div>
                        </div>
                        <div className="sad-stat-val">{stats?.totalHelpers || 0}</div>
                        <div className="sad-stat-sub">Verified task workers</div>
                    </div>

                    <div className="sad-stat-card">
                        <div className="sad-stat-top">
                            <span className="sad-stat-title">Gross Booking Volume</span>
                            <div className="sad-stat-icon" style={{ background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc' }}>
                                <Receipt />
                            </div>
                        </div>
                        <div className="sad-stat-val">₹{Number(stats?.grossRevenue || 0).toLocaleString('en-IN')}</div>
                        <div className="sad-stat-sub">{stats?.totalBookings || 0} total bookings</div>
                    </div>

                    <div className="sad-stat-card">
                        <div className="sad-stat-top">
                            <span className="sad-stat-title">Platform Fees Earned</span>
                            <div className="sad-stat-icon" style={{ background: 'rgba(234, 179, 8, 0.2)', color: '#facc15' }}>
                                <AccountBalanceWallet />
                            </div>
                        </div>
                        <div className="sad-stat-val">₹{Number(stats?.platformRevenue || 0).toLocaleString('en-IN')}</div>
                        <div className="sad-stat-sub">SuperAdmin platform commission</div>
                    </div>

                    <div className="sad-stat-card" style={{ border: stats?.pendingPayoutsCount > 0 ? '1px solid rgba(239, 68, 68, 0.5)' : undefined }}>
                        <div className="sad-stat-top">
                            <span className="sad-stat-title">Pending Settlements</span>
                            <div className="sad-stat-icon" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171' }}>
                                <Payments />
                            </div>
                        </div>
                        <div className="sad-stat-val" style={{ color: stats?.pendingPayoutsCount > 0 ? '#f87171' : undefined }}>
                            ₹{Number(stats?.pendingPayoutsAmount || 0).toLocaleString('en-IN')}
                        </div>
                        <div className="sad-stat-sub">{stats?.pendingPayoutsCount || 0} withdrawal requests</div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="sad-tabs-bar">
                    {tabs.map((tab, idx) => (
                        <button
                            key={idx}
                            className={`sad-tab-btn ${activeTab === idx ? 'active' : ''}`}
                            onClick={() => {
                                setActiveTab(idx);
                                setPage(1);
                                setSearch('');
                                setStatusFilter('all');
                            }}
                        >
                            {tab.icon}
                            <span>{tab.label}</span>
                            <span className="sad-tab-badge">{tab.count}</span>
                        </button>
                    ))}
                </div>

                {/* Surface Container for Table and Actions */}
                <div className="sad-surface">
                    <div className="sad-surface-header">
                        <div>
                            <div className="sad-surface-title">
                                {tabs[activeTab].icon}
                                <span>{tabs[activeTab].label}</span>
                            </div>
                            <div className="sad-surface-subtitle">
                                {activeTab === 0 && "Manage all service provider Admins, inspect their services, helpers, and financial payouts"}
                                {activeTab === 1 && "Complete inventory of services across all categories with pricing and live visibility controls"}
                                {activeTab === 2 && "Directory of all registered helpers, their skill profiles, and their associated Admin / Vendor"}
                                {activeTab === 3 && "SuperAdmin settlement queue: review and confirm bank payouts with official UTR numbers"}
                                {activeTab === 4 && "Master booking pipeline: track fulfillment, helper dispatch, and escrow release milestones"}
                                {activeTab === 5 && "User database: registered client accounts and activity history"}
                                {activeTab === 6 && "Partner intake queue: verify applications and convert them to live Admins"}
                            </div>
                        </div>

                        {/* Search & Filter Bar */}
                        <div className="sad-filter-bar">
                            <input
                                type="text"
                                className="sad-search-input"
                                placeholder={`Search in ${tabs[activeTab].label}...`}
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                            />

                            {/* Status Filter for Payouts or Bookings */}
                            {(activeTab === 3 || activeTab === 4) && (
                                <select
                                    className="sad-select"
                                    value={statusFilter}
                                    onChange={(e) => {
                                        setStatusFilter(e.target.value);
                                        setPage(1);
                                    }}
                                >
                                    <option value="all">All Statuses</option>
                                    {activeTab === 3 ? (
                                        <>
                                            <option value="pending">Pending Review</option>
                                            <option value="approved">Approved & Paid</option>
                                            <option value="rejected">Rejected</option>
                                        </>
                                    ) : (
                                        <>
                                            <option value="booked">Booked</option>
                                            <option value="confirmed">Confirmed</option>
                                            <option value="in-progress">In Progress</option>
                                            <option value="completed">Completed</option>
                                            <option value="cancelled">Cancelled</option>
                                        </>
                                    )}
                                </select>
                            )}

                            {/* Category Filter for Services */}
                            {activeTab === 1 && categories.length > 0 && (
                                <select
                                    className="sad-select"
                                    value={categoryFilter}
                                    onChange={(e) => {
                                        setCategoryFilter(e.target.value);
                                        setPage(1);
                                    }}
                                >
                                    <option value="all">All Categories</option>
                                    {categories.map((cat, i) => (
                                        <option key={i} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>

                    {/* Table View */}
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
                            <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
                            <div>Loading {tabs[activeTab].label}...</div>
                        </div>
                    ) : entities.data.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
                            <div style={{ fontSize: 36, marginBottom: 10 }}>📂</div>
                            <div style={{ fontWeight: 600, fontSize: 16 }}>No records found</div>
                            <p style={{ fontSize: 13, color: '#64748b' }}>Try adjusting your search keywords or filter options.</p>
                        </div>
                    ) : (
                        <div className="sad-table-wrapper">
                            <table className="sad-table">
                                <thead>
                                    <tr>
                                        {activeTab === 0 && (
                                            <>
                                                <th>Admin / Company</th>
                                                <th>Contact Info</th>
                                                <th>Services</th>
                                                <th>Helpers</th>
                                                <th>Gross Volume</th>
                                                <th>Net Earnings</th>
                                                <th>Role</th>
                                                <th style={{ textAlign: 'right' }}>Actions</th>
                                            </>
                                        )}
                                        {activeTab === 1 && (
                                            <>
                                                <th>Service Details</th>
                                                <th>Category</th>
                                                <th>Owner Admin</th>
                                                <th>Pricing & Units</th>
                                                <th>Booking Type</th>
                                                <th>Visibility</th>
                                                <th>Bookings</th>
                                                <th style={{ textAlign: 'right' }}>Actions</th>
                                            </>
                                        )}
                                        {activeTab === 2 && (
                                            <>
                                                <th>Helper Name</th>
                                                <th>Phone / Email</th>
                                                <th>Assigned Admin</th>
                                                <th>Skills</th>
                                                <th>Availability</th>
                                                <th>Verification</th>
                                                <th>Status</th>
                                                <th style={{ textAlign: 'right' }}>Actions</th>
                                            </>
                                        )}
                                        {activeTab === 3 && (
                                            <>
                                                <th>Admin / Provider</th>
                                                <th>Amount</th>
                                                <th>Method</th>
                                                <th>Bank / UPI Target</th>
                                                <th>Status</th>
                                                <th>Bank UTR / Ref</th>
                                                <th>Requested Date</th>
                                                <th style={{ textAlign: 'right' }}>SuperAdmin Decision</th>
                                            </>
                                        )}
                                        {activeTab === 4 && (
                                            <>
                                                <th>Service & Customer</th>
                                                <th>Admin Provider</th>
                                                <th>Amount & Payment</th>
                                                <th>Status</th>
                                                <th>Escrow Status</th>
                                                <th>Helpers Assigned</th>
                                                <th>Date</th>
                                            </>
                                        )}
                                        {activeTab === 5 && (
                                            <>
                                                <th>Name</th>
                                                <th>Email</th>
                                                <th>Phone</th>
                                                <th>Bookings Made</th>
                                                <th>Joined Date</th>
                                                <th style={{ textAlign: 'right' }}>Actions</th>
                                            </>
                                        )}
                                        {activeTab === 6 && (
                                            <>
                                                <th>Service Name</th>
                                                <th>Applicant Owner</th>
                                                <th>Email & Phone</th>
                                                <th>Service Type</th>
                                                <th>Location</th>
                                                <th style={{ textAlign: 'right' }}>Actions</th>
                                            </>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* 0: ADMINS / VENDORS */}
                                    {activeTab === 0 && entities.data.map((admin) => (
                                        <tr key={admin._id}>
                                            <td>
                                                <div style={{ fontWeight: 600, color: '#fff', fontSize: 14 }}>
                                                    {admin.companyName || admin.name}
                                                </div>
                                                <div style={{ fontSize: 12, color: '#94a3b8' }}>
                                                    Owner: {admin.name}
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ fontSize: 12 }}>📧 {admin.email}</div>
                                                <div style={{ fontSize: 12, color: '#94a3b8' }}>📞 {admin.phone || 'Not provided'}</div>
                                            </td>
                                            <td>
                                                <span className="sad-chip sad-chip-info">
                                                    🛠️ {admin.servicesCount || 0} services
                                                </span>
                                            </td>
                                            <td>
                                                <span className="sad-chip sad-chip-purple">
                                                    👥 {admin.helpersCount || 0} helpers
                                                </span>
                                            </td>
                                            <td style={{ fontWeight: 600, color: '#38bdf8' }}>
                                                ₹{Number(admin.grossEarnings || 0).toLocaleString('en-IN')}
                                            </td>
                                            <td style={{ fontWeight: 600, color: '#34d399' }}>
                                                ₹{Number(admin.netEarnings || 0).toLocaleString('en-IN')}
                                            </td>
                                            <td>
                                                <span className={`sad-chip ${admin.role === 'superadmin' ? 'sad-chip-danger' : admin.role === 'admin' ? 'sad-chip-success' : 'sad-chip-info'}`}>
                                                    {admin.role === 'superadmin' ? 'Super Admin' : 'Admin / Provider'}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                                                    <button
                                                        className="sad-btn sad-btn-primary sad-btn-sm"
                                                        onClick={() => handleInspectAdmin(admin._id)}
                                                        title="Inspect Admin Services, Helpers & Payments"
                                                    >
                                                        🔍 Inspect Details
                                                    </button>
                                                    {admin.role !== 'superadmin' && admin.email !== 'himanshufa875@gmail.com' && (
                                                        <button
                                                            className="sad-btn sad-btn-danger sad-btn-sm"
                                                            onClick={() => handleDeleteEntity('vendor', admin._id, admin.name)}
                                                            title="Delete Admin"
                                                        >
                                                            <Delete fontSize="small" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}

                                    {/* 1: ALL SERVICES */}
                                    {activeTab === 1 && entities.data.map((service) => (
                                        <tr key={service._id}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    {service.imageurls && service.imageurls[0] ? (
                                                        <img
                                                            src={service.imageurls[0]}
                                                            alt={service.name}
                                                            style={{ width: 42, height: 42, borderRadius: 8, objectFit: 'cover' }}
                                                        />
                                                    ) : (
                                                        <div style={{ width: 42, height: 42, borderRadius: 8, background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            🛠️
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div style={{ fontWeight: 600, color: '#fff' }}>{service.name}</div>
                                                        <div style={{ fontSize: 11, color: '#94a3b8' }}>
                                                            {service.subCategory || 'General'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="sad-chip sad-chip-info">{service.category}</span>
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: 500, color: '#e2e8f0' }}>
                                                    {service.vendorId?.companyName || service.vendorId?.name || service.companyname || 'Admin'}
                                                </div>
                                                <div style={{ fontSize: 11, color: '#94a3b8' }}>
                                                    {service.vendorId?.phone || service.phonenumber || ''}
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: 700, color: '#38bdf8' }}>
                                                    ₹{service.rentperday || (service.pricingUnits && service.pricingUnits[0]?.price) || 0}
                                                </div>
                                                <div style={{ fontSize: 11, color: '#94a3b8' }}>
                                                    {service.unit || (service.pricingUnits && service.pricingUnits[0]?.unit) || 'per unit'}
                                                </div>
                                            </td>
                                            <td>
                                                <span className="sad-chip sad-chip-purple">
                                                    {service.bookingType || 'Automatic'}
                                                </span>
                                            </td>
                                            <td>
                                                <button
                                                    onClick={(e) => handleToggleServiceVisibility(service._id, e)}
                                                    className={`sad-chip ${service.isVisible ? 'sad-chip-success' : 'sad-chip-warning'}`}
                                                    style={{ cursor: 'pointer', border: 'none' }}
                                                    title="Click to toggle visibility"
                                                >
                                                    {service.isVisible ? '✅ Visible' : '⏸️ Hidden'}
                                                </button>
                                            </td>
                                            <td>
                                                <span style={{ fontWeight: 600 }}>{service.bookingCount || 0} bookings</span>
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                                                    <button
                                                        className="sad-btn sad-btn-secondary sad-btn-sm"
                                                        onClick={() => setSelectedServiceSpecs(service)}
                                                        title="View Complete Specifications"
                                                    >
                                                        Specs
                                                    </button>
                                                    <button
                                                        className="sad-btn sad-btn-danger sad-btn-sm"
                                                        onClick={() => handleDeleteEntity('service', service._id, service.name)}
                                                    >
                                                        <Delete fontSize="small" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}

                                    {/* 2: HELPERS DIRECTORY */}
                                    {activeTab === 2 && entities.data.map((helper) => (
                                        <tr key={helper._id}>
                                            <td>
                                                <div style={{ fontWeight: 600, color: '#fff' }}>{helper.name}</div>
                                                <div style={{ fontSize: 11, color: '#94a3b8' }}>Code: {helper.code}</div>
                                            </td>
                                            <td>
                                                <div>📞 {helper.phone}</div>
                                                <div style={{ fontSize: 11, color: '#94a3b8' }}>📧 {helper.email || 'N/A'}</div>
                                            </td>
                                            <td>
                                                {helper.vendorInfo ? (
                                                    <div>
                                                        <div style={{ fontWeight: 500, color: '#818cf8' }}>
                                                            🏢 {helper.vendorInfo.companyName || helper.vendorInfo.name}
                                                        </div>
                                                        <div style={{ fontSize: 11, color: '#94a3b8' }}>{helper.vendorInfo.email}</div>
                                                    </div>
                                                ) : (
                                                    <span style={{ color: '#94a3b8', fontSize: 12 }}>Independent / Unassigned</span>
                                                )}
                                            </td>
                                            <td>
                                                <span className="sad-chip sad-chip-info">{helper.skills || 'General'}</span>
                                            </td>
                                            <td>
                                                <span className={`sad-chip ${helper.availability === 'Full-time' ? 'sad-chip-success' : 'sad-chip-purple'}`}>
                                                    {helper.availability}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`sad-chip ${helper.policeVerification ? 'sad-chip-success' : 'sad-chip-warning'}`}>
                                                    {helper.policeVerification ? 'Verified' : 'Pending'}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`sad-chip ${helper.isConnected ? 'sad-chip-success' : 'sad-chip-info'}`}>
                                                    {helper.isConnected ? '🟢 Online' : '⚪ Offline'}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <button
                                                    className="sad-btn sad-btn-danger sad-btn-sm"
                                                    onClick={() => handleDeleteEntity('helper', helper._id, helper.name)}
                                                >
                                                    <Delete fontSize="small" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}

                                    {/* 3: PAYOUTS & SETTLEMENTS */}
                                    {activeTab === 3 && entities.data.map((payout) => (
                                        <tr key={payout._id}>
                                            <td>
                                                <div style={{ fontWeight: 600, color: '#fff' }}>
                                                    {payout.companyName || payout.vendorName || payout.vendorId?.name || 'Admin'}
                                                </div>
                                                <div style={{ fontSize: 12, color: '#94a3b8' }}>
                                                    {payout.vendorEmail || payout.vendorId?.email}
                                                </div>
                                            </td>
                                            <td style={{ fontWeight: 700, fontSize: 15, color: '#38bdf8' }}>
                                                ₹{Number(payout.amount || 0).toLocaleString('en-IN')}
                                            </td>
                                            <td>
                                                <span className="sad-chip sad-chip-purple">
                                                    {payout.payoutMethod || 'BANK_TRANSFER'}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ fontSize: 12 }}>
                                                    {payout.bankDetails?.bankName && <strong>{payout.bankDetails.bankName}: </strong>}
                                                    {payout.bankDetails?.accountNumber || payout.bankDetails?.upiId || 'Not provided'}
                                                </div>
                                                <div style={{ fontSize: 11, color: '#94a3b8' }}>
                                                    IFSC: {payout.bankDetails?.ifscCode || 'N/A'} | A/C Holder: {payout.bankDetails?.accountHolderName || 'N/A'}
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`sad-chip ${payout.status === 'approved' ? 'sad-chip-success' : payout.status === 'rejected' ? 'sad-chip-danger' : 'sad-chip-warning'}`}>
                                                    {payout.status === 'approved' ? '✅ Paid' : payout.status === 'rejected' ? '❌ Rejected' : '⏳ Pending'}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ fontSize: 12, fontFamily: 'monospace', color: payout.transactionRef ? '#34d399' : '#94a3b8' }}>
                                                    {payout.transactionRef || 'Pending Transfer'}
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ fontSize: 12 }}>{new Date(payout.createdAt).toLocaleDateString()}</div>
                                                <div style={{ fontSize: 11, color: '#94a3b8' }}>{new Date(payout.createdAt).toLocaleTimeString()}</div>
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                {payout.status === 'pending' ? (
                                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                                                        <button
                                                            className="sad-btn sad-btn-success sad-btn-sm"
                                                            onClick={() => {
                                                                setPayoutToApprove(payout);
                                                                setApprovalUTR('');
                                                                setApprovalNotes('');
                                                            }}
                                                        >
                                                            💳 Confirm Transfer
                                                        </button>
                                                        <button
                                                            className="sad-btn sad-btn-danger sad-btn-sm"
                                                            onClick={() => {
                                                                setPayoutToReject(payout);
                                                                setRejectionReason('');
                                                            }}
                                                        >
                                                            Reject
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span style={{ fontSize: 12, color: '#94a3b8' }}>
                                                        Settled on {payout.approvedAt ? new Date(payout.approvedAt).toLocaleDateString() : 'N/A'}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}

                                    {/* 4: BOOKINGS HUB */}
                                    {activeTab === 4 && entities.data.map((booking) => (
                                        <tr key={booking._id}>
                                            <td>
                                                <div style={{ fontWeight: 600, color: '#fff' }}>{booking.service}</div>
                                                <div style={{ fontSize: 12, color: '#94a3b8' }}>
                                                    Client: {booking.name} (📞 {booking.phone})
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: 500, color: '#818cf8' }}>
                                                    {booking.vendorInfo?.companyName || booking.vendorInfo?.name || 'Admin'}
                                                </div>
                                                <div style={{ fontSize: 11, color: '#94a3b8' }}>{booking.vendorInfo?.phone}</div>
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: 700, color: '#38bdf8' }}>
                                                    ₹{booking.totalAmount || 0}
                                                </div>
                                                <div style={{ fontSize: 11, color: '#94a3b8' }}>
                                                    {booking.paymentMethod || 'CASH_AFTER_SERVICE'}
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`sad-chip ${booking.status === 'completed' ? 'sad-chip-success' : booking.status === 'cancelled' ? 'sad-chip-danger' : booking.status === 'in-progress' ? 'sad-chip-warning' : 'sad-chip-info'}`}>
                                                    {booking.status}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`sad-chip ${booking.payoutStatus === 'paid' ? 'sad-chip-success' : booking.payoutStatus === 'available' ? 'sad-chip-info' : booking.payoutStatus === 'in_escrow' ? 'sad-chip-warning' : 'sad-chip-purple'}`}>
                                                    {booking.payoutStatus || 'unsettled'}
                                                </span>
                                            </td>
                                            <td>
                                                {booking.assignedHelpers && booking.assignedHelpers.length > 0 ? (
                                                    <span className="sad-chip sad-chip-info">
                                                        👥 {booking.assignedHelpers.length} helpers
                                                    </span>
                                                ) : (
                                                    <span style={{ color: '#94a3b8', fontSize: 12 }}>Unassigned</span>
                                                )}
                                            </td>
                                            <td style={{ fontSize: 12, color: '#94a3b8' }}>
                                                {new Date(booking.createdAt).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}

                                    {/* 5: USERS */}
                                    {activeTab === 5 && entities.data.map((user) => (
                                        <tr key={user._id}>
                                            <td style={{ fontWeight: 600, color: '#fff' }}>{user.name}</td>
                                            <td>{user.email}</td>
                                            <td>{user.phone || 'N/A'}</td>
                                            <td>
                                                <span className="sad-chip sad-chip-info">
                                                    📅 {user.bookingsCount || 0} bookings
                                                </span>
                                            </td>
                                            <td style={{ fontSize: 12, color: '#94a3b8' }}>
                                                {new Date(user.createdAt).toLocaleDateString()}
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <button
                                                    className="sad-btn sad-btn-danger sad-btn-sm"
                                                    onClick={() => handleDeleteEntity('user', user._id, user.name)}
                                                    disabled={user.role === 'superadmin'}
                                                >
                                                    <Delete fontSize="small" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}

                                    {/* 6: PARTNER APPLICATIONS */}
                                    {activeTab === 6 && entities.data.map((partner) => (
                                        <tr key={partner._id}>
                                            <td style={{ fontWeight: 600, color: '#fff' }}>{partner.serviceName}</td>
                                            <td>{partner.ownerDetails}</td>
                                            <td>
                                                <div>📧 {partner.emailDetails}</div>
                                                <div style={{ fontSize: 11, color: '#94a3b8' }}>📞 {partner.phoneNumber}</div>
                                            </td>
                                            <td>
                                                <span className="sad-chip sad-chip-purple">{partner.typeOfService || 'General'}</span>
                                            </td>
                                            <td style={{ fontSize: 12, color: '#94a3b8' }}>{partner.address || 'Not specified'}</td>
                                            <td style={{ textAlign: 'right' }}>
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                                                    <button
                                                        className="sad-btn sad-btn-success sad-btn-sm"
                                                        onClick={() => handleConvertPartner(partner._id)}
                                                    >
                                                        ✅ Make Vendor / Admin
                                                    </button>
                                                    <button
                                                        className="sad-btn sad-btn-danger sad-btn-sm"
                                                        onClick={() => handleDeleteEntity('pathner', partner._id, partner.serviceName)}
                                                    >
                                                        <Delete fontSize="small" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination Bar */}
                    <div className="sad-pagination">
                        <div>
                            Showing page {entities.pagination.page || 1} of {entities.pagination.totalPages || 1} ({entities.pagination.total || 0} total)
                        </div>
                        <div className="sad-page-btns">
                            <button
                                className="sad-btn sad-btn-secondary sad-btn-sm"
                                disabled={page <= 1}
                                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                            >
                                Previous
                            </button>
                            <button
                                className="sad-btn sad-btn-secondary sad-btn-sm"
                                disabled={page >= (entities.pagination.totalPages || 1)}
                                onClick={() => setPage((prev) => prev + 1)}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>

                {/* Loading indicator for Admin modal */}
                {adminModalLoading && (
                    <div className="sad-modal-overlay">
                        <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', padding: '30px 40px', borderRadius: 16, color: '#fff', textAlign: 'center' }}>
                            <div style={{ fontSize: 32, marginBottom: 10 }}>⏳</div>
                            <div style={{ fontWeight: 600 }}>Loading Admin Details, Services & Financials...</div>
                        </div>
                    </div>
                )}

                {/* ========================================================================= */}
                {/* ADMIN DRILL-DOWN MODAL (Services of Admin, Helpers of Admin, Payments) */}
                {/* ========================================================================= */}
                {selectedAdminDetails && (
                    <div className="sad-modal-overlay" onClick={() => setSelectedAdminDetails(null)}>
                        <div className="sad-modal" onClick={(e) => e.stopPropagation()}>
                            <div className="sad-modal-header">
                                <div className="sad-modal-header-left">
                                    <div className="sad-modal-avatar">
                                        {(selectedAdminDetails.vendor.companyName || selectedAdminDetails.vendor.name || 'A')[0].toUpperCase()}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>
                                            {selectedAdminDetails.vendor.companyName || selectedAdminDetails.vendor.name}
                                        </div>
                                        <div style={{ fontSize: 12, color: '#94a3b8' }}>
                                            Admin: {selectedAdminDetails.vendor.name} | 📧 {selectedAdminDetails.vendor.email} | 📞 {selectedAdminDetails.vendor.phone || 'N/A'}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedAdminDetails(null)}
                                    style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 20 }}
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="sad-modal-body">
                                {/* Sub-navigation tabs inside Admin Modal */}
                                <div className="sad-subtabs">
                                    <button
                                        className={`sad-subtab-btn ${adminSubTab === 'services' ? 'active' : ''}`}
                                        onClick={() => setAdminSubTab('services')}
                                    >
                                        🛠️ Services of this Admin ({selectedAdminDetails.services?.length || 0})
                                    </button>
                                    <button
                                        className={`sad-subtab-btn ${adminSubTab === 'helpers' ? 'active' : ''}`}
                                        onClick={() => setAdminSubTab('helpers')}
                                    >
                                        👥 Helpers of this Admin ({selectedAdminDetails.helpers?.length || 0})
                                    </button>
                                    <button
                                        className={`sad-subtab-btn ${adminSubTab === 'payments' ? 'active' : ''}`}
                                        onClick={() => setAdminSubTab('payments')}
                                    >
                                        💳 Financials & Payments
                                    </button>
                                    <button
                                        className={`sad-subtab-btn ${adminSubTab === 'bookings' ? 'active' : ''}`}
                                        onClick={() => setAdminSubTab('bookings')}
                                    >
                                        📋 Bookings ({selectedAdminDetails.bookings?.length || 0})
                                    </button>
                                </div>

                                {/* 1. SERVICES OF THIS ADMIN */}
                                {adminSubTab === 'services' && (
                                    <div>
                                        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <h3 style={{ margin: 0, fontSize: 16 }}>Services Created & Administered</h3>
                                            <span style={{ fontSize: 12, color: '#94a3b8' }}>
                                                {selectedAdminDetails.services?.length || 0} active catalog items
                                            </span>
                                        </div>

                                        {selectedAdminDetails.services?.length === 0 ? (
                                            <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                                                No services added by this admin yet.
                                            </div>
                                        ) : (
                                            <div className="sad-services-grid">
                                                {selectedAdminDetails.services.map((svc) => (
                                                    <div key={svc._id} className="sad-service-card">
                                                        {svc.imageurls && svc.imageurls[0] ? (
                                                            <img src={svc.imageurls[0]} alt={svc.name} className="sad-service-img" />
                                                        ) : (
                                                            <div className="sad-service-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>
                                                                🛠️
                                                            </div>
                                                        )}
                                                        <div className="sad-service-body">
                                                            <div className="sad-service-title">{svc.name}</div>
                                                            <div className="sad-service-meta">
                                                                <span className="sad-chip sad-chip-info">{svc.category}</span>
                                                                <button
                                                                    onClick={(e) => handleToggleServiceVisibility(svc._id, e)}
                                                                    className={`sad-chip ${svc.isVisible ? 'sad-chip-success' : 'sad-chip-warning'}`}
                                                                    style={{ cursor: 'pointer', border: 'none' }}
                                                                >
                                                                    {svc.isVisible ? 'Visible' : 'Hidden'}
                                                                </button>
                                                            </div>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                                                                <span className="sad-service-price">
                                                                    ₹{svc.rentperday || (svc.pricingUnits && svc.pricingUnits[0]?.price) || 0}
                                                                    <span style={{ fontSize: 11, fontWeight: 'normal', color: '#94a3b8' }}> / {svc.unit || 'unit'}</span>
                                                                </span>
                                                                <span style={{ fontSize: 12, color: '#94a3b8' }}>
                                                                    {svc.bookingCount || 0} Bookings
                                                                </span>
                                                            </div>
                                                            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                                                                <button
                                                                    className="sad-btn sad-btn-secondary sad-btn-sm"
                                                                    style={{ flex: 1 }}
                                                                    onClick={() => setSelectedServiceSpecs(svc)}
                                                                >
                                                                    Full Specs
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* 2. HELPERS OF THIS ADMIN */}
                                {adminSubTab === 'helpers' && (
                                    <div>
                                        <div style={{ marginBottom: 16 }}>
                                            <h3 style={{ margin: 0, fontSize: 16 }}>Registered Helpers under this Admin</h3>
                                            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8' }}>
                                                Helpers receive job dispatches and complete work orders on behalf of this vendor.
                                            </p>
                                        </div>

                                        {selectedAdminDetails.helpers?.length === 0 ? (
                                            <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                                                No helpers registered by this admin yet.
                                            </div>
                                        ) : (
                                            <div className="sad-table-wrapper">
                                                <table className="sad-table">
                                                    <thead>
                                                        <tr>
                                                            <th>Helper Name</th>
                                                            <th>Phone & Email</th>
                                                            <th>Login Code</th>
                                                            <th>Skills</th>
                                                            <th>Availability</th>
                                                            <th>Verification</th>
                                                            <th>Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {selectedAdminDetails.helpers.map((h) => (
                                                            <tr key={h._id}>
                                                                <td style={{ fontWeight: 600, color: '#fff' }}>{h.name}</td>
                                                                <td>
                                                                    <div>📞 {h.phone}</div>
                                                                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{h.email}</div>
                                                                </td>
                                                                <td>
                                                                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#38bdf8' }}>
                                                                        {h.code}
                                                                    </span>
                                                                </td>
                                                                <td>{h.skills || 'General'}</td>
                                                                <td>
                                                                    <span className={`sad-chip ${h.availability === 'Full-time' ? 'sad-chip-success' : 'sad-chip-purple'}`}>
                                                                        {h.availability}
                                                                    </span>
                                                                </td>
                                                                <td>
                                                                    <span className={`sad-chip ${h.policeVerification ? 'sad-chip-success' : 'sad-chip-warning'}`}>
                                                                        {h.policeVerification ? 'Verified' : 'Pending'}
                                                                    </span>
                                                                </td>
                                                                <td>
                                                                    <span className={`sad-chip ${h.isConnected ? 'sad-chip-success' : 'sad-chip-info'}`}>
                                                                        {h.isConnected ? '🟢 Online' : '⚪ Offline'}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* 3. PAYMENTS & FINANCIALS OF THIS PARTICULAR ADMIN */}
                                {adminSubTab === 'payments' && (
                                    <div>
                                        <div className="sad-fin-grid">
                                            <div className="sad-fin-card">
                                                <div className="sad-fin-label">Gross Revenue</div>
                                                <div className="sad-fin-val" style={{ color: '#38bdf8' }}>
                                                    ₹{Number(selectedAdminDetails.financials?.grossRevenue || 0).toLocaleString('en-IN')}
                                                </div>
                                            </div>
                                            <div className="sad-fin-card">
                                                <div className="sad-fin-label">Platform Fee Deducted</div>
                                                <div className="sad-fin-val" style={{ color: '#facc15' }}>
                                                    ₹{Number(selectedAdminDetails.financials?.totalCommissionDeducted || 0).toLocaleString('en-IN')}
                                                </div>
                                            </div>
                                            <div className="sad-fin-card">
                                                <div className="sad-fin-label">Net Admin Earnings</div>
                                                <div className="sad-fin-val" style={{ color: '#34d399' }}>
                                                    ₹{Number(selectedAdminDetails.financials?.netEarnings || 0).toLocaleString('en-IN')}
                                                </div>
                                            </div>
                                            <div className="sad-fin-card">
                                                <div className="sad-fin-label">In-Escrow (Maturity Pending)</div>
                                                <div className="sad-fin-val" style={{ color: '#fbbf24' }}>
                                                    ₹{Number(selectedAdminDetails.financials?.inEscrowBalance || 0).toLocaleString('en-IN')}
                                                </div>
                                            </div>
                                            <div className="sad-fin-card">
                                                <div className="sad-fin-label">Available for Withdrawal</div>
                                                <div className="sad-fin-val" style={{ color: '#60a5fa' }}>
                                                    ₹{Number(selectedAdminDetails.financials?.availableBalance || 0).toLocaleString('en-IN')}
                                                </div>
                                            </div>
                                            <div className="sad-fin-card">
                                                <div className="sad-fin-label">Total Transferred (Paid)</div>
                                                <div className="sad-fin-val" style={{ color: '#a78bfa' }}>
                                                    ₹{Number(selectedAdminDetails.financials?.paidOutBalance || 0).toLocaleString('en-IN')}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Bank & UPI Details Card */}
                                        <div style={{
                                            background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)',
                                            borderRadius: 14, padding: 18, marginBottom: 20
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                                                <AccountBalance style={{ color: '#818cf8' }} />
                                                <h4 style={{ margin: 0, fontSize: 15, color: '#fff' }}>Registered Banking & UPI Target</h4>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, fontSize: 13 }}>
                                                <div>
                                                    <span style={{ color: '#94a3b8' }}>Bank Name: </span>
                                                    <strong>{selectedAdminDetails.financials?.bankDetails?.bankName || 'Not Set'}</strong>
                                                </div>
                                                <div>
                                                    <span style={{ color: '#94a3b8' }}>A/C Number: </span>
                                                    <strong>{selectedAdminDetails.financials?.bankDetails?.accountNumber || 'Not Set'}</strong>
                                                </div>
                                                <div>
                                                    <span style={{ color: '#94a3b8' }}>IFSC Code: </span>
                                                    <strong style={{ fontFamily: 'monospace' }}>{selectedAdminDetails.financials?.bankDetails?.ifscCode || 'Not Set'}</strong>
                                                </div>
                                                <div>
                                                    <span style={{ color: '#94a3b8' }}>Account Holder: </span>
                                                    <strong>{selectedAdminDetails.financials?.bankDetails?.accountHolderName || 'Not Set'}</strong>
                                                </div>
                                                <div>
                                                    <span style={{ color: '#94a3b8' }}>UPI ID: </span>
                                                    <strong style={{ color: '#38bdf8' }}>{selectedAdminDetails.financials?.bankDetails?.upiId || 'Not Set'}</strong>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Payout Requests History */}
                                        <div style={{ marginBottom: 20 }}>
                                            <h4 style={{ margin: '0 0 10px', fontSize: 14, color: '#fff' }}>Withdrawal & Payout Requests</h4>
                                            {selectedAdminDetails.financials?.payoutRequests?.length === 0 ? (
                                                <div style={{ color: '#94a3b8', fontSize: 13 }}>No payout requests submitted yet.</div>
                                            ) : (
                                                <div className="sad-table-wrapper">
                                                    <table className="sad-table">
                                                        <thead>
                                                            <tr>
                                                                <th>Amount</th>
                                                                <th>Method</th>
                                                                <th>Status</th>
                                                                <th>Bank Reference (UTR)</th>
                                                                <th>Requested Date</th>
                                                                <th>Action</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {selectedAdminDetails.financials.payoutRequests.map((p) => (
                                                                <tr key={p._id}>
                                                                    <td style={{ fontWeight: 700, color: '#38bdf8' }}>₹{p.amount}</td>
                                                                    <td>{p.payoutMethod}</td>
                                                                    <td>
                                                                        <span className={`sad-chip ${p.status === 'approved' ? 'sad-chip-success' : p.status === 'rejected' ? 'sad-chip-danger' : 'sad-chip-warning'}`}>
                                                                            {p.status}
                                                                        </span>
                                                                    </td>
                                                                    <td style={{ fontFamily: 'monospace' }}>{p.transactionRef || 'Pending'}</td>
                                                                    <td>{new Date(p.createdAt).toLocaleDateString()}</td>
                                                                    <td>
                                                                        {p.status === 'pending' && (
                                                                            <button
                                                                                className="sad-btn sad-btn-success sad-btn-sm"
                                                                                onClick={() => {
                                                                                    setPayoutToApprove(p);
                                                                                    setApprovalUTR('');
                                                                                    setApprovalNotes('');
                                                                                }}
                                                                            >
                                                                                Approve
                                                                            </button>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>

                                        {/* Completed Bookings Financial Breakdown */}
                                        <div>
                                            <h4 style={{ margin: '0 0 10px', fontSize: 14, color: '#fff' }}>Completed Job Settlements Breakdown</h4>
                                            {selectedAdminDetails.financials?.completedBookings?.length === 0 ? (
                                                <div style={{ color: '#94a3b8', fontSize: 13 }}>No completed jobs recorded yet.</div>
                                            ) : (
                                                <div className="sad-table-wrapper">
                                                    <table className="sad-table">
                                                        <thead>
                                                            <tr>
                                                                <th>Service & Customer</th>
                                                                <th>Gross Total</th>
                                                                <th>Platform Fee (5%)</th>
                                                                <th>Admin Net Earning</th>
                                                                <th>Escrow Release</th>
                                                                <th>Settlement Status</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {selectedAdminDetails.financials.completedBookings.map((b) => (
                                                                <tr key={b._id}>
                                                                    <td>
                                                                        <div style={{ fontWeight: 600 }}>{b.service}</div>
                                                                        <div style={{ fontSize: 11, color: '#94a3b8' }}>Client: {b.customerName}</div>
                                                                    </td>
                                                                    <td>₹{b.totalAmount}</td>
                                                                    <td style={{ color: '#facc15' }}>-₹{b.platformCommission}</td>
                                                                    <td style={{ fontWeight: 700, color: '#34d399' }}>₹{b.adminNetEarning}</td>
                                                                    <td>
                                                                        <div style={{ fontSize: 12 }}>{new Date(b.escrowReleaseDate).toLocaleDateString()}</div>
                                                                        <div style={{ fontSize: 11, color: b.isMatured ? '#34d399' : '#fbbf24' }}>
                                                                            {b.isMatured ? 'Matured & Withdrawable' : 'In 48h Escrow Lock'}
                                                                        </div>
                                                                    </td>
                                                                    <td>
                                                                        <span className={`sad-chip ${b.payoutStatus === 'paid' ? 'sad-chip-success' : b.payoutStatus === 'available' ? 'sad-chip-info' : 'sad-chip-warning'}`}>
                                                                            {b.payoutStatus}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* 4. BOOKINGS OF THIS ADMIN */}
                                {adminSubTab === 'bookings' && (
                                    <div>
                                        <div style={{ marginBottom: 16 }}>
                                            <h3 style={{ margin: 0, fontSize: 16 }}>Customer Orders & Bookings</h3>
                                            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8' }}>
                                                Every booking dispatched to this admin's services.
                                            </p>
                                        </div>

                                        {selectedAdminDetails.bookings?.length === 0 ? (
                                            <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                                                No bookings received yet.
                                            </div>
                                        ) : (
                                            <div className="sad-table-wrapper">
                                                <table className="sad-table">
                                                    <thead>
                                                        <tr>
                                                            <th>Service</th>
                                                            <th>Customer</th>
                                                            <th>Amount</th>
                                                            <th>Payment Method</th>
                                                            <th>Status</th>
                                                            <th>Assigned Helpers</th>
                                                            <th>Date</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {selectedAdminDetails.bookings.map((b) => (
                                                            <tr key={b._id}>
                                                                <td style={{ fontWeight: 600 }}>{b.service}</td>
                                                                <td>
                                                                    <div>{b.name}</div>
                                                                    <div style={{ fontSize: 11, color: '#94a3b8' }}>📞 {b.phone}</div>
                                                                </td>
                                                                <td style={{ fontWeight: 700, color: '#38bdf8' }}>₹{b.totalAmount || 0}</td>
                                                                <td>
                                                                    <span className="sad-chip sad-chip-purple">
                                                                        {b.paymentMethod || 'CASH_AFTER_SERVICE'}
                                                                    </span>
                                                                </td>
                                                                <td>
                                                                    <span className={`sad-chip ${b.status === 'completed' ? 'sad-chip-success' : b.status === 'cancelled' ? 'sad-chip-danger' : b.status === 'in-progress' ? 'sad-chip-warning' : 'sad-chip-info'}`}>
                                                                        {b.status}
                                                                    </span>
                                                                </td>
                                                                <td>
                                                                    {b.assignedHelpers && b.assignedHelpers.length > 0 ? (
                                                                        <span>{b.assignedHelpers.map(h => h.name).join(', ')}</span>
                                                                    ) : (
                                                                        <span style={{ color: '#94a3b8' }}>Unassigned</span>
                                                                    )}
                                                                </td>
                                                                <td style={{ fontSize: 12, color: '#94a3b8' }}>
                                                                    {new Date(b.createdAt).toLocaleDateString()}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="sad-modal-footer">
                                <button className="sad-btn sad-btn-secondary" onClick={() => setSelectedAdminDetails(null)}>
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ========================================================================= */}
                {/* SERVICE SPECS MODAL */}
                {/* ========================================================================= */}
                {selectedServiceSpecs && (
                    <div className="sad-modal-overlay" onClick={() => setSelectedServiceSpecs(null)}>
                        <div className="sad-modal" style={{ maxWidth: 800 }} onClick={(e) => e.stopPropagation()}>
                            <div className="sad-modal-header">
                                <div style={{ fontWeight: 700, fontSize: 18, color: '#fff' }}>
                                    🛠️ Service Specifications: {selectedServiceSpecs.name}
                                </div>
                                <button onClick={() => setSelectedServiceSpecs(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 20 }}>
                                    ✕
                                </button>
                            </div>
                            <div className="sad-modal-body">
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 20 }}>
                                    <div>
                                        <div style={{ fontSize: 12, color: '#94a3b8' }}>Category</div>
                                        <div style={{ fontWeight: 600 }}>{selectedServiceSpecs.category} / {selectedServiceSpecs.subCategory || 'General'}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 12, color: '#94a3b8' }}>Base Rate</div>
                                        <div style={{ fontWeight: 700, color: '#38bdf8', fontSize: 16 }}>
                                            ₹{selectedServiceSpecs.rentperday} / {selectedServiceSpecs.unit || 'unit'}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 12, color: '#94a3b8' }}>Booking Mode</div>
                                        <div style={{ fontWeight: 600 }}>{selectedServiceSpecs.bookingType}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 12, color: '#94a3b8' }}>Visibility Status</div>
                                        <span className={`sad-chip ${selectedServiceSpecs.isVisible ? 'sad-chip-success' : 'sad-chip-warning'}`}>
                                            {selectedServiceSpecs.isVisible ? 'Live on Marketplace' : 'Hidden from Search'}
                                        </span>
                                    </div>
                                </div>

                                {selectedServiceSpecs.pricingUnits && selectedServiceSpecs.pricingUnits.length > 0 && (
                                    <div style={{ marginBottom: 16 }}>
                                        <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>Multiple Pricing Units</h4>
                                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                            {selectedServiceSpecs.pricingUnits.map((u, i) => (
                                                <div key={i} style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '6px 12px', borderRadius: 8, fontSize: 13 }}>
                                                    <strong>₹{u.price}</strong> <span style={{ color: '#94a3b8' }}>/ {u.unit}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div style={{ marginBottom: 16 }}>
                                    <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>Service Description</h4>
                                    <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: 14, borderRadius: 10, fontSize: 13, lineHeight: 1.5, color: '#cbd5e1' }}>
                                        {selectedServiceSpecs.description || 'No description provided.'}
                                    </div>
                                </div>

                                {selectedServiceSpecs.facility && (
                                    <div>
                                        <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>Included Facilities & Features</h4>
                                        <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: 14, borderRadius: 10, fontSize: 13, lineHeight: 1.5, color: '#cbd5e1' }}>
                                            {selectedServiceSpecs.facility}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="sad-modal-footer">
                                <button
                                    className="sad-btn sad-btn-primary"
                                    onClick={() => handleToggleServiceVisibility(selectedServiceSpecs._id)}
                                >
                                    {selectedServiceSpecs.isVisible ? 'Hide Service' : 'Make Service Visible'}
                                </button>
                                <button className="sad-btn sad-btn-secondary" onClick={() => setSelectedServiceSpecs(null)}>
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ========================================================================= */}
                {/* APPROVE PAYOUT MODAL (Enter UTR) */}
                {/* ========================================================================= */}
                {payoutToApprove && (
                    <div className="sad-modal-overlay" onClick={() => setPayoutToApprove(null)}>
                        <div className="sad-modal" style={{ maxWidth: 540 }} onClick={(e) => e.stopPropagation()}>
                            <div className="sad-modal-header">
                                <div style={{ fontWeight: 700, fontSize: 16, color: '#fff' }}>
                                    💳 Confirm Payout & Enter Bank UTR
                                </div>
                                <button onClick={() => setPayoutToApprove(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 20 }}>
                                    ✕
                                </button>
                            </div>
                            <div className="sad-modal-body">
                                <div style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: 10, padding: 14, marginBottom: 16 }}>
                                    <div style={{ fontSize: 13, color: '#94a3b8' }}>Transferring to:</div>
                                    <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>
                                        {payoutToApprove.companyName || payoutToApprove.vendorName}
                                    </div>
                                    <div style={{ fontSize: 20, fontWeight: 800, color: '#38bdf8', marginTop: 4 }}>
                                        ₹{Number(payoutToApprove.amount).toLocaleString('en-IN')}
                                    </div>
                                    <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 6 }}>
                                        Target: {payoutToApprove.bankDetails?.bankName} | A/C: {payoutToApprove.bankDetails?.accountNumber || payoutToApprove.bankDetails?.upiId}
                                    </div>
                                </div>

                                <div style={{ marginBottom: 14 }}>
                                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                                        Bank Reference / IMPS UTR Number <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="sad-search-input"
                                        style={{ width: '100%', boxSizing: 'border-box' }}
                                        placeholder="e.g. UTR178239012903 or IMPS-93821"
                                        value={approvalUTR}
                                        onChange={(e) => setApprovalUTR(e.target.value)}
                                    />
                                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                                        This official transaction ID will be stored and provided to the vendor.
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                                        Transfer Notes (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        className="sad-search-input"
                                        style={{ width: '100%', boxSizing: 'border-box' }}
                                        placeholder="e.g. Settled via ICICI NetBanking"
                                        value={approvalNotes}
                                        onChange={(e) => setApprovalNotes(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="sad-modal-footer">
                                <button className="sad-btn sad-btn-secondary" onClick={() => setPayoutToApprove(null)}>
                                    Cancel
                                </button>
                                <button className="sad-btn sad-btn-success" onClick={handleApprovePayout}>
                                    ✅ Confirm & Mark Paid
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ========================================================================= */}
                {/* REJECT PAYOUT MODAL */}
                {/* ========================================================================= */}
                {payoutToReject && (
                    <div className="sad-modal-overlay" onClick={() => setPayoutToReject(null)}>
                        <div className="sad-modal" style={{ maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
                            <div className="sad-modal-header">
                                <div style={{ fontWeight: 700, fontSize: 16, color: '#fff' }}>
                                    ❌ Decline Payout Request
                                </div>
                                <button onClick={() => setPayoutToReject(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 20 }}>
                                    ✕
                                </button>
                            </div>
                            <div className="sad-modal-body">
                                <p style={{ fontSize: 13, color: '#cbd5e1', marginTop: 0 }}>
                                    Declining this payout request of <strong>₹{payoutToReject.amount}</strong> will restore the balance back to the Admin's available balance so they can request again later.
                                </p>
                                <div>
                                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                                        Rejection Reason
                                    </label>
                                    <textarea
                                        rows={3}
                                        className="sad-search-input"
                                        style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical' }}
                                        placeholder="e.g. Invalid bank account details or pending dispute"
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="sad-modal-footer">
                                <button className="sad-btn sad-btn-secondary" onClick={() => setPayoutToReject(null)}>
                                    Cancel
                                </button>
                                <button className="sad-btn sad-btn-danger" onClick={handleRejectPayout}>
                                    Decline Request
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default SuperAdminDashboard;

import React, { useState, useEffect, useCallback } from "react";
import { Modal, Table, Button, Input, Select, Tag, message, Tabs } from "antd";
import axios from "axios";
import "./Payment.css";

const { TabPane } = Tabs;
const { Option } = Select;

export function Payment({ userId, isSuperAdmin }) {
    const [loading, setLoading] = useState(false);
    const [balances, setBalances] = useState({
        grossRevenue: 0,
        totalCommissionDeducted: 0,
        netEarnings: 0,
        inEscrowBalance: 0,
        availableBalance: 0,
        requestedBalance: 0,
        paidOutBalance: 0
    });
    const [bankDetails, setBankDetails] = useState({
        accountHolderName: '',
        accountNumber: '',
        ifscCode: '',
        bankName: '',
        upiId: ''
    });
    const [payoutRequests, setPayoutRequests] = useState([]);
    const [completedBookings, setCompletedBookings] = useState([]);
    const [allBookings, setAllBookings] = useState([]);
    const [paymentFilter, setPaymentFilter] = useState('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [paymentStats, setPaymentStats] = useState({
        totalBookingsCount: 0,
        totalGrossAmount: 0,
        totalPlatformCharges: 0,
        totalNetEarnings: 0,
        newBookingsCount: 0,
        cashCount: 0,
        cashTotalAmount: 0,
        onlineCount: 0,
        onlineTotalAmount: 0,
        onlineCollected: 0,
        partialCount: 0,
        partialTotalAmount: 0,
        partialAdvanceCollected: 0,
        partialCashRemaining: 0,
        inquiryCount: 0
    });

    // SuperAdmin State
    const [superAdminRequests, setSuperAdminRequests] = useState([]);
    const [superAdminStats, setSuperAdminStats] = useState({
        totalRequests: 0,
        pendingCount: 0,
        pendingAmount: 0,
        approvedCount: 0,
        approvedAmount: 0
    });

    // Request Payout Modal State
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [requestAmount, setRequestAmount] = useState('');
    const [requestMethod, setRequestMethod] = useState('BANK_TRANSFER');
    const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

    // Bank Details Modal State
    const [showBankModal, setShowBankModal] = useState(false);
    const [editingBankDetails, setEditingBankDetails] = useState({
        accountHolderName: '',
        accountNumber: '',
        ifscCode: '',
        bankName: '',
        upiId: ''
    });
    const [isSavingBank, setIsSavingBank] = useState(false);

    // SuperAdmin Transfer Approval Modal State
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [selectedRequestToApprove, setSelectedRequestToApprove] = useState(null);
    const [utrNumber, setUtrNumber] = useState('');
    const [transferNotes, setTransferNotes] = useState('');
    const [isApproving, setIsApproving] = useState(false);

    // SuperAdmin Reject Modal State
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [selectedRequestToReject, setSelectedRequestToReject] = useState(null);
    const [rejectReason, setRejectReason] = useState('');
    const [isRejecting, setIsRejecting] = useState(false);
    const [isReleasingEscrow, setIsReleasingEscrow] = useState(false);

    // Fetch data on load
    const fetchPaymentData = useCallback(async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const res = await axios.get(`/api/payouts/admin-earnings?userid=${userId}`);
            if (res.data.success) {
                setBalances(res.data.balances || {});
                setBankDetails(res.data.bankDetails || {});
                setEditingBankDetails(res.data.bankDetails || {});
                setPayoutRequests(res.data.payoutRequests || []);
                setCompletedBookings(res.data.completedBookings || []);
                setAllBookings(res.data.allBookings || []);
                if (res.data.paymentStats) {
                    setPaymentStats(res.data.paymentStats);
                }
            }

            // If SuperAdmin, also load the all-requests queue
            if (isSuperAdmin) {
                const superRes = await axios.get(`/api/payouts/all-requests?userid=${userId}`);
                if (superRes.data.success) {
                    setSuperAdminRequests(superRes.data.requests || []);
                    setSuperAdminStats(superRes.data.stats || {});
                }
            }
        } catch (error) {
            console.error("Error loading payment data:", error);
            message.error("Failed to load payment & payout details");
        } finally {
            setLoading(false);
        }
    }, [userId, isSuperAdmin]);

    useEffect(() => {
        fetchPaymentData();
    }, [fetchPaymentData]);

    // Handle Payout Request Submission
    const handleRequestPayout = async () => {
        const numAmount = parseFloat(requestAmount);
        if (!numAmount || numAmount <= 0) {
            return message.error("Please enter a valid amount to withdraw");
        }
        if (numAmount > balances.availableBalance) {
            return message.error(`Amount exceeds your available withdrawable balance (₹${balances.availableBalance.toFixed(2)})`);
        }

        if (requestMethod === 'BANK_TRANSFER') {
            if (!bankDetails.accountNumber || !bankDetails.ifscCode) {
                return message.error("Please provide Bank Account Number and IFSC code first!");
            }
        } else {
            if (!bankDetails.upiId) {
                return message.error("Please provide a valid UPI ID for UPI withdrawal!");
            }
        }

        try {
            setIsSubmittingRequest(true);
            const payload = {
                userId,
                amount: numAmount,
                payoutMethod: requestMethod,
                bankDetails: bankDetails
            };

            const res = await axios.post('/api/payouts/request', payload);
            if (res.data.success) {
                message.success(res.data.message || "Payout request submitted to SuperAdmin!");
                setShowRequestModal(false);
                setRequestAmount('');
                fetchPaymentData();
            }
        } catch (error) {
            console.error("Error requesting payout:", error);
            message.error(error.response?.data?.message || "Failed to submit payout request");
        } finally {
            setIsSubmittingRequest(false);
        }
    };

    // Handle Save Bank Details
    const handleSaveBankDetails = async () => {
        try {
            setIsSavingBank(true);
            const res = await axios.post('/api/payouts/update-bank-details', {
                userId,
                bankDetails: editingBankDetails
            });
            if (res.data.success) {
                message.success("Bank & UPI details saved successfully!");
                setBankDetails(res.data.bankDetails);
                setShowBankModal(false);
            }
        } catch (error) {
            console.error("Error saving bank details:", error);
            message.error("Failed to save bank details");
        } finally {
            setIsSavingBank(false);
        }
    };

    // SuperAdmin: Confirm Transfer with UTR
    const handleApprovePayout = async () => {
        if (!selectedRequestToApprove) return;
        if (!utrNumber || !utrNumber.trim()) {
            return message.error("Please enter the Bank UTR / Transaction Reference ID of the transfer!");
        }

        try {
            setIsApproving(true);
            const res = await axios.post('/api/payouts/approve', {
                requestId: selectedRequestToApprove._id,
                transactionRef: utrNumber.trim(),
                transferNotes,
                superAdminId: userId
            });

            if (res.data.success) {
                message.success(res.data.message || "Payout approved and marked as transferred!");
                setShowApproveModal(false);
                setSelectedRequestToApprove(null);
                setUtrNumber('');
                setTransferNotes('');
                fetchPaymentData();
            }
        } catch (error) {
            console.error("Error approving payout:", error);
            message.error(error.response?.data?.message || "Failed to approve payout");
        } finally {
            setIsApproving(false);
        }
    };

    // SuperAdmin: Reject Payout
    const handleRejectPayout = async () => {
        if (!selectedRequestToReject) return;
        try {
            setIsRejecting(true);
            const res = await axios.post('/api/payouts/reject', {
                requestId: selectedRequestToReject._id,
                rejectedReason: rejectReason || 'Bank account details invalid or unverified',
                superAdminId: userId
            });

            if (res.data.success) {
                message.success("Payout request rejected. Funds returned to Admin available balance.");
                setShowRejectModal(false);
                setSelectedRequestToReject(null);
                setRejectReason('');
                fetchPaymentData();
            }
        } catch (error) {
            console.error("Error rejecting payout:", error);
            message.error(error.response?.data?.message || "Failed to reject payout");
        } finally {
            setIsRejecting(false);
        }
    };

    // Instant Release All for Testing
    const handleInstantReleaseAll = async () => {
        try {
            setIsReleasingEscrow(true);
            const res = await axios.post('/api/payouts/instant-release-all');
            if (res.data.success) {
                message.success(res.data.message || "All completed jobs released to Available balance for instant testing!");
                fetchPaymentData();
            }
        } catch (error) {
            console.error("Error releasing escrow:", error);
            message.error("Failed to release escrow");
        } finally {
            setIsReleasingEscrow(false);
        }
    };

    // Filtered Bookings for the Payment Hub
    const filteredBookings = allBookings.filter(b => {
        // Method filter
        if (paymentFilter === 'CASH') {
            if (b.paymentMethod !== 'CASH_AFTER_SERVICE') return false;
        } else if (paymentFilter === 'ONLINE') {
            if (b.paymentMethod !== 'FULL_ONLINE') return false;
        } else if (paymentFilter === 'PARTIAL') {
            if (b.paymentMethod !== 'PARTIAL_30_70') return false;
        } else if (paymentFilter === 'NEW') {
            if (!['booked', 'pending', 'confirmed', 'assigned', 'in-progress'].includes(b.status)) return false;
        } else if (paymentFilter === 'INQUIRY') {
            if (b.bookingType !== 'Inquari Booking' && b.bookingType !== 'inquiry' && b.paymentMethod !== 'N/A') return false;
        }

        // Search term filter
        if (searchTerm.trim()) {
            const query = searchTerm.toLowerCase();
            const serviceMatch = b.service?.toLowerCase().includes(query);
            const customerMatch = b.customerName?.toLowerCase().includes(query);
            const phoneMatch = b.customerPhone?.toLowerCase().includes(query);
            const idMatch = b._id?.toLowerCase().includes(query);
            const rzpMatch = b.razorpayPaymentId?.toLowerCase().includes(query);
            return serviceMatch || customerMatch || phoneMatch || idMatch || rzpMatch;
        }

        return true;
    });

    // Columns for All Bookings & Payment Details
    const allBookingsColumns = [
        {
            title: 'Booking & Customer',
            key: 'service',
            render: (_, record) => (
                <div>
                    <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '13.5px' }}>{record.service}</div>
                    <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb', background: '#eff6ff', padding: '1px 5px', borderRadius: 4 }}>
                            #{record._id?.slice(-6)?.toUpperCase()}
                        </span>
                        {' '}• {record.customerName} {record.customerPhone ? `(📞 ${record.customerPhone})` : ''}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                        📅 {new Date(record.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                </div>
            )
        },
        {
            title: 'Booking Status',
            dataIndex: 'status',
            key: 'status',
            render: (st) => {
                const map = {
                    completed: { color: 'green', text: 'Completed' },
                    booked: { color: 'blue', text: 'Booked (New)' },
                    pending: { color: 'gold', text: 'Pending (New)' },
                    confirmed: { color: 'cyan', text: 'Confirmed' },
                    assigned: { color: 'geekblue', text: 'Specialist Assigned' },
                    'in-progress': { color: 'orange', text: 'In Progress' },
                    inquiry: { color: 'purple', text: 'Inquiry' },
                    cancelled: { color: 'red', text: 'Cancelled' },
                    rejected: { color: 'magenta', text: 'Rejected' }
                };
                const config = map[st] || { color: 'default', text: st || 'Active' };
                return <Tag color={config.color} style={{ fontWeight: 600, borderRadius: 12 }}>{config.text}</Tag>;
            }
        },
        {
            title: 'Payment Method',
            key: 'paymentMethod',
            render: (_, record) => {
                const isInquiry = record.bookingType === 'Inquari Booking' || record.bookingType === 'inquiry' || record.paymentMethod === 'N/A';
                if (isInquiry) {
                    return <Tag color="purple">📞 Inquiry (No Checkout)</Tag>;
                }
                const method = record.paymentMethod || 'CASH_AFTER_SERVICE';
                if (method === 'FULL_ONLINE') {
                    return (
                        <div>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', fontSize: '12px', fontWeight: 700 }}>
                                💳 100% Online
                            </span>
                            {record.razorpayPaymentId && (
                                <div style={{ fontSize: '10.5px', color: '#64748b', fontFamily: 'monospace', marginTop: 3 }}>
                                    ID: {record.razorpayPaymentId}
                                </div>
                            )}
                        </div>
                    );
                }
                if (method === 'PARTIAL_30_70') {
                    return (
                        <div>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', fontSize: '12px', fontWeight: 700 }}>
                                ⚡ 30% Advance + 70% Cash
                            </span>
                            {record.razorpayPaymentId && (
                                <div style={{ fontSize: '10.5px', color: '#64748b', fontFamily: 'monospace', marginTop: 3 }}>
                                    ID: {record.razorpayPaymentId}
                                </div>
                            )}
                        </div>
                    );
                }
                return (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, background: '#f8fafc', color: '#334155', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 600 }}>
                        💵 Cash on Service
                    </span>
                );
            }
        },
        {
            title: 'Payment Status',
            key: 'paymentStatus',
            render: (_, record) => {
                const isInquiry = record.bookingType === 'Inquari Booking' || record.bookingType === 'inquiry' || record.paymentMethod === 'N/A';
                if (isInquiry) return <span style={{ color: '#94a3b8', fontSize: '12px' }}>N/A</span>;

                const status = record.paymentStatus || 'unpaid';
                if (status === 'paid') {
                    return <Tag color="green" style={{ fontWeight: 700, borderRadius: 12 }}>✓ Paid in Full</Tag>;
                }
                if (status === 'partial_paid') {
                    return <Tag color="gold" style={{ fontWeight: 700, borderRadius: 12 }}>⚡ 30% Advance Paid</Tag>;
                }
                return <Tag color="default" style={{ fontWeight: 600, borderRadius: 12 }}>⏳ Unpaid (Cash Due)</Tag>;
            }
        },
        {
            title: 'Total Amount',
            dataIndex: 'totalAmount',
            key: 'totalAmount',
            render: (val) => (
                <span style={{ fontWeight: 800, fontSize: '14.5px', color: '#0f172a' }}>
                    ₹{Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
            )
        },
        {
            title: 'Platform Charges',
            key: 'platformCommission',
            render: (_, record) => {
                const isInquiry = record.bookingType === 'Inquari Booking' || record.bookingType === 'inquiry' || record.paymentMethod === 'N/A';
                const commission = Number(record.platformCommission || 0);
                return (
                    <div>
                        <span style={{ fontWeight: 700, color: '#dc2626', fontSize: '13.5px' }}>
                            -₹{commission.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                            {isInquiry ? 'Flat ₹200 Inquiry Fee' : '5% Platform Fee'}
                        </div>
                    </div>
                );
            }
        },
        {
            title: 'Remaining Net Amount',
            key: 'adminNetEarning',
            render: (_, record) => {
                const net = Number(record.adminNetEarning || 0);
                return (
                    <div>
                        <span style={{ fontWeight: 800, color: '#059669', fontSize: '14.5px' }}>
                            ₹{net.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <div style={{ fontSize: '10.5px', color: '#059669', fontWeight: 600 }}>
                            Admin Net Share
                        </div>
                    </div>
                );
            }
        },
        {
            title: 'Collection Breakdown',
            key: 'breakdown',
            render: (_, record) => {
                const isInquiry = record.bookingType === 'Inquari Booking' || record.bookingType === 'inquiry' || record.paymentMethod === 'N/A';
                if (isInquiry) return <span style={{ color: '#94a3b8', fontSize: '12px' }}>Inquiry</span>;

                const advance = Number(record.advancePaidAmount) || 0;
                const remaining = Number(record.remainingCashAmount) || 0;

                return (
                    <div style={{ fontSize: '12px' }}>
                        {advance > 0 && (
                            <div style={{ color: '#059669', fontWeight: 600 }}>
                                🟢 Online Paid: ₹{advance.toLocaleString('en-IN')}
                            </div>
                        )}
                        {remaining > 0 && (
                            <div style={{ color: '#b45309', fontWeight: 600 }}>
                                💵 Cash to Collect: ₹{remaining.toLocaleString('en-IN')}
                            </div>
                        )}
                        {advance === 0 && remaining === 0 && (
                            <div style={{ color: '#64748b' }}>
                                ₹{Number(record.totalAmount || 0).toLocaleString('en-IN')}
                            </div>
                        )}
                    </div>
                );
            }
        }
    ];

    // Columns for Admin's Payout Requests History
    const payoutColumns = [
        {
            title: 'Request ID',
            dataIndex: '_id',
            key: '_id',
            render: (id) => (
                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb', background: '#eff6ff', padding: '3px 8px', borderRadius: 6 }}>
                    #{id?.slice(-6)?.toUpperCase() || id}
                </span>
            )
        },
        {
            title: 'Requested Date',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (d) => <span style={{ color: '#64748b', fontSize: 13 }}>{new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
        },
        {
            title: 'Amount',
            dataIndex: 'amount',
            key: 'amount',
            render: (val) => <span style={{ fontWeight: 800, fontSize: 15, color: '#0f172a' }}>₹{Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        },
        {
            title: 'Method & Destination',
            key: 'destination',
            render: (_, record) => (
                <div style={{ fontSize: 12.5 }}>
                    <div style={{ fontWeight: 600, color: '#1e293b' }}>
                        {record.payoutMethod === 'UPI' ? '⚡ UPI Transfer' : '🏦 Bank Transfer (IMPS/NEFT)'}
                    </div>
                    {record.payoutMethod === 'UPI' ? (
                        <div style={{ color: '#059669', fontFamily: 'monospace' }}>{record.bankDetails?.upiId || 'N/A'}</div>
                    ) : (
                        <div style={{ color: '#64748b' }}>
                            A/C: {record.bankDetails?.accountNumber ? `••••${record.bankDetails.accountNumber.slice(-4)}` : 'N/A'} ({record.bankDetails?.ifscCode || 'IFSC'})
                        </div>
                    )}
                </div>
            )
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (st) => {
                if (st === 'approved') return <span className="payment-badge-status approved">✓ Transferred</span>;
                if (st === 'rejected') return <span className="payment-badge-status rejected">✗ Rejected</span>;
                return <span className="payment-badge-status pending">⏳ Pending SuperAdmin</span>;
            }
        },
        {
            title: 'Bank Transfer Reference (UTR)',
            key: 'utr',
            render: (_, record) => {
                if (record.status === 'approved') {
                    return (
                        <div>
                            <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#059669', fontSize: 12.5 }}>
                                UTR: {record.transactionRef || 'Verified'}
                            </div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>
                                Transferred: {record.approvedAt ? new Date(record.approvedAt).toLocaleDateString('en-IN') : 'Completed'}
                            </div>
                        </div>
                    );
                }
                if (record.status === 'rejected') {
                    return <span style={{ color: '#dc2626', fontSize: 12 }}>Reason: {record.rejectedReason}</span>;
                }
                return <span style={{ color: '#94a3b8', fontSize: 12 }}>Waiting for SuperAdmin to confirm UTR</span>;
            }
        }
    ];

    // Columns for 2-Day Escrow & Completed Bookings Ledger
    const ledgerColumns = [
        {
            title: 'Booking & Service',
            key: 'service',
            render: (_, record) => (
                <div>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{record.service}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                        ID: #{record._id?.slice(-6)?.toUpperCase()} • {record.customerName}
                    </div>
                </div>
            )
        },
        {
            title: 'Completed Date',
            dataIndex: 'completedAt',
            key: 'completedAt',
            render: (d) => <span style={{ color: '#475569', fontSize: 12.5 }}>{new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
        },
        {
            title: 'Gross Amount',
            dataIndex: 'totalAmount',
            key: 'totalAmount',
            render: (val) => <span style={{ fontWeight: 700, color: '#0f172a' }}>₹{Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        },
        {
            title: 'Platform Fee (SuperAdmin)',
            key: 'commission',
            render: (_, record) => {
                const isInquiry = record.bookingType === 'Inquari Booking' || record.bookingType === 'inquiry';
                return (
                    <div>
                        <span style={{ fontWeight: 700, color: '#dc2626' }}>
                            -₹{Number(record.platformCommission || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                        <div style={{ fontSize: 10.5, color: '#64748b' }}>
                            {isInquiry ? 'Flat ₹200 Inquiry Fee' : '5% Platform Fee'}
                        </div>
                    </div>
                );
            }
        },
        {
            title: 'Net Admin Earning',
            dataIndex: 'adminNetEarning',
            key: 'adminNetEarning',
            render: (val) => (
                <span style={{ fontWeight: 800, color: '#059669', fontSize: 14 }}>
                    ₹{Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
            )
        },
        {
            title: 'Escrow / Payout Status',
            key: 'escrowStatus',
            render: (_, record) => {
                if (record.payoutStatus === 'paid') {
                    return <Tag color="green">✓ Paid to Bank</Tag>;
                }
                if (record.payoutStatus === 'payout_requested') {
                    return <Tag color="orange">⏳ In Payout Request</Tag>;
                }
                if (record.isMatured || record.payoutStatus === 'available') {
                    return (
                        <div>
                            <Tag color="cyan">🟢 Available to Withdraw</Tag>
                            <div style={{ fontSize: 10.5, color: '#059669', marginTop: 2 }}>2-day hold cleared</div>
                        </div>
                    );
                }
                // Still in 2-day holding window
                const release = new Date(record.escrowReleaseDate);
                return (
                    <div>
                        <Tag color="gold">⏳ In 48h Escrow Hold</Tag>
                        <div style={{ fontSize: 11, color: '#b45309', marginTop: 2 }}>
                            Unlocks: {release.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>
                );
            }
        }
    ];

    // SuperAdmin Queue Columns
    const superAdminColumns = [
        {
            title: 'Request ID',
            dataIndex: '_id',
            key: '_id',
            render: (id) => (
                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>
                    #{id?.slice(-6)?.toUpperCase() || id}
                </span>
            )
        },
        {
            title: 'Admin / Vendor Details',
            key: 'vendor',
            render: (_, record) => (
                <div>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{record.companyName || record.vendorName}</div>
                    <div style={{ fontSize: 12, color: '#475569' }}>📞 {record.vendorPhone || 'N/A'} • ✉️ {record.vendorEmail}</div>
                </div>
            )
        },
        {
            title: 'Amount to Transfer',
            dataIndex: 'amount',
            key: 'amount',
            render: (val) => (
                <span style={{ fontSize: 16, fontWeight: 800, color: '#059669' }}>
                    ₹{Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
            )
        },
        {
            title: 'Transfer Destination',
            key: 'bank',
            render: (_, record) => (
                <div style={{ fontSize: 12.5 }}>
                    <div style={{ fontWeight: 600 }}>{record.payoutMethod === 'UPI' ? '⚡ UPI ID:' : `🏦 ${record.bankDetails?.bankName || 'Bank'}:`}</div>
                    {record.payoutMethod === 'UPI' ? (
                        <div style={{ color: '#0284c7', fontWeight: 600, fontFamily: 'monospace' }}>{record.bankDetails?.upiId || 'N/A'}</div>
                    ) : (
                        <div>
                            <div><strong>A/C:</strong> {record.bankDetails?.accountNumber || 'N/A'}</div>
                            <div><strong>IFSC:</strong> {record.bankDetails?.ifscCode || 'N/A'} • <strong>Name:</strong> {record.bankDetails?.accountHolderName || 'N/A'}</div>
                        </div>
                    )}
                </div>
            )
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (st) => {
                if (st === 'approved') return <Tag color="green">✓ TRANSFERRED</Tag>;
                if (st === 'rejected') return <Tag color="red">REJECTED</Tag>;
                return <Tag color="orange">⏳ PENDING APPROVAL</Tag>;
            }
        },
        {
            title: 'SuperAdmin Actions',
            key: 'action',
            render: (_, record) => {
                if (record.status === 'approved') {
                    return (
                        <div style={{ fontSize: 12, color: '#059669' }}>
                            <strong>UTR:</strong> {record.transactionRef}
                        </div>
                    );
                }
                if (record.status === 'rejected') {
                    return <span style={{ color: '#dc2626', fontSize: 12 }}>Rejected</span>;
                }
                return (
                    <div style={{ display: 'flex', gap: 8 }}>
                        <Button
                            type="primary"
                            size="small"
                            style={{ background: '#059669', borderColor: '#059669', fontWeight: 600, borderRadius: 6 }}
                            onClick={() => {
                                setSelectedRequestToApprove(record);
                                setUtrNumber('');
                                setTransferNotes('');
                                setShowApproveModal(true);
                            }}
                        >
                            Confirm Transfer
                        </Button>
                        <Button
                            danger
                            size="small"
                            style={{ borderRadius: 6 }}
                            onClick={() => {
                                setSelectedRequestToReject(record);
                                setRejectReason('');
                                setShowRejectModal(true);
                            }}
                        >
                            Reject
                        </Button>
                    </div>
                );
            }
        }
    ];

    return (
        <div className="payment-container">
            {/* Header */}
            <div className="payment-header">
                <div className="payment-title-group">
                    <h2>💳 Payments, Escrow & Settlements</h2>
                    <p>Track job earnings, 2-day escrow release dates, SuperAdmin platform commissions, and payout transfers.</p>
                </div>
                <div className="payment-header-actions">
                    <Button
                        onClick={handleInstantReleaseAll}
                        loading={isReleasingEscrow}
                        style={{ borderRadius: 8, fontWeight: 600, background: '#f59e0b', borderColor: '#f59e0b', color: '#fff' }}
                        title="Instantly unlocks completed bookings to Available balance without waiting 2 days"
                    >
                        ⚡ Instant Test Release
                    </Button>
                    <Button
                        onClick={() => setShowBankModal(true)}
                        style={{ borderRadius: 8, fontWeight: 600, borderColor: '#cbd5e1' }}
                    >
                        🏦 Bank & UPI Details
                    </Button>
                    <Button
                        type="primary"
                        disabled={balances.availableBalance <= 0}
                        onClick={() => {
                            setRequestAmount(balances.availableBalance.toString());
                            setShowRequestModal(true);
                        }}
                        style={{ background: '#059669', borderColor: '#059669', borderRadius: 8, fontWeight: 700, padding: '0 20px', height: 38 }}
                    >
                        💸 Request Payout (₹{balances.availableBalance.toFixed(2)})
                    </Button>
                </div>
            </div>

            {/* Instant Test Mode Notice */}
            <div className="escrow-info-banner" style={{ background: '#ecfdf5', borderColor: '#6ee7b7' }}>
                <span className="banner-icon">⚡</span>
                <div>
                    <h4 style={{ color: '#065f46' }}>Testing Mode Active: Instant Escrow Release (0-Day Delay)</h4>
                    <p style={{ color: '#047857' }}>
                        To enable fast testing without waiting 48 hours, completed bookings are instantly unlocked into <strong>Available to Withdraw</strong>.
                        You can test entering Bank/UPI details, submitting a payout request, and SuperAdmin confirming with a UTR right away!
                        (Standard policy: 48h escrow hold & 5% commission / flat ₹200 for inquiries).
                    </p>
                </div>
            </div>

            {/* Financial Overview Cards */}
            <div className="payment-stats-grid">
                <div className="payment-stat-card featured">
                    <div className="stat-header">
                        <span className="stat-label">🟢 Available to Withdraw</span>
                        <span className="stat-icon">💰</span>
                    </div>
                    <div className="stat-value">₹{Number(balances.availableBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                    <div className="stat-sub">Ready for withdrawal request</div>
                </div>

                <div className="payment-stat-card escrow">
                    <div className="stat-header">
                        <span className="stat-label">⏳ In 48h Escrow Hold</span>
                        <span className="stat-icon">🕒</span>
                    </div>
                    <div className="stat-value">₹{Number(balances.inEscrowBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                    <div className="stat-sub">Unlocks 2 days after job completion</div>
                </div>

                <div className="payment-stat-card">
                    <div className="stat-header">
                        <span className="stat-label">🕒 Requested (Pending Approval)</span>
                        <span className="stat-icon">⏳</span>
                    </div>
                    <div className="stat-value" style={{ color: '#d97706' }}>
                        ₹{Number(balances.requestedBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="stat-sub">Waiting for SuperAdmin transfer</div>
                </div>

                <div className="payment-stat-card paid">
                    <div className="stat-header">
                        <span className="stat-label">🏦 Total Paid Out</span>
                        <span className="stat-icon">✅</span>
                    </div>
                    <div className="stat-value" style={{ color: '#0284c7' }}>
                        ₹{Number(balances.paidOutBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="stat-sub">Transferred to your bank/UPI</div>
                </div>

                <div className="payment-stat-card commission">
                    <div className="stat-header">
                        <span className="stat-label">🏷️ Platform Fee Deducted</span>
                        <span className="stat-icon">📊</span>
                    </div>
                    <div className="stat-value" style={{ color: '#4f46e5' }}>
                        ₹{Number(balances.totalCommissionDeducted || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="stat-sub">5% Standard / ₹200 Inquiry fee</div>
                </div>
            </div>

            {/* SuperAdmin Payout Approvals Banner & Section if SuperAdmin */}
            {isSuperAdmin && (
                <div className="payment-section-card" style={{ border: '2px solid #2563eb' }}>
                    <div className="superadmin-approval-banner">
                        <div>
                            <h4>👑 SuperAdmin Payout Approval Queue ({superAdminStats.pendingCount || 0} Pending)</h4>
                            <p>Review payout requests submitted by Admins, transfer funds via bank/UPI, and submit the Bank UTR reference.</p>
                        </div>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            <Tag color="gold" style={{ fontSize: 13, padding: '4px 12px', borderRadius: 20 }}>
                                Pending: ₹{Number(superAdminStats.pendingAmount || 0).toLocaleString('en-IN')}
                            </Tag>
                            <Tag color="green" style={{ fontSize: 13, padding: '4px 12px', borderRadius: 20 }}>
                                Transferred: ₹{Number(superAdminStats.approvedAmount || 0).toLocaleString('en-IN')}
                            </Tag>
                        </div>
                    </div>
                    <div style={{ padding: '0 16px 16px 16px' }}>
                        <Table
                            dataSource={superAdminRequests}
                            columns={superAdminColumns}
                            rowKey="_id"
                            pagination={{ pageSize: 5 }}
                            scroll={{ x: true }}
                        />
                    </div>
                </div>
            )}

            {/* Payment Methods Breakdown Cards */}
            <div style={{ marginBottom: 22 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
                    <div>
                        <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#0f172a' }}>
                            💳 Payment Methods & Collections Summary
                        </h3>
                        <p style={{ fontSize: 12.5, color: '#64748b', margin: 0 }}>
                            Review bookings breakdown by payment method, or click any card to filter:
                        </p>
                    </div>
                    {paymentFilter !== 'ALL' && (
                        <Button 
                            size="small" 
                            onClick={() => setPaymentFilter('ALL')}
                            style={{ borderRadius: 6, fontSize: 12, fontWeight: 600 }}
                        >
                            Reset Filter (Show All)
                        </Button>
                    )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14 }}>
                    {/* 1. All Bookings */}
                    <div 
                        onClick={() => setPaymentFilter('ALL')}
                        style={{
                            background: '#ffffff',
                            borderRadius: 12,
                            padding: '16px 18px',
                            border: paymentFilter === 'ALL' ? '2px solid #2563eb' : '1px solid #e2e8f0',
                            cursor: 'pointer',
                            boxShadow: paymentFilter === 'ALL' ? '0 4px 12px rgba(37, 99, 235, 0.15)' : '0 1px 3px rgba(0,0,0,0.04)',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <span style={{ fontSize: 11.5, fontWeight: 700, color: '#2563eb', textTransform: 'uppercase' }}>
                                📦 Total Bookings
                            </span>
                            <span style={{ fontSize: 18 }}>📋</span>
                        </div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a' }}>
                            {paymentStats.totalBookingsCount}
                        </div>
                        <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 4 }}>
                            Volume: <strong>₹{paymentStats.totalGrossAmount.toLocaleString('en-IN')}</strong>
                        </div>
                    </div>

                    {/* 2. Platform Charges */}
                    <div 
                        style={{
                            background: '#fff5f5',
                            borderRadius: 12,
                            padding: '16px 18px',
                            border: '1px solid #fecaca',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <span style={{ fontSize: 11.5, fontWeight: 700, color: '#dc2626', textTransform: 'uppercase' }}>
                                🏷️ Platform Charges
                            </span>
                            <span style={{ fontSize: 18 }}>📊</span>
                        </div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: '#dc2626' }}>
                            -₹{Number(paymentStats.totalPlatformCharges || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div style={{ fontSize: 11.5, color: '#991b1b', marginTop: 4 }}>
                            5% Standard / ₹200 Inquiry Fee
                        </div>
                    </div>

                    {/* 3. Net Remaining Amount */}
                    <div 
                        style={{
                            background: '#f0fdf4',
                            borderRadius: 12,
                            padding: '16px 18px',
                            border: '1.5px solid #86efac',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <span style={{ fontSize: 11.5, fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
                                💰 Net Remaining Amount
                            </span>
                            <span style={{ fontSize: 18 }}>📈</span>
                        </div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: '#15803d' }}>
                            ₹{Number(paymentStats.totalNetEarnings || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div style={{ fontSize: 11.5, color: '#166534', marginTop: 4 }}>
                            Total Admin / Vendor Share
                        </div>
                    </div>

                    {/* 4. Cash on Service */}
                    <div 
                        onClick={() => setPaymentFilter('CASH')}
                        style={{
                            background: '#ffffff',
                            borderRadius: 12,
                            padding: '16px 18px',
                            border: paymentFilter === 'CASH' ? '2px solid #475569' : '1px solid #e2e8f0',
                            cursor: 'pointer',
                            boxShadow: paymentFilter === 'CASH' ? '0 4px 12px rgba(71, 85, 105, 0.15)' : '0 1px 3px rgba(0,0,0,0.04)',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <span style={{ fontSize: 11.5, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                                💵 Cash on Service
                            </span>
                            <span style={{ fontSize: 18 }}>💵</span>
                        </div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: '#334155' }}>
                            {paymentStats.cashCount}
                        </div>
                        <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 4 }}>
                            Cash Due: <strong style={{ color: '#0f172a' }}>₹{paymentStats.cashTotalAmount.toLocaleString('en-IN')}</strong>
                        </div>
                    </div>

                    {/* 3. 100% Online Payment */}
                    <div 
                        onClick={() => setPaymentFilter('ONLINE')}
                        style={{
                            background: '#ffffff',
                            borderRadius: 12,
                            padding: '16px 18px',
                            border: paymentFilter === 'ONLINE' ? '2px solid #059669' : '1px solid #e2e8f0',
                            cursor: 'pointer',
                            boxShadow: paymentFilter === 'ONLINE' ? '0 4px 12px rgba(5, 150, 105, 0.15)' : '0 1px 3px rgba(0,0,0,0.04)',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <span style={{ fontSize: 11.5, fontWeight: 700, color: '#059669', textTransform: 'uppercase' }}>
                                💳 100% Online (Razorpay)
                            </span>
                            <span style={{ fontSize: 18 }}>💳</span>
                        </div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: '#059669' }}>
                            {paymentStats.onlineCount}
                        </div>
                        <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 4 }}>
                            Paid: <strong style={{ color: '#059669' }}>₹{paymentStats.onlineCollected.toLocaleString('en-IN')}</strong>
                        </div>
                    </div>

                    {/* 4. 30% Advance + 70% Cash */}
                    <div 
                        onClick={() => setPaymentFilter('PARTIAL')}
                        style={{
                            background: '#ffffff',
                            borderRadius: 12,
                            padding: '16px 18px',
                            border: paymentFilter === 'PARTIAL' ? '2px solid #d97706' : '1px solid #e2e8f0',
                            cursor: 'pointer',
                            boxShadow: paymentFilter === 'PARTIAL' ? '0 4px 12px rgba(217, 119, 6, 0.15)' : '0 1px 3px rgba(0,0,0,0.04)',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <span style={{ fontSize: 11.5, fontWeight: 700, color: '#d97706', textTransform: 'uppercase' }}>
                                ⚡ 30% Advance / 70% Cash
                            </span>
                            <span style={{ fontSize: 18 }}>⚡</span>
                        </div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: '#d97706' }}>
                            {paymentStats.partialCount}
                        </div>
                        <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 4 }}>
                            Paid: <strong>₹{paymentStats.partialAdvanceCollected.toLocaleString('en-IN')}</strong> • Due: <strong>₹{paymentStats.partialCashRemaining.toLocaleString('en-IN')}</strong>
                        </div>
                    </div>

                    {/* 5. New / Active Bookings */}
                    <div 
                        onClick={() => setPaymentFilter('NEW')}
                        style={{
                            background: '#ffffff',
                            borderRadius: 12,
                            padding: '16px 18px',
                            border: paymentFilter === 'NEW' ? '2px solid #7c3aed' : '1px solid #e2e8f0',
                            cursor: 'pointer',
                            boxShadow: paymentFilter === 'NEW' ? '0 4px 12px rgba(124, 58, 237, 0.15)' : '0 1px 3px rgba(0,0,0,0.04)',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <span style={{ fontSize: 11.5, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase' }}>
                                🆕 New / Active Bookings
                            </span>
                            <span style={{ fontSize: 18 }}>⏳</span>
                        </div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: '#7c3aed' }}>
                            {paymentStats.newBookingsCount}
                        </div>
                        <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 4 }}>
                            Pending / Confirmed / In-Progress
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Tabs: All Bookings, Payout Requests vs Completed Bookings Ledger */}
            <div className="payment-section-card">
                <Tabs defaultActiveKey="1" style={{ padding: '0 20px 20px 20px' }}>
                    <TabPane 
                        tab={<span style={{ fontWeight: 600 }}>📦 All Bookings & Payment Details ({allBookings.length})</span>} 
                        key="1"
                    >
                        {/* Sub-filters and search bar */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16, marginTop: 8 }}>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                <Button 
                                    type={paymentFilter === 'ALL' ? 'primary' : 'default'}
                                    onClick={() => setPaymentFilter('ALL')}
                                    style={{ borderRadius: 20, fontSize: 12 }}
                                >
                                    All ({allBookings.length})
                                </Button>
                                <Button 
                                    type={paymentFilter === 'CASH' ? 'primary' : 'default'}
                                    onClick={() => setPaymentFilter('CASH')}
                                    style={{ borderRadius: 20, fontSize: 12 }}
                                >
                                    💵 Cash ({paymentStats.cashCount})
                                </Button>
                                <Button 
                                    type={paymentFilter === 'ONLINE' ? 'primary' : 'default'}
                                    onClick={() => setPaymentFilter('ONLINE')}
                                    style={{ borderRadius: 20, fontSize: 12 }}
                                >
                                    💳 100% Online ({paymentStats.onlineCount})
                                </Button>
                                <Button 
                                    type={paymentFilter === 'PARTIAL' ? 'primary' : 'default'}
                                    onClick={() => setPaymentFilter('PARTIAL')}
                                    style={{ borderRadius: 20, fontSize: 12 }}
                                >
                                    ⚡ 30% / 70% ({paymentStats.partialCount})
                                </Button>
                                <Button 
                                    type={paymentFilter === 'NEW' ? 'primary' : 'default'}
                                    onClick={() => setPaymentFilter('NEW')}
                                    style={{ borderRadius: 20, fontSize: 12 }}
                                >
                                    🆕 New Bookings ({paymentStats.newBookingsCount})
                                </Button>
                                {paymentStats.inquiryCount > 0 && (
                                    <Button 
                                        type={paymentFilter === 'INQUIRY' ? 'primary' : 'default'}
                                        onClick={() => setPaymentFilter('INQUIRY')}
                                        style={{ borderRadius: 20, fontSize: 12 }}
                                    >
                                        📞 Inquiries ({paymentStats.inquiryCount})
                                    </Button>
                                )}
                            </div>

                            <div style={{ minWidth: 260 }}>
                                <Input.Search
                                    placeholder="Search service, customer, phone, Razorpay ID..."
                                    allowClear
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{ width: '100%', borderRadius: 8 }}
                                />
                            </div>
                        </div>

                        <Table
                            dataSource={filteredBookings}
                            columns={allBookingsColumns}
                            rowKey="_id"
                            loading={loading}
                            pagination={{ pageSize: 8 }}
                            scroll={{ x: true }}
                        />
                    </TabPane>

                    <TabPane 
                        tab={<span style={{ fontWeight: 600 }}>📋 Payout Requests History ({payoutRequests.length})</span>} 
                        key="2"
                    >
                        <Table
                            dataSource={payoutRequests}
                            columns={payoutColumns}
                            rowKey="_id"
                            loading={loading}
                            pagination={{ pageSize: 6 }}
                            scroll={{ x: true }}
                        />
                    </TabPane>

                    <TabPane 
                        tab={<span style={{ fontWeight: 600 }}>📊 Completed Bookings & Escrow Ledger ({completedBookings.length})</span>} 
                        key="3"
                    >
                        <Table
                            dataSource={completedBookings}
                            columns={ledgerColumns}
                            rowKey="_id"
                            loading={loading}
                            pagination={{ pageSize: 6 }}
                            scroll={{ x: true }}
                        />
                    </TabPane>
                </Tabs>
            </div>

            {/* Modal: Request Payout */}
            <Modal
                title={<div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>💸 Request Payout to Bank / UPI</div>}
                open={showRequestModal}
                onCancel={() => setShowRequestModal(false)}
                footer={[
                    <Button key="back" onClick={() => setShowRequestModal(false)} style={{ borderRadius: 6 }}>
                        Cancel
                    </Button>,
                    <Button
                        key="submit"
                        type="primary"
                        loading={isSubmittingRequest}
                        onClick={handleRequestPayout}
                        style={{ background: '#059669', borderColor: '#059669', borderRadius: 6, fontWeight: 700 }}
                    >
                        Submit Payout Request
                    </Button>
                ]}
                width={520}
            >
                <div style={{ padding: '10px 0' }}>
                    <div style={{ padding: '12px 16px', background: '#ecfdf5', borderRadius: 8, border: '1px solid #a7f3d0', marginBottom: 16 }}>
                        <div style={{ fontSize: 13, color: '#065f46' }}>Available Balance to Withdraw:</div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: '#047857' }}>
                            ₹{balances.availableBalance.toFixed(2)}
                        </div>
                    </div>

                    <div style={{ marginBottom: 16 }}>
                        <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, color: '#334155' }}>
                            Withdrawal Amount (₹) <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <Input
                            type="number"
                            placeholder="Enter amount"
                            value={requestAmount}
                            onChange={(e) => setRequestAmount(e.target.value)}
                            max={balances.availableBalance}
                            size="large"
                            style={{ borderRadius: 8 }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                            <span style={{ fontSize: 11, color: '#64748b' }}>Min: ₹100 • Max: ₹{balances.availableBalance.toFixed(2)}</span>
                            <Button
                                type="link"
                                size="small"
                                style={{ padding: 0, height: 'auto', fontSize: 12 }}
                                onClick={() => setRequestAmount(balances.availableBalance.toString())}
                            >
                                Withdraw All
                            </Button>
                        </div>
                    </div>

                    <div style={{ marginBottom: 16 }}>
                        <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, color: '#334155' }}>
                            Payout Method <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <Select
                            value={requestMethod}
                            onChange={setRequestMethod}
                            style={{ width: '100%' }}
                            size="large"
                        >
                            <Option value="BANK_TRANSFER">🏦 Direct Bank Transfer (IMPS / NEFT)</Option>
                            <Option value="UPI">⚡ UPI Transfer (Instant to VPA)</Option>
                        </Select>
                    </div>

                    {/* Destination Preview */}
                    <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }}>
                        <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>Destination Account:</div>
                        {requestMethod === 'BANK_TRANSFER' ? (
                            bankDetails.accountNumber ? (
                                <div style={{ color: '#334155' }}>
                                    <div><strong>Holder:</strong> {bankDetails.accountHolderName}</div>
                                    <div><strong>Account:</strong> {bankDetails.accountNumber} ({bankDetails.bankName})</div>
                                    <div><strong>IFSC:</strong> {bankDetails.ifscCode}</div>
                                </div>
                            ) : (
                                <div style={{ color: '#dc2626' }}>
                                    ⚠️ No bank details found. Please click "Bank & UPI Details" to add your account first.
                                </div>
                            )
                        ) : (
                            bankDetails.upiId ? (
                                <div style={{ color: '#059669', fontWeight: 600, fontFamily: 'monospace' }}>
                                    UPI ID: {bankDetails.upiId}
                                </div>
                            ) : (
                                <div style={{ color: '#dc2626' }}>
                                    ⚠️ No UPI ID found. Please update your details.
                                </div>
                            )
                        )}
                    </div>
                </div>
            </Modal>

            {/* Modal: Bank & UPI Details */}
            <Modal
                title={<div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>🏦 Payout Bank & UPI Profile</div>}
                open={showBankModal}
                onCancel={() => setShowBankModal(false)}
                footer={[
                    <Button key="back" onClick={() => setShowBankModal(false)} style={{ borderRadius: 6 }}>
                        Cancel
                    </Button>,
                    <Button
                        key="submit"
                        type="primary"
                        loading={isSavingBank}
                        onClick={handleSaveBankDetails}
                        style={{ borderRadius: 6, fontWeight: 700 }}
                    >
                        Save Details
                    </Button>
                ]}
                width={520}
            >
                <div style={{ padding: '10px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ fontSize: 13, color: '#64748b' }}>
                        Provide your verified banking information so SuperAdmin can transfer your approved payouts directly.
                    </div>

                    <div>
                        <label style={{ display: 'block', fontWeight: 600, marginBottom: 4, color: '#334155', fontSize: 13 }}>
                            Account Holder Name
                        </label>
                        <Input
                            placeholder="e.g. John Doe / Business Name"
                            value={editingBankDetails.accountHolderName}
                            onChange={(e) => setEditingBankDetails({ ...editingBankDetails, accountHolderName: e.target.value })}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontWeight: 600, marginBottom: 4, color: '#334155', fontSize: 13 }}>
                            Bank Name
                        </label>
                        <Input
                            placeholder="e.g. HDFC Bank, SBI, ICICI"
                            value={editingBankDetails.bankName}
                            onChange={(e) => setEditingBankDetails({ ...editingBankDetails, bankName: e.target.value })}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontWeight: 600, marginBottom: 4, color: '#334155', fontSize: 13 }}>
                            Account Number
                        </label>
                        <Input
                            placeholder="Enter bank account number"
                            value={editingBankDetails.accountNumber}
                            onChange={(e) => setEditingBankDetails({ ...editingBankDetails, accountNumber: e.target.value })}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontWeight: 600, marginBottom: 4, color: '#334155', fontSize: 13 }}>
                            IFSC Code
                        </label>
                        <Input
                            placeholder="e.g. HDFC0001234"
                            style={{ textTransform: 'uppercase' }}
                            value={editingBankDetails.ifscCode}
                            onChange={(e) => setEditingBankDetails({ ...editingBankDetails, ifscCode: e.target.value.toUpperCase() })}
                        />
                    </div>

                    <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: 12 }}>
                        <label style={{ display: 'block', fontWeight: 600, marginBottom: 4, color: '#334155', fontSize: 13 }}>
                            UPI ID (Optional for fast UPI payouts)
                        </label>
                        <Input
                            placeholder="e.g. yourname@okhdfcbank"
                            value={editingBankDetails.upiId}
                            onChange={(e) => setEditingBankDetails({ ...editingBankDetails, upiId: e.target.value })}
                        />
                    </div>
                </div>
            </Modal>

            {/* SuperAdmin Modal: Confirm Transfer with UTR */}
            <Modal
                title={<div style={{ fontSize: 18, fontWeight: 700, color: '#047857' }}>✅ Confirm Payment Transfer to Admin</div>}
                open={showApproveModal}
                onCancel={() => setShowApproveModal(false)}
                footer={[
                    <Button key="cancel" onClick={() => setShowApproveModal(false)} style={{ borderRadius: 6 }}>
                        Cancel
                    </Button>,
                    <Button
                        key="approve"
                        type="primary"
                        loading={isApproving}
                        onClick={handleApprovePayout}
                        style={{ background: '#059669', borderColor: '#059669', borderRadius: 6, fontWeight: 700 }}
                    >
                        Confirm Transfer & Mark Paid
                    </Button>
                ]}
                width={520}
            >
                {selectedRequestToApprove && (
                    <div style={{ padding: '10px 0' }}>
                        <div style={{ padding: '12px 16px', background: '#ecfdf5', borderRadius: 8, border: '1px solid #a7f3d0', marginBottom: 16 }}>
                            <div style={{ fontSize: 13, color: '#065f46' }}>Admin / Vendor:</div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{selectedRequestToApprove.companyName || selectedRequestToApprove.vendorName}</div>
                            <div style={{ fontSize: 20, fontWeight: 800, color: '#047857', marginTop: 4 }}>
                                Transfer Amount: ₹{selectedRequestToApprove.amount.toFixed(2)}
                            </div>
                        </div>

                        <div style={{ marginBottom: 14 }}>
                            <label style={{ display: 'block', fontWeight: 700, marginBottom: 4, color: '#0f172a', fontSize: 13 }}>
                                Bank UTR / Transaction Reference ID <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <Input
                                placeholder="Enter Bank UTR (e.g. UTR129837192837 or IMPS ref)"
                                value={utrNumber}
                                onChange={(e) => setUtrNumber(e.target.value)}
                                size="large"
                                style={{ borderRadius: 8, fontFamily: 'monospace' }}
                            />
                            <span style={{ fontSize: 11, color: '#64748b' }}>
                                This reference will be visible to the Admin as proof of bank transfer.
                            </span>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontWeight: 600, marginBottom: 4, color: '#334155', fontSize: 13 }}>
                                Notes / Remarks (Optional)
                            </label>
                            <Input.TextArea
                                placeholder="e.g. Transferred via HDFC NetBanking"
                                value={transferNotes}
                                onChange={(e) => setTransferNotes(e.target.value)}
                                rows={2}
                            />
                        </div>
                    </div>
                )}
            </Modal>

            {/* SuperAdmin Modal: Reject Payout */}
            <Modal
                title={<div style={{ fontSize: 18, fontWeight: 700, color: '#dc2626' }}>❌ Reject Payout Request</div>}
                open={showRejectModal}
                onCancel={() => setShowRejectModal(false)}
                footer={[
                    <Button key="cancel" onClick={() => setShowRejectModal(false)} style={{ borderRadius: 6 }}>
                        Cancel
                    </Button>,
                    <Button
                        key="reject"
                        danger
                        type="primary"
                        loading={isRejecting}
                        onClick={handleRejectPayout}
                        style={{ borderRadius: 6, fontWeight: 700 }}
                    >
                        Confirm Rejection
                    </Button>
                ]}
                width={480}
            >
                {selectedRequestToReject && (
                    <div style={{ padding: '10px 0' }}>
                        <p style={{ color: '#475569', fontSize: 13 }}>
                            Are you sure you want to reject this payout request of <strong>₹{selectedRequestToReject.amount}</strong> for <strong>{selectedRequestToReject.companyName || selectedRequestToReject.vendorName}</strong>?
                            The funds will be immediately returned to the Admin's available balance.
                        </p>
                        <div>
                            <label style={{ display: 'block', fontWeight: 600, marginBottom: 4, color: '#334155', fontSize: 13 }}>
                                Reason for Rejection
                            </label>
                            <Input.TextArea
                                placeholder="e.g. Invalid IFSC Code or Bank Account Name mismatch"
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                rows={3}
                            />
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}

export default Payment;

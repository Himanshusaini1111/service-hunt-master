import React, { useEffect, useState } from "react";
import { Tag, Typography, Button, List, Alert, Modal, Descriptions, Divider, Space } from "antd";
import axios from "axios";
import moment from "moment";
import { message } from "antd";
import { 
    CalendarOutlined, 
    TeamOutlined,
    EnvironmentOutlined,
    ClockCircleOutlined,
    UserOutlined,
    PhoneOutlined,
    ShoppingOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    LoadingOutlined,
    WarningOutlined,
    QuestionCircleOutlined,
    RobotOutlined,
    UserOutlined as UserIcon,
    MailOutlined,
    SearchOutlined,
    AppstoreOutlined
} from '@ant-design/icons';
import Error from "../components/Error";
import Loader from "../components/Loader";
import Navbar from "../components/Navbar";
import "./Order.css";

const { Title, Text, Paragraph } = Typography;

const MyOrders = () => {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expandedHelper, setExpandedHelper] = useState(null);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [activeTab, setActiveTab] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        fetchBookings();
    }, []);

    const fetchBookings = async () => {
        try {
            const currentUser = JSON.parse(localStorage.getItem("currentUser"));
            if (!currentUser?._id) throw new Error("User not authenticated");

            const { data } = await axios.post("/api/bookings/getuserbookings", {
                userid: currentUser._id,
            });

            console.log('Fetched bookings:', data);
            setBookings(data);
            setError(null);
        } catch (err) {
            console.error("Error fetching bookings:", err);
            setError(err.response?.data?.message || err.message);
        } finally {
            setLoading(false);
        }
    };

    const canCancelBooking = (booking) => {
        if (!booking || !booking.status) return false;
        const s = String(booking.status).trim().toLowerCase();
        // Cancel button is removed when in-progress or completed (or already cancelled/rejected)
        if (s === 'in-progress' || s === 'in_progress' || s === 'inprogress' || s === 'completed' || s === 'cancelled' || s === 'rejected') {
            return false;
        }
        return true;
    };

    const handleCancelBooking = (bookingId, serviceId) => {
        Modal.confirm({
            title: "Cancel Booking",
            content: "Are you sure you want to cancel this booking?",
            okText: "Yes, Cancel",
            okType: "danger",
            cancelText: "No, Keep",
            onOk: async () => {
                try {
                    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
                    if (!currentUser?._id) throw new Error("User not authenticated");

                    await axios.post("/api/bookings/cancelbooking", {
                        bookingid: bookingId,
                        serviceid: serviceId,
                        userid: currentUser._id
                    });

                    message.success("Booking cancelled successfully!");
                    fetchBookings();
                } catch (err) {
                    message.error(err.response?.data?.message || "Failed to cancel booking");
                }
            }
        });
    };

    const renderBookingStatus = (status) => {
        const statusConfig = {
            confirmed: { color: "#059669", bgColor: "#ecfdf5", borderColor: "#a7f3d0", icon: <CheckCircleOutlined />, text: "Confirmed" },
            rejected: { color: "#dc2626", bgColor: "#fef2f2", borderColor: "#fecaca", icon: <CloseCircleOutlined />, text: "Rejected" },
            booked: { color: "#2563eb", bgColor: "#eff6ff", borderColor: "#bfdbfe", icon: <LoadingOutlined />, text: "Booked" },
            pending: { color: "#d97706", bgColor: "#fffbeb", borderColor: "#fde68a", icon: <WarningOutlined />, text: "Pending" },
            assigned: { color: "#0891b2", bgColor: "#ecfeff", borderColor: "#a5f3fc", icon: <TeamOutlined />, text: "Assigned" },
            "in-progress": { color: "#ea580c", bgColor: "#fff7ed", borderColor: "#fed7aa", icon: <LoadingOutlined />, text: "In Progress" },
            completed: { color: "#059669", bgColor: "#ecfdf5", borderColor: "#a7f3d0", icon: <CheckCircleOutlined />, text: "Completed" },
            inquiry: { color: "#7c3aed", bgColor: "#f5f3ff", borderColor: "#ddd6fe", icon: <QuestionCircleOutlined />, text: "Inquiry" },
            default: { color: "#64748b", bgColor: "#f8fafc", borderColor: "#e2e8f0", icon: <LoadingOutlined />, text: status || "Processing" }
        };

        const config = statusConfig[status] || statusConfig.default;
        
        return (
            <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                background: config.bgColor,
                borderRadius: '20px',
                border: `1px solid ${config.borderColor}`,
                color: config.color,
                fontSize: '12px',
                fontWeight: '600'
            }}>
                {config.icon}
                <span>{config.text}</span>
            </div>
        );
    };

    const renderBookingType = (type) => {
        const typeConfig = {
            automatic: { color: "blue", icon: <RobotOutlined />, text: "Automatic Booking" },
            manual: { color: "orange", icon: <UserIcon />, text: "Manual Booking" },
            inquiry: { color: "purple", icon: <QuestionCircleOutlined />, text: "Inquiry" },
            standard: { color: "green", icon: <ShoppingOutlined />, text: "Standard" }
        };

        const config = typeConfig[type] || typeConfig.standard;
        
        return (
            <Tag color={config.color} icon={config.icon} style={{ margin: 0, borderRadius: '6px', fontWeight: '500' }}>
                {config.text}
            </Tag>
        );
    };

    const handleHelperClick = (helperId) => {
        setExpandedHelper(expandedHelper === helperId ? null : helperId);
    };

    const handleBookingClick = (booking) => {
        setSelectedBooking(booking);
        setModalVisible(true);
    };

    const handleModalClose = () => {
        setModalVisible(false);
        setSelectedBooking(null);
    };

    const renderHelperItem = (helper) => (
        <List.Item
            onClick={() => handleHelperClick(helper._id)}
            style={{
                cursor: 'pointer',
                padding: '12px',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                marginBottom: '8px',
                background: expandedHelper === helper._id ? '#f8fafc' : 'white',
                transition: 'all 0.2s ease'
            }}
        >
            <div style={{ width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {helper.photo ? (
                        <img
                            src={helper.photo}
                            alt={helper.name}
                            style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '50%',
                                objectFit: 'cover',
                                border: '2px solid #2563eb'
                            }}
                        />
                    ) : (
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            backgroundColor: '#eff6ff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '2px solid #2563eb',
                            fontSize: '18px',
                            fontWeight: 'bold',
                            color: '#2563eb'
                        }}>
                            {helper.name ? helper.name.charAt(0).toUpperCase() : '?'}
                        </div>
                    )}
                    
                    <div style={{ flex: 1 }}>
                        <Text strong style={{ fontSize: '15px', display: 'block', color: '#0f172a' }}>
                            {helper.name || 'Assigned Specialist'}
                        </Text>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                            📞 {helper.phone || 'N/A'}
                        </Text>
                    </div>
                </div>

                {expandedHelper === helper._id && (
                    <div style={{
                        marginTop: '12px',
                        paddingTop: '12px',
                        borderTop: '1px solid #e2e8f0'
                    }}>
                        {helper.skills && (
                            <Text style={{ display: 'block', marginBottom: '4px', fontSize: '13px' }}>
                                <strong>Skills:</strong> {helper.skills}
                            </Text>
                        )}
                        {helper.experience && (
                            <Text style={{ display: 'block', marginBottom: '4px', fontSize: '13px' }}>
                                <strong>Experience:</strong> {helper.experience} years
                            </Text>
                        )}
                        {helper.email && (
                            <Text style={{ display: 'block', marginBottom: '4px', fontSize: '13px' }}>
                                <strong>Email:</strong> {helper.email}
                            </Text>
                        )}
                        {helper.description && (
                            <Text style={{ display: 'block', fontSize: '13px', color: '#475569' }}>
                                <strong>About:</strong> {helper.description}
                            </Text>
                        )}
                    </div>
                )}
            </div>
        </List.Item>
    );

    const renderBookingDetailsModal = () => {
        if (!selectedBooking) return null;

        const formatDateRange = () => {
            if (selectedBooking.selectedDates && selectedBooking.selectedDates.length > 0) {
                const dates = selectedBooking.selectedDates;
                if (dates.length === 1) {
                    return moment(dates[0]).format("dddd, MMMM D, YYYY");
                } else {
                    return `${moment(dates[0]).format("MMM D")} - ${moment(dates[dates.length - 1]).format("MMM D, YYYY")}`;
                }
            } else if (selectedBooking.fromdate && selectedBooking.todate) {
                return `${moment(selectedBooking.fromdate).format("dddd, MMMM D, YYYY")} - ${moment(selectedBooking.todate).format("dddd, MMMM D, YYYY")}`;
            } else if (selectedBooking.fromdate) {
                return moment(selectedBooking.fromdate).format("dddd, MMMM D, YYYY");
            } else if (selectedBooking.createdAt) {
                return moment(selectedBooking.createdAt).format("dddd, MMMM D, YYYY");
            }
            return "Date not specified";
        };

        const formatTimeSlots = () => {
            if (selectedBooking.slots && selectedBooking.slots.length > 0) {
                return selectedBooking.slots.map(slot => 
                    typeof slot === 'object' ? (slot.slot || slot.date || '') : slot
                ).filter(Boolean).join(', ');
            }
            if (selectedBooking.time && selectedBooking.time !== 'N/A') {
                return selectedBooking.time;
            }
            return null;
        };

        const getUnitDisplay = () => {
            let unit = selectedBooking.customUnit || selectedBooking.unit || 'per day';
            if (typeof unit === 'string') {
                const parts = unit.split(/\s*(?:and|\/|\+|&)\s*/i);
                unit = parts[0].trim();
            }
            if (unit.startsWith('per-')) {
                return unit.replace('per-', '').replace(/-/g, ' ');
            }
            return unit;
        };

        const isInquiry = 
            selectedBooking.status === 'inquiry' || 
            selectedBooking.bookingType === 'inquiry' || 
            selectedBooking.bookingType === 'Inquari Booking' || 
            (typeof selectedBooking.bookingType === 'string' && selectedBooking.bookingType.toLowerCase().includes('inqu'));

        const basePrice = selectedBooking.rentperday !== undefined && selectedBooking.rentperday !== null 
            ? selectedBooking.rentperday 
            : (selectedBooking.price || 0);

        return (
            <Modal
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <ShoppingOutlined style={{ color: '#2563eb', fontSize: '20px' }} />
                        <span style={{ fontWeight: '700' }}>Booking Details</span>
                    </div>
                }
                open={modalVisible}
                onCancel={handleModalClose}
                footer={[
                    <Button key="close" onClick={handleModalClose} style={{ borderRadius: '8px' }}>
                        Close
                    </Button>,
                    canCancelBooking(selectedBooking) && (
                        <Button
                            key="cancel"
                            type="primary"
                            danger
                            style={{ borderRadius: '8px' }}
                            onClick={() => {
                                handleCancelBooking(selectedBooking._id, selectedBooking.serviceid);
                                handleModalClose();
                            }}
                        >
                            Cancel Booking
                        </Button>
                    )
                ]}
                width={720}
                style={{ maxWidth: '95vw', top: 20 }}
            >
                <div className="order-modal-body-wrapper">
                    {/* 1. Header Hero with Service Title & Status Badge (No Booking ID, No Booking Type) */}
                    <div className={`order-modal-hero ${isInquiry ? 'order-modal-hero-inquiry' : ''}`}>
                        <div className="order-modal-hero-top">
                            <h2 className="order-modal-title">{selectedBooking.service}</h2>
                            <div className="order-modal-status">
                                {renderBookingStatus(selectedBooking.status)}
                            </div>
                        </div>
                    </div>

                    {/* 2. Service & Pricing Details */}
                    <div className="order-modal-card">
                        <div className="order-modal-card-title">
                            <ShoppingOutlined className="order-modal-card-icon" />
                            <span>Service & Pricing Details</span>
                        </div>
                        <div className="order-modal-fields-grid">
                            <div className="order-modal-field">
                                <span className="order-modal-field-label">Base Price</span>
                                <span className="order-modal-field-value price-highlight">
                                    ₹{Number(basePrice).toLocaleString()}
                                    <span className="order-modal-unit-text"> / {getUnitDisplay()}</span>
                                </span>
                            </div>

                            <div className="order-modal-field">
                                <span className="order-modal-field-label">Unit</span>
                                <span className="order-modal-field-value">{getUnitDisplay()}</span>
                            </div>

                            <div className="order-modal-field">
                                <span className="order-modal-field-label">Quantity</span>
                                <span className="order-modal-field-value">{selectedBooking.quantity || 1}</span>
                            </div>

                            {selectedBooking.daysCount > 1 && (
                                <div className="order-modal-field">
                                    <span className="order-modal-field-label">Duration</span>
                                    <span className="order-modal-field-value">{selectedBooking.daysCount} days</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 3. Schedule & Timing */}
                    <div className="order-modal-card">
                        <div className="order-modal-card-title">
                            <CalendarOutlined className="order-modal-card-icon" />
                            <span>Schedule & Timing</span>
                        </div>
                        <div className="order-modal-fields-grid">
                            <div className="order-modal-field full-width">
                                <span className="order-modal-field-label">Service Date</span>
                                <span className="order-modal-field-value">
                                    <CalendarOutlined style={{ marginRight: 6, color: '#2563eb' }} />
                                    {formatDateRange()}
                                </span>
                            </div>

                            {formatTimeSlots() && (
                                <div className="order-modal-field full-width">
                                    <span className="order-modal-field-label">Time Slots</span>
                                    <span className="order-modal-field-value">
                                        <ClockCircleOutlined style={{ marginRight: 6, color: '#2563eb' }} />
                                        {formatTimeSlots()}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 4. Customer Information */}
                    <div className="order-modal-card">
                        <div className="order-modal-card-title">
                            <UserOutlined className="order-modal-card-icon" />
                            <span>Customer Information</span>
                        </div>
                        <div className="order-modal-fields-grid">
                            <div className="order-modal-field">
                                <span className="order-modal-field-label">Customer Name</span>
                                <span className="order-modal-field-value">
                                    <UserOutlined style={{ marginRight: 6, color: '#64748b' }} />
                                    {selectedBooking.name}
                                </span>
                            </div>

                            <div className="order-modal-field">
                                <span className="order-modal-field-label">Phone Number</span>
                                <span className="order-modal-field-value">
                                    <PhoneOutlined style={{ marginRight: 6, color: '#64748b' }} />
                                    {selectedBooking.phone}
                                </span>
                            </div>

                            {selectedBooking.email && (
                                <div className="order-modal-field full-width">
                                    <span className="order-modal-field-label">Email Address</span>
                                    <span className="order-modal-field-value">
                                        <MailOutlined style={{ marginRight: 6, color: '#64748b' }} />
                                        {selectedBooking.email}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 5. Location / Address (if available) */}
                    {((selectedBooking.locationType === 'Simple' && selectedBooking.address) || selectedBooking.locationType === 'Rental') && (
                        <div className="order-modal-card">
                            <div className="order-modal-card-title">
                                <EnvironmentOutlined className="order-modal-card-icon" />
                                <span>Service Location</span>
                            </div>
                            <div className="order-modal-fields-grid">
                                {selectedBooking.locationType === 'Simple' && selectedBooking.address && (
                                    <div className="order-modal-field full-width">
                                        <span className="order-modal-field-label">Address</span>
                                        <span className="order-modal-field-value">
                                            <EnvironmentOutlined style={{ marginRight: 6, color: '#2563eb' }} />
                                            {selectedBooking.address}
                                        </span>
                                    </div>
                                )}

                                {selectedBooking.locationType === 'Rental' && (
                                    <>
                                        <div className="order-modal-field full-width">
                                            <span className="order-modal-field-label">Pickup Address</span>
                                            <span className="order-modal-field-value">
                                                <EnvironmentOutlined style={{ marginRight: 6, color: '#2563eb' }} />
                                                {selectedBooking.pickupAddress}
                                            </span>
                                        </div>
                                        <div className="order-modal-field full-width">
                                            <span className="order-modal-field-label">Drop Address</span>
                                            <span className="order-modal-field-value">
                                                <EnvironmentOutlined style={{ marginRight: 6, color: '#dc2626' }} />
                                                {selectedBooking.dropAddress}
                                            </span>
                                        </div>
                                        <div className="order-modal-field">
                                            <span className="order-modal-field-label">Return Trip</span>
                                            <span className="order-modal-field-value">{selectedBooking.returnTrip ? 'Yes' : 'No'}</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* 6. Special Notes / Description (if available) */}
                    {selectedBooking.description && (
                        <div className="order-modal-card">
                            <div className="order-modal-card-title">
                                <span>Description / Special Instructions</span>
                            </div>
                            <p className="order-modal-description-text">
                                {selectedBooking.description}
                            </p>
                        </div>
                    )}

                    {/* 7. Optional / Extra Services (if available) */}
                    {((selectedBooking.optionalInputs && selectedBooking.optionalInputs.length > 0) || (selectedBooking.extraInputs && selectedBooking.extraInputs.length > 0)) && (
                        <div className="order-modal-card">
                            <div className="order-modal-card-title">
                                <span>Addon & Optional Services</span>
                            </div>
                            {selectedBooking.optionalInputs && selectedBooking.optionalInputs.length > 0 && (
                                <div className="order-modal-addon-list">
                                    {selectedBooking.optionalInputs.map((input, index) => (
                                        <div key={index} className="order-modal-addon-row">
                                            <span>
                                                <strong>{input.name}:</strong> {input.count} × ₹{input.price}
                                                {input.unit && ` /${input.unit.replace('per-', '')}`}
                                            </span>
                                            <span className="order-modal-addon-price">
                                                {isInquiry ? 'Quote on inquiry' : `₹${(input.count * input.price * (selectedBooking.daysCount || 1)).toFixed(2)}`}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {selectedBooking.extraInputs && selectedBooking.extraInputs.length > 0 && (
                                <div className="order-modal-addon-list">
                                    {selectedBooking.extraInputs.map((input, index) => (
                                        <div key={index} className="order-modal-addon-row">
                                            <span>
                                                <strong>{input.name}</strong>
                                                {input.unit && <span style={{ color: '#64748b' }}> ({input.unit.replace('per-', '')})</span>}
                                            </span>
                                            <span className="order-modal-addon-price" style={{ color: '#ea580c' }}>
                                                {isInquiry ? 'Quote on inquiry' : `₹${input.price}`}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* 8. Bottom Notice for Inquiry Service (Shows it is an inquiry service without a total amount) */}
                    {isInquiry && (
                        <div className="order-modal-inquiry-banner">
                            <div className="order-modal-inquiry-header">
                                <div className="order-modal-inquiry-title-wrap">
                                    <QuestionCircleOutlined className="order-modal-inquiry-icon" />
                                    <span className="order-modal-inquiry-title">Inquiry Service</span>
                                </div>
                                <span className="order-modal-inquiry-pill">No Total Amount</span>
                            </div>
                            <p className="order-modal-inquiry-desc">
                                This is an inquiry-based service and does not have a fixed total amount. Final pricing and schedule will be confirmed directly with you after requirement review.
                            </p>
                        </div>
                    )}

                    {/* 9. Assigned Specialists (if assigned) */}
                    {selectedBooking.assignedHelpers && selectedBooking.assignedHelpers.length > 0 && (
                        <div className="order-modal-card">
                            <div className="order-modal-card-title">
                                <TeamOutlined className="order-modal-card-icon" style={{ color: '#059669' }} />
                                <span>Assigned Specialists ({selectedBooking.assignedHelpers.length})</span>
                            </div>
                            <List
                                grid={{
                                    gutter: 12,
                                    xs: 1,
                                    sm: 2,
                                    md: 2,
                                    lg: 2,
                                    xl: 2,
                                }}
                                dataSource={selectedBooking.assignedHelpers}
                                renderItem={renderHelperItem}
                            />
                        </div>
                    )}
                </div>
            </Modal>
        );
    };

    const renderBookingCard = (booking) => {
        const getDateDisplay = () => {
            if (booking.selectedDates && booking.selectedDates.length > 0) {
                const dates = booking.selectedDates;
                if (dates.length === 1) {
                    return moment(dates[0]).format("MMM D, YYYY");
                } else {
                    return `${moment(dates[0]).format("MMM D")} - ${moment(dates[dates.length - 1]).format("MMM D, YYYY")}`;
                }
            } else if (booking.fromdate) {
                return moment(booking.fromdate).format("MMM D, YYYY");
            } else if (booking.createdAt) {
                return moment(booking.createdAt).format("MMM D, YYYY");
            }
            return "Date TBD";
        };

        const formatTimeSlots = () => {
            if (booking.slots && booking.slots.length > 0) {
                const slots = booking.slots.map(slot => typeof slot === 'object' ? (slot.slot || slot.date || '') : slot).filter(Boolean);
                if (slots.length === 1) return slots[0];
                if (slots.length > 1) return `${slots[0]} (+${slots.length - 1} more)`;
            }
            if (booking.time && booking.time !== 'N/A') {
                return booking.time;
            }
            return null;
        };

        const getUnitDisplay = () => {
            let unit = booking.customUnit || booking.unit || 'per day';
            if (typeof unit === 'string') {
                const parts = unit.split(/\s*(?:and|\/|\+|&)\s*/i);
                unit = parts[0].trim();
            }
            if (unit.startsWith('per-')) {
                return unit.replace('per-', '').replace(/-/g, ' ');
            }
            return unit;
        };

        const isInquiry = 
            booking.status === 'inquiry' || 
            booking.bookingType === 'inquiry' || 
            booking.bookingType === 'Inquari Booking' || 
            (typeof booking.bookingType === 'string' && booking.bookingType.toLowerCase().includes('inqu'));

        const basePrice = booking.rentperday !== undefined && booking.rentperday !== null 
            ? booking.rentperday 
            : (booking.price || 0);

        const getAccentColor = () => {
            if (isInquiry) return '#7c3aed';
            if (booking.status === 'confirmed' || booking.status === 'completed') return '#059669';
            if (booking.status === 'rejected' || booking.status === 'cancelled') return '#dc2626';
            if (booking.status === 'pending') return '#d97706';
            if (booking.status === 'in-progress' || booking.status === 'assigned') return '#0891b2';
            return '#2563eb';
        };

        return (
            <div
                key={booking._id}
                className={`order-card ${isInquiry ? 'order-card-inquiry' : ''}`}
                onClick={() => handleBookingClick(booking)}
            >
                <div className="order-card-accent" style={{ background: getAccentColor() }} />

                <div className="order-card-body">
                    {/* Header: Service Name & Status Badge (No Booking ID, No Booking Type) */}
                    <div className="order-card-header">
                        <h3 className="order-card-service-name" title={booking.service}>
                            {booking.service}
                        </h3>
                        <div className="order-card-status-wrap">
                            {renderBookingStatus(booking.status)}
                        </div>
                    </div>

                    {/* Schedule / Timing Information */}
                    <div className="order-meta-box">
                        <div className="order-meta-item">
                            <CalendarOutlined className="order-meta-icon" />
                            <span className="order-meta-text">{getDateDisplay()}</span>
                        </div>
                        {formatTimeSlots() && (
                            <div className="order-meta-item">
                                <ClockCircleOutlined className="order-meta-icon" />
                                <span className="order-meta-text">{formatTimeSlots()}</span>
                            </div>
                        )}
                    </div>

                    {/* Base Price Strip (Replacing Total Amount) */}
                    <div className="order-price-strip">
                        <span className="order-price-label">Base Price</span>
                        <div className="order-price-val-box">
                            <span className="order-price-currency">₹</span>
                            <span className="order-price-val">{Number(basePrice).toLocaleString()}</span>
                            <span className="order-price-unit">/ {getUnitDisplay()}</span>
                        </div>
                    </div>

                    {/* Helpers indicator (if assigned) */}
                    {booking.assignedHelpers && booking.assignedHelpers.length > 0 && (
                        <div className="order-helpers-strip">
                            <TeamOutlined className="order-helpers-icon" />
                            <span>{booking.assignedHelpers.length} Specialist{booking.assignedHelpers.length > 1 ? 's' : ''} Assigned</span>
                        </div>
                    )}

                    {/* Bottom Inquiry Notice for inquiry services without a total amount */}
                    {isInquiry && (
                        <div className="order-inquiry-bottom-banner">
                            <div className="order-inquiry-header-row">
                                <div className="order-inquiry-badge-tag">
                                    <QuestionCircleOutlined className="order-inquiry-icon" />
                                    <span>Inquiry Service</span>
                                </div>
                                <span className="order-inquiry-no-amount-tag">No Total Amount</span>
                            </div>
                            <p className="order-inquiry-desc">
                                This is an inquiry service without a fixed total amount. Final pricing will be confirmed after requirement discussion.
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer Action Buttons */}
                <div className="order-card-footer">
                    <button
                        type="button"
                        className="order-btn-view"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleBookingClick(booking);
                        }}
                    >
                        View Details
                    </button>

                    {canCancelBooking(booking) && (
                        <button
                            type="button"
                            className="order-btn-cancel"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleCancelBooking(booking._id, booking.serviceid);
                            }}
                        >
                            Cancel
                        </button>
                    )}
                </div>
            </div>
        );
    };

    if (loading) return <Loader />;
    if (error) return <Error message={error} />;

    const activeBookings = bookings.filter(b => 
        !['completed', 'rejected', 'cancelled'].includes(b.status)
    );
    const completedBookings = bookings.filter(b => b.status === 'completed');
    const inquiryBookings = bookings.filter(b => b.status === 'inquiry');
    const cancelledBookings = bookings.filter(b => ['rejected', 'cancelled'].includes(b.status));

    // Filter by tab
    const getFilteredByTab = () => {
        if (activeTab === 'active') return activeBookings;
        if (activeTab === 'completed') return completedBookings;
        if (activeTab === 'inquiry') return inquiryBookings;
        if (activeTab === 'cancelled') return cancelledBookings;
        return bookings;
    };

    // Filter by search query
    const displayedBookings = getFilteredByTab().filter(b => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
            (b.service && b.service.toLowerCase().includes(q)) ||
            (b._id && b._id.toLowerCase().includes(q))
        );
    });

    return (
        <div className="myorders-page">
            <Navbar />

            <div className="myorders-container">
                {/* Hero / Header Card with Live Stats */}
                <div className="myorders-hero">
                    <div className="myorders-title-row">
                        <div className="myorders-title-box">
                            <div className="myorders-title-icon">
                                <ShoppingOutlined />
                            </div>
                            <div>
                                <h1 className="myorders-title">My Bookings & Orders</h1>
                                <p className="myorders-subtitle">
                                    Manage your active appointments, track progress, and review past service history
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="myorders-stats-grid">
                        <div className="myorders-stat-card">
                            <span className="myorders-stat-label">Total Bookings</span>
                            <span className="myorders-stat-val">{bookings.length}</span>
                        </div>
                        <div className="myorders-stat-card">
                            <span className="myorders-stat-label" style={{ color: '#2563eb' }}>Active</span>
                            <span className="myorders-stat-val" style={{ color: '#2563eb' }}>{activeBookings.length}</span>
                        </div>
                        <div className="myorders-stat-card">
                            <span className="myorders-stat-label" style={{ color: '#059669' }}>Completed</span>
                            <span className="myorders-stat-val" style={{ color: '#059669' }}>{completedBookings.length}</span>
                        </div>
                        <div className="myorders-stat-card">
                            <span className="myorders-stat-label" style={{ color: '#7c3aed' }}>Inquiries</span>
                            <span className="myorders-stat-val" style={{ color: '#7c3aed' }}>{inquiryBookings.length}</span>
                        </div>
                    </div>
                </div>

                {/* Toolbar: Filter Tabs & Search */}
                {bookings.length > 0 && (
                    <div className="myorders-toolbar">
                        <div className="myorders-filter-tabs">
                            <button
                                className={`myorders-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
                                onClick={() => setActiveTab('all')}
                            >
                                <AppstoreOutlined /> All
                                <span className="myorders-tab-badge">{bookings.length}</span>
                            </button>
                            <button
                                className={`myorders-tab-btn ${activeTab === 'active' ? 'active' : ''}`}
                                onClick={() => setActiveTab('active')}
                            >
                                Active
                                <span className="myorders-tab-badge">{activeBookings.length}</span>
                            </button>
                            <button
                                className={`myorders-tab-btn ${activeTab === 'completed' ? 'active' : ''}`}
                                onClick={() => setActiveTab('completed')}
                            >
                                Completed
                                <span className="myorders-tab-badge">{completedBookings.length}</span>
                            </button>
                            {inquiryBookings.length > 0 && (
                                <button
                                    className={`myorders-tab-btn ${activeTab === 'inquiry' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('inquiry')}
                                >
                                    Inquiries
                                    <span className="myorders-tab-badge">{inquiryBookings.length}</span>
                                </button>
                            )}
                            {cancelledBookings.length > 0 && (
                                <button
                                    className={`myorders-tab-btn ${activeTab === 'cancelled' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('cancelled')}
                                >
                                    Cancelled
                                    <span className="myorders-tab-badge">{cancelledBookings.length}</span>
                                </button>
                            )}
                        </div>

                        <div className="myorders-search-box">
                            <SearchOutlined className="myorders-search-icon" />
                            <input
                                type="text"
                                className="myorders-search-input"
                                placeholder="Search by service or booking ID..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                )}

                {/* Orders Cards Grid */}
                {displayedBookings.length > 0 ? (
                    <div className="myorders-grid">
                        {displayedBookings.map(booking => renderBookingCard(booking))}
                    </div>
                ) : bookings.length > 0 ? (
                    <div className="myorders-empty-state">
                        <SearchOutlined className="myorders-empty-icon" />
                        <h3 className="myorders-empty-title">No matching bookings found</h3>
                        <p className="myorders-empty-text">
                            Try clearing your search query or switching to another tab.
                        </p>
                        <Button onClick={() => { setSearchQuery(''); setActiveTab('all'); }}>
                            Reset Filters
                        </Button>
                    </div>
                ) : (
                    <div className="myorders-empty-state">
                        <ShoppingOutlined className="myorders-empty-icon" />
                        <h3 className="myorders-empty-title">No bookings yet</h3>
                        <p className="myorders-empty-text">
                            You haven't made any service bookings yet. Explore verified professionals and book your first service today!
                        </p>
                        <a href="/home" className="myorders-empty-btn">
                            Browse Services
                        </a>
                    </div>
                )}

                {/* Booking Details Modal */}
                {renderBookingDetailsModal()}
            </div>
        </div>
    );
};

export default MyOrders;

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

    const handleCancelBooking = async (bookingId, serviceId) => {
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
            }
            return "Date not specified";
        };

        const formatTimeSlots = () => {
            if (selectedBooking.slots && selectedBooking.slots.length > 0) {
                return selectedBooking.slots.map(slot => 
                    typeof slot === 'object' ? slot.slot : slot
                ).join(', ');
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

        const isInquiry = selectedBooking.status === 'inquiry';
        const bookingType = selectedBooking.bookingType || selectedBooking.type || 'standard';

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
                    selectedBooking.status !== "confirmed" && 
                    selectedBooking.status !== "rejected" && 
                    selectedBooking.status !== "completed" &&
                    selectedBooking.status !== "inquiry" && (
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
                width={window.innerWidth < 600 ? "95%" : 760}
                style={{ top: 20 }}
            >
                <div style={{ 
                    background: isInquiry ? 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)' : 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                    color: 'white',
                    padding: '20px 24px',
                    borderRadius: '12px',
                    marginBottom: '20px'
                }}>
                    <Title level={3} style={{ color: 'white', margin: 0, fontSize: '20px' }}>
                        {selectedBooking.service}
                    </Title>
                    <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px' }}>
                        Booking ID: {selectedBooking._id}
                    </Text>
                </div>

                <Descriptions bordered column={{ xs: 1, sm: 2 }} size="middle">
                    <Descriptions.Item label="Status" span={2}>
                        {renderBookingStatus(selectedBooking.status)}
                    </Descriptions.Item>

                    <Descriptions.Item label="Booking Type" span={2}>
                        {renderBookingType(bookingType)}
                    </Descriptions.Item>
                    
                    {!isInquiry && (
                        <Descriptions.Item label="Total Amount">
                            <Text strong style={{ fontSize: '18px', color: '#2563eb' }}>
                                ₹{selectedBooking.totalAmount?.toFixed(2) || 0}
                            </Text>
                        </Descriptions.Item>
                    )}

                    {isInquiry && (
                        <Descriptions.Item label="Status Note" span={2}>
                            <Alert
                                message="Inquiry Request"
                                description="The service provider will review your requirements and provide pricing and availability details."
                                type="info"
                                showIcon
                                icon={<QuestionCircleOutlined />}
                            />
                        </Descriptions.Item>
                    )}

                    {(!isInquiry || (selectedBooking.unit && selectedBooking.quantity)) && (
                        <>
                            <Descriptions.Item label="Unit">
                                {getUnitDisplay()}
                            </Descriptions.Item>
                            
                            <Descriptions.Item label="Quantity">
                                {selectedBooking.quantity || 1}
                            </Descriptions.Item>
                        </>
                    )}

                    <Descriptions.Item label="Service Date" span={2}>
                        <Space direction="vertical" size="small">
                            <div>
                                <CalendarOutlined style={{ marginRight: '8px', color: '#2563eb' }} />
                                {formatDateRange()}
                            </div>
                            {selectedBooking.daysCount > 1 && (
                                <Text type="secondary">
                                    Duration: {selectedBooking.daysCount} days
                                </Text>
                            )}
                        </Space>
                    </Descriptions.Item>

                    {formatTimeSlots() && (
                        <Descriptions.Item label="Time Slots" span={2}>
                            <ClockCircleOutlined style={{ marginRight: '8px', color: '#2563eb' }} />
                            {formatTimeSlots()}
                        </Descriptions.Item>
                    )}

                    <Descriptions.Item label="Customer">
                        <Space>
                            <UserOutlined />
                            {selectedBooking.name}
                        </Space>
                    </Descriptions.Item>
                    
                    <Descriptions.Item label="Phone">
                        <Space>
                            <PhoneOutlined />
                            {selectedBooking.phone}
                        </Space>
                    </Descriptions.Item>

                    {selectedBooking.email && (
                        <Descriptions.Item label="Email" span={2}>
                            <Space>
                                <MailOutlined />
                                {selectedBooking.email}
                            </Space>
                        </Descriptions.Item>
                    )}

                    {selectedBooking.description && (
                        <Descriptions.Item label="Description" span={2}>
                            <Paragraph style={{ margin: 0, color: '#334155' }}>
                                {selectedBooking.description}
                            </Paragraph>
                        </Descriptions.Item>
                    )}

                    {selectedBooking.locationType === 'Simple' && selectedBooking.address && (
                        <Descriptions.Item label="Address" span={2}>
                            <EnvironmentOutlined style={{ marginRight: '8px', color: '#2563eb' }} />
                            {selectedBooking.address}
                        </Descriptions.Item>
                    )}

                    {selectedBooking.locationType === 'Rental' && (
                        <>
                            <Descriptions.Item label="Pickup Address" span={2}>
                                <EnvironmentOutlined style={{ marginRight: '8px', color: '#2563eb' }} />
                                {selectedBooking.pickupAddress}
                            </Descriptions.Item>
                            <Descriptions.Item label="Drop Address" span={2}>
                                <EnvironmentOutlined style={{ marginRight: '8px', color: '#dc2626' }} />
                                {selectedBooking.dropAddress}
                            </Descriptions.Item>
                            <Descriptions.Item label="Return Trip" span={2}>
                                {selectedBooking.returnTrip ? 'Yes' : 'No'}
                            </Descriptions.Item>
                        </>
                    )}

                    {selectedBooking.optionalInputs && selectedBooking.optionalInputs.length > 0 && (
                        <Descriptions.Item label="Optional Services" span={2}>
                            <div style={{ width: '100%' }}>
                                {selectedBooking.optionalInputs.map((input, index) => (
                                    <div key={index} style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        padding: '8px 0',
                                        borderBottom: index < selectedBooking.optionalInputs.length - 1 ? '1px solid #e2e8f0' : 'none'
                                    }}>
                                        <span>
                                            <strong>{input.name}:</strong> {input.count} x ₹{input.price}
                                            {input.unit && ` /${input.unit.replace('per-', '')}`}
                                        </span>
                                        <span style={{ color: '#2563eb', fontWeight: 'bold' }}>
                                            ₹{(input.count * input.price * (selectedBooking.daysCount || 1)).toFixed(2)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </Descriptions.Item>
                    )}

                    {selectedBooking.extraInputs && selectedBooking.extraInputs.length > 0 && (
                        <Descriptions.Item label="Additional Services" span={2}>
                            <div style={{ width: '100%' }}>
                                {selectedBooking.extraInputs.map((input, index) => (
                                    <div key={index} style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        padding: '8px 0',
                                        borderBottom: index < selectedBooking.extraInputs.length - 1 ? '1px solid #e2e8f0' : 'none'
                                    }}>
                                        <span>
                                            <strong>{input.name}</strong>
                                            {input.unit && <span style={{ color: '#64748b' }}> ({input.unit.replace('per-', '')})</span>}
                                        </span>
                                        <span style={{ color: '#ea580c', fontWeight: 'bold' }}>
                                            ₹{input.price}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </Descriptions.Item>
                    )}
                </Descriptions>

                {!isInquiry && selectedBooking.totalAmount > 0 && (
                    <>
                        <Divider style={{ margin: '18px 0' }} />
                        <div style={{
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            padding: '16px',
                            borderRadius: '10px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                                <span style={{ color: '#64748b' }}>Base Price:</span>
                                <span>₹{selectedBooking.rentperday || 0} / {getUnitDisplay()}</span>
                            </div>
                            {selectedBooking.quantity > 1 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                                    <span style={{ color: '#64748b' }}>Quantity:</span>
                                    <span>× {selectedBooking.quantity}</span>
                                </div>
                            )}
                            {selectedBooking.daysCount > 1 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                                    <span style={{ color: '#64748b' }}>Duration:</span>
                                    <span>{selectedBooking.daysCount} days</span>
                                </div>
                            )}
                            <Divider style={{ margin: '10px 0' }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '17px', fontWeight: 'bold' }}>
                                <span>Total Amount:</span>
                                <span style={{ color: '#2563eb' }}>₹{selectedBooking.totalAmount?.toFixed(2) || 0}</span>
                            </div>
                        </div>
                    </>
                )}

                {selectedBooking.assignedHelpers && selectedBooking.assignedHelpers.length > 0 && (
                    <>
                        <Divider style={{ margin: '18px 0' }} />
                        <Title level={4} style={{ marginBottom: '14px', fontSize: '16px' }}>
                            <TeamOutlined style={{ marginRight: '8px', color: '#059669' }} />
                            Assigned Specialists ({selectedBooking.assignedHelpers.length})
                        </Title>
                        <List
                            grid={{
                                gutter: 16,
                                xs: 1,
                                sm: 2,
                                md: 2,
                                lg: 2,
                                xl: 2,
                            }}
                            dataSource={selectedBooking.assignedHelpers}
                            renderItem={renderHelperItem}
                        />
                    </>
                )}
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
            }
            return "Date TBD";
        };

        const formatTimeSlots = () => {
            if (booking.slots && booking.slots.length > 0) {
                const slots = booking.slots.map(slot => typeof slot === 'object' ? slot.slot : slot);
                if (slots.length === 1) return slots[0];
                if (slots.length > 1) return `${slots[0]} +${slots.length - 1}`;
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

        const isInquiry = booking.status === 'inquiry';
        const bookingType = booking.bookingType || booking.type || 'standard';

        const getAccentColor = () => {
            if (bookingType === 'automatic') return '#2563eb';
            if (bookingType === 'manual') return '#f59e0b';
            if (bookingType === 'inquiry') return '#7c3aed';
            return '#10b981';
        };

        return (
            <div
                key={booking._id}
                className="order-card"
                onClick={() => handleBookingClick(booking)}
            >
                <div className="order-card-accent" style={{ background: getAccentColor() }} />

                <div className="order-card-body">
                    {/* Header */}
                    <div className="order-card-header">
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <h3 className="order-card-service-name">
                                {booking.service}
                            </h3>
                            <div className="order-card-type-row">
                                {renderBookingType(bookingType)}
                            </div>
                        </div>
                        <div>
                            {renderBookingStatus(booking.status)}
                        </div>
                    </div>

                    {/* Schedule Box */}
                    <div className="order-meta-box">
                        <div className="order-meta-item">
                            <CalendarOutlined className="order-meta-icon" />
                            <span>{getDateDisplay()}</span>
                        </div>
                        {formatTimeSlots() && (
                            <div className="order-meta-item">
                                <ClockCircleOutlined className="order-meta-icon" />
                                <span>{formatTimeSlots()}</span>
                            </div>
                        )}
                    </div>

                    {/* Price or Inquiry Note */}
                    {!isInquiry && booking.totalAmount > 0 ? (
                        <div className="order-price-strip">
                            <span className="order-price-label">Total Amount</span>
                            <div>
                                <span className="order-price-val">₹{booking.totalAmount?.toFixed(2) || 0}</span>
                                <span className="order-price-unit">/ {getUnitDisplay()}</span>
                            </div>
                        </div>
                    ) : isInquiry ? (
                        <div style={{
                            padding: '8px 12px',
                            background: '#f5f3ff',
                            borderRadius: '8px',
                            border: '1px solid #ddd6fe',
                            fontSize: '12px',
                            color: '#7c3aed',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}>
                            <QuestionCircleOutlined />
                            <span>Inquiry awaiting quote</span>
                        </div>
                    ) : null}

                    {/* Helpers indicator */}
                    {booking.assignedHelpers && booking.assignedHelpers.length > 0 && (
                        <div className="order-helpers-strip">
                            <TeamOutlined />
                            <span>{booking.assignedHelpers.length} Specialist(s) Assigned</span>
                        </div>
                    )}
                </div>

                {/* Footer Action Buttons */}
                <div className="order-card-footer">
                    <button
                        className="order-btn-view"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleBookingClick(booking);
                        }}
                    >
                        View Details
                    </button>

                    {booking.status !== "confirmed" && 
                     booking.status !== "rejected" && 
                     booking.status !== "completed" &&
                     booking.status !== "inquiry" && (
                        <button
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

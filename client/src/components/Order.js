import React, { useEffect, useState } from "react";
import { Tag, Typography, Card, Button, List, Alert, Modal, Descriptions, Divider, Space, Badge, Row, Col, Tooltip } from "antd";
import axios from "axios";
import moment from "moment";
import { message } from "antd";
import { 
    CalendarOutlined, 
    DollarOutlined, 
    TagOutlined, 
    TeamOutlined,
    EnvironmentOutlined,
    ClockCircleOutlined,
    UserOutlined,
    PhoneOutlined,
    FileTextOutlined,
    ShoppingOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    LoadingOutlined,
    WarningOutlined,
    QuestionCircleOutlined,
    RobotOutlined,
    UserOutlined as UserIcon,
    MailOutlined
} from '@ant-design/icons';
import Error from "../components/Error";
import Loader from "../components/Loader";

const { Title, Text, Paragraph } = Typography;

const MyOrders = () => {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expandedHelper, setExpandedHelper] = useState(null);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [hoveredCard, setHoveredCard] = useState(null);

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
            confirmed: { color: "#52c41a", bgColor: "#f6ffed", borderColor: "#b7eb8f", icon: <CheckCircleOutlined />, text: "Confirmed" },
            rejected: { color: "#ff4d4f", bgColor: "#fff2f0", borderColor: "#ffccc7", icon: <CloseCircleOutlined />, text: "Rejected" },
            booked: { color: "#1890ff", bgColor: "#e6f7ff", borderColor: "#91d5ff", icon: <LoadingOutlined />, text: "Booked" },
            pending: { color: "#faad14", bgColor: "#fffbe6", borderColor: "#ffe58f", icon: <WarningOutlined />, text: "Pending" },
            assigned: { color: "#13c2c2", bgColor: "#e6fffb", borderColor: "#87e8de", icon: <TeamOutlined />, text: "Assigned" },
            "in-progress": { color: "#fa8c16", bgColor: "#fff7e6", borderColor: "#ffd591", icon: <LoadingOutlined />, text: "In Progress" },
            completed: { color: "#52c41a", bgColor: "#f6ffed", borderColor: "#b7eb8f", icon: <CheckCircleOutlined />, text: "Completed" },
            inquiry: { color: "#722ed1", bgColor: "#f9f0ff", borderColor: "#d3adf7", icon: <QuestionCircleOutlined />, text: "Inquiry" },
            default: { color: "#8c8c8c", bgColor: "#fafafa", borderColor: "#d9d9d9", icon: <LoadingOutlined />, text: status || "Processing" }
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
                fontWeight: '500'
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
            <Tag color={config.color} icon={config.icon} style={{ margin: 0 }}>
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
                border: '1px solid #f0f0f0',
                borderRadius: '8px',
                marginBottom: '8px',
                background: expandedHelper === helper._id ? '#f9f9f9' : 'white',
                transition: 'all 0.3s ease'
            }}
        >
            <div style={{ width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {helper.photo ? (
                        <img
                            src={helper.photo}
                            alt={helper.name}
                            style={{
                                width: '50px',
                                height: '50px',
                                borderRadius: '50%',
                                objectFit: 'cover',
                                border: '2px solid #1677ff'
                            }}
                        />
                    ) : (
                        <div style={{
                            width: '50px',
                            height: '50px',
                            borderRadius: '50%',
                            backgroundColor: '#f0f0f0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '2px solid #1677ff',
                            fontSize: '20px',
                            fontWeight: 'bold',
                            color: '#1677ff'
                        }}>
                            {helper.name ? helper.name.charAt(0).toUpperCase() : '?'}
                        </div>
                    )}
                    
                    <div style={{ flex: 1 }}>
                        <Text strong style={{ fontSize: '15px', display: 'block' }}>
                            {helper.name || 'Unknown Helper'}
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
                        borderTop: '1px solid #f0f0f0'
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
                            <Text style={{ display: 'block', fontSize: '13px' }}>
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
            if (selectedBooking.customUnit) return selectedBooking.customUnit;
            const unit = selectedBooking.unit || 'per day';
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
                        <ShoppingOutlined style={{ color: '#1677ff', fontSize: '20px' }} />
                        <span>Booking Details</span>
                    </div>
                }
                open={modalVisible}
                onCancel={handleModalClose}
                footer={[
                    <Button key="close" onClick={handleModalClose}>
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
                            onClick={() => {
                                handleCancelBooking(selectedBooking._id, selectedBooking.serviceid);
                                handleModalClose();
                            }}
                        >
                            Cancel Booking
                        </Button>
                    )
                ]}
                width={window.innerWidth < 600 ? "95%" : 800}
                style={{ top: 20 }}
            >
                <div style={{ 
                    background: isInquiry ? 'linear-gradient(135deg, #722ed1 0%, #b37feb 100%)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    padding: '20px',
                    borderRadius: '12px',
                    marginBottom: '20px'
                }}>
                    <Title level={3} style={{ color: 'white', margin: 0 }}>
                        {selectedBooking.service}
                    </Title>
                    <Text style={{ color: 'rgba(255,255,255,0.9)' }}>
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
                    
                    {/* Show Total Amount only for non-inquiry bookings */}
                    {!isInquiry && (
                        <Descriptions.Item label="Total Amount">
                            <Text strong style={{ fontSize: '16px', color: '#f5222d' }}>
                                ₹{selectedBooking.totalAmount?.toFixed(2) || 0}
                            </Text>
                        </Descriptions.Item>
                    )}

                    {isInquiry && (
                        <Descriptions.Item label="Status Note" span={2}>
                            <Alert
                                message="This is an inquiry booking"
                                description="The service provider will get back to you with pricing and availability details."
                                type="info"
                                showIcon
                                icon={<QuestionCircleOutlined />}
                            />
                        </Descriptions.Item>
                    )}

                    {/* Show Unit and Quantity only for non-inquiry or if data exists */}
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
                                <CalendarOutlined style={{ marginRight: '8px', color: '#1677ff' }} />
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
                            <ClockCircleOutlined style={{ marginRight: '8px', color: '#1677ff' }} />
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
                            <Paragraph style={{ margin: 0 }}>
                                {selectedBooking.description}
                            </Paragraph>
                        </Descriptions.Item>
                    )}

                    {selectedBooking.locationType === 'Simple' && selectedBooking.address && (
                        <Descriptions.Item label="Address" span={2}>
                            <EnvironmentOutlined style={{ marginRight: '8px', color: '#1677ff' }} />
                            {selectedBooking.address}
                        </Descriptions.Item>
                    )}

                    {selectedBooking.locationType === 'Rental' && (
                        <>
                            <Descriptions.Item label="Pickup Address" span={2}>
                                <EnvironmentOutlined style={{ marginRight: '8px', color: '#1677ff' }} />
                                {selectedBooking.pickupAddress}
                            </Descriptions.Item>
                            <Descriptions.Item label="Drop Address" span={2}>
                                <EnvironmentOutlined style={{ marginRight: '8px', color: '#f5222d' }} />
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
                                        borderBottom: index < selectedBooking.optionalInputs.length - 1 ? '1px solid #f0f0f0' : 'none'
                                    }}>
                                        <span>
                                            <strong>{input.name}:</strong> {input.count} x ₹{input.price}
                                            {input.unit && ` /${input.unit.replace('per-', '')}`}
                                        </span>
                                        <span style={{ color: '#1677ff', fontWeight: 'bold' }}>
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
                                        borderBottom: index < selectedBooking.extraInputs.length - 1 ? '1px solid #f0f0f0' : 'none'
                                    }}>
                                        <span>
                                            <strong>{input.name}</strong>
                                            {input.unit && <span style={{ color: '#666' }}> ({input.unit.replace('per-', '')})</span>}
                                        </span>
                                        <span style={{ color: '#f57c00', fontWeight: 'bold' }}>
                                            ₹{input.price}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </Descriptions.Item>
                    )}
                </Descriptions>

                {/* Show Price Summary only for non-inquiry bookings */}
                {!isInquiry && selectedBooking.totalAmount > 0 && (
                    <>
                        <Divider />
                        <div style={{
                            background: '#f8f9fa',
                            padding: '16px',
                            borderRadius: '8px',
                            marginTop: '16px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                <span>Base Price:</span>
                                <span>₹{selectedBooking.rentperday || 0} / {getUnitDisplay()}</span>
                            </div>
                            {selectedBooking.quantity > 1 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                    <span>Quantity:</span>
                                    <span>× {selectedBooking.quantity}</span>
                                </div>
                            )}
                            {selectedBooking.daysCount > 1 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                    <span>Duration:</span>
                                    <span>{selectedBooking.daysCount} days</span>
                                </div>
                            )}
                            <Divider style={{ margin: '12px 0' }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 'bold' }}>
                                <span>Total Amount:</span>
                                <span style={{ color: '#f5222d' }}>₹{selectedBooking.totalAmount?.toFixed(2) || 0}</span>
                            </div>
                        </div>
                    </>
                )}

                {selectedBooking.assignedHelpers && selectedBooking.assignedHelpers.length > 0 && (
                    <>
                        <Divider />
                        <Title level={4} style={{ marginBottom: '16px' }}>
                            <TeamOutlined style={{ marginRight: '8px' }} />
                            Assigned Helpers ({selectedBooking.assignedHelpers.length})
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
            if (booking.customUnit) return booking.customUnit;
            const unit = booking.unit || 'per day';
            if (unit.startsWith('per-')) {
                return unit.replace('per-', '').replace(/-/g, ' ');
            }
            return unit;
        };

        const isActive = !['completed', 'rejected', 'cancelled'].includes(booking.status);
        const isInquiry = booking.status === 'inquiry';
        const bookingType = booking.bookingType || booking.type || 'standard';
        const isHovered = hoveredCard === booking._id;

        // Determine border color based on booking type and hover state
        const getBorderColor = () => {
            if (isHovered) {
                if (bookingType === 'automatic') return '#1890ff';
                if (bookingType === 'manual') return '#fa8c16';
                if (bookingType === 'inquiry') return '#722ed1';
                return '#1677ff';
            }
            return '#f0f0f0';
        };

        // Determine gradient color based on booking type
        const getGradientColor = () => {
            if (bookingType === 'automatic') return 'linear-gradient(90deg, #1890ff, #69c0ff)';
            if (bookingType === 'manual') return 'linear-gradient(90deg, #fa8c16, #ffc069)';
            if (bookingType === 'inquiry') return 'linear-gradient(90deg, #722ed1, #b37feb)';
            return 'linear-gradient(90deg, #1677ff, #69c0ff)';
        };

        return (
            <Card
                key={booking._id}
                hoverable
                style={{
                    borderRadius: "16px",
                    border: `1px solid ${getBorderColor()}`,
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    cursor: "pointer",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    background: isActive ? 'white' : '#fafafa',
                    position: 'relative',
                    overflow: 'hidden'
                }}
                onMouseEnter={() => setHoveredCard(booking._id)}
                onMouseLeave={() => setHoveredCard(null)}
                onClick={() => handleBookingClick(booking)}
                bodyStyle={{ padding: '20px', flex: 1 }}
            >
                {/* Gradient Border Top based on booking type */}
                {isActive && (
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '4px',
                        background: getGradientColor()
                    }} />
                )}

                {/* Header Section */}
                <div style={{ marginBottom: '16px' }}>
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'flex-start',
                        marginBottom: '12px',
                        flexWrap: 'wrap',
                        gap: '8px'
                    }}>
                        <div style={{ flex: 1 }}>
                            <Text strong style={{ 
                                fontSize: '18px', 
                                display: 'block',
                                marginBottom: '8px',
                                color: '#1f1f1f'
                            }}>
                                {booking.service}
                            </Text>
                            {/* Booking Type Badge */}
                            <div style={{ marginBottom: '8px' }}>
                                {renderBookingType(bookingType)}
                            </div>
                        </div>
                        <div>
                            {renderBookingStatus(booking.status)}
                        </div>
                    </div>
                </div>

                {/* Divider with gradient based on booking type */}
                <div style={{ 
                    height: '1px', 
                    background: `linear-gradient(90deg, #f0f0f0, ${bookingType === 'automatic' ? '#1890ff' : bookingType === 'manual' ? '#fa8c16' : bookingType === 'inquiry' ? '#722ed1' : '#1677ff'}, #f0f0f0)`,
                    margin: '12px 0'
                }} />

                {/* Details Section */}
                <div style={{ flex: 1 }}>
                    {/* Date */}
                    <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px',
                        marginBottom: '12px',
                        padding: '8px 0'
                    }}>
                        <CalendarOutlined style={{ 
                            color: bookingType === 'automatic' ? '#1890ff' : bookingType === 'manual' ? '#fa8c16' : bookingType === 'inquiry' ? '#722ed1' : '#1677ff', 
                            fontSize: '16px',
                            width: '20px'
                        }} />
                        <Text style={{ fontSize: '14px', color: '#595959' }}>
                            {getDateDisplay()}
                        </Text>
                    </div>

                    {/* Time Slots */}
                    {formatTimeSlots() && (
                        <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '12px',
                            marginBottom: '12px',
                            padding: '8px 0'
                        }}>
                            <ClockCircleOutlined style={{ 
                                color: bookingType === 'automatic' ? '#1890ff' : bookingType === 'manual' ? '#fa8c16' : bookingType === 'inquiry' ? '#722ed1' : '#1677ff', 
                                fontSize: '16px',
                                width: '20px'
                            }} />
                            <Text style={{ fontSize: '14px', color: '#595959' }}>
                                {formatTimeSlots()}
                            </Text>
                        </div>
                    )}

                    {/* Price - Show only for non-inquiry bookings with totalAmount */}
                    {!isInquiry && booking.totalAmount > 0 && (
                        <div style={{ 
                            display: 'flex', 
                            alignItems: 'baseline', 
                            gap: '8px',
                            marginBottom: '12px',
                            background: '#f8f9fa',
                            borderRadius: '12px',
                            padding: '8px 12px',
                            marginTop: '8px'
                        }}>
                            <DollarOutlined style={{ color: '#f5222d', fontSize: '16px' }} />
                            <div>
                                <Text strong style={{ 
                                    fontSize: '20px', 
                                    color: '#f5222d',
                                    fontWeight: 'bold'
                                }}>
                                    ₹{booking.totalAmount?.toFixed(2) || 0}
                                </Text>
                                <Text type="secondary" style={{ fontSize: '12px', marginLeft: '8px' }}>
                                    / {getUnitDisplay()}
                                </Text>
                                {booking.quantity > 1 && (
                                    <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>
                                        × {booking.quantity} {booking.quantity > 1 ? 'units' : 'unit'}
                                    </Text>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Inquiry Message */}
                    {isInquiry && (
                        <div style={{ 
                            marginBottom: '12px',
                            padding: '12px',
                            background: '#f9f0ff',
                            borderRadius: '12px',
                            border: '1px solid #d3adf7'
                        }}>
                            <Space>
                                <QuestionCircleOutlined style={{ color: '#722ed1' }} />
                                <Text style={{ fontSize: '13px', color: '#722ed1' }}>
                                    Awaiting provider response
                                </Text>
                            </Space>
                        </div>
                    )}

                    {/* Manual Booking Note */}
                    {bookingType === 'manual' && !isInquiry && (
                        <div style={{ 
                            marginBottom: '12px',
                            padding: '8px 12px',
                            background: '#fff7e6',
                            borderRadius: '8px',
                            border: '1px solid #ffd591'
                        }}>
                            <Space>
                                <UserIcon style={{ color: '#fa8c16' }} />
                                <Text style={{ fontSize: '12px', color: '#fa8c16' }}>
                                    Manual booking - Pending admin approval
                                </Text>
                            </Space>
                        </div>
                    )}

                    {/* Automatic Booking Note */}
                    {bookingType === 'automatic' && !isInquiry && (
                        <div style={{ 
                            marginBottom: '12px',
                            padding: '8px 12px',
                            background: '#e6f7ff',
                            borderRadius: '8px',
                            border: '1px solid #91d5ff'
                        }}>
                            <Space>
                                <RobotOutlined style={{ color: '#1890ff' }} />
                                <Text style={{ fontSize: '12px', color: '#1890ff' }}>
                                    Automatic booking - Instant confirmation
                                </Text>
                            </Space>
                        </div>
                    )}

                    {/* Optional Services Badge */}
                    {booking.optionalInputs && booking.optionalInputs.length > 0 && (
                        <div style={{ marginBottom: '12px' }}>
                            <Tag icon={<TagOutlined />} color={bookingType === 'inquiry' ? "purple" : bookingType === 'automatic' ? "blue" : "cyan"} style={{ marginRight: '4px' }}>
                                {booking.optionalInputs.length} Optional Service(s)
                            </Tag>
                        </div>
                    )}

                    {/* Helpers Count */}
                    {booking.assignedHelpers && booking.assignedHelpers.length > 0 && (
                        <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px',
                            marginTop: '8px'
                        }}>
                            <TeamOutlined style={{ color: '#52c41a', fontSize: '14px' }} />
                            <Text type="secondary" style={{ fontSize: '13px' }}>
                                {booking.assignedHelpers.length} Helper(s) Assigned
                            </Text>
                        </div>
                    )}
                </div>

                {/* Action Buttons - Hide cancel for inquiry and manual bookings appropriately */}
                {booking.status !== "confirmed" && 
                 booking.status !== "rejected" && 
                 booking.status !== "completed" &&
                 booking.status !== "inquiry" && (
                    <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #f0f0f0' }}>
                        <Button
                            type="text"
                            danger
                            size="small"
                            block
                            onClick={(e) => {
                                e.stopPropagation();
                                handleCancelBooking(booking._id, booking.serviceid);
                            }}
                            style={{ borderRadius: '20px' }}
                        >
                            Cancel Booking
                        </Button>
                    </div>
                )}

                {/* Special note for inquiry bookings */}
                {isInquiry && (
                    <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #f0f0f0' }}>
                        <Text type="secondary" style={{ fontSize: '12px', display: 'block', textAlign: 'center' }}>
                            <QuestionCircleOutlined /> Inquiry sent to provider
                        </Text>
                    </div>
                )}

                {/* Special note for manual bookings */}
                {bookingType === 'manual' && !isInquiry && booking.status === 'pending' && (
                    <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #f0f0f0' }}>
                        <Text type="secondary" style={{ fontSize: '12px', display: 'block', textAlign: 'center' }}>
                            <UserIcon /> Awaiting admin approval
                        </Text>
                    </div>
                )}
            </Card>
        );
    };

    if (loading) return <Loader />;
    if (error) return <Error message={error} />;

    const activeBookings = bookings.filter(b => 
        !['completed', 'rejected', 'cancelled'].includes(b.status)
    );
    const pastBookings = bookings.filter(b => 
        ['completed', 'rejected', 'cancelled'].includes(b.status)
    );

    return (
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px 20px' }}>
            {/* Header */}
            <div style={{ marginBottom: '32px', textAlign: 'center' }}>
                <Title level={2} style={{ 
                    marginBottom: '12px',
                    background: 'linear-gradient(135deg, #1677ff 0%, #69c0ff 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                }}>
                    My Bookings
                </Title>
                <div style={{ 
                    width: '80px', 
                    height: '4px', 
                    background: 'linear-gradient(90deg, #1677ff, #69c0ff)', 
                    borderRadius: '2px',
                    margin: '0 auto 16px auto'
                }} />
                <Text type="secondary" style={{ fontSize: '16px' }}>
                    Manage and track all your service bookings
                </Text>
            </div>

            {/* Active Bookings Section */}
            {activeBookings.length > 0 && (
                <div style={{ marginBottom: '48px' }}>
                    <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px',
                        marginBottom: '24px'
                    }}>
                        <div style={{
                            width: '4px',
                            height: '24px',
                            background: '#1677ff',
                            borderRadius: '2px'
                        }} />
                        <Title level={4} style={{ margin: 0 }}>
                            Active Bookings
                        </Title>
                        <Badge count={activeBookings.length} style={{ backgroundColor: '#1677ff' }} />
                    </div>
                    <Row gutter={[24, 24]}>
                        {activeBookings.map(booking => (
                            <Col xs={24} sm={12} lg={8} xl={6} key={booking._id}>
                                {renderBookingCard(booking)}
                            </Col>
                        ))}
                    </Row>
                </div>
            )}

            {/* Past Bookings Section */}
            {pastBookings.length > 0 && (
                <div>
                    <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px',
                        marginBottom: '24px'
                    }}>
                        <div style={{
                            width: '4px',
                            height: '24px',
                            background: '#8c8c8c',
                            borderRadius: '2px'
                        }} />
                        <Title level={4} style={{ margin: 0 }}>
                            Past Bookings
                        </Title>
                        <Badge count={pastBookings.length} style={{ backgroundColor: '#8c8c8c' }} />
                    </div>
                    <Row gutter={[24, 24]}>
                        {pastBookings.map(booking => (
                            <Col xs={24} sm={12} lg={8} xl={6} key={booking._id}>
                                {renderBookingCard(booking)}
                            </Col>
                        ))}
                    </Row>
                </div>
            )}

            {/* No Bookings */}
            {bookings.length === 0 && (
                <div style={{ 
                    textAlign: 'center', 
                    padding: '60px 20px',
                    background: '#fafafa',
                    borderRadius: '24px',
                    marginTop: '40px'
                }}>
                    <ShoppingOutlined style={{ fontSize: '64px', color: '#d9d9d9', marginBottom: '16px' }} />
                    <Title level={4} style={{ color: '#8c8c8c' }}>
                        No bookings found
                    </Title>
                    <Text type="secondary">
                        You haven't made any service bookings yet. Browse our services and book your first service!
                    </Text>
                    <div style={{ marginTop: '24px' }}>
                        <Button type="primary" href="/services">
                            Browse Services
                        </Button>
                    </div>
                </div>
            )}

            {/* Booking Details Modal */}
            {renderBookingDetailsModal()}
        </div>
    );
};

export default MyOrders;
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Tabs, Table, Button, Form, Input, Select, message, Tag } from "antd";

const { TabPane } = Tabs;
const { Option } = Select;


export function VendorHelperInfo({ bookingId, userId }) {  // Added userId prop
    const [activeBookingId, setActiveBookingId] = useState(bookingId);

    return (
        <div className="col-md-8 helper-management-section">
            <div className="helper-header">
                <h2 className="section-title">Helper Management</h2>
                {bookingId && (
                    <div className="booking-id-badge">
                        Assigning helpers for Booking ID: <span className="id-number">{bookingId}</span>
                    </div>
                )}
            </div>

            <div className="helper-tabs-container">
                <Tabs
                    defaultActiveKey="1"
                    className="custom-helper-tabs"
                    tabBarGutter={20}
                >
                     <TabPane
                        tab={<span className="tab-label">👥 View Helpers</span>}
                        key="1"
                        className="tab-content"
                    >
                        <ViewHelpers bookingId={activeBookingId} userId={userId} />  {/* Pass userId */}
                    </TabPane>

                    <TabPane
                        tab={<span className="tab-label">➕ Add New Helper</span>}
                        key="2"
                        className="tab-content"
                    >
                        <AddHelper userId={userId} />  {/* Pass userId */}
                    </TabPane>
                </Tabs>
            </div>
        </div>
    );
}

function ViewHelpers({ bookingId, userId }) {
    const [helperDetails, setHelperDetails] = useState([]);
    const [selectedHelpers, setSelectedHelpers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [assigning, setAssigning] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    useEffect(() => {
        fetchHelperDetails();
        
        // Add resize listener for responsive design
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [userId]);

    const fetchHelperDetails = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`/api/vendor/helpers?userid=${userId}`);
            setHelperDetails(response.data);
            setError(null);
        } catch (error) {
            setError("Failed to fetch helper details. Please try again.");
            console.error("Error fetching helper details:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleHelperSelection = (helperId) => {
        setSelectedHelpers(prev => 
            prev.includes(helperId)
                ? prev.filter(id => id !== helperId)
                : [...prev, helperId]
        );
    };

    const assignHelpersToBooking = async () => {
        if (!bookingId) {
            message.error("Invalid Booking ID. Please try again.");
            return;
        }
        if (selectedHelpers.length === 0) {
            message.warning("Please select at least one helper.");
            return;
        }

        setAssigning(true);
        try {
            const response = await axios.post("/api/bookings/assign-helpers", {
                bookingId,
                helperIds: selectedHelpers
            });
            
            message.success(`Helpers assigned successfully to booking!`);
            setSelectedHelpers([]);
        } catch (error) {
            console.error("Error assigning helpers:", error);
            message.error(error.response?.data?.message || "Failed to assign helpers.");
        } finally {
            setAssigning(false);
        }
    };

    // Mobile Card View Render
    const renderMobileCardView = () => {
        return (
            <div className="mobile-helpers-list">
                {helperDetails.map((helper, index) => (
                    <div key={helper._id} className="helper-card" style={{
                        background: "white",
                        borderRadius: "12px",
                        marginBottom: "12px",
                        padding: "16px",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                        border: selectedHelpers.includes(helper._id) ? "2px solid #1890ff" : "1px solid #e8e8e8",
                        position: "relative"
                    }}>
                        {/* Selection Checkbox */}
                        <div style={{
                            position: "absolute",
                            top: "12px",
                            right: "12px"
                        }}>
                            <input
                                type="checkbox"
                                checked={selectedHelpers.includes(helper._id)}
                                onChange={() => handleHelperSelection(helper._id)}
                                disabled={!bookingId || assigning}
                                style={{
                                    width: "20px",
                                    height: "20px",
                                    cursor: "pointer"
                                }}
                            />
                        </div>

                        {/* Helper Info */}
                        <div style={{ marginBottom: "12px", paddingRight: "32px" }}>
                            <div style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: "8px"
                            }}>
                                <h4 style={{
                                    margin: 0,
                                    fontSize: "16px",
                                    fontWeight: "bold",
                                    color: "#333"
                                }}>
                                    {helper.name}
                                </h4>
                                <Tag color={helper.isConnected ? "green" : "red"} style={{ margin: 0 }}>
                                    {helper.isConnected ? "Online" : "Offline"}
                                </Tag>
                            </div>
                            
                            <div style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "8px",
                                marginTop: "12px"
                            }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <span style={{ fontSize: "12px", color: "#666", minWidth: "60px" }}>📞 Phone:</span>
                                    <span style={{ fontSize: "14px", color: "#333" }}>{helper.phone}</span>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <span style={{ fontSize: "12px", color: "#666", minWidth: "60px" }}>✉️ Email:</span>
                                    <span style={{ fontSize: "13px", color: "#333", wordBreak: "break-all" }}>{helper.email}</span>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <span style={{ fontSize: "12px", color: "#666", minWidth: "60px" }}>🔢 Code:</span>
                                    <span style={{ fontSize: "14px", color: "#333" }}>{helper.code}</span>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <span style={{ fontSize: "12px", color: "#666", minWidth: "60px" }}>💼 Experience:</span>
                                    <span style={{ fontSize: "14px", color: "#333" }}>{helper.experience} years</span>
                                </div>
                                <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                                    <span style={{ fontSize: "12px", color: "#666", minWidth: "60px" }}>⚡ Skills:</span>
                                    <span style={{ fontSize: "14px", color: "#333", flex: 1 }}>{helper.skills}</span>
                                </div>
                            </div>
                        </div>

                        {/* Selection Indicator */}
                        {selectedHelpers.includes(helper._id) && (
                            <div style={{
                                position: "absolute",
                                top: "8px",
                                left: "8px",
                                background: "#1890ff",
                                color: "white",
                                padding: "2px 8px",
                                borderRadius: "12px",
                                fontSize: "10px",
                                fontWeight: "bold"
                            }}>
                                Selected
                            </div>
                        )}
                    </div>
                ))}
            </div>
        );
    };

    // Table Columns Configuration
    const columns = [
        {
            title: "#",
            key: "index",
            width: 60,
            render: (text, record, index) => index + 1
        },
        {
            title: "Select",
            key: "select",
            width: 70,
            render: (_, helper) => (
                <input
                    type="checkbox"
                    checked={selectedHelpers.includes(helper._id)}
                    onChange={() => handleHelperSelection(helper._id)}
                    disabled={!bookingId || assigning}
                    style={{ cursor: "pointer", width: "18px", height: "18px" }}
                />
            )
        },
        {
            title: "Name",
            dataIndex: "name",
            key: "name",
            ellipsis: true
        },
        {
            title: "Phone",
            dataIndex: "phone",
            key: "phone",
            responsive: ['md'] // Hide on mobile
        },
        {
            title: "Email",
            dataIndex: "email",
            key: "email",
            ellipsis: true,
            responsive: ['lg'] // Hide on tablet
        },
        {
            title: "Code",
            dataIndex: "code",
            key: "code",
            responsive: ['sm'] // Hide on very small screens
        },
        {
            title: "Status",
            key: "status",
            width: 100,
            render: (_, helper) => (
                <Tag color={helper.isConnected ? "green" : "red"}>
                    {helper.isConnected ? "Online" : "Offline"}
                </Tag>
            )
        },
        {
            title: "Experience",
            dataIndex: "experience",
            key: "experience",
            responsive: ['md'] // Hide on mobile
        },
        {
            title: "Skills",
            dataIndex: "skills",
            key: "skills",
            ellipsis: true,
            responsive: ['lg'] // Hide on tablet
        }
    ];

    return (
        <div style={{
            padding: isMobile ? "12px" : "20px",
            maxWidth: "1400px",
            margin: "0 auto",
            width: "100%"
        }}>
            {/* Header Section */}
            <div style={{
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                justifyContent: "space-between",
                alignItems: isMobile ? "flex-start" : "center",
                marginBottom: "20px",
                gap: isMobile ? "12px" : "0"
            }}>
                <h3 style={{
                    margin: 0,
                    fontSize: isMobile ? "18px" : "20px",
                    fontWeight: "bold",
                    color: "#333"
                }}>
                    Helper Management
                </h3>
                <div style={{
                    background: "#f0f0f0",
                    padding: "8px 16px",
                    borderRadius: "8px",
                    fontSize: isMobile ? "13px" : "14px",
                    width: isMobile ? "100%" : "auto"
                }}>
                    Booking ID: <strong style={{ color: "#1890ff" }}>{bookingId || "Not Selected"}</strong>
                </div>
            </div>

            {/* Status Messages */}
            {loading && (
                <div style={{
                    textAlign: "center",
                    padding: "40px 20px",
                    background: "#fafafa",
                    borderRadius: "8px"
                }}>
                    <div style={{
                        display: "inline-block",
                        width: "30px",
                        height: "30px",
                        border: "3px solid #f3f3f3",
                        borderTop: "3px solid #1890ff",
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite"
                    }}></div>
                    <p style={{ marginTop: "12px", color: "#666" }}>Loading helpers...</p>
                </div>
            )}

            {error && (
                <div style={{
                    background: "#fff2f0",
                    border: "1px solid #ffccc7",
                    padding: "12px 16px",
                    borderRadius: "8px",
                    color: "#ff4d4f",
                    marginBottom: "16px",
                    fontSize: "14px"
                }}>
                    ⚠️ {error}
                </div>
            )}

            {/* Helpers List */}
            {helperDetails.length > 0 ? (
                <>
                    {/* Responsive View Switcher */}
                    {isMobile ? (
                        renderMobileCardView()
                    ) : (
                        <div className="table-wrapper" style={{
                            overflowX: "auto",
                            WebkitOverflowScrolling: "touch"
                        }}>
                            <Table
                                dataSource={helperDetails}
                                rowKey="_id"
                                columns={columns}
                                pagination={{ 
                                    pageSize: isMobile ? 5 : 10,
                                    responsive: true,
                                    showSizeChanger: !isMobile,
                                    showTotal: (total, range) => isMobile ? 
                                        `${range[0]}-${range[1]} of ${total}` : 
                                        `Showing ${range[0]}-${range[1]} of ${total} helpers`
                                }}
                                scroll={{ x: isMobile ? undefined : 800 }}
                                size={isMobile ? "small" : "middle"}
                            />
                        </div>
                    )}
                    
                    {/* Action Bar */}
                    {selectedHelpers.length > 0 && bookingId && (
                        <div style={{
                            position: isMobile ? "fixed" : "sticky",
                            bottom: isMobile ? "0" : "auto",
                            left: isMobile ? "0" : "auto",
                            right: isMobile ? "0" : "auto",
                            background: isMobile ? "white" : "transparent",
                            padding: isMobile ? "12px 16px" : "20px 0 0",
                            boxShadow: isMobile ? "0 -2px 10px rgba(0,0,0,0.1)" : "none",
                            zIndex: isMobile ? 100 : "auto",
                            borderTop: isMobile ? "1px solid #e8e8e8" : "none",
                            textAlign: "right"
                        }}>
                            <Button
                                type="primary"
                                onClick={assignHelpersToBooking}
                                loading={assigning}
                                disabled={assigning}
                                size={isMobile ? "large" : "middle"}
                                style={{
                                    width: isMobile ? "100%" : "auto",
                                    height: isMobile ? "44px" : "auto",
                                    fontSize: isMobile ? "16px" : "14px"
                                }}
                            >
                                {assigning ? 'Assigning...' : `Assign ${selectedHelpers.length} Helper${selectedHelpers.length > 1 ? 's' : ''}`}
                            </Button>
                        </div>
                    )}
                </>
            ) : (
                !loading && (
                    <div style={{
                        textAlign: "center",
                        padding: "60px 20px",
                        background: "#fafafa",
                        borderRadius: "8px",
                        color: "#999"
                    }}>
                        <div style={{ fontSize: "48px", marginBottom: "16px" }}>👥</div>
                        <p style={{ margin: 0 }}>No helpers available. Add helpers first.</p>
                    </div>
                )
            )}

            {/* Add CSS for animations */}
            <style jsx>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                
                /* For mobile card view */
                .mobile-helpers-list {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    margin-bottom: 80px;
                }
                
                /* Responsive table adjustments */
                @media (max-width: 768px) {
                    .ant-table {
                        font-size: 12px;
                    }
                    .ant-table-thead > tr > th,
                    .ant-table-tbody > tr > td {
                        padding: 8px 4px;
                    }
                }
            `}</style>
        </div>
    );
}

function AddHelper({ userId }) {
    const [inputHelperInfo, setInputHelperInfo] = useState({
        name: "",
        phone: "",
        email: "",
        address: "",
        age: "",
        idProof: null,
        experience: "",
        skills: "",
        availability: "Full-time",
        policeVerification: false,
        pastWorkPhotos: [],
    });
    const [loading, setLoading] = useState(false);
    
    // Add refs for file inputs
    const idProofRef = useRef(null);
    const pastWorkPhotosRef = useRef(null);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setInputHelperInfo(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Basic validation
        if (!inputHelperInfo.name || !inputHelperInfo.phone || !inputHelperInfo.email || 
            !inputHelperInfo.idProof) {
            message.error("Please fill all required fields");
            return;
        }

        const formData = new FormData();

        // Append files
        if (inputHelperInfo.idProof) {
            formData.append("idProof", inputHelperInfo.idProof);
        }
        
        if (inputHelperInfo.pastWorkPhotos && inputHelperInfo.pastWorkPhotos.length > 0) {
            inputHelperInfo.pastWorkPhotos.forEach(photo => {
                formData.append("pastWorkPhotos", photo);
            });
        }

        // Append other fields
        Object.entries(inputHelperInfo).forEach(([key, value]) => {
            if (key !== "idProof" && key !== "pastWorkPhotos" && value !== null) {
                formData.append(key, value.toString());
            }
        });

        // Append vendorId
        formData.append("vendorId", userId);

        try {
            setLoading(true);
            const response = await axios.post("/api/vendor/add", formData, {
                headers: { 
                    "Content-Type": "multipart/form-data",
                }
            });
            
            if (response.data.success) {
                message.success(response.data.message);
                // Reset form
                setInputHelperInfo({
                    name: "",
                    phone: "",
                    email: "",
                    address: "",
                    age: "",
                    idProof: null,
                    experience: "",
                    skills: "",
                    availability: "Full-time",
                    policeVerification: false,
                    pastWorkPhotos: [],
                });
                
                // ✅ CORRECT WAY: Clear file inputs using refs
                if (idProofRef.current) {
                    idProofRef.current.value = '';
                }
                if (pastWorkPhotosRef.current) {
                    pastWorkPhotosRef.current.value = '';
                }
            }
        } catch (error) {
            console.error("Submission error:", error);
            let errorMessage = "Failed to add helper";
            if (error.response) {
                errorMessage = error.response.data.message || errorMessage;
                console.error("Server response:", error.response.data);
            } else if (error.request) {
                errorMessage = "No response from server";
            }
            message.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleIdProofChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setInputHelperInfo(prev => ({
                ...prev,
                idProof: file
            }));
        }
    };

    const handlePastWorkPhotosChange = (e) => {
        const files = Array.from(e.target.files);
        setInputHelperInfo(prev => ({
            ...prev,
            pastWorkPhotos: files
        }));
    };

    return (
        <Form onSubmit={handleSubmit} layout="vertical">
            <Form.Item label="Full Name" required>
                <Input
                    name="name"
                    value={inputHelperInfo.name}
                    onChange={handleChange}
                    placeholder="Enter helper's full name"
                />
            </Form.Item>

            <Form.Item label="Phone Number" required>
                <Input
                    name="phone"
                    value={inputHelperInfo.phone}
                    onChange={handleChange}
                    placeholder="Enter helper's phone number"
                />
            </Form.Item>

            <Form.Item label="Email" required>
                <Input 
                    name="email" 
                    type="email" 
                    value={inputHelperInfo.email} 
                    onChange={handleChange} 
                />
            </Form.Item>

            <Form.Item label="Address" required>
                <Input 
                    name="address" 
                    value={inputHelperInfo.address} 
                    onChange={handleChange} 
                />
            </Form.Item>

            <Form.Item label="Age" required>
                <Input 
                    name="age" 
                    type="number" 
                    value={inputHelperInfo.age} 
                    onChange={handleChange} 
                />
            </Form.Item>

            <Form.Item label="ID Proof" required>
                <Input
                    type="file"
                    ref={idProofRef}  // ✅ Add ref here
                    onChange={handleIdProofChange}
                    accept=".pdf,.jpg,.png,.jpeg"
                />
            </Form.Item>

            <Form.Item label="Past Work Photos">
                <Input
                    type="file"
                    multiple
                    ref={pastWorkPhotosRef}  // ✅ Add ref here
                    onChange={handlePastWorkPhotosChange}
                    accept=".jpg,.png,.jpeg"
                />
            </Form.Item>

            <Form.Item label="Experience (Years)" required>
                <Input 
                    name="experience" 
                    value={inputHelperInfo.experience} 
                    onChange={handleChange} 
                />
            </Form.Item>

            <Form.Item label="Skills/Services" required>
                <Input 
                    name="skills" 
                    value={inputHelperInfo.skills} 
                    onChange={handleChange} 
                />
            </Form.Item>

            <Form.Item label="Availability" required>
                <Select
                    value={inputHelperInfo.availability}
                    onChange={value => setInputHelperInfo(prev => ({ ...prev, availability: value }))}
                >
                    <Option value="Full-time">Full-time</Option>
                    <Option value="Part-time">Part-time</Option>
                </Select>
            </Form.Item>

            <Form.Item label="Police Verification" required>
                <Select
                    value={inputHelperInfo.policeVerification}
                    onChange={value => setInputHelperInfo(prev => ({ ...prev, policeVerification: value }))}
                >
                    <Option value={true}>Verified</Option>
                    <Option value={false}>Not Verified</Option>
                </Select>
            </Form.Item>

            <Button 
                type="primary" 
                htmlType="submit"
                onClick={handleSubmit} 
                loading={loading}
                disabled={loading}
            >
                {loading ? 'Adding Helper...' : 'Add Helper'}
            </Button>
        </Form>
    );
}
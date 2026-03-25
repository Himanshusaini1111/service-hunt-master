import React, { useState, useEffect } from "react";
import { Card, Row, Col, Tag, Descriptions, message, Button, Modal, Form, Input, Select, Upload, Rate } from "antd";
import { UserOutlined, EditOutlined, CameraOutlined, StarFilled, ShopOutlined, PhoneOutlined, MailOutlined, EnvironmentOutlined } from "@ant-design/icons";
import axios from "axios";
import Loader from "../components/Loader";
import Error from "../components/Error";

const { Option } = Select;
const { TextArea } = Input;

export function VendorProfile({ userId }) {
    const [vendorProfile, setVendorProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editForm] = Form.useForm();
    const [stats, setStats] = useState({
        totalServices: 0,
        totalBookings: 0,
        completedJobs: 0,
        totalEarnings: 0,
        averageRating: 0
    });

    useEffect(() => {
        if (userId) {
            fetchVendorProfile();
        }
    }, [userId]);

    const fetchVendorProfile = async () => {
        try {
            setLoading(true);
            setError(false);
            
            // Fetch vendor profile with userId
            const { data: vendorData } = await axios.get(`/api/vendor/profile/${userId}`);
            
            if (vendorData) {
                // Verify this is the correct vendor data for this user
                if (vendorData.userId && vendorData.userId !== userId) {
                    console.error('Vendor data mismatch');
                    setError(true);
                    message.error("You don't have permission to view this profile");
                    return;
                }
                
                setVendorProfile(vendorData);
                
                // Fetch stats for this vendor only
                if (vendorData._id && vendorData.isFromVendorCollection) {
                    fetchVendorStats(vendorData._id);
                }
            } else {
                setError(true);
                message.error("No vendor profile found");
            }
        } catch (error) {
            console.error("Error fetching vendor profile:", error);
            setError(true);
            message.error(error.response?.data?.message || "Failed to load vendor profile");
        } finally {
            setLoading(false);
        }
    };

    const fetchVendorStats = async (vendorId) => {
        try {
            // Fetch stats specific to this vendor
            const { data } = await axios.get(`/api/vendor/stats/${vendorId}`);
            setStats(data);
        } catch (error) {
            console.error("Error fetching vendor stats:", error);
        }
    };

    // Handle profile edit
    const handleEdit = () => {
        editForm.setFieldsValue({
            name: vendorProfile.name,
            email: vendorProfile.email,
            phone: vendorProfile.phone,
            skills: vendorProfile.skills,
            experience: vendorProfile.experience,
            availability: vendorProfile.availability,
            address: vendorProfile.address,
            description: vendorProfile.description,
            hourlyRate: vendorProfile.hourlyRate,
            category: vendorProfile.category,
            companyName: vendorProfile.companyName,
            serviceType: vendorProfile.serviceType
        });
        setEditModalVisible(true);
    };

    const handleUpdate = async (values) => {
        try {
            const { data } = await axios.put(`/api/vendor/update/${vendorProfile._id}`, values);
            setVendorProfile(prev => ({ ...prev, ...data }));
            setEditModalVisible(false);
            message.success("Profile updated successfully");
        } catch (error) {
            console.error("Update error:", error);
            message.error("Failed to update profile");
        }
    };

    // Handle profile image upload
    const handleImageUpload = async (info) => {
        if (info.file.status === 'done') {
            const imageUrl = info.file.response.url;
            try {
                await axios.put(`/api/vendor/update/${vendorProfile._id}`, {
                    profileImage: imageUrl
                });
                setVendorProfile(prev => ({ ...prev, profileImage: imageUrl }));
                message.success('Profile image updated');
            } catch (error) {
                message.error('Failed to update profile image');
            }
        }
    };

    // Get status color
    const getStatusColor = (status) => {
        const colors = {
            'Available': 'green',
            'Busy': 'orange',
            'On Leave': 'red',
            'Unavailable': 'gray'
        };
        return colors[status] || 'blue';
    };

    if (loading) return <Loader />;
    if (error) return <Error message="Failed to load vendor profile" />;
    if (!vendorProfile) return <Error message="No vendor profile found" />;

    return (
        <div className="vendor-profile-container" >
            {/* Profile Header with Path Design */}
            <div className="profile-path-header">
                <div className="path-container">
                    <div className="path-item">
                        <span className="path-icon">🏠</span>
                        <span className="path-text">Dashboard</span>
                    </div>
                    <div className="path-separator">›</div>
                    <div className="path-item">
                        <span className="path-icon">👤</span>
                        <span className="path-text">Vendors</span>
                    </div>
                    <div className="path-separator">›</div>
                    <div className="path-item active">
                        <span className="path-icon">📋</span>
                        <span className="path-text">Profile</span>
                    </div>
                </div>
            </div>

            {/* Profile Header */}
            <div className="profile-header">
                <div className="profile-cover">
                    <div className="profile-avatar-wrapper">
                        <div className="profile-avatar">
                            {vendorProfile.profileImage ? (
                                <img 
                                    src={vendorProfile.profileImage} 
                                    alt={vendorProfile.name}
                                    className="avatar-image"
                                />
                            ) : (
                                <div className="avatar-placeholder">
                                    <UserOutlined />
                                </div>
                            )}
                            <Upload
                                name="avatar"
                                action="/api/upload"
                                showUploadList={false}
                                onChange={handleImageUpload}
                                className="avatar-upload"
                            >
                                <Button icon={<CameraOutlined />} size="small" />
                            </Upload>
                        </div>
                        <div className="profile-info">
                            <h1 className="profile-name">{vendorProfile.name}</h1>
                            <div className="profile-badges">
                                <Tag color="blue" icon={<ShopOutlined />}>
                                    {vendorProfile.companyName || 'Individual Vendor'}
                                </Tag>
                                <Tag color={getStatusColor(vendorProfile.availability)}>
                                    {vendorProfile.availability || 'Available'}
                                </Tag>
                                {vendorProfile.isApproved && (
                                    <Tag color="green">Verified Vendor</Tag>
                                )}
                            </div>
                            <div className="profile-rating">
                                <Rate disabled defaultValue={stats.averageRating} allowHalf />
                                <span className="rating-text">
                                    ({stats.averageRating.toFixed(1)} from {stats.totalBookings} bookings)
                                </span>
                            </div>
                        </div>
                        <Button 
                            type="primary" 
                            icon={<EditOutlined />}
                            onClick={handleEdit}
                            className="edit-profile-btn"
                        >
                            Edit Profile
                        </Button>
                    </div>
                </div>
            </div>

            {/* Profile Details Section */}
            <Card className="profile-details-card" title="Profile Information" bordered={false}>
                <Descriptions bordered column={{ xs: 1, sm: 2, md: 3 }} className="profile-descriptions">
                    <Descriptions.Item label="Full Name" span={1}>
                        <UserOutlined className="description-icon" /> {vendorProfile.name}
                    </Descriptions.Item>
                    <Descriptions.Item label="Email" span={1}>
                        <MailOutlined className="description-icon" /> {vendorProfile.email}
                    </Descriptions.Item>
                    <Descriptions.Item label="Phone" span={1}>
                        <PhoneOutlined className="description-icon" /> {vendorProfile.phone || 'Not provided'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Company Name" span={1}>
                        {vendorProfile.companyName || 'Individual'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Service Type" span={1}>
                        {vendorProfile.serviceType || vendorProfile.category || 'General'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Experience" span={1}>
                        {vendorProfile.experience ? `${vendorProfile.experience} years` : 'Not specified'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Hourly Rate" span={1}>
                        {vendorProfile.hourlyRate ? `₹${vendorProfile.hourlyRate}/hour` : 'Not set'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Address" span={2}>
                        <EnvironmentOutlined className="description-icon" /> {vendorProfile.address || 'Not provided'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Skills" span={3}>
                        {vendorProfile.skills ? (
                            <div className="skills-tags">
                                {vendorProfile.skills.split(',').map((skill, index) => (
                                    <Tag key={index} color="blue">{skill.trim()}</Tag>
                                ))}
                            </div>
                        ) : 'No skills listed'}
                    </Descriptions.Item>
                    {vendorProfile.description && (
                        <Descriptions.Item label="Description" span={3}>
                            {vendorProfile.description}
                        </Descriptions.Item>
                    )}
                </Descriptions>
            </Card>

            {/* Pathner Application Details - Separate Card */}
            {vendorProfile.pathnerDetails && (
                <Card className="pathner-details-card" title="Partner Application Details" bordered={false}>
                    <Row gutter={[24, 16]}>
                        <Col xs={24} md={12}>
                            <div className="pathner-info-item">
                                <div className="pathner-label">Application Date</div>
                                <div className="pathner-value">
                                    {new Date(vendorProfile.pathnerDetails.createdAt).toLocaleDateString('en-IN', {
                                        day: 'numeric',
                                        month: 'long',
                                        year: 'numeric'
                                    })}
                                </div>
                            </div>
                        </Col>
                        <Col xs={24} md={12}>
                            <div className="pathner-info-item">
                                <div className="pathner-label">Status</div>
                                <div className="pathner-value">
                                    <Tag color="green" className="status-tag">✓ Approved</Tag>
                                </div>
                            </div>
                        </Col>
                        <Col xs={24} md={12}>
                            <div className="pathner-info-item">
                                <div className="pathner-label">Service Name</div>
                                <div className="pathner-value">{vendorProfile.pathnerDetails.serviceName}</div>
                            </div>
                        </Col>
                        <Col xs={24} md={12}>
                            <div className="pathner-info-item">
                                <div className="pathner-label">Owner Details</div>
                                <div className="pathner-value">{vendorProfile.pathnerDetails.ownerDetails}</div>
                            </div>
                        </Col>
                        {vendorProfile.pathnerDetails.registrationNumber && (
                            <Col xs={24} md={12}>
                                <div className="pathner-info-item">
                                    <div className="pathner-label">Registration Number</div>
                                    <div className="pathner-value">{vendorProfile.pathnerDetails.registrationNumber}</div>
                                </div>
                            </Col>
                        )}
                        {vendorProfile.pathnerDetails.gstNumber && (
                            <Col xs={24} md={12}>
                                <div className="pathner-info-item">
                                    <div className="pathner-label">GST Number</div>
                                    <div className="pathner-value">{vendorProfile.pathnerDetails.gstNumber}</div>
                                </div>
                            </Col>
                        )}
                    </Row>
                </Card>
            )}

            {/* Edit Profile Modal */}
            <Modal
                title="Edit Vendor Profile"
                open={editModalVisible}
                onCancel={() => setEditModalVisible(false)}
                footer={null}
                width={700}
                className="edit-profile-modal"
            >
                <Form
                    form={editForm}
                    layout="vertical"
                    onFinish={handleUpdate}
                >
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name="name"
                                label="Full Name"
                                rules={[{ required: true, message: 'Please enter name' }]}
                            >
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="email"
                                label="Email"
                                rules={[
                                    { required: true, message: 'Please enter email' },
                                    { type: 'email', message: 'Invalid email' }
                                ]}
                            >
                                <Input />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="phone" label="Phone">
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="companyName" label="Company Name">
                                <Input />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="category" label="Category">
                                <Select>
                                    <Option value="Plumbing">Plumbing</Option>
                                    <Option value="Electrical">Electrical</Option>
                                    <Option value="Cleaning">Cleaning</Option>
                                    <Option value="Carpentry">Carpentry</Option>
                                    <Option value="Painting">Painting</Option>
                                    <Option value="General">General</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="serviceType" label="Service Type">
                                <Input placeholder="e.g., Home Repairs, Maintenance" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="skills" label="Skills (comma separated)">
                        <Input placeholder="e.g., Plumbing, Electrical, Carpentry" />
                    </Form.Item>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="experience" label="Experience (years)">
                                <Input type="number" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="hourlyRate" label="Hourly Rate (₹)">
                                <Input type="number" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="availability" label="Availability">
                        <Select>
                            <Option value="Available">Available</Option>
                            <Option value="Busy">Busy</Option>
                            <Option value="On Leave">On Leave</Option>
                            <Option value="Unavailable">Unavailable</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item name="address" label="Address">
                        <TextArea rows={2} />
                    </Form.Item>

                    <Form.Item name="description" label="Description">
                        <TextArea rows={3} />
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit" style={{ marginRight: 8 }}>
                            Update Profile
                        </Button>
                        <Button onClick={() => setEditModalVisible(false)}>
                            Cancel
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>

            <style jsx>{`
                .vendor-profile-container {
                    padding: 20px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    min-height: 100vh;
                    animation: fadeIn 0.5s ease-in;
                }

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                /* Path Header Styles */
                .profile-path-header {
                    background: white;
                    border-radius: 12px;
                    padding: 15px 20px;
                    margin-bottom: 20px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.08);
                }

                .path-container {
                    display: flex;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 8px;
                }

                .path-item {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 6px 12px;
                    border-radius: 20px;
                    background: #f8f9fa;
                    color: #666;
                    transition: all 0.3s ease;
                    cursor: default;
                }

                .path-item.active {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                }

                .path-icon {
                    font-size: 16px;
                }

                .path-text {
                    font-size: 14px;
                    font-weight: 500;
                }

                .path-separator {
                    color: #999;
                    font-size: 18px;
                    font-weight: 300;
                }

                /* Profile Header Styles */
                .profile-header {
                    background: white;
                    border-radius: 20px;
                    margin-bottom: 24px;
                    padding: 30px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                    position: relative;
                    overflow: hidden;
                }

                .profile-header::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 150px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    opacity: 0.1;
                }

                .profile-avatar-wrapper {
                    display: flex;
                    align-items: center;
                    gap: 30px;
                    flex-wrap: wrap;
                    position: relative;
                }

                .profile-avatar {
                    position: relative;
                    width: 130px;
                    height: 130px;
                }

                .avatar-image {
                    width: 100%;
                    height: 100%;
                    border-radius: 50%;
                    object-fit: cover;
                    border: 4px solid white;
                    box-shadow: 0 5px 15px rgba(0,0,0,0.2);
                }

                .avatar-placeholder {
                    width: 100%;
                    height: 100%;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 48px;
                    color: white;
                    border: 4px solid white;
                    box-shadow: 0 5px 15px rgba(0,0,0,0.2);
                }

                .avatar-upload {
                    position: absolute;
                    bottom: 5px;
                    right: 5px;
                    background: white;
                    border-radius: 50%;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                }

                .profile-info {
                    flex: 1;
                }

                .profile-name {
                    margin: 0 0 10px 0;
                    font-size: 32px;
                    font-weight: 600;
                    color: #333;
                }

                .profile-badges {
                    display: flex;
                    gap: 8px;
                    flex-wrap: wrap;
                    margin-bottom: 10px;
                }

                .profile-rating {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .rating-text {
                    color: #666;
                    font-size: 14px;
                }

                .edit-profile-btn {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border: none;
                    border-radius: 8px;
                    padding: 8px 20px;
                    font-weight: 500;
                    transition: all 0.3s ease;
                }

                .edit-profile-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
                }

                /* Statistics Cards */
                .stats-row {
                    margin-bottom: 24px;
                }

                .stat-card {
                    border-radius: 16px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.05);
                    transition: all 0.3s ease;
                }

                .stat-card:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 8px 25px rgba(0,0,0,0.1);
                }

                .stat-content {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                }

                .stat-icon-wrapper {
                    width: 50px;
                    height: 50px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 24px;
                }

                .stat-info {
                    flex: 1;
                }

                .stat-label {
                    color: #666;
                    font-size: 14px;
                    margin-bottom: 4px;
                }

                .stat-value {
                    font-size: 24px;
                    font-weight: 600;
                    color: #333;
                }

                /* Profile Details Card */
                .profile-details-card {
                    border-radius: 20px;
                    margin-bottom: 24px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.05);
                }

                .profile-details-card .ant-card-head {
                    border-bottom: 1px solid #f0f0f0;
                    padding: 0 20px;
                }

                .profile-details-card .ant-card-head-title {
                    font-size: 18px;
                    font-weight: 600;
                    color: #333;
                }

                .profile-descriptions {
                    background: #fafafa;
                }

                .description-icon {
                    margin-right: 8px;
                    color: #667eea;
                }

                .skills-tags {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                }

                /* Pathner Details Card */
                .pathner-details-card {
                    border-radius: 20px;
                    margin-bottom: 24px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.05);
                    border-left: 4px solid #52c41a;
                }

                .pathner-details-card .ant-card-head {
                    border-bottom: 1px solid #f0f0f0;
                    padding: 0 20px;
                }

                .pathner-details-card .ant-card-head-title {
                    font-size: 18px;
                    font-weight: 600;
                    color: #333;
                }

                .pathner-info-item {
                    background: #f8f9fa;
                    border-radius: 12px;
                    padding: 15px;
                    transition: all 0.3s ease;
                }

                .pathner-info-item:hover {
                    background: #f0f2f5;
                }

                .pathner-label {
                    color: #666;
                    font-size: 13px;
                    margin-bottom: 5px;
                }

                .pathner-value {
                    color: #333;
                    font-size: 16px;
                    font-weight: 500;
                }

                .status-tag {
                    font-size: 14px;
                    padding: 4px 12px;
                }

                /* Responsive Design */
                @media (max-width: 768px) {
                    .profile-avatar-wrapper {
                        flex-direction: column;
                        text-align: center;
                    }
                    
                    .profile-info {
                        text-align: center;
                    }
                    
                    .profile-badges {
                        justify-content: center;
                    }
                    
                    .profile-rating {
                        justify-content: center;
                    }
                    
                    .edit-profile-btn {
                        margin: 0 auto;
                    }
                    
                    .path-container {
                        justify-content: center;
                    }
                    
                    .stat-content {
                        flex-direction: column;
                        text-align: center;
                    }
                }

                /* Animation for cards */
                .profile-header,
                .stat-card,
                .profile-details-card,
                .pathner-details-card {
                    animation: slideIn 0.5s ease-out;
                    animation-fill-mode: both;
                }

                .profile-header { animation-delay: 0.1s; }
                .stat-card:nth-child(1) { animation-delay: 0.2s; }
                .stat-card:nth-child(2) { animation-delay: 0.3s; }
                .stat-card:nth-child(3) { animation-delay: 0.4s; }
                .stat-card:nth-child(4) { animation-delay: 0.5s; }
                .profile-details-card { animation-delay: 0.6s; }
                .pathner-details-card { animation-delay: 0.7s; }

                @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translateY(30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>
        </div>
    );
}
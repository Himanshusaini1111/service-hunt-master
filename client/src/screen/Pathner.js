import React, { useState } from 'react';
import './pathner.css';
import axios from 'axios';
import Navbar from '../components/Navbar';
import { 
    FaBuilding, 
    FaUser, 
    FaEnvelope, 
    FaPhone, 
    FaMapMarkerAlt, 
    FaTools, 
    FaRocket, 
    FaShieldAlt, 
    FaHandshake, 
    FaChartLine, 
    FaCheckCircle, 
    FaExclamationCircle 
} from 'react-icons/fa';

const Pathner = () => {
    const [ServiceName, setServiceName] = useState('');
    const [ownerDetails, setOwnerDetails] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [address, setAddress] = useState('');
    const [typeOfService, setTypeOfService] = useState('');
    const [emailDetails, setEmailDetails] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        
        // Clear previous messages
        setSuccessMessage('');
        setErrorMessage('');
        setIsLoading(true);

        // Prepare data to send
        const pathnerData = {
            serviceName: ServiceName,
            ownerDetails,
            phoneNumber,
            address,
            typeOfService,
            emailDetails
        };

        try {
            const response = await axios.post('http://localhost:5000/api/pathners', pathnerData);
            console.log(response.data);
            
            // Show success message
            setSuccessMessage('Service provider registered successfully!');
            
            // Reset form after successful submission
            setServiceName('');
            setOwnerDetails('');
            setPhoneNumber('');
            setAddress('');
            setTypeOfService('');
            setEmailDetails('');
            
            // Auto-hide success message after 5 seconds
            setTimeout(() => {
                setSuccessMessage('');
            }, 5000);
            
        } catch (error) {
            if (error.response) {
                console.error('Error saving pathner details:', error.response.data);
                setErrorMessage(error.response.data.message || 'Failed to save service provider details');
            } else if (error.request) {
                console.error('No response received from the server:', error.request);
                setErrorMessage('No response from server. Please check your connection.');
            } else {
                console.error('Error in setting up the request:', error.message);
                setErrorMessage(error.message);
            }
            
            // Auto-hide error message after 5 seconds
            setTimeout(() => {
                setErrorMessage('');
            }, 5000);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="pathner-page">
            <Navbar />

            <div className="pathner-container">
                {/* Breadcrumb Navigation */}
                <div className="pathner-breadcrumb">
                    <a href="/home">Home</a>
                    <span className="pathner-breadcrumb-sep">/</span>
                    <span>Partner Network</span>
                    <span className="pathner-breadcrumb-sep">/</span>
                    <span className="pathner-breadcrumb-current">Register Business</span>
                </div>

                <div className="pathner-layout">
                    {/* Left Column: Value Proposition & Benefits */}
                    <div className="pathner-benefits-col">
                        <span className="pathner-badge">
                            <FaHandshake /> Partner Network
                        </span>

                        <h1 className="pathner-heading">
                            Grow Your Business & Reach New Customers
                        </h1>

                        <p className="pathner-lead-text">
                            Join our trusted platform of verified specialists. Showcase your expertise, manage requests, and grow your local client base with zero onboarding hassle.
                        </p>

                        <div className="pathner-cards-list">
                            <div className="pathner-benefit-item">
                                <div className="pathner-benefit-icon">
                                    <FaRocket />
                                </div>
                                <div>
                                    <h4 className="pathner-benefit-title">Instant Visibility</h4>
                                    <p className="pathner-benefit-desc">
                                        Get your services discovered by thousands of local clients searching for verified specialists every day.
                                    </p>
                                </div>
                            </div>

                            <div className="pathner-benefit-item">
                                <div className="pathner-benefit-icon">
                                    <FaChartLine />
                                </div>
                                <div>
                                    <h4 className="pathner-benefit-title">Transparent & Flexible</h4>
                                    <p className="pathner-benefit-desc">
                                        Maintain 100% control over your rates, unit pricing (per hour, per day, custom), and add-on services.
                                    </p>
                                </div>
                            </div>

                            <div className="pathner-benefit-item">
                                <div className="pathner-benefit-icon">
                                    <FaShieldAlt />
                                </div>
                                <div>
                                    <h4 className="pathner-benefit-title">Verified Specialist Badge</h4>
                                    <p className="pathner-benefit-desc">
                                        Build immediate credibility with authentic customer reviews, ratings, and verified accreditation.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="pathner-trust-pill">
                            <FaCheckCircle className="pathner-trust-icon" />
                            <span>Over 500+ local specialists trust Service Hunt to power their growth.</span>
                        </div>
                    </div>

                    {/* Right Column: Registration Form Card */}
                    <div className="pathner-form-col">
                        <div className="pathner-card">
                            <div className="pathner-card-header">
                                <h2 className="pathner-card-title">Provider Application</h2>
                                <p className="pathner-card-subtitle">
                                    Fill out your business profile details below to get started with our team.
                                </p>
                            </div>

                            {/* Success Notification Alert */}
                            {successMessage && (
                                <div className="pathner-alert-success">
                                    <FaCheckCircle style={{ fontSize: '16px', flexShrink: 0 }} />
                                    <span>{successMessage}</span>
                                </div>
                            )}

                            {/* Error Notification Alert */}
                            {errorMessage && (
                                <div className="pathner-alert-error">
                                    <FaExclamationCircle style={{ fontSize: '16px', flexShrink: 0 }} />
                                    <span>{errorMessage}</span>
                                </div>
                            )}

                            <form onSubmit={handleSubmit}>
                                <div className="pathner-form-grid">
                                    {/* Service / Business Name */}
                                    <div className="pathner-field-group">
                                        <label className="pathner-label" htmlFor="serviceName">
                                            Service / Business Name <span className="pathner-required">*</span>
                                        </label>
                                        <div className="pathner-input-box">
                                            <input
                                                type="text"
                                                id="serviceName"
                                                className="pathner-input"
                                                placeholder="      e.g. Apex Home Solutions"
                                                value={ServiceName}
                                                onChange={(e) => setServiceName(e.target.value)}
                                                required
                                                disabled={isLoading}
                                            />
                                            <FaBuilding className="pathner-input-icon" />
                                        </div>
                                    </div>

                                    {/* Owner Details */}
                                    <div className="pathner-field-group">
                                        <label className="pathner-label" htmlFor="ownerDetails">
                                            Owner / Lead Specialist <span className="pathner-required">*</span>
                                        </label>
                                        <div className="pathner-input-box">
                                            <input
                                                type="text"
                                                id="ownerDetails"
                                                className="pathner-input"
                                                placeholder="     Full name"
                                                value={ownerDetails}
                                                onChange={(e) => setOwnerDetails(e.target.value)}
                                                required
                                                disabled={isLoading}
                                            />
                                            <FaUser className="pathner-input-icon" />
                                        </div>
                                    </div>

                                    {/* Email */}
                                    <div className="pathner-field-group">
                                        <label className="pathner-label" htmlFor="emailDetails">
                                            Business Email <span className="pathner-required">*</span>
                                        </label>
                                        <div className="pathner-input-box">
                                            <input
                                                type="email"
                                                id="emailDetails"
                                                className="pathner-input"
                                                placeholder="contact@business.com"
                                                value={emailDetails}
                                                onChange={(e) => setEmailDetails(e.target.value)}
                                                required
                                                disabled={isLoading}
                                            />
                                            <FaEnvelope className="pathner-input-icon" />
                                        </div>
                                    </div>

                                    {/* Phone Number */}
                                    <div className="pathner-field-group">
                                        <label className="pathner-label" htmlFor="phoneNumber">
                                            Phone Number <span className="pathner-required">*</span>
                                        </label>
                                        <div className="pathner-input-box">
                                            <input
                                                type="tel"
                                                id="phoneNumber"
                                                className="pathner-input"
                                                placeholder="Mobile or office phone"
                                                value={phoneNumber}
                                                onChange={(e) => setPhoneNumber(e.target.value)}
                                                required
                                                disabled={isLoading}
                                            />
                                            <FaPhone className="pathner-input-icon" />
                                        </div>
                                    </div>

                                    {/* Operating Address */}
                                    <div className="pathner-field-group full-width">
                                        <label className="pathner-label" htmlFor="address">
                                            Operating Address / City <span className="pathner-required">*</span>
                                        </label>
                                        <div className="pathner-input-box">
                                            <input
                                                type="text"
                                                id="address"
                                                className="pathner-input"
                                                placeholder="     Street, City, Postal Code"
                                                value={address}
                                                onChange={(e) => setAddress(e.target.value)}
                                                required
                                                disabled={isLoading}
                                            />
                                            <FaMapMarkerAlt className="pathner-input-icon" />
                                        </div>
                                    </div>

                                    {/* Type of Service Provided */}
                                    <div className="pathner-field-group full-width">
                                        <label className="pathner-label" htmlFor="typeOfService">
                                            Type of Service Provided <span className="pathner-required">*</span>
                                        </label>
                                        <div className="pathner-input-box">
                                            <input
                                                type="text"
                                                id="typeOfService"
                                                className="pathner-input"
                                                placeholder="      e.g. Electrical, Home Cleaning, Appliance Repair, Plumbing"
                                                value={typeOfService}
                                                onChange={(e) => setTypeOfService(e.target.value)}
                                                required
                                                disabled={isLoading}
                                            />
                                            <FaTools className="pathner-input-icon" />
                                        </div>
                                    </div>
                                </div>

                                <button type="submit" className="pathner-submit-btn" disabled={isLoading}>
                                    {isLoading ? (
                                        <>
                                            <div className="pathner-btn-spinner" />
                                            <span>Submitting Application...</span>
                                        </>
                                    ) : (
                                        <>
                                            <FaHandshake />
                                            <span>Register as Partner</span>
                                        </>
                                    )}
                                </button>

                                <p className="pathner-security-note">
                                    🔒 Your business information is securely stored and never shared with unauthorized parties.
                                </p>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Pathner;

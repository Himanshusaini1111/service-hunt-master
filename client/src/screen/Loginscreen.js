import React, { useState, useEffect } from 'react';
import axios from "axios";
import Error from '../components/Error';
import Loader from '../components/Loader';
import Success from "../components/Success";
import { GoogleLogin } from '@react-oauth/google';
import Navbar from '../components/Navbar';
import { FaEnvelope, FaLock, FaEye, FaEyeSlash, FaSignInAlt } from 'react-icons/fa';
import './Auth.css';

export default function LoginScreen() {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        // Redirect if user is already logged in
        if (localStorage.getItem('currentUser')) {
            window.location.href = '/';
        }
    }, []);

    const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Clear error when user starts typing
        if (error) setError(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Basic validation
        if (!formData.email || !formData.password) {
            setError('Please fill in all fields');
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const result = await axios.post('/api/users/login', formData);
            localStorage.setItem('currentUser', JSON.stringify(result.data));
            setSuccess(true);

            // Redirect after successful login
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);

        } catch (error) {
            setError(error.response?.data?.message || 'Invalid credentials. Please try again.');
            console.error('Login error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSubmit(e);
        }
    };

    const handleGoogleLoginSuccess = async (credentialResponse) => {
        console.log('Google Login Success:', credentialResponse);

        try {
            setLoading(true);
            const result = await axios.post('/api/users/google-login', {
                credential: credentialResponse.credential
            });

            localStorage.setItem('currentUser', JSON.stringify(result.data));
            setSuccess(true);

            setTimeout(() => {
                window.location.href = '/';
            }, 1000);

        } catch (error) {
            setError(error.response?.data?.message || 'Google login failed. Please try again.');
            console.error('Google login error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLoginError = () => {
        console.log('Google Login Failed');
        setError('Google login failed. Please try again.');
    };

    return (
        <div className="auth-page">
            <Navbar />
            <div className="auth-bg-ambient" />

            <div className="auth-container">
                <div className="auth-card">
                    <div className="auth-card-top-accent" />

                    <div className="auth-header">
                        <div className="auth-header-icon">
                            <FaSignInAlt />
                        </div>
                        <h1 className="auth-title">Welcome Back</h1>
                        <p className="auth-subtitle">Sign in to manage bookings and services</p>
                    </div>

                    {/* Status Feedback */}
                    {loading && (
                        <div style={{ marginBottom: '16px' }}>
                            <Loader />
                        </div>
                    )}
                    {error && (
                        <div style={{ marginBottom: '16px' }}>
                            <Error error={error} />
                        </div>
                    )}
                    {success && (
                        <div style={{ marginBottom: '16px', color: '#059669' }}>
                            <Success success="Login successful! Redirecting..." />
                        </div>
                    )}

                    {/* Login Form */}
                    <form className="auth-form" onSubmit={handleSubmit}>
                        <div className="auth-field-group">
                            <label className="auth-label" htmlFor="email">
                                Email Address
                            </label>
                            <div className="auth-input-wrap">
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    className="auth-input"
                                    placeholder="name@example.com"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    onKeyPress={handleKeyPress}
                                    disabled={loading}
                                    required
                                />
                                <FaEnvelope className="auth-input-icon" />
                            </div>
                        </div>

                        <div className="auth-field-group">
                            <label className="auth-label" htmlFor="password">
                                Password
                            </label>
                            <div className="auth-input-wrap">
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    className="auth-input has-toggle"
                                    placeholder="Enter your password"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    onKeyPress={handleKeyPress}
                                    disabled={loading}
                                    required
                                />
                                <FaLock className="auth-input-icon" />
                                <button
                                    type="button"
                                    className="auth-toggle-pwd"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="auth-submit-btn"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <div className="auth-btn-spinner" />
                                    <span>Signing In...</span>
                                </>
                            ) : (
                                <>
                                    <FaSignInAlt />
                                    <span>Sign In</span>
                                </>
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="auth-divider">
                        <span className="auth-divider-text">OR CONTINUE WITH</span>
                    </div>

                    {/* Google OAuth Login */}
                    <div className="auth-google-wrap">
                        <GoogleLogin
                            onSuccess={handleGoogleLoginSuccess}
                            onError={handleGoogleLoginError}
                            useOneTap={false}
                            theme="outline"
                            size="large"
                            text="signin_with"
                            shape="rectangular"
                            clientId={googleClientId}
                        />
                    </div>

                    {/* Footer Switch Links */}
                    <div className="auth-footer">
                        <span>
                            Don't have an account?{' '}
                            <a href="/register" className="auth-link">
                                Create Account
                            </a>
                        </span>
                        <a href="/forgot-password" className="auth-sublink">
                            Forgot your password?
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}

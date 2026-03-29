import React, { useState, useEffect } from 'react';
import axios from "axios";
import Error from '../components/Error';
import Loader from '../components/Loader';
import Success from "../components/Success";
import { GoogleLogin } from '@react-oauth/google';

export default function LoginScreen() {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        // Redirect if user is already logged in
        if (localStorage.getItem('currentUser')) {
            window.location.href = '/';
        }
    }, []);

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
  
  if (!credentialResponse.credential) {
    setError('Invalid Google response');
    return;
  }

  try {
    setLoading(true);
    setError(null);
    
    const result = await axios.post('/api/users/google-login', {
      credential: credentialResponse.credential
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true // Important for CORS
    });
    
    localStorage.setItem('currentUser', JSON.stringify(result.data));
    setSuccess(true);
    
    setTimeout(() => {
      window.location.href = '/';
    }, 1000);
    
  } catch (error) {
    console.error('Google login error details:', error);
    let errorMessage = 'Google login failed. Please try again.';
    
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.response?.status === 500) {
      errorMessage = 'Server error. Please try again later.';
    }
    
    setError(errorMessage);
  } finally {
    setLoading(false);
  }
};

    const handleGoogleLoginError = () => {
        console.log('Google Login Failed');
        setError('Google login failed. Please try again.');
    };

    return (
        <div className="min-vh-100 bg-light">
            {/* Navigation */}
            <nav className="navbar navbar-expand-lg custom-navbar">
                <div className="navbar-brand-section">
                    {/* Brand Logo/Name */}
                    <a className="navbar-brand d-flex align-items-center" href="/home">
                        <h2 className="brand-title mb-0">
                            Service Hunt
                        </h2>
                    </a>
                </div>
            </nav>

            {/* Main Content */}
            <div className="container">
                <div className="row justify-content-center align-items-center min-vh-75 py-1">
                    <div className="col-md-6 col-lg-5">
                        {/* Login Card */}
                        <div className="card shadow-lg border-0 rounded-3">
                            <div className="card-body p-5">
                                {/* Header */}
                                <div className="text-center mb-4">
                                    <h2 className="card-title fw-bold text-primary mb-2">
                                        Welcome Back
                                    </h2>
                                    <p className="text-muted">Sign in to your account</p>
                                </div>

                                {/* Status Messages */}
                                {loading && (
                                    <div className="mb-3">
                                        <Loader />
                                    </div>
                                )}
                                {error && (
                                    <div className="mb-3">
                                        <Error error={error} />
                                    </div>
                                )}
                                {success && (
                                    <div className="mb-3">
                                        <Success success="Login successful! Redirecting..." />
                                    </div>
                                )}

                                {/* Login Form */}
                                <form onSubmit={handleSubmit}>
                                    <div className="mb-3">
                                        <label htmlFor="email" className="form-label fw-semibold">
                                            Email Address
                                        </label>
                                        <input
                                            id="email"
                                            name="email"
                                            type="email"
                                            className="form-control form-control-lg"
                                            placeholder="Enter your email"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            onKeyPress={handleKeyPress}
                                            disabled={loading}
                                            required
                                        />
                                    </div>

                                    <div className="mb-4">
                                        <label htmlFor="password" className="form-label fw-semibold">
                                            Password
                                        </label>
                                        <input
                                            id="password"
                                            name="password"
                                            type="password"
                                            className="form-control form-control-lg"
                                            placeholder="Enter your password"
                                            value={formData.password}
                                            onChange={handleInputChange}
                                            onKeyPress={handleKeyPress}
                                            disabled={loading}
                                            required
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        className="btn btn-primary btn-lg w-100 py-3 fw-semibold"
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2" />
                                                Signing In...
                                            </>
                                        ) : (
                                            'Sign In'
                                        )}
                                    </button>
                                </form>

                                {/* Divider */}
                                <div className="position-relative my-4">
                                    <hr className="border-1" />
                                    <span className="position-absolute top-50 start-50 translate-middle bg-white px-3 text-muted">
                                        OR
                                    </span>
                                </div>

                                {/* Google Login Button */}
                            <div className="d-flex justify-content-center">
  <GoogleLogin
    onSuccess={handleGoogleLoginSuccess}
    onError={handleGoogleLoginError}
    useOneTap={false}
    theme="outline"
    size="large"
    text="signin_with"
    shape="rectangular"
    width="250"
    // Add these props for better production behavior
    auto_select={false}
    cancel_on_tap_outside={true}
    prompt_parent_id="google-login-container"
  />
</div>

                                {/* Footer Links */}
                                <div className="text-center mt-4 pt-3 border-top">
                                    <p className="text-muted mb-2">
                                        Don't have an account?{' '}
                                        <a 
                                            href="/register" 
                                            className="text-primary fw-semibold text-decoration-none"
                                        >
                                            Create Account
                                        </a>
                                    </p>
                                    <a 
                                        href="/forgot-password" 
                                        className="text-muted text-decoration-none small"
                                    >
                                        Forgot your password?
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Additional CSS */}
            <style jsx>{`
                .min-vh-100 {
                    min-height: 100vh;
                }
                .min-vh-75 {
                    min-height: 75vh;
                }
                .card {
                    backdrop-filter: blur(10px);
                    background: rgba(255, 255, 255, 0.95);
                }
                .btn-primary {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border: none;
                    transition: all 0.3s ease;
                }
                .btn-primary:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
                }
                .form-control {
                    border: 1px solid #e1e5e9;
                    transition: all 0.3s ease;
                }
                .form-control:focus {
                    border-color: #667eea;
                    box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.25);
                }
            `}</style>
        </div>
    );
}
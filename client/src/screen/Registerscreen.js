import React, { useState } from 'react';
import axios from "axios";
import Error from '../components/Error';
import Loader from '../components/Loader';
import Success from '../components/Success';
import { GoogleLogin } from '@react-oauth/google';
import Navbar from '../components/Navbar';
import { FaUser, FaEnvelope, FaLock, FaEye, FaEyeSlash, FaUserPlus } from 'react-icons/fa';
import './Auth.css';

function RegisterScreen() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    cpassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showCpassword, setShowCpassword] = useState(false);
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    password: false,
    cpassword: false
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (error) setError(null);
  };

  const handleBlur = (field) => {
    setTouched(prev => ({
      ...prev,
      [field]: true
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      return "Name is required";
    }
    if (!formData.email.trim()) {
      return "Email is required";
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      return "Email is invalid";
    }
    if (!formData.password) {
      return "Password is required";
    }
    if (formData.password.length < 6) {
      return "Password must be at least 6 characters";
    }
    if (formData.password !== formData.cpassword) {
      return "Passwords do not match";
    }
    return null;
  };

  async function handleRegister(e) {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    const user = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      password: formData.password,
    };

    try {
      setLoading(true);
      setError(null);
      
      const result = await axios.post('/api/users/register', user);
      console.log('Registration successful:', result.data);
      
      setSuccess(true);
      
      // Clear form after successful registration
      setFormData({
        name: '',
        email: '',
        password: '',
        cpassword: ''
      });
      
      setTouched({
        name: false,
        email: false,
        password: false,
        cpassword: false
      });

      // Redirect to login after delay
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);

    } catch (err) {
      let errorMessage = 'Registration failed. Please try again.';
      
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.status === 409) {
        errorMessage = 'Email already exists. Please use a different email.';
      } else if (err.response?.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      } else if (err.request) {
        errorMessage = 'Network error. Please check your connection.';
      }
      
      setError(errorMessage);
      console.error('Registration error:', err);
    } finally {
      setLoading(false);
    }
  }

  // Handle Google Registration/Signup
  const handleGoogleRegister = async (credentialResponse) => {
    console.log('Google Registration Success:', credentialResponse);
    
    try {
      setLoading(true);
      setError(null);
      
      const result = await axios.post('/api/users/google-login', {
        credential: credentialResponse.credential
      });
      
      console.log('Google registration successful:', result.data);
      setSuccess(true);
      
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
      
    } catch (error) {
      let errorMessage = 'Google registration failed. Please try again.';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      setError(errorMessage);
      console.error('Google registration error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    console.log('Google Registration Failed');
    setError('Google registration failed. Please try again.');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleRegister(e);
    }
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
              <FaUserPlus />
            </div>
            <h1 className="auth-title">Create Account</h1>
            <p className="auth-subtitle">Join Service Hunt to book verified specialists</p>
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
              <Success success="Registration successful! Redirecting to login..." />
            </div>
          )}

          {/* Registration Form */}
          <form className="auth-form" onSubmit={handleRegister}>
            {/* Full Name */}
            <div className="auth-field-group">
              <label className="auth-label" htmlFor="name">
                Full Name
              </label>
              <div className="auth-input-wrap">
                <input
                  id="name"
                  name="name"
                  type="text"
                  className={`auth-input ${touched.name && !formData.name ? 'is-invalid' : ''}`}
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={handleInputChange}
                  onBlur={() => handleBlur('name')}
                  onKeyPress={handleKeyPress}
                  disabled={loading}
                  required
                />
                <FaUser className="auth-input-icon" />
              </div>
              {touched.name && !formData.name && (
                <span className="auth-field-error">Name is required</span>
              )}
            </div>

            {/* Email Address */}
            <div className="auth-field-group">
              <label className="auth-label" htmlFor="email">
                Email Address
              </label>
              <div className="auth-input-wrap">
                <input
                  id="email"
                  name="email"
                  type="email"
                  className={`auth-input ${touched.email && !formData.email ? 'is-invalid' : ''}`}
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  onBlur={() => handleBlur('email')}
                  onKeyPress={handleKeyPress}
                  disabled={loading}
                  required
                />
                <FaEnvelope className="auth-input-icon" />
              </div>
              {touched.email && !formData.email && (
                <span className="auth-field-error">Email is required</span>
              )}
            </div>

            {/* Password */}
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
                  placeholder="At least 6 characters"
                  value={formData.password}
                  onChange={handleInputChange}
                  onBlur={() => handleBlur('password')}
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
              {touched.password && formData.password.length > 0 && formData.password.length < 6 && (
                <span className="auth-field-hint">Password must be at least 6 characters</span>
              )}
            </div>

            {/* Confirm Password */}
            <div className="auth-field-group">
              <label className="auth-label" htmlFor="cpassword">
                Confirm Password
              </label>
              <div className="auth-input-wrap">
                <input
                  id="cpassword"
                  name="cpassword"
                  type={showCpassword ? "text" : "password"}
                  className="auth-input has-toggle"
                  placeholder="Re-enter your password"
                  value={formData.cpassword}
                  onChange={handleInputChange}
                  onBlur={() => handleBlur('cpassword')}
                  onKeyPress={handleKeyPress}
                  disabled={loading}
                  required
                />
                <FaLock className="auth-input-icon" />
                <button
                  type="button"
                  className="auth-toggle-pwd"
                  onClick={() => setShowCpassword(!showCpassword)}
                  aria-label={showCpassword ? "Hide password" : "Show password"}
                >
                  {showCpassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              {formData.cpassword && formData.password !== formData.cpassword && (
                <span className="auth-field-error">Passwords do not match</span>
              )}
            </div>

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="auth-btn-spinner" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <FaUserPlus />
                  <span>Create Account</span>
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="auth-divider">
            <span className="auth-divider-text">OR CONTINUE WITH</span>
          </div>

          {/* Google OAuth Register */}
          <div className="auth-google-wrap">
            <GoogleLogin
              onSuccess={handleGoogleRegister}
              onError={handleGoogleError}
              useOneTap={false}
              theme="outline"
              size="large"
              text="signup_with"
              shape="rectangular"
              width="100%"
            />
          </div>

          {/* Footer Switch Links */}
          <div className="auth-footer">
            <span>
              Already have an account?{' '}
              <a href="/login" className="auth-link">
                Sign In
              </a>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RegisterScreen;

import React, { useState } from 'react';
import axios from "axios";
import Error from '../components/Error';
import Loader from '../components/Loader';
import Success from '../components/Success';
import { GoogleLogin } from '@react-oauth/google';

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

      // Optional: Redirect to login after delay
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
      
      // Send the Google credential to your backend
      const result = await axios.post('/api/users/google-login', {
        credential: credentialResponse.credential
      });
      
      console.log('Google registration successful:', result.data);
      setSuccess(true);
      
      // Show success message and redirect to login
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

  const getInputClassName = (field) => {
    const isInvalid = touched[field] && !formData[field];
    return `form-control form-control-lg ${isInvalid ? 'is-invalid' : ''}`;
  };

  return (
    <div className="min-vh-100 bg-light">
      {/* Navigation */}
      <nav className="navbar navbar-expand-lg custom-navbar">
        <div className="navbar-brand-section">
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
            {/* Registration Card */}
            <div className="card shadow-lg border-0 rounded-3">
              <div className="card-body p-5">
                {/* Header */}
                <div className="text-center mb-4">
                  <h2 className="card-title fw-bold text-primary mb-2">
                    Create Account
                  </h2>
                  <p className="text-muted">Join us today</p>
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
                    <Success success="Registration successful! Redirecting to login..." />
                  </div>
                )}

                {/* Registration Form */}
                <form onSubmit={handleRegister}>
                  <div className="mb-3">
                    <label htmlFor="name" className="form-label fw-semibold">
                      Full Name
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      className={getInputClassName('name')}
                      placeholder="Enter your full name"
                      value={formData.name}
                      onChange={handleInputChange}
                      onBlur={() => handleBlur('name')}
                      onKeyPress={handleKeyPress}
                      disabled={loading}
                      required
                    />
                    {touched.name && !formData.name && (
                      <div className="invalid-feedback">
                        Name is required
                      </div>
                    )}
                  </div>

                  <div className="mb-3">
                    <label htmlFor="email" className="form-label fw-semibold">
                      Email Address
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      className={getInputClassName('email')}
                      placeholder="Enter your email"
                      value={formData.email}
                      onChange={handleInputChange}
                      onBlur={() => handleBlur('email')}
                      onKeyPress={handleKeyPress}
                      disabled={loading}
                      required
                    />
                    {touched.email && !formData.email && (
                      <div className="invalid-feedback">
                        Email is required
                      </div>
                    )}
                  </div>

                  <div className="mb-3">
                    <label htmlFor="password" className="form-label fw-semibold">
                      Password
                    </label>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      className={getInputClassName('password')}
                      placeholder="Create a password"
                      value={formData.password}
                      onChange={handleInputChange}
                      onBlur={() => handleBlur('password')}
                      onKeyPress={handleKeyPress}
                      disabled={loading}
                      required
                    />
                    {touched.password && formData.password.length < 6 && (
                      <div className="text-warning small mt-1">
                        Password must be at least 6 characters
                      </div>
                    )}
                  </div>

                  <div className="mb-4">
                    <label htmlFor="cpassword" className="form-label fw-semibold">
                      Confirm Password
                    </label>
                    <input
                      id="cpassword"
                      name="cpassword"
                      type="password"
                      className={getInputClassName('cpassword')}
                      placeholder="Confirm your password"
                      value={formData.cpassword}
                      onChange={handleInputChange}
                      onBlur={() => handleBlur('cpassword')}
                      onKeyPress={handleKeyPress}
                      disabled={loading}
                      required
                    />
                    {formData.cpassword && formData.password !== formData.cpassword && (
                      <div className="text-danger small mt-1">
                        Passwords do not match
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary btn-lg w-100 py-3 fw-semibold"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" />
                        Creating Account...
                      </>
                    ) : (
                      'Create Account'
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

                {/* Google Registration Button */}
                <div className="d-flex justify-content-center">
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

                {/* Footer Links */}
                <div className="text-center mt-4 pt-3 border-top">
                  <p className="text-muted mb-0">
                    Already have an account?{' '}
                    <a 
                      href="/login" 
                      className="text-primary fw-semibold text-decoration-none"
                    >
                      Sign In
                    </a>
                  </p>
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

export default RegisterScreen;
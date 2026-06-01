import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ReviewSystem = ({ serviceId, showFullDetails = true, onAverageRating }) => {
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [averageRating, setAverageRating] = useState(0);
    const [totalReviews, setTotalReviews] = useState(0);
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const fetchReviews = async () => {
        try {
            setLoading(true);
            const { data } = await axios.get(`/api/reviews?serviceid=${serviceId}`);
            const avgRating = parseFloat(data.averageRating) || 0;
            setAverageRating(avgRating);
            setTotalReviews(data.totalReviews || 0);
            setReviews(data.reviews || []);
            if (onAverageRating) onAverageRating(avgRating);
        } catch (error) {
            console.error('Error fetching reviews:', error);
            setAverageRating(0);
            setTotalReviews(0);
            setReviews([]);
        } finally {
            setLoading(false);
        }
    };

    const submitReview = async () => {
        if (rating < 1 || rating > 5) {
            setErrorMessage('Please select a rating');
            setTimeout(() => setErrorMessage(''), 3000);
            return;
        }

        setSubmitting(true);
        setErrorMessage('');
        
        try {
            await axios.post('/api/reviews', { serviceid: serviceId, rating });
            setSubmitSuccess(true);
            setRating(0);
            fetchReviews();
            
            // Hide success message after 3 seconds
            setTimeout(() => setSubmitSuccess(false), 3000);
        } catch (error) {
            console.error('Error submitting review:', error);
            setErrorMessage('Failed to submit review. Please try again.');
            setTimeout(() => setErrorMessage(''), 3000);
        } finally {
            setSubmitting(false);
        }
    };

    useEffect(() => {
        fetchReviews();
    }, [serviceId]);

    const renderStars = (value, interactive = false, onStarClick = null, onStarHover = null) => {
        return (
            <div style={{ display: 'inline-flex', gap: '6px' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                    <span
                        key={star}
                        onClick={() => interactive && onStarClick && onStarClick(star)}
                        onMouseEnter={() => interactive && onStarHover && onStarHover(star)}
                        onMouseLeave={() => interactive && onStarHover && onStarHover(0)}
                        style={{
                            fontSize: interactive ? '32px' : '18px',
                            cursor: interactive ? 'pointer' : 'default',
                            color: star <= (interactive ? hoverRating || rating : value) ? '#ffb300' : '#e0e0e0',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        ★
                    </span>
                ))}
            </div>
        );
    };

    const getRatingText = (ratingValue) => {
        const texts = {
            1: 'Poor',
            2: 'Fair',
            3: 'Good',
            4: 'Very Good',
            5: 'Excellent'
        };
        return texts[ratingValue] || '';
    };

    if (!showFullDetails) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '18px', fontWeight: '600', color: '#b12704' }}>
                    {averageRating ? averageRating.toFixed(1) : ''} ★
                </span>
            </div>
        );
    }

    if (loading) {
        return (
            <div style={{ padding: '40px', textAlign: 'center' }}>
                <div style={{ 
                    display: 'inline-block', 
                    width: '24px', 
                    height: '24px', 
                    border: '3px solid #f3f3f3', 
                    borderTop: '3px solid #ff9900', 
                    borderRadius: '50%', 
                    animation: 'spin 1s linear infinite' 
                }} />
                <style>{`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div>
            {/* Success Message */}
            {submitSuccess && (
                <div style={{
                    backgroundColor: '#d4edda',
                    color: '#155724',
                    padding: '12px 20px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    border: '1px solid #c3e6cb',
                    fontSize: '14px',
                    animation: 'fadeIn 0.3s ease'
                }}>
                    ✓ Thank you for your review!
                </div>
            )}

            {/* Error Message */}
            {errorMessage && (
                <div style={{
                    backgroundColor: '#f8d7da',
                    color: '#721c24',
                    padding: '12px 20px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    border: '1px solid #f5c6cb',
                    fontSize: '14px',
                    animation: 'fadeIn 0.3s ease'
                }}>
                    ⚠ {errorMessage}
                </div>
            )}

            {/* Rating Summary Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '24px',
                padding: '24px',
                backgroundColor: '#fafafa',
                borderRadius: '12px',
                marginBottom: '32px',
                flexWrap: 'wrap'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', fontWeight: '600', color: '#b12704' }}>
                        {averageRating ? averageRating.toFixed(1) : '0'}
                    </div>
                    {renderStars(averageRating)}
                    <div style={{ fontSize: '13px', color: '#565959', marginTop: '8px' }}>
                        Based on {totalReviews} reviews
                    </div>
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', color: '#333', lineHeight: '1.6' }}>
                        {totalReviews > 0 ? (
                            <>
                                {averageRating >= 4.5 && '⭐ Excellent service! Customers love this offering.'}
                                {averageRating >= 3.5 && averageRating < 4.5 && '👍 Good service with positive feedback.'}
                                {averageRating >= 2.5 && averageRating < 3.5 && '👌 Average service - room for improvement.'}
                                {averageRating < 2.5 && '📝 Service needs improvement based on reviews.'}
                            </>
                        ) : (
                            'Be the first to review this service!'
                        )}
                    </div>
                </div>
            </div>

            {/* Rate Us Section */}
            <div style={{
                marginBottom: '32px',
                padding: '24px',
                border: '1px solid #e8e8e8',
                borderRadius: '12px',
                backgroundColor: '#fff'
            }}>
                <h4 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '500' }}>Share your experience</h4>
                <div style={{ marginBottom: '16px' }}>
                    {renderStars(rating, true, setRating, setHoverRating)}
                    {hoverRating > 0 && (
                        <span style={{ marginLeft: '16px', color: '#666', fontSize: '14px', fontWeight: '500' }}>
                            {getRatingText(hoverRating)}
                        </span>
                    )}
                </div>
                <button
                    onClick={submitReview}
                    disabled={submitting || rating === 0}
                    style={{
                        backgroundColor: rating === 0 ? '#ccc' : '#ff9900',
                        color: 'white',
                        border: 'none',
                        padding: '10px 24px',
                        borderRadius: '8px',
                        cursor: rating === 0 ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        opacity: submitting ? 0.7 : 1,
                        transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                        if (!submitting && rating !== 0) e.currentTarget.style.backgroundColor = '#e68a00';
                    }}
                    onMouseLeave={(e) => {
                        if (!submitting && rating !== 0) e.currentTarget.style.backgroundColor = '#ff9900';
                    }}
                >
                    {submitting ? 'Submitting...' : 'Submit Review'}
                </button>
                {rating === 0 && !submitting && (
                    <span style={{ marginLeft: '16px', fontSize: '12px', color: '#999' }}>
                        Select a rating to submit
                    </span>
                )}
            </div>

            {/* Customer Reviews List */}
            {reviews.length > 0 && (
                <div>
                    <h4 style={{ 
                        marginBottom: '20px', 
                        fontSize: '18px', 
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <span>📝</span> Customer Reviews ({totalReviews})
                    </h4>
                    <div style={{ maxHeight: '450px', overflowY: 'auto', paddingRight: '8px' }}>
                        {reviews.slice().reverse().map((review, index) => (
                            <div
                                key={index}
                                style={{
                                    marginBottom: '16px',
                                    padding: '20px',
                                    border: '1px solid #f0f0f0',
                                    borderRadius: '12px',
                                    backgroundColor: '#fff',
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
                                    e.currentTarget.style.borderColor = '#e0e0e0';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.boxShadow = 'none';
                                    e.currentTarget.style.borderColor = '#f0f0f0';
                                }}
                            >
                                <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', alignItems: 'center' }}>
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '50%',
                                        backgroundColor: '#e8f4f8',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '16px',
                                        fontWeight: 'bold',
                                        color: '#007185'
                                    }}>
                                        {review.userName ? review.userName.charAt(0).toUpperCase() : 'U'}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: '500', fontSize: '14px', color: '#333', marginBottom: '4px' }}>
                                            {review.userName || 'Verified Customer'}
                                        </div>
                                        {renderStars(Number(review.rating))}
                                        <div style={{ fontSize: '12px', color: '#999', marginTop: '6px' }}>
                                            {new Date(review.createdAt || review.date).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </div>
                                    </div>
                                </div>
                                <p style={{ 
                                    margin: 0, 
                                    marginLeft: '52px', 
                                    fontSize: '14px', 
                                    color: '#555', 
                                    lineHeight: '1.6',
                                    fontStyle: review.comment ? 'normal' : 'italic'
                                }}>
                                    {review.comment || `Rated ${review.rating} out of 5 stars`}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Add fade-in animation */}
            <style>{`
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(-10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>
        </div>
    );
};

export default ReviewSystem;
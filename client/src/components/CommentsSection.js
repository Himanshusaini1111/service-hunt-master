import React, { useState, useEffect } from 'react';
import axios from 'axios';

const CommentsSection = ({ serviceId }) => {
    const [comments, setComments] = useState([]);
    const [commentText, setCommentText] = useState('');
    const [showAll, setShowAll] = useState(false); // Track whether to show all comments
    const [loadingMore, setLoadingMore] = useState(false); // Track loading state for "Show More"

    // Fetch initial comments for the specific service
    useEffect(() => {
        const fetchComments = async () => {
            try {
                const response = await axios.get(`/api/comments?serviceid=${serviceId}&limit=3`);
                setComments(response.data);
            } catch (err) {
                console.error('Error fetching comments:', err);
            }
        };

        fetchComments();
    }, [serviceId]);

    // Handle form submit
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!commentText.trim()) return;

        try {
            // Pass serviceid along with the comment text
            const response = await axios.post('/api/comments', { serviceid: serviceId, text: commentText });
            setComments([response.data, ...comments]); // Update comments list
            setCommentText(''); // Clear textarea
        } catch (err) {
            console.error('Error posting comment:', err);
        }
    };

    // Load all comments when "Show More" is clicked
    const loadAllComments = async () => {
        setLoadingMore(true);

        try {
            const response = await axios.get(`/api/comments?serviceid=${serviceId}`);
            setComments(response.data);
            setShowAll(true); // Mark that all comments are displayed
        } catch (err) {
            console.error('Error loading more comments:', err);
        } finally {
            setLoadingMore(false);
        }
    };

    return (
        <div className="container mt-4 text-left">
            <form onSubmit={handleSubmit} className="mb-3">
                <textarea
                    className="form-control"
                    placeholder="Write your comment here..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                ></textarea>
                <button type="submit" className="btn btn-primary mt-2">Post Comment</button>
            </form>
            <div className="comments-list">
                {comments.length > 0 ? (
                    comments.slice(0, showAll ? comments.length : 3).map((comment, index) => (
                        <div key={index} className="comment-box p-3 mb-2" style={{ border: '1px solid #ccc', borderRadius: '5px' }}>
                            <p>{comment.text}</p>
                            <small className="text-muted">Posted on {new Date(comment.date).toLocaleString()}</small>
                        </div>
                    ))
                ) : (
                    <p>No comments yet. Be the first to comment!</p>
                )}
                {!showAll && comments.length > 3 && (
                    <button
                        onClick={loadAllComments}
                        className="btn btn-secondary mt-2"
                        disabled={loadingMore}
                    >
                        {loadingMore ? 'Loading...' : 'Show More'}
                    </button>
                )}
            </div>
        </div>
    );
};

export default CommentsSection;

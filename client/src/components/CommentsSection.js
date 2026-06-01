import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Avatar, Button, Input, message, Spin, Empty } from 'antd';
import { UserOutlined, SendOutlined, LikeOutlined, MessageOutlined } from '@ant-design/icons';

const { TextArea } = Input;

const CommentsSection = ({ serviceId }) => {
    const [comments, setComments] = useState([]);
    const [commentText, setCommentText] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [showAll, setShowAll] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [totalComments, setTotalComments] = useState(0);
    const commentsEndRef = useRef(null);

    const fetchComments = async (loadAll = false, currentPage = 1) => {
        setLoading(true);
        try {
            const limit = loadAll ? 100 : 5;
            const response = await axios.get(`/api/comments?serviceid=${serviceId}&limit=${limit}&page=${currentPage}`);
            const data = response.data;
            
            if (loadAll) {
                setComments(data.comments || data);
                setShowAll(true);
                setHasMore(false);
            } else {
                if (currentPage === 1) {
                    setComments(data.comments || data);
                } else {
                    setComments(prev => [...prev, ...(data.comments || data)]);
                }
                setHasMore((data.comments || data).length === limit);
                setTotalComments(data.total || (data.comments || data).length);
            }
        } catch (err) {
            console.error('Error fetching comments:', err);
            message.error('Failed to load comments');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!commentText.trim()) {
            message.warning('Please enter a comment');
            return;
        }

        setSubmitting(true);
        try {
            const response = await axios.post('/api/comments', { 
                serviceid: serviceId, 
                text: commentText,
                createdAt: new Date().toISOString()
            });
            
            const newComment = response.data;
            setComments([newComment, ...comments]);
            setCommentText('');
            message.success('Comment posted successfully!');
            
            // Scroll to new comment
            setTimeout(() => {
                commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        } catch (err) {
            console.error('Error posting comment:', err);
            message.error('Failed to post comment. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const loadMoreComments = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchComments(false, nextPage);
    };

    useEffect(() => {
        fetchComments(false, 1);
    }, [serviceId]);

    const getTimeAgo = (date) => {
        const now = new Date();
        const commentDate = new Date(date);
        const diffMs = now - commentDate;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} minutes ago`;
        if (diffHours < 24) return `${diffHours} hours ago`;
        if (diffDays < 7) return `${diffDays} days ago`;
        return commentDate.toLocaleDateString();
    };

    return (
        <div>
            {/* Comment Form */}
            <div style={{
                marginBottom: '32px',
                padding: '20px',
                backgroundColor: '#fafafa',
                borderRadius: '8px',
                border: '1px solid #e8e8e8'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <Avatar icon={<UserOutlined />} />
                    <span style={{ fontWeight: '500', fontSize: '14px' }}>Write a comment</span>
                </div>
                <form onSubmit={handleSubmit}>
                    <TextArea
                        rows={3}
                        placeholder="Share your thoughts about this service..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        style={{ marginBottom: '12px', borderRadius: '8px' }}
                        maxLength={500}
                        showCount
                    />
                    <Button
                        type="primary"
                        htmlType="submit"
                        loading={submitting}
                        icon={<SendOutlined />}
                        style={{ backgroundColor: '#007185', borderColor: '#007185' }}
                    >
                        Post Comment
                    </Button>
                </form>
            </div>

            {/* Comments List */}
            <div>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '20px',
                    paddingBottom: '12px',
                    borderBottom: '1px solid #e8e8e8'
                }}>
                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '500' }}>
                        <MessageOutlined style={{ marginRight: '8px' }} />
                        Customer Comments ({totalComments || comments.length})
                    </h4>
                    {!showAll && comments.length > 3 && (
                        <Button type="link" onClick={() => fetchComments(true)} style={{ color: '#007185' }}>
                            View all
                        </Button>
                    )}
                </div>

                {loading && comments.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                        <Spin />
                    </div>
                ) : comments.length > 0 ? (
                    <div style={{ maxHeight: showAll ? 'none' : '500px', overflowY: 'auto' }}>
                        {comments.map((comment, index) => (
                            <div
                                key={comment._id || index}
                                style={{
                                    padding: '16px',
                                    borderBottom: '1px solid #f0f0f0',
                                    transition: 'background-color 0.2s ease',
                                    backgroundColor: index % 2 === 0 ? '#fff' : '#fafafa'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#f5f5f5';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#fff' : '#fafafa';
                                }}
                            >
                                <div style={{ display: 'flex', gap: '12px', marginBottom: '8px' }}>
                                    <Avatar icon={<UserOutlined />} size="small" />
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                            <span style={{ fontWeight: '500', fontSize: '13px', color: '#333' }}>
                                                Customer
                                            </span>
                                            <span style={{ fontSize: '11px', color: '#999' }}>
                                                {getTimeAgo(comment.createdAt || comment.date)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <p style={{
                                    margin: 0,
                                    marginLeft: '40px',
                                    fontSize: '14px',
                                    color: '#555',
                                    lineHeight: '1.6',
                                    wordBreak: 'break-word'
                                }}>
                                    {comment.text}
                                </p>
                            </div>
                        ))}
                        <div ref={commentsEndRef} />
                    </div>
                ) : (
                    <Empty
                        description="No comments yet. Be the first to share your thoughts!"
                        style={{ padding: '40px 20px' }}
                    />
                )}

                {!showAll && hasMore && comments.length > 0 && comments.length >= 5 && (
                    <div style={{ textAlign: 'center', marginTop: '20px' }}>
                        <Button
                            onClick={loadMoreComments}
                            loading={loading}
                            style={{ color: '#007185', borderColor: '#007185' }}
                        >
                            Load More Comments
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CommentsSection;
import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import Navbar from "./Navbar";
import { FaSyncAlt, FaGavel, FaTag, FaUser, FaInfoCircle } from "react-icons/fa";

function BidNotification() {
    const [bids, setBids] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchBids = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            const { data } = await axios.get("/api/bids");
            setBids(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Error fetching bids:", error.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchBids();
    }, [fetchBids]);

    return (
        <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
            <Navbar />
            <div className="container py-4" style={{ maxWidth: 900 }}>
                <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
                    <div>
                        <h2 className="mb-1 fw-bold text-dark d-flex align-items-center gap-2">
                            <FaGavel style={{ color: "#2563eb" }} /> Received Requirement Bids
                        </h2>
                        <p className="text-muted mb-0 small">
                            Real-time overview of bids placed on service requirements
                        </p>
                    </div>
                    <button
                        type="button"
                        className="btn btn-outline-primary d-flex align-items-center gap-2 rounded-pill px-3 py-2"
                        onClick={() => fetchBids(true)}
                        disabled={refreshing}
                    >
                        <FaSyncAlt className={refreshing ? "fa-spin" : ""} />
                        <span>{refreshing ? "Refreshing..." : "Refresh Bids"}</span>
                    </button>
                </div>

                {loading ? (
                    <div className="text-center py-5">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading bids...</span>
                        </div>
                        <p className="mt-2 text-muted">Loading bids...</p>
                    </div>
                ) : bids.length > 0 ? (
                    <div className="row g-3">
                        {bids.map((bid) => (
                            <div key={bid._id} className="col-12">
                                <div
                                    className="card shadow-sm border-0"
                                    style={{
                                        borderRadius: 14,
                                        borderLeft: "5px solid #2563eb",
                                        background: "#ffffff"
                                    }}
                                >
                                    <div className="card-body p-4">
                                        <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                                            <div>
                                                <h5 className="card-title fw-bold text-dark mb-1">
                                                    {bid.requirement?.serviceType || "General Requirement"}
                                                </h5>
                                                <span className="badge bg-light text-primary border mb-2">
                                                    <FaTag className="me-1" />
                                                    {bid.requirement?.category || "Service Bid"}
                                                </span>
                                            </div>
                                            <div className="text-end">
                                                <div className="fs-4 fw-bold text-success">
                                                    ₹{bid.price}
                                                </div>
                                                <small className="text-muted">Offered Bid Price</small>
                                            </div>
                                        </div>

                                        <p className="card-text text-secondary mt-2 mb-3" style={{ fontSize: "0.95rem" }}>
                                            {bid.description || "No additional description provided."}
                                        </p>

                                        <div className="d-flex justify-content-between align-items-center pt-2 border-top text-muted small flex-wrap gap-2">
                                            <span className="d-flex align-items-center gap-1">
                                                <FaUser className="text-primary" />
                                                Bidder: <strong>{bid.user?.name || "Anonymous User"}</strong>
                                            </span>
                                            {bid.createdAt && (
                                                <span>
                                                    Submitted: {new Date(bid.createdAt).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div
                        className="text-center py-5 bg-white rounded-3 shadow-sm p-4"
                        style={{ borderRadius: 16 }}
                    >
                        <FaInfoCircle className="text-muted mb-3" style={{ fontSize: "2.5rem" }} />
                        <h5 className="fw-bold text-dark">No Bids Received Yet</h5>
                        <p className="text-muted mb-0">
                            When helpers or vendors submit bids for requirements, they will appear here in real time.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default BidNotification;

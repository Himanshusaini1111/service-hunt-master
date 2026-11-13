import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { Tabs, Table, message, Select, Modal, Button } from "antd";
import "./VendorHelperInfo.css";

const { TabPane } = Tabs;
const { Option } = Select;

export function VendorHelperInfo({ bookingId, userId }) {
    const [currentBookingId, setCurrentBookingId] = useState(bookingId);

    useEffect(() => {
        setCurrentBookingId(bookingId);
    }, [bookingId]);

    return (
        <div className="vhi-wrapper">
            {/* Header Surface */}
            <div className="vhi-header-card">
                <div className="vhi-header-main">
                    <div className="vhi-header-icon">👷</div>
                    <div className="vhi-header-text-wrap">
                        <h2 className="vhi-header-title">Helper Management Studio</h2>
                        <p className="vhi-header-subtitle">
                            Monitor field technicians, verify real-time status, and dispatch crew to jobs
                        </p>
                    </div>
                </div>

                <div className="vhi-header-badges">
                    {currentBookingId ? (
                        <div className="vhi-booking-pill">
                            <span>🎯 Target Booking:</span>
                            <span className="vhi-bid-mono">#{currentBookingId}</span>
                        </div>
                    ) : (
                        <div className="vhi-booking-pill no-booking">
                            <span>ℹ️ Select a booking to dispatch crew</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Tabs Container */}
            <div className="vhi-tabs-wrap">
                <Tabs defaultActiveKey="1" tabBarGutter={8}>
                    <TabPane
                        tab={<span>👥 View &amp; Assign Helpers</span>}
                        key="1"
                    >
                        <div className="vhi-tab-pane-content">
                            <ViewHelpers bookingId={currentBookingId} userId={userId} />
                        </div>
                    </TabPane>

                    <TabPane
                        tab={<span>➕ Register New Helper</span>}
                        key="2"
                    >
                        <div className="vhi-tab-pane-content">
                            <AddHelper userId={userId} />
                        </div>
                    </TabPane>
                </Tabs>
            </div>
        </div>
    );
}

function ViewHelpers({ bookingId, userId }) {
    const [helperDetails, setHelperDetails] = useState([]);
    const [selectedHelpers, setSelectedHelpers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [assigning, setAssigning] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'online' | 'offline'

    const fetchHelperDetails = useCallback(async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const response = await axios.get(`/api/vendor/helpers?userid=${userId}`);
            setHelperDetails(Array.isArray(response.data) ? response.data : []);
            setError(null);
        } catch (err) {
            setError("Failed to fetch helper details. Please try again.");
            console.error("Error fetching helper details:", err);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        fetchHelperDetails();
    }, [fetchHelperDetails]);

    const handleHelperSelection = (helperId) => {
        setSelectedHelpers((prev) =>
            prev.includes(helperId)
                ? prev.filter((id) => id !== helperId)
                : [...prev, helperId]
        );
    };

    const handleSelectAll = (filteredList) => {
        const ids = filteredList.map((h) => h._id);
        const allSelected = ids.every((id) => selectedHelpers.includes(id));
        if (allSelected) {
            setSelectedHelpers((prev) => prev.filter((id) => !ids.includes(id)));
        } else {
            setSelectedHelpers((prev) => Array.from(new Set([...prev, ...ids])));
        }
    };

    const assignHelpersToBooking = async () => {
        if (!bookingId) {
            message.error("No Booking ID specified. Please select a booking first.");
            return;
        }
        if (selectedHelpers.length === 0) {
            message.warning("Please select at least one helper.");
            return;
        }

        setAssigning(true);
        try {
            await axios.post("/api/bookings/assign-helpers", {
                bookingId,
                helperIds: selectedHelpers,
            });

            message.success(`Successfully assigned ${selectedHelpers.length} helper(s) to Booking #${bookingId}!`);
            setSelectedHelpers([]);
        } catch (err) {
            console.error("Error assigning helpers:", err);
            message.error(err.response?.data?.message || "Failed to assign helpers.");
        } finally {
            setAssigning(false);
        }
    };

    // Filter helpers based on search and status
    const filteredHelpers = helperDetails.filter((helper) => {
        const matchesSearch =
            !searchTerm ||
            helper.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            helper.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            helper.skills?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus =
            statusFilter === "all" ||
            (statusFilter === "online" && helper.isConnected) ||
            (statusFilter === "offline" && !helper.isConnected);

        return matchesSearch && matchesStatus;
    });

    const onlineCount = helperDetails.filter((h) => h.isConnected).length;
    const offlineCount = helperDetails.length - onlineCount;

    // Table Columns Configuration
    const columns = [
        {
            title: "#",
            key: "index",
            width: 50,
            align: "center",
            render: (_text, _record, index) => index + 1,
        },
        {
            title: "Select",
            key: "select",
            width: 70,
            align: "center",
            render: (_, helper) => (
                <input
                    type="checkbox"
                    className="vhi-custom-checkbox"
                    checked={selectedHelpers.includes(helper._id)}
                    onChange={() => handleHelperSelection(helper._id)}
                    aria-label={`Select helper ${helper.name}`}
                />
            ),
        },
        {
            title: "Helper Details",
            key: "helperDetails",
            render: (_, helper) => {
                const initials = helper.name
                    ? helper.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
                    : "H";
                return (
                    <div className="vhi-helper-user-cell">
                        <div className="vhi-avatar">{initials}</div>
                        <div className="vhi-user-info-text">
                            <span className="vhi-user-name">{helper.name}</span>
                            <span className="vhi-code-badge">ID: {helper.code || "N/A"}</span>
                        </div>
                    </div>
                );
            },
        },
        {
            title: "Status",
            key: "status",
            width: 120,
            render: (_, helper) => (
                <span className={`vhi-status-pill ${helper.isConnected ? "online" : "offline"}`}>
                    {helper.isConnected ? "Online" : "Offline"}
                </span>
            ),
        },
        {
            title: "Contact",
            key: "contact",
            render: (_, helper) => (
                <div style={{ fontSize: "13px", lineHeight: "1.5" }}>
                    <div>
                        📞 <a href={`tel:${helper.phone}`} className="vhi-contact-link">{helper.phone || "—"}</a>
                    </div>
                    <div style={{ color: "#64748b", fontSize: "12px" }}>
                        ✉️ {helper.email || "—"}
                    </div>
                </div>
            ),
            responsive: ["md"],
        },
        {
            title: "Experience",
            dataIndex: "experience",
            key: "experience",
            width: 120,
            render: (exp) => (
                <span style={{ fontWeight: 600, color: "#2563eb", background: "#eff6ff", padding: "3px 8px", borderRadius: "6px" }}>
                    ⭐ {exp ? `${exp} yrs` : "N/A"}
                </span>
            ),
            responsive: ["md"],
        },
        {
            title: "Skills / Services",
            dataIndex: "skills",
            key: "skills",
            render: (skills) => {
                if (!skills) return <span style={{ color: "#94a3b8" }}>—</span>;
                const items = typeof skills === "string" ? skills.split(",") : [skills];
                return (
                    <div className="vhi-skills-badge-list">
                        {items.slice(0, 3).map((s, idx) => (
                            <span key={idx} className="vhi-skill-chip">{s.trim()}</span>
                        ))}
                        {items.length > 3 && (
                            <span className="vhi-skill-chip" style={{ background: "#e2e8f0" }}>+{items.length - 3}</span>
                        )}
                    </div>
                );
            },
            responsive: ["lg"],
        },
    ];

    return (
        <div>
            {/* Quick Metrics Ribbon (2x2 on mobile, 4 on desktop) */}
            <div className="vhi-stats-ribbon">
                <div className="vhi-stat-card total">
                    <div className="vhi-stat-icon">👥</div>
                    <div className="vhi-stat-info">
                        <div className="vhi-stat-val">{helperDetails.length}</div>
                        <div className="vhi-stat-lbl">Total Helpers</div>
                    </div>
                </div>

                <div className="vhi-stat-card online">
                    <div className="vhi-stat-icon">🟢</div>
                    <div className="vhi-stat-info">
                        <div className="vhi-stat-val">{onlineCount}</div>
                        <div className="vhi-stat-lbl">Online Ready</div>
                    </div>
                </div>

                <div className="vhi-stat-card offline">
                    <div className="vhi-stat-icon">⚪</div>
                    <div className="vhi-stat-info">
                        <div className="vhi-stat-val">{offlineCount}</div>
                        <div className="vhi-stat-lbl">Offline</div>
                    </div>
                </div>

                <div className="vhi-stat-card selected">
                    <div className="vhi-stat-icon">✓</div>
                    <div className="vhi-stat-info">
                        <div className="vhi-stat-val">{selectedHelpers.length}</div>
                        <div className="vhi-stat-lbl">Selected for Job</div>
                    </div>
                </div>
            </div>

            {/* Controls & Filter Bar */}
            <div className="vhi-controls-bar">
                <div className="vhi-search-input-wrap">
                    <span className="vhi-search-icon">🔍</span>
                    <input
                        type="text"
                        className="vhi-search-input"
                        placeholder="Search helpers by name, code, or skill..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="vhi-filter-pills">
                    <button
                        type="button"
                        className={`vhi-filter-pill-btn ${statusFilter === "all" ? "active" : ""}`}
                        onClick={() => setStatusFilter("all")}
                    >
                        All ({helperDetails.length})
                    </button>
                    <button
                        type="button"
                        className={`vhi-filter-pill-btn ${statusFilter === "online" ? "active" : ""}`}
                        onClick={() => setStatusFilter("online")}
                    >
                        Online ({onlineCount})
                    </button>
                    <button
                        type="button"
                        className={`vhi-filter-pill-btn ${statusFilter === "offline" ? "active" : ""}`}
                        onClick={() => setStatusFilter("offline")}
                    >
                        Offline ({offlineCount})
                    </button>
                </div>

                {filteredHelpers.length > 0 && (
                    <div className="vhi-selection-actions">
                        <button
                            type="button"
                            className="vhi-select-toggle-btn"
                            onClick={() => handleSelectAll(filteredHelpers)}
                        >
                            {filteredHelpers.every((h) => selectedHelpers.includes(h._id))
                                ? "Deselect All"
                                : "Select All Filtered"}
                        </button>
                    </div>
                )}
            </div>

            {/* Error Message */}
            {error && (
                <div style={{
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    color: "#dc2626",
                    padding: "12px 16px",
                    borderRadius: "10px",
                    marginBottom: "16px",
                    fontSize: "14px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                }}>
                    <span>⚠️</span>
                    <span>{error}</span>
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div className="vhi-loading-wrap">
                    <div className="vhi-spinner"></div>
                    <p style={{ marginTop: "12px", color: "#64748b", fontSize: "14px" }}>
                        Loading technician profiles...
                    </p>
                </div>
            )}

            {/* Content Display: Desktop Table View */}
            {!loading && filteredHelpers.length > 0 && (
                <>
                    <div className="vhi-desktop-table-view">
                        <div className="vhi-table-container">
                            <Table
                                dataSource={filteredHelpers}
                                rowKey="_id"
                                columns={columns}
                                rowClassName={(record) =>
                                    selectedHelpers.includes(record._id) ? "vhi-row-selected" : ""
                                }
                                pagination={{
                                    pageSize: 10,
                                    showTotal: (total, range) =>
                                        `Showing ${range[0]}-${range[1]} of ${total} helpers`,
                                }}
                            />
                        </div>
                    </div>

                    {/* Content Display: Mobile/Tablet Cards View */}
                    <div className="vhi-mobile-cards-view">
                        <div className="vhi-mobile-grid">
                            {filteredHelpers.map((helper) => {
                                const isSelected = selectedHelpers.includes(helper._id);
                                const initials = helper.name
                                    ? helper.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
                                    : "H";

                                return (
                                    <div
                                        key={helper._id}
                                        className={`vhi-mobile-card ${isSelected ? "is-selected" : ""}`}
                                        onClick={() => handleHelperSelection(helper._id)}
                                    >
                                        <div className="vhi-mcard-top">
                                            <div className="vhi-mcard-user">
                                                <div className="vhi-avatar">{initials}</div>
                                                <div className="vhi-mcard-user-info">
                                                    <div className="vhi-mcard-name">{helper.name}</div>
                                                    <span className="vhi-code-badge">ID: {helper.code || "N/A"}</span>
                                                </div>
                                            </div>

                                            <div className="vhi-mcard-actions">
                                                <span className={`vhi-status-pill ${helper.isConnected ? "online" : "offline"}`}>
                                                    {helper.isConnected ? "Online" : "Offline"}
                                                </span>
                                                <input
                                                    type="checkbox"
                                                    className="vhi-custom-checkbox"
                                                    checked={isSelected}
                                                    onChange={(e) => {
                                                        e.stopPropagation();
                                                        handleHelperSelection(helper._id);
                                                    }}
                                                    aria-label={`Select helper ${helper.name}`}
                                                />
                                            </div>
                                        </div>

                                        <div className="vhi-mcard-details">
                                            <div className="vhi-mdetail-row">
                                                <span className="lbl">📞 Phone:</span>
                                                <span className="val">
                                                    <a href={`tel:${helper.phone}`} className="vhi-contact-link" onClick={(e) => e.stopPropagation()}>
                                                        {helper.phone || "—"}
                                                    </a>
                                                </span>
                                            </div>
                                            <div className="vhi-mdetail-row">
                                                <span className="lbl">✉️ Email:</span>
                                                <span className="val">
                                                    <a href={`mailto:${helper.email}`} className="vhi-contact-link" onClick={(e) => e.stopPropagation()}>
                                                        {helper.email || "—"}
                                                    </a>
                                                </span>
                                            </div>
                                            <div className="vhi-mdetail-row">
                                                <span className="lbl">💼 Experience:</span>
                                                <span className="val">{helper.experience ? `${helper.experience} years` : "—"}</span>
                                            </div>
                                            {helper.skills && (
                                                <div className="vhi-mdetail-row" style={{ alignItems: "flex-start" }}>
                                                    <span className="lbl">⚡ Skills:</span>
                                                    <span className="val" style={{ textAlign: "right", flex: 1 }}>{helper.skills}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Elevated Action Dock for Helper Assignment */}
                    {selectedHelpers.length > 0 && (
                        <div className="vhi-assign-dock">
                            <div className="vhi-assign-dock-info">
                                <span className="vhi-assign-icon">🚀</span>
                                <div>
                                    <p className="vhi-assign-text-main">
                                        {selectedHelpers.length} Helper{selectedHelpers.length > 1 ? "s" : ""} Selected
                                    </p>
                                    <p className="vhi-assign-text-sub">
                                        {bookingId
                                            ? `Ready to dispatch to Booking #${bookingId}`
                                            : "Notice: No booking active. Open from Bookings to assign."}
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                className="vhi-assign-confirm-btn"
                                onClick={assignHelpersToBooking}
                                disabled={!bookingId || assigning}
                            >
                                {assigning ? (
                                    <>
                                        <span className="vhi-spinner" style={{ width: "16px", height: "16px", borderWidth: "2px" }}></span>
                                        <span>Dispatching...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>⚡ Assign to Booking</span>
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* Empty State */}
            {!loading && filteredHelpers.length === 0 && (
                <div className="vhi-empty-state">
                    <div className="vhi-empty-icon">👷‍♂️</div>
                    <h3 className="vhi-empty-title">
                        {helperDetails.length === 0
                            ? "No helpers registered yet"
                            : "No matching helpers found"}
                    </h3>
                    <p className="vhi-empty-desc">
                        {helperDetails.length === 0
                            ? "Register your field technicians and helpers using the 'Register New Helper' tab to start assigning them to customer bookings."
                            : "Try adjusting your search criteria or switching status filter tabs."}
                    </p>
                </div>
            )}
        </div>
    );
}

function AddHelper({ userId }) {
    const [inputHelperInfo, setInputHelperInfo] = useState({
        name: "",
        phone: "",
        email: "",
        address: "",
        age: "",
        idProof: null,
        experience: "",
        skills: "",
        availability: "Full-time",
        policeVerification: false,
        pastWorkPhotos: [],
    });
    const [loading, setLoading] = useState(false);
    const [newlyCreatedHelper, setNewlyCreatedHelper] = useState(null);

    // Add refs for file inputs
    const idProofRef = useRef(null);
    const pastWorkPhotosRef = useRef(null);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setInputHelperInfo((prev) => ({ ...prev, [name]: value }));
    };

    const handleIdProofChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setInputHelperInfo((prev) => ({
                ...prev,
                idProof: file,
            }));
        }
    };

    const handlePastWorkPhotosChange = (e) => {
        const files = Array.from(e.target.files);
        setInputHelperInfo((prev) => ({
            ...prev,
            pastWorkPhotos: files,
        }));
    };

    const handleResetForm = () => {
        setInputHelperInfo({
            name: "",
            phone: "",
            email: "",
            address: "",
            age: "",
            idProof: null,
            experience: "",
            skills: "",
            availability: "Full-time",
            policeVerification: false,
            pastWorkPhotos: [],
        });
        if (idProofRef.current) idProofRef.current.value = "";
        if (pastWorkPhotosRef.current) pastWorkPhotosRef.current.value = "";
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Basic validation
        if (
            !inputHelperInfo.name ||
            !inputHelperInfo.phone ||
            !inputHelperInfo.email ||
            !inputHelperInfo.idProof
        ) {
            message.error("Please fill all required fields including Government ID Proof.");
            return;
        }

        const formData = new FormData();

        // Append files
        if (inputHelperInfo.idProof) {
            formData.append("idProof", inputHelperInfo.idProof);
        }

        if (inputHelperInfo.pastWorkPhotos && inputHelperInfo.pastWorkPhotos.length > 0) {
            inputHelperInfo.pastWorkPhotos.forEach((photo) => {
                formData.append("pastWorkPhotos", photo);
            });
        }

        // Append other fields
        Object.entries(inputHelperInfo).forEach(([key, value]) => {
            if (key !== "idProof" && key !== "pastWorkPhotos" && value !== null) {
                formData.append(key, value.toString());
            }
        });

        // Append vendorId
        formData.append("vendorId", userId);

        try {
            setLoading(true);
            const res = await axios.post("/api/vendor/add", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });

            if (res.data.success) {
                message.success(res.data.message || "Helper registered successfully!");
                if (res.data.helper) {
                    setNewlyCreatedHelper(res.data.helper);
                }
                handleResetForm();
            } else {
                message.warning(res.data.message || "Helper could not be added.");
            }
        } catch (err) {
            console.error("Submission error:", err);
            let errorMessage = "Failed to add helper";
            if (err.response) {
                errorMessage = err.response.data?.message || errorMessage;
                console.error("Server response:", err.response.data);
            } else if (err.request) {
                errorMessage = "No response from server";
            }
            message.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="vhi-add-form-container">
            <div className="vhi-form-header-callout">
                <span className="vhi-callout-icon">💡</span>
                <div className="vhi-callout-text">
                    <h4>Register a Field Technician</h4>
                    <p>
                        Onboarding helpers allows you to assign specific staff to incoming bookings and lets them log into their Helper Station with their unique credentials.
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                {/* Section 1: Personal Details */}
                <div className="vhi-form-card-section">
                    <div className="vhi-section-legend">
                        <span className="legend-icon">👤</span>
                        <span>Personal Information</span>
                    </div>

                    <div className="vhi-grid-2col">
                        <div className="vhi-field-group">
                            <label className="vhi-field-label">
                                Full Name <span className="req">*</span>
                            </label>
                            <input
                                type="text"
                                className="vhi-input-styled"
                                name="name"
                                value={inputHelperInfo.name}
                                onChange={handleChange}
                                placeholder="e.g. John Doe"
                                required
                            />
                        </div>

                        <div className="vhi-field-group">
                            <label className="vhi-field-label">
                                Phone Number <span className="req">*</span>
                            </label>
                            <input
                                type="tel"
                                className="vhi-input-styled"
                                name="phone"
                                value={inputHelperInfo.phone}
                                onChange={handleChange}
                                placeholder="e.g. +91 9876543210"
                                required
                            />
                        </div>

                        <div className="vhi-field-group">
                            <label className="vhi-field-label">
                                Email Address <span className="req">*</span>
                            </label>
                            <input
                                type="email"
                                className="vhi-input-styled"
                                name="email"
                                value={inputHelperInfo.email}
                                onChange={handleChange}
                                placeholder="e.g. helper@domain.com"
                                required
                            />
                        </div>

                        <div className="vhi-field-group">
                            <label className="vhi-field-label">
                                Age
                            </label>
                            <input
                                type="number"
                                className="vhi-input-styled"
                                name="age"
                                min="18"
                                max="70"
                                value={inputHelperInfo.age}
                                onChange={handleChange}
                                placeholder="e.g. 28"
                            />
                        </div>
                    </div>

                    <div style={{ marginTop: "14px" }} className="vhi-field-group">
                        <label className="vhi-field-label">
                            Residential Address <span className="req">*</span>
                        </label>
                        <input
                            type="text"
                            className="vhi-input-styled"
                            name="address"
                            value={inputHelperInfo.address}
                            onChange={handleChange}
                            placeholder="Full street address, city, and postal code"
                            required
                        />
                    </div>
                </div>

                {/* Section 2: Professional Details */}
                <div className="vhi-form-card-section">
                    <div className="vhi-section-legend">
                        <span className="legend-icon">💼</span>
                        <span>Professional Qualifications</span>
                    </div>

                    <div className="vhi-grid-2col">
                        <div className="vhi-field-group">
                            <label className="vhi-field-label">
                                Experience (Years) <span className="req">*</span>
                            </label>
                            <input
                                type="text"
                                className="vhi-input-styled"
                                name="experience"
                                value={inputHelperInfo.experience}
                                onChange={handleChange}
                                placeholder="e.g. 3"
                                required
                            />
                        </div>

                        <div className="vhi-field-group">
                            <label className="vhi-field-label">
                                Availability <span className="req">*</span>
                            </label>
                            <Select
                                value={inputHelperInfo.availability}
                                onChange={(value) =>
                                    setInputHelperInfo((prev) => ({ ...prev, availability: value }))
                                }
                                style={{ width: "100%", height: "42px" }}
                            >
                                <Option value="Full-time">Full-time (Standard)</Option>
                                <Option value="Part-time">Part-time (On-demand)</Option>
                            </Select>
                        </div>
                    </div>

                    <div style={{ marginTop: "14px" }} className="vhi-field-group">
                        <label className="vhi-field-label">
                            Skills &amp; Specializations <span className="req">*</span>
                        </label>
                        <input
                            type="text"
                            className="vhi-input-styled"
                            name="skills"
                            value={inputHelperInfo.skills}
                            onChange={handleChange}
                            placeholder="e.g. Electrical wiring, AC servicing, Pipe fitting"
                            required
                        />
                    </div>

                    <div style={{ marginTop: "14px" }} className="vhi-field-group">
                        <label className="vhi-field-label">
                            Police Background Verification <span className="req">*</span>
                        </label>
                        <Select
                            value={inputHelperInfo.policeVerification}
                            onChange={(value) =>
                                setInputHelperInfo((prev) => ({ ...prev, policeVerification: value }))
                            }
                            style={{ width: "100%", height: "42px" }}
                        >
                            <Option value={true}>✅ Verified by Local Authorities</Option>
                            <Option value={false}>⏳ Pending / Not Verified</Option>
                        </Select>
                    </div>
                </div>

                {/* Section 3: Verification & Documentation */}
                <div className="vhi-form-card-section">
                    <div className="vhi-section-legend">
                        <span className="legend-icon">📄</span>
                        <span>Verification &amp; Proof of Work</span>
                    </div>

                    <div className="vhi-grid-2col">
                        <div className="vhi-field-group">
                            <label className="vhi-field-label">
                                Government ID Proof <span className="req">*</span>
                            </label>
                            <div className="vhi-file-dropzone">
                                <input
                                    type="file"
                                    ref={idProofRef}
                                    onChange={handleIdProofChange}
                                    accept=".pdf,.jpg,.png,.jpeg"
                                    required
                                />
                                <div className="vhi-dropzone-content">
                                    <span className="vhi-dropzone-icon">📁</span>
                                    <p className="vhi-dropzone-title">Upload Official ID Proof</p>
                                    <p className="vhi-dropzone-hint">PDF, JPG, PNG up to 10MB</p>
                                    {inputHelperInfo.idProof && (
                                        <div className="vhi-file-selected-tag">
                                            📄 {inputHelperInfo.idProof.name}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="vhi-field-group">
                            <label className="vhi-field-label">
                                Past Work Photos (Optional)
                            </label>
                            <div className="vhi-file-dropzone">
                                <input
                                    type="file"
                                    multiple
                                    ref={pastWorkPhotosRef}
                                    onChange={handlePastWorkPhotosChange}
                                    accept=".jpg,.png,.jpeg"
                                />
                                <div className="vhi-dropzone-content">
                                    <span className="vhi-dropzone-icon">📸</span>
                                    <p className="vhi-dropzone-title">Upload Work Showcase</p>
                                    <p className="vhi-dropzone-hint">Multiple photos allowed</p>
                                    {inputHelperInfo.pastWorkPhotos && inputHelperInfo.pastWorkPhotos.length > 0 && (
                                        <div className="vhi-file-selected-tag">
                                            🖼️ {inputHelperInfo.pastWorkPhotos.length} photo(s) selected
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Form Action Buttons */}
                <div className="vhi-form-actions-bar">
                    <button
                        type="button"
                        className="vhi-reset-btn"
                        onClick={handleResetForm}
                        disabled={loading}
                    >
                        Reset Form
                    </button>

                    <button
                        type="submit"
                        className="vhi-submit-btn"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <span className="vhi-spinner" style={{ width: "16px", height: "16px", borderWidth: "2px" }}></span>
                                <span>Registering Helper...</span>
                            </>
                        ) : (
                            <>
                                <span>➕ Complete Helper Registration</span>
                            </>
                        )}
                    </button>
                </div>
            </form>

            {/* Generated Helper Unique Code Announcement Modal */}
            <Modal
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 24 }}>🎉</span>
                        <span style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>Helper Registered Successfully!</span>
                    </div>
                }
                open={Boolean(newlyCreatedHelper)}
                onOk={() => setNewlyCreatedHelper(null)}
                onCancel={() => setNewlyCreatedHelper(null)}
                footer={[
                    <Button
                        key="copy"
                        type="default"
                        onClick={() => {
                            if (newlyCreatedHelper?.code) {
                                navigator.clipboard.writeText(newlyCreatedHelper.code);
                                message.success("Unique Code copied to clipboard!");
                            }
                        }}
                    >
                        📋 Copy Code
                    </Button>,
                    <Button
                        key="done"
                        type="primary"
                        onClick={() => setNewlyCreatedHelper(null)}
                        style={{ background: '#4f46e5', borderColor: '#4f46e5' }}
                    >
                        Done
                    </Button>
                ]}
                centered
            >
                {newlyCreatedHelper && (
                    <div style={{ padding: '12px 4px' }}>
                        <p style={{ color: '#475569', fontSize: 14, marginBottom: 16 }}>
                            A unique security code has been generated for <strong>{newlyCreatedHelper.name}</strong>.
                        </p>

                        <div style={{
                            background: '#f8fafc',
                            border: '1.5px dashed #4f46e5',
                            borderRadius: '12px',
                            padding: '16px',
                            textAlign: 'center',
                            marginBottom: '16px'
                        }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Helper Unique Access Code
                            </div>
                            <div style={{ fontSize: 32, fontWeight: 800, color: '#1e1b4b', letterSpacing: '4px', margin: '8px 0' }}>
                                {newlyCreatedHelper.code}
                            </div>
                            <div style={{ fontSize: 13, color: '#64748b' }}>
                                Registered Email: <strong>{newlyCreatedHelper.email}</strong>
                            </div>
                        </div>

                        <div style={{
                            background: '#eff6ff',
                            borderLeft: '4px solid #3b82f6',
                            padding: '10px 14px',
                            borderRadius: '4px',
                            fontSize: 13,
                            color: '#1e40af',
                            lineHeight: 1.5
                        }}>
                            ℹ️ <strong>How helper connects:</strong> When this helper logs into Service Hunt with this email (<strong>{newlyCreatedHelper.email}</strong>), the <strong>Helper Panel</strong> will automatically appear directly in their top navbar. They enter this 5-digit code to connect with your admin account!
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}

export default VendorHelperInfo;

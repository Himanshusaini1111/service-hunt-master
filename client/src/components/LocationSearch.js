import React, { useState, useCallback, useEffect } from "react";
import debounce from "lodash.debounce";

const LocationSearch = ({ onLocationSelect, placeholder = "Enter location..." }) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [suggestions, setSuggestions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    // Handle window resize
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Debounced search function
    const debouncedSearch = useCallback(
        debounce(async (query) => {
            if (query.length < 2) {
                setSuggestions([]);
                return;
            }

            setIsLoading(true);
            setError(null);

            try {
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=in&addressdetails=1&limit=5`
                );

                if (!response.ok) throw new Error("Failed to fetch locations");

                const data = await response.json();
                setSuggestions(data);
            } catch (err) {
                setError(err.message);
                console.error("Error fetching locations:", err);
            } finally {
                setIsLoading(false);
            }
        }, 500),
        []
    );

    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchQuery(value);
        debouncedSearch(value);
    };

    const handleClear = () => {
        setSearchQuery("");
        setSuggestions([]);
        setError(null);
        onLocationSelect?.(null);
    };

    const handleSelectLocation = (location) => {
        console.log("Location selected in LocationSearch:", location);
        setSearchQuery(location.display_name);
        setSuggestions([]);
        onLocationSelect?.(location);
    };

    return (
        <div style={{ position: "relative", width: "100%" }}>
            <div style={{ position: "relative" }}>
                <input
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    placeholder={placeholder}
                    style={{
                        width: "100%",
                        height: isMobile ? "48px" : "56px",
                        padding: "0 50px 0 20px",
                        border: "2px solid #E2E8F0",
                        borderRadius: "12px",
                        fontSize: isMobile ? "14px" : "16px",
                        fontWeight: "400",
                        outline: "none",
                        transition: "all 0.3s ease",
                        backgroundColor: "#FFFFFF",
                        boxSizing: "border-box",
                        color: "#2D3748"
                    }}
                    onFocus={(e) => {
                        e.target.style.borderColor = "#4299E1";
                        e.target.style.boxShadow = "0 0 0 3px rgba(66, 153, 225, 0.1)";
                        e.target.style.backgroundColor = "#F7FAFC";
                    }}
                    onBlur={(e) => {
                        e.target.style.borderColor = "#E2E8F0";
                        e.target.style.boxShadow = "none";
                        e.target.style.backgroundColor = "#FFFFFF";
                    }}
                />
                
                <div style={{
                    position: "absolute",
                    right: "50px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#A0AEC0",
                    fontSize: "18px"
                }}>
                    📍
                </div>

                {searchQuery && (
                    <button
                        onClick={handleClear}
                        style={{
                            position: "absolute",
                            right: "15px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            fontSize: "20px",
                            color: "#666",
                            lineHeight: "1",
                            width: "24px",
                            height: "24px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: "50%",
                            transition: "background-color 0.2s"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f5f5f5"}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                    >
                        ×
                    </button>
                )}
            </div>

            {/* Loading/Error State */}
            {(isLoading || error) && (
                <div style={{
                    marginTop: "4px",
                    padding: "8px",
                    fontSize: "14px",
                    color: error ? "#ff4444" : "#666",
                    backgroundColor: "#f9f9f9",
                    borderRadius: "4px"
                }}>
                    {isLoading ? "Searching locations..." : error}
                </div>
            )}

            {/* Suggestions Dropdown */}
            {suggestions.length > 0 && (
                <div style={{
                    position: "absolute",
                    width: "100%",
                    maxHeight: "300px",
                    overflowY: "auto",
                    backgroundColor: "white",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    zIndex: 1000,
                    marginTop: "4px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
                }}>
                    {suggestions.map((location) => (
                        <div
                            key={location.place_id}
                            onClick={() => handleSelectLocation(location)}
                            style={{
                                padding: isMobile ? "12px 16px" : "12px 16px",
                                cursor: "pointer",
                                borderBottom: "1px solid #f0f0f0",
                                backgroundColor: "white",
                                transition: "background-color 0.2s",
                                display: "flex",
                                alignItems: "center",
                                gap: "10px"
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f8f9fa"}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "white"}
                        >
                            <span style={{ fontSize: "18px" }}>📍</span>
                            <div>
                                <div style={{ fontWeight: "500", color: "#333", fontSize: isMobile ? "14px" : "16px" }}>
                                    {location.name || location.display_name.split(',')[0]}
                                </div>
                                <div style={{ fontSize: isMobile ? "11px" : "12px", color: "#666", marginTop: "2px" }}>
                                    {location.display_name.length > (isMobile ? 60 : 80) 
                                        ? location.display_name.substring(0, isMobile ? 60 : 80) + '...'
                                        : location.display_name}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default LocationSearch;
import React from 'react';
import Service from './Service';

const SearchResults = ({ 
    filteredServices, 
    onClearSearch, 
    selectedLocation 
}) => {
    if (filteredServices.length === 0) {
        return (
            <div style={{ 
                padding: '20px', 
                backgroundColor: '#FFFFFF', 
                borderRadius: '10px', 
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
                width: '100%',
                maxWidth: '900px',
                margin: '30px auto'
            }}>
                <div style={{ textAlign: "center", padding: "40px" }}>
                    <p style={{ fontSize: '1.1rem', color: '#4a5568', marginBottom: '16px' }}>
                        No services found matching your criteria in this location.
                    </p>
                    <button
                        onClick={onClearSearch}
                        style={{
                            padding: "8px 20px",
                            backgroundColor: "#4a54e1",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontWeight: 600
                        }}
                    >
                        Clear Search
                    </button>
                </div>
            </div>
        );
    }

    return (
       <div className="d-flex justify-content-center" style={{ width: '100%', marginTop: '20px' }}>
          <div className="col-md-8">
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: "100%",
              }}
            >
              {filteredServices.map((service) => (
                <div key={service._id} style={{ width: "100%", maxWidth: "900px", marginBottom: "16px" }}>
                  <Service service={service} bookingArea={selectedLocation} />
                </div>
              ))}
            </div>
          </div>
        </div>
    );
};

export default SearchResults;

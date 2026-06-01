import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Service from './Service';

const SearchResults = ({ 
    filteredServices, 
    onClearSearch, 
    selectedLocation 
}) => {
    const navigate = useNavigate();

    // Handle browser back button
    useEffect(() => {
        const handlePopState = () => {
            // Clear search when back button is pressed
            onClearSearch();
        };

        // Add event listener for popstate (browser back/forward buttons)
        window.addEventListener('popstate', handlePopState);

        // Cleanup event listener
        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, [onClearSearch]);

    // Push a new state to history when search results are shown
    useEffect(() => {
        // Push a new state to mark that we're in search results
        const currentState = { searchActive: true };
        window.history.pushState(currentState, '', window.location.href);

        return () => {
            // Optional: cleanup if needed
        };
    }, []);

    if (filteredServices.length === 0) {
        return (
            <div style={{ 
                marginTop: '20px', 
                padding: '20px', 
                backgroundColor: '#FFFFFF', 
                borderRadius: '10px', 
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)' 
            }}>
                <div style={{ textAlign: "center", padding: "40px" }}>
                    <p>No services found matching your criteria in this location.</p>
                    <button
                        onClick={onClearSearch}
                        style={{
                            marginTop: "10px",
                            padding: "8px 16px",
                            backgroundColor: "#4a54e1",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            cursor: "pointer"
                        }}
                    >
                        Clear Search
                    </button>
                </div>
            </div>
        );
    }

    return (
       <div className="d-flex justify-content-center">
  <div className="col-md-8">
    <div
      data-aos="zoom-in"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
      }}
    >
      {filteredServices.map((service) => (
        <div key={service._id} style={{ width: "100%", maxWidth: "900px" }}>
          <Service service={service} bookingArea={selectedLocation} />
        </div>
      ))}
    </div>
  </div>
</div>
    );
};

export default SearchResults;
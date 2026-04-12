import React, { useState } from "react";

const About = () => {
    const [activeSection, setActiveSection] = useState(null);

    const toggleSection = (section) => {
        setActiveSection(activeSection === section ? null : section);
    };

    return (
        <div style={styles.page}>
        <nav className="navbar navbar-expand-lg custom-navbar">
                <div className="navbar-brand-section">
                    {/* Brand Logo/Name */}
                    <a className="navbar-brand d-flex align-items-center" href="/home">
                        <h2 className="brand-title mb-0" >
                            Service Hunt
                        </h2>
                    </a>


                </div>
            </nav>

            <style>{`
    .navbar {
        padding: 0.5rem 1rem;
    }

    .brand-title {
        font-size: 1.75rem;
        font-weight: 700;
        letter-spacing: -0.5px;
    }

`}</style>
            <div style={styles.container}>
                {!activeSection && (
                    <div style={styles.gridContainer}>
                        {/* Company Section */}
                        <div style={styles.section}>
                            <h3 style={styles.sectionTitle}>Company</h3>
                            <ul style={styles.list}>
                                <li style={styles.listItem}>
                                    <a href="#about-us" style={styles.link} onClick={() => toggleSection("aboutUs")}>
                                        About us
                                    </a>
                                </li>
                                <li style={styles.listItem}>
                                    <a href="#terms" style={styles.link} onClick={() => toggleSection("terms")}>
                                        Terms & Conditions
                                    </a>
                                </li>
                                <li style={styles.listItem}>
                                    <a href="#privacy" style={styles.link} onClick={() => toggleSection("privacy")}>
                                        Privacy Policy
                                    </a>
                                </li>
                            </ul>
                        </div>

                        {/* Customer Section */}
                        <div style={styles.section}>
                            <h3 style={styles.sectionTitle}>For Customers</h3>
                            <ul style={styles.list}>
                                <li style={styles.listItem}>
                                    <a href="#user-us" style={styles.link} onClick={() => toggleSection("userUs")}>
                                        Why Choose Us?
                                    </a>
                                </li>
                                <li style={styles.listItem}>
                                    <a href="#contact" style={styles.link}>
                                        Contact Support
                                    </a>
                                </li>
                            </ul>
                        </div>

                        {/* Partners Section */}
                        <div style={styles.section}>
                            <h3 style={styles.sectionTitle}>For Partners</h3>
                            <ul style={styles.list}>
                                <li style={styles.listItem}>
                                    <a href="#vendor-us" style={styles.link} onClick={() => toggleSection("vendorUs")}>
                                        Partner Benefits
                                    </a>
                                </li>
                            </ul>
                        </div>

                        {/* Social & Apps Section */}
                        <div style={styles.section}>
                            <h3 style={styles.sectionTitle}>Connect With Us</h3>
                            <div style={styles.socialContainer}>
                                <div style={styles.iconGroup}>
                                    <a href="#twitter" style={styles.iconLink}>
                                        <i className="fab fa-twitter" style={styles.icon}></i>
                                    </a>
                                    <a href="#facebook" style={styles.iconLink}>
                                        <i className="fab fa-facebook" style={styles.icon}></i>
                                    </a>
                                    <a href="#instagram" style={styles.iconLink}>
                                        <i className="fab fa-instagram" style={styles.icon}></i>
                                    </a>
                                    <a href="#linkedin" style={styles.iconLink}>
                                        <i className="fab fa-linkedin" style={styles.icon}></i>
                                    </a>
                                </div>

                                <div style={styles.appLinks}>
                                    <a href="#playstore" style={styles.appLink}>
                                        <img
                                            src="https://upload.wikimedia.org/wikipedia/commons/a/a0/Get_it_on_Google_play.svg"
                                            alt="Google Play"
                                            style={styles.storeImage}
                                        />
                                    </a>
                                    <a href="#appstore" style={styles.appLink}>
                                        <img
                                            src="https://upload.wikimedia.org/wikipedia/commons/5/58/Download_on_the_App_Store_Badge.svg"
                                            alt="App Store"
                                            style={styles.storeImage}
                                        />
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {/* About Us Section */}
                {
                    activeSection === "aboutUs" && (
                        <div id="about-us" style={styles.content}>
                            <h1 style={styles.heading}>About Us</h1>
                            <img
                                src="https://th.bing.com/th/id/OIP.yn6JD0Y-ZbvHNU3gj3gauwHaHa?w=1210&h=1210&rs=1&pid=ImgDetMain"
                                alt="Service Hunt"
                                style={styles.image}
                            />
                            <p style={styles.paragraph}>
                                Welcome to <strong>Service Hunt</strong>, your one-stop destination for all service and event needs.
                                We aim to simplify the process of finding and booking services, making your life hassle-free.
                            </p>

                            <div style={styles.section}>
                                <h2 style={styles.subheading}>Who We Are</h2>
                                <img
                                    src="https://www.success.com/wp-content/uploads/2019/06/thebalancebusiness.jpg"
                                    alt="Who We Are"
                                    style={styles.imageSmall}
                                />
                                <p style={styles.paragraph}>
                                    We are a team of innovators, bringing together local vendors, service providers, and event organizers
                                    on a single platform. Whether you need a plumber, wedding planner, or tickets to a live event, we have you covered.
                                </p>
                            </div>

                            <div style={styles.section}>
                                <h2 style={styles.subheading}>What We Do</h2>
                                <img
                                    src="https://th.bing.com/th/id/OIP.VjaDdG2ppXwMaEewed7TlgHaE7?w=800&h=533&rs=1&pid=ImgDetMain"
                                    alt="What We Do"
                                    style={styles.imageSmall}
                                />
                                <ul style={styles.list}>
                                    <li>✅ Connect You with Trusted Professionals</li>
                                    <li>✅ Simplify Event Planning</li>
                                    <li>✅ Provide Ticketing Solutions</li>
                                    <li>✅ Support Local Businesses</li>
                                </ul>
                            </div>

                            <div style={styles.section}>
                                <h2 style={styles.subheading}>Our Vision</h2>
                                <img
                                    src="https://th.bing.com/th/id/OIP.Z9sBdTxSks6X1nOIVUz1vAHaE7?rs=1&pid=ImgDetMain"
                                    alt="Our Vision"
                                    style={styles.imageSmall}
                                />
                                <p style={styles.paragraph}>
                                    To become the leading platform for services and bookings, fostering connections between people
                                    and businesses while transforming community interactions.
                                </p>
                            </div>

                            <div style={styles.section}>
                                <h2 style={styles.subheading}>Our Mission</h2>
                                <img
                                    src="https://th.bing.com/th/id/OIP.c3yLfXwSbnrQFsa1X-WqWAHaEo?w=1000&h=625&rs=1&pid=ImgDetMain"
                                    alt="Our Mission"
                                    style={styles.imageSmall}
                                />
                                <p style={styles.paragraph}>
                                    To create a seamless, trusted, and comprehensive marketplace where individuals can easily find services,
                                    book events, and discover experiences effortlessly.
                                </p>
                            </div>

                            <button style={styles.backButton} onClick={() => toggleSection(null)}>
                                🔙 Back
                            </button>
                        </div>
                    )
                }




                {/* Vendor Us Section */}
                {
                    activeSection === "vendorUs" && (
                        <div id="vendor-us" style={styles.content}>
                            <div style={styles.vendorContainer}>
                                <h1 style={styles.heading}>Grow Your Business With Us</h1>

                                <div style={styles.heroImageContainer}>
                                    <img
                                        src="https://th.bing.com/th/id/OIP.yELYmy4neggRJg7LrnCmagHaFS?w=1280&h=914&rs=1&pid=ImgDetMain"
                                        alt="Successful vendor partnership"
                                        style={styles.heroImage}
                                    />
                                </div>

                                <div style={styles.vendorBenefits}>
                                    <h2 style={styles.sectionTitle}>
                                        <span style={styles.icon}>🚀</span>
                                        Vendor Advantages
                                    </h2>

                                    <div style={styles.benefitsGrid}>
                                        <div style={styles.benefitCard}>
                                            <div style={styles.benefitIcon}>👁️</div>
                                            <h3 style={styles.benefitTitle}>Enhanced Visibility</h3>
                                            <p>Reach thousands of potential customers in our marketplace</p>
                                        </div>

                                        <div style={styles.benefitCard}>
                                            <div style={styles.benefitIcon}>📈</div>
                                            <h3 style={styles.benefitTitle}>Smart Management</h3>
                                            <p>Real-time booking dashboard and calendar integration</p>
                                        </div>

                                        <div style={styles.benefitCard}>
                                            <div style={styles.benefitIcon}>💰</div>
                                            <h3 style={styles.benefitTitle}>Flexible Payments</h3>
                                            <p>Multiple payout options with secure transactions</p>
                                        </div>

                                        <div style={styles.benefitCard}>
                                            <div style={styles.benefitIcon}>📊</div>
                                            <h3 style={styles.benefitTitle}>Performance Insights</h3>
                                            <p>Detailed analytics and customer feedback reports</p>
                                        </div>
                                    </div>
                                </div>

                                <div style={styles.onboardingProcess}>
                                    <h2 style={styles.sectionTitle}>
                                        <span style={styles.icon}>📝</span>
                                        Simple Onboarding
                                    </h2>

                                    <div style={styles.stepsContainer}>
                                        <div style={styles.stepCard}>
                                            <div style={styles.stepNumber}>1</div>
                                            <h3 style={styles.stepTitle}>Account Setup</h3>
                                            <p>Register your business and verify credentials</p>
                                        </div>

                                        <div style={styles.stepCard}>
                                            <div style={styles.stepNumber}>2</div>
                                            <h3 style={styles.stepTitle}>Profile Creation</h3>
                                            <p>Add services, pricing, and availability</p>
                                        </div>

                                        <div style={styles.stepCard}>
                                            <div style={styles.stepNumber}>3</div>
                                            <h3 style={styles.stepTitle}>Go Live</h3>
                                            <p>Start receiving and managing bookings</p>
                                        </div>

                                        <div style={styles.stepCard}>
                                            <div style={styles.stepNumber}>4</div>
                                            <h3 style={styles.stepTitle}>Growth Support</h3>
                                            <p>Utilize our marketing tools and analytics</p>
                                        </div>
                                    </div>
                                </div>

                                <div style={styles.ctaSection}>
                                    <button
                                        style={styles.ctaButton}
                                        onClick={() => toggleSection(null)}
                                        aria-label="Return to previous page"
                                    >
                                        ← Back to Overview
                                    </button>
                                    <p style={styles.supportText}>
                                        Need help? Contact our <a href="#support" style={styles.supportLink}>partner team</a>
                                    </p>
                                </div>
                            </div>
                        </div>
                    )
                }
                {/* User Us Section */}
                {
                    activeSection === "userUs" && (
                        <div id="user-us" style={styles.content}>
                            <div style={styles.sectionContainer}>
                                <h1 style={styles.heading}>Why Choose Our Platform?</h1>

                                <div style={styles.imageContainer}>
                                    <img
                                        src="https://thumbs.dreamstime.com/z/great-customer-service-words-white-concept-exciting-experience-customers-45526322.jpg"
                                        alt="Happy customers using our platform"
                                        style={styles.featuredImage}
                                    />
                                </div>

                                <div style={styles.sectionContent}>
                                    <section style={styles.featureSection}>
                                        <h2 style={styles.subheading}>
                                            <span style={styles.icon}>🏆</span>
                                            Convenience at Your Fingertips
                                        </h2>
                                        <ul style={styles.featureList}>
                                            <li style={styles.listItem}>
                                                <strong>All-in-One Platform:</strong> Access all services from a single dashboard
                                            </li>
                                            <li style={styles.listItem}>
                                                <strong>Instant Booking:</strong> Find and book services in 3 clicks
                                            </li>
                                            <li style={styles.listItem}>
                                                <strong>Time-Saving:</strong> Reduce planning time by up to 70%
                                            </li>
                                        </ul>
                                    </section>

                                    <section style={styles.featureSection}>
                                        <h2 style={styles.subheading}>
                                            <span style={styles.icon}>🎯</span>
                                            Comprehensive Service Selection
                                        </h2>
                                        <div style={styles.serviceGrid}>
                                            <div style={styles.serviceCategory}>
                                                <h3 style={styles.serviceTitle}>Home Services</h3>
                                                <ul style={styles.serviceList}>
                                                    <li>Plumbing & Electrical</li>
                                                    <li>Cleaning & Maintenance</li>
                                                    <li>Renovation Experts</li>
                                                </ul>
                                            </div>

                                            <div style={styles.serviceCategory}>
                                                <h3 style={styles.serviceTitle}>Event Planning</h3>
                                                <ul style={styles.serviceList}>
                                                    <li>Wedding Specialists</li>
                                                    <li>Catering Services</li>
                                                    <li>Professional Photographers</li>
                                                </ul>
                                            </div>

                                            <div style={styles.serviceCategory}>
                                                <h3 style={styles.serviceTitle}>Entertainment</h3>
                                                <ul style={styles.serviceList}>
                                                    <li>Live Events & Shows</li>
                                                    <li>Adventure Activities</li>
                                                    <li>Family Entertainment</li>
                                                </ul>
                                            </div>
                                        </div>
                                    </section>
                                </div>

                                <div style={styles.buttonContainer}>
                                    <button
                                        style={styles.backButton}
                                        onClick={() => toggleSection(null)}
                                        aria-label="Return to previous page"
                                    >
                                        <span style={styles.buttonIcon}>←</span>
                                        Back to Overview
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                }
                {/* Terms and Conditions Section */}
                {
                    activeSection === "terms" && (
                        <div id="terms" style={styles.content}>
                            <h1 style={styles.heading}>Terms And Conditions</h1>
                            <section>
                                <h2 style={styles.subheading}>For Users:</h2>
                                <ul style={styles.list}>
                                    <li>Users must confirm bookings within the specified timeline.</li>
                                    <li>Cancellations may incur charges, depending on the vendor’s policy.</li>
                                </ul>
                            </section>
                            <section>
                                <h2 style={styles.subheading}>For Vendors:</h2>
                                <ul style={styles.list}>
                                    <li>Vendors must provide accurate business details and comply with local regulations.</li>
                                    <li>Vendors must ensure the quality of their services and adhere to agreed timelines.</li>
                                </ul>
                            </section>
                            <button style={styles.backButton} onClick={() => toggleSection(null)}>
                                Back
                            </button>
                        </div>
                    )
                }

                {/* Privacy Policy Section */}
                {
                    activeSection === "privacy" && (
                        <div id="privacy" style={styles.content}>
                            <h1 style={styles.heading}>Privacy Policy</h1>
                            <section>
                                <h2 style={styles.subheading}>Data Collection</h2>
                                <ul style={styles.list}>
                                    <li>We collect user information (name, email, phone number) for account creation and booking purposes.</li>
                                    <li>We collect vendor details for registration and verification.</li>
                                </ul>
                            </section>
                            <section>
                                <h2 style={styles.subheading}>Data Usage</h2>
                                <ul style={styles.list}>
                                    <li>Your data is used to facilitate bookings, process payments, and provide customer support.</li>
                                    <li>Vendor details are shared with users as required for bookings.</li>
                                </ul>
                            </section>
                            <button style={styles.backButton} onClick={() => toggleSection(null)}>
                                Back
                            </button>
                        </div>
                    )
                }
            </div >
        </div >
    );
};

const styles = {
    page: {
        backgroundColor: '#f0f4f8',
        minHeight: '100vh',
        fontFamily: 'Arial, sans-serif',
    },
    navbar: {
        backgroundColor: '#3498db',
        padding: '20px',
        textAlign: 'center',
        color: '#fff',
    },
    brand: {
        margin: 0,
        fontSize: '2rem',
    },
    container: {
        display: 'flex',
        justifyContent: 'space-between',
        padding: '20px',
        maxWidth: '1200px',
        margin: '0 auto',
    },
    section: {
        width: '30%',
        backgroundColor: '#fff',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    },
    sectionTitle: {
        color: '#3498db',
        marginBottom: '20px',
    },
    list: {
        listStyleType: 'none',
        padding: 0,
    },
    listItem: {
        marginBottom: '10px',
    },
    link: {
        color: '#3498db',
        textDecoration: 'none',
        fontSize: '18px',
        transition: 'color 0.3s ease',
    },
    linkHover: {
        color: '#2980b9',
    },
    icons: {
        display: 'flex',
        gap: '10px',
    },
    iconLink: {
        color: '#3498db',
        fontSize: '24px',
        transition: 'color 0.3s ease',
    },
    iconLinkHover: {
        color: '#2980b9',
    },
    storeLinks: {
        display: 'flex',
        marginTop: '20px',
    },
    storeImage: {
        width: '130px',
        height: '40px',
        marginRight: '10px',
    },
    content: {
        marginTop: '30px',
        padding: '20px',
        backgroundColor: '#fff',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    },
    heading: {
        fontSize: '30px',
        color: '#3498db',
    },
    subheading: {
        fontSize: '24px',
        marginTop: '20px',
        color: '#2c3e50',
    },
    paragraph: {
        fontSize: '16px',
        lineHeight: '1.6',
        color: '#34495e',
    },
    image: {
        width: '100%',
        height: '200px',
        objectFit: 'cover',
        borderRadius: '8px',
        marginBottom: '20px',
    },
    backButton: {
        backgroundColor: '#3498db',
        color: '#fff',
        padding: '10px 20px',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        marginTop: '20px',
        transition: 'background-color 0.3s ease',
    },
    backButtonHover: {
        backgroundColor: '#2980b9',
    },

    content: {
        maxWidth: "900px", // Ensures it doesn’t spread too wide
        width: "90%", // Keeps it responsive
        margin: "0 auto", // Centers the content
        padding: "20px",
        textAlign: "center",
    },
    image: {
        maxWidth: "100%",
        height: "auto",
        borderRadius: "10px",
    },
    imageSmall: {
        maxWidth: "80%",
        height: "auto",
        borderRadius: "10px",
        margin: "10px 0",
    },
    section: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: "30px",
    },
    list: {
        listStyle: "none",
        padding: "0",
        textAlign: "left",
    },
    backButton: {
        backgroundColor: "#007BFF",
        color: "white",
        padding: "10px 20px",
        border: "none",
        borderRadius: "5px",
        cursor: "pointer",
        marginTop: "20px",
    },
    sectionContainer: {
        maxWidth: '800px',
        margin: '0 auto',
        padding: '20px',
    },
    imageContainer: {
        borderRadius: '12px',
        overflow: 'hidden',
        margin: '30px 0',
        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
    },
    featuredImage: {
        width: '100%',
        height: '300px',
        objectFit: 'cover',
    },
    sectionContent: {
        textAlign: 'left',
        margin: '40px 0',
    },
    featureSection: {
        backgroundColor: '#f8f9fa',
        borderRadius: '10px',
        padding: '25px',
        marginBottom: '30px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    },
    icon: {
        marginRight: '10px',
    },
    featureList: {
        listStyle: 'none',
        padding: '0',
        margin: '20px 0',
    },
    listItem: {
        padding: '12px 0',
        borderBottom: '1px solid #eee',
        fontSize: '16px',
        lineHeight: '1.6',
        display: 'flex',
        alignItems: 'center',
        '&:last-child': {
            borderBottom: 'none',
        },
    },
    serviceGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '25px',
        marginTop: '25px',
    },
    serviceCategory: {
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '20px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
    },
    serviceTitle: {
        color: '#2c3e50',
        margin: '0 0 15px 0',
        fontSize: '18px',
    },
    serviceList: {
        listStyle: 'none',
        padding: '0',
        margin: '0',
        '& li': {
            padding: '8px 0',
            color: '#34495e',
        },
    },
    buttonContainer: {
        textAlign: 'center',
        marginTop: '40px',
    },
    buttonIcon: {
        marginRight: '8px',
    },

    vendorContainer: {
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '20px',
    },
    heroImageContainer: {
        borderRadius: '16px',
        overflow: 'hidden',
        margin: '40px 0',
        boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
    },
    heroImage: {
        width: '100%',
        height: '400px',
        objectFit: 'cover',
    },
    vendorBenefits: {
        margin: '60px 0',
    },
    sectionTitle: {
        fontSize: '28px',
        color: '#2c3e50',
        marginBottom: '40px',
        display: 'flex',
        alignItems: 'center',
    },
    icon: {
        marginRight: '15px',
        fontSize: '32px',
    },
    benefitsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '30px',
        marginTop: '30px',
    },
    benefitCard: {
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '30px',
        textAlign: 'center',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        transition: 'transform 0.3s ease',
        ':hover': {
            transform: 'translateY(-5px)',
        },
    },
    benefitIcon: {
        fontSize: '40px',
        marginBottom: '20px',
    },
    benefitTitle: {
        color: '#3498db',
        margin: '15px 0',
        fontSize: '20px',
    },
    onboardingProcess: {
        margin: '60px 0',
    },
    stepsContainer: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '25px',
        marginTop: '40px',
    },
    stepCard: {
        backgroundColor: '#f8f9fa',
        borderRadius: '10px',
        padding: '25px',
        position: 'relative',
        '::before': {
            content: '""',
            position: 'absolute',
            top: '40px',
            left: '-20px',
            width: '40px',
            height: '2px',
            backgroundColor: '#3498db',
            display: ['none', , 'block'], // Hide on mobile
        },
    },
    stepNumber: {
        width: '40px',
        height: '40px',
        backgroundColor: '#3498db',
        color: '#fff',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '20px',
        fontWeight: 'bold',
        marginBottom: '15px',
    },
    stepTitle: {
        color: '#2c3e50',
        margin: '10px 0',
        fontSize: '18px',
    },
    ctaSection: {
        textAlign: 'center',
        margin: '50px 0 30px',
    },
    ctaButton: {
        backgroundColor: '#3498db',
        color: '#fff',
        padding: '15px 40px',
        borderRadius: '30px',
        border: 'none',
        fontSize: '16px',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        ':hover': {
            backgroundColor: '#2980b9',
            transform: 'scale(1.05)',
        },
    },
    supportText: {
        marginTop: '25px',
        color: '#7f8c8d',
    },
    supportLink: {
        color: '#3498db',
        textDecoration: 'none',
        fontWeight: 'bold',
    },
    page: {
        backgroundColor: '#f8f9fa',
        padding: '2rem 0',
        borderTop: '1px solid #e9ecef'
    },
    navbar: {
        padding: '0 2rem 2rem',
        borderBottom: '1px solid #dee2e6'
    },
    brand: {
        fontSize: '1.8rem',
        color: '#2d3436',
        margin: 0
    },
    container: {
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 2rem'
    },
    gridContainer: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '2rem',
        padding: '2rem 0'
    },
    section: {
        marginBottom: '2rem'
    },
    sectionTitle: {
        fontSize: '1.1rem',
        color: '#495057',
        marginBottom: '1rem',
        fontWeight: '600',
        textTransform: 'uppercase'
    },
    list: {
        listStyle: 'none',
        padding: 0,
        margin: 0
    },
    listItem: {
        marginBottom: '0.75rem'
    },
    link: {
        color: '#6c757d',
        textDecoration: 'none',
        fontSize: '0.95rem',
        transition: 'color 0.2s ease',
        ':hover': {
            color: '#2d3436',
            textDecoration: 'underline'
        }
    },
    socialContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem'
    },
    iconGroup: {
        display: 'flex',
        gap: '1rem'
    },
    icon: {
        fontSize: '1.5rem',
        color: '#6c757d',
        transition: 'color 0.2s ease',
        ':hover': {
            color: '#2d3436'
        }
    },
    appLinks: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        maxWidth: '200px'
    },
    storeImage: {
        height: '40px',
        width: 'auto',
        borderRadius: '5px'
    },
    '@media (max-width: 768px)': {
        gridContainer: {
            gridTemplateColumns: '1fr'
        },
        brand: {
            fontSize: '1.5rem'
        }
    },


    navbar: {
        backgroundColor: '#bdefbd',  // Light background
        borderBottom: '1px solid #e9ecef'
    },
    brand: {
        color: '#2d3436',  // Dark text
        // ...
    }
}
export default About;
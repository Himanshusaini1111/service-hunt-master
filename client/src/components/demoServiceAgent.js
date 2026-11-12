// demoServiceAgent.js - Intelligent Test Data Generator for Add Service

const DEMO_SCENARIOS = [
    {
        category: "Home Maintenance & Repair Services",
        subCategory: "Plumbing Services",
        titleTemplates: [
            "24/7 Emergency Leak Detection & Pipe Repair",
            "HydroFlow Sanitary & High-Pressure Drain Cleaning",
            "Master Plumber Kitchen & Bathroom Fixture Installation",
            "Express Water Tank Leakage & Pipeline Overhaul"
        ],
        companyTemplates: [
            "Apex HydroWorks Pvt Ltd",
            "BlueFlow Sanitary Solutions",
            "QuickFix Plumbing Masters",
            "Urban Pipeline Engineering"
        ],
        unit: "per visit",
        basePrice: 599,
        multipleUnits: [
            { unit: "per visit", price: "599", isDefault: true, isCountable: true, isMerged: false, mergedUnit: "per day", description: "Standard on-site diagnosis and repair visit" },
            { unit: "per hour", price: "249", isDefault: false, isCountable: true, isMerged: false, mergedUnit: "per day", description: "Additional hourly labor for extended pipe work" }
        ],
        images: [
            "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80"
        ],
        descriptionPoints: "Comprehensive acoustic detection for concealed water pipe leaks\nHigh-pressure mechanical snake clearing for blocked drainage\nComplete faucet, mixer, angle-cock & cistern replacements\nCertified pressure-tested seals with anti-seepage guarantee\nFree inspection of overhead water storage connections",
        facilityPoints: "Certified & Background-Verified Plumbers\n30-Day Leak-Free Workmanship Warranty\nEmergency 45-Minute Doorstep Response\nOriginal OEM Branded Fittings & Seals\nDigital GST Invoice & Contactless Payment",
        addOns: [
            { name: "Heavy-Duty Chemical Drain De-clogging", price: "349", unit: "per service", maxcount: "4", image: "https://images.unsplash.com/photo-1585421514738-01798e348b17?auto=format&fit=crop&w=400&q=80" },
            { name: "Overhead Water Tank Deep Scrubbing", price: "699", unit: "per unit", maxcount: "2", image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=400&q=80" }
        ],
        locationType: "Simple"
    },
    {
        category: "Home Maintenance & Repair Services",
        subCategory: "Electrical Repairs",
        titleTemplates: [
            "VoltSafe Complete Home Rewiring & MCB Troubleshooting",
            "SparkShield Heavy Appliance Wiring & Inverter Setup",
            "Lumina Smart Lighting & Concealed Wiring Repair",
            "Master Electrician Power Surge & Earthing Audit"
        ],
        companyTemplates: [
            "VoltSafe Electrical Engineering LLP",
            "PowerGuard Technical Services",
            "ElectroPro Home Systems",
            "BrightVolt Power Works"
        ],
        unit: "per hour",
        basePrice: 349,
        multipleUnits: [
            { unit: "per hour", price: "349", isDefault: true, isCountable: true, isMerged: false, mergedUnit: "per day", description: "Standard hourly technical troubleshooting rate" },
            { unit: "per task", price: "799", isDefault: false, isCountable: true, isMerged: false, mergedUnit: "per day", description: "Complete room wiring or distribution box check" }
        ],
        images: [
            "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80"
        ],
        descriptionPoints: "Deep diagnosis of tripping MCBs, short circuits and voltage surges\nSafe installation and concealed cabling for heavy air conditioners & geysers\nEarthing resistance testing and copper spike grounding\nSmart chandelier, dimmer switch and LED strip mounting\nSafety load calculation for domestic solar or inverter backups",
        facilityPoints: "Government Licensed Class-1 Electricians\nInsulated 1000V Fluke Testing Equipment\n45-Day Shock-Safe Guarantee\nImmediate Same-Day Slot Availability\nZero Hidden Inspection Charges",
        addOns: [
            { name: "Whole-House Surge Protector Fitting", price: "499", unit: "per item", maxcount: "3", image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=400&q=80" },
            { name: "Heavy Geyser Power Isolator Setup", price: "299", unit: "per unit", maxcount: "3", image: "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=400&q=80" }
        ],
        locationType: "Simple"
    },
    {
        category: "Home Maintenance & Repair Services",
        subCategory: "Home Cleaning",
        titleTemplates: [
            "SparklePro Full Villa Deep Cleaning & Steam Sanitization",
            "PristineLiving Kitchen Degreasing & Bathroom Descaling",
            "EcoClean Deep Carpet, Sofa & Upholstery Shampooing",
            "PureBreeze Post-Construction Deep Home Scrubbing"
        ],
        companyTemplates: [
            "SparklePro Hygiene Services",
            "Pristine Living Facilities Pvt Ltd",
            "EcoClean Professional Washers",
            "RoyalShine Cleaners"
        ],
        unit: "per room",
        basePrice: 899,
        multipleUnits: [
            { unit: "per room", price: "899", isDefault: true, isCountable: true, isMerged: true, mergedUnit: "per day", description: "Per-room deep scrub with multi-day booking support" },
            { unit: "per service", price: "2499", isDefault: false, isCountable: false, isMerged: false, mergedUnit: "per day", description: "Full 2BHK/3BHK complete deep overhaul" }
        ],
        images: [
            "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?auto=format&fit=crop&w=800&q=80"
        ],
        descriptionPoints: "Industrial mechanized rotary scrubbing for hard floor tiles & grout\nComplete chimney, slab & cabinet oil-grease removal\nHigh-temperature 140°C steam disinfection of mattresses and sofas\nBalcony rail, mesh & sliding glass streak-free cleaning\nEco-friendly non-toxic Diversey certified cleaning chemicals",
        facilityPoints: "100% Background-Verified Cleaning Crew\nGerman Kärcher Wet & Dry Industrial Machines\n100% Satisfaction or Free Spot Re-Cleaning\nBiodegradable Kid & Pet Friendly Agents\nProtective Shoe Covers & Gloves Worn",
        addOns: [
            { name: "5-Seater Sofa Foam Extraction Wash", price: "699", unit: "per item", maxcount: "2", image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=400&q=80" },
            { name: "Balcony Jet Pressure Wash", price: "349", unit: "per room", maxcount: "3", image: "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&w=400&q=80" }
        ],
        locationType: "Simple"
    },
    {
        category: "Home Maintenance & Repair Services",
        subCategory: "HVAC Maintenance",
        titleTemplates: [
            "FrostCool Jet Foam AC Service & Gas Leak Repair",
            "AirPrecision Inverter Split & Central HVAC Overhaul",
            "CoolBreeze Anti-Bacterial Coil Cleaning & Gas Top-up",
            "ThermalMaster Commercial Duct & Cassette AC Servicing"
        ],
        companyTemplates: [
            "FrostCool Thermal Systems",
            "AirPrecision Climate Care",
            "CoolBreeze Engineering Works",
            "ZeroDegree AC Specialists"
        ],
        unit: "per unit",
        basePrice: 699,
        multipleUnits: [
            { unit: "per unit", price: "699", isDefault: true, isCountable: true, isMerged: false, mergedUnit: "per day", description: "Per AC indoor jet pump foam wash and pressure check" },
            { unit: "per visit", price: "399", isDefault: false, isCountable: true, isMerged: false, mergedUnit: "per day", description: "Diagnostic inspection & cooling performance check" }
        ],
        images: [
            "https://images.unsplash.com/photo-1621905252472-943afaa20e20?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80"
        ],
        descriptionPoints: "Deep pressurized water-jacket cleaning without wall splashes\nAnti-microbial chemical foam spray on evaporator cooling fins\nOutdoor condenser coil wash and fan motor bearing lubrication\nDrain pipe vacuum clearing to eliminate indoor water dripping\nRefrigerant R32 / R410A pressure check and compressor amp test",
        facilityPoints: "60-Day Cooling Performance Warranty\nSpecialized Spill-Proof Foam Jacket Kit\nCertified Refrigeration Technicians\nGenuine Branded Spare Capacitors & Gas\nFast 90-Minute Service Turnaround",
        addOns: [
            { name: "Outdoor Unit Anti-Corrosion Zinc Spray", price: "299", unit: "per unit", maxcount: "4", image: "https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=400&q=80" },
            { name: "Refrigerant Gas Top-Up (R32 / R410)", price: "999", unit: "per unit", maxcount: "2", image: "https://images.unsplash.com/photo-1621905252472-943afaa20e20?auto=format&fit=crop&w=400&q=80" }
        ],
        locationType: "Simple"
    },
    {
        category: "Home Maintenance & Repair Services",
        subCategory: "Painting and Wallpapering",
        titleTemplates: [
            "ColorCraft Mechanized Dust-Free Interior & Exterior Painting",
            "RoyalFinish Texture Wall Painting & Luxury Wallpaper Fitting",
            "VelvetCoat Waterproof Wall Putty & Emulsion Finishing",
            "ArtisanBrush Designer Accent Walls & Wood Polish"
        ],
        companyTemplates: [
            "ColorCraft Studio Decor LLP",
            "RoyalFinish Home Painters",
            "VelvetCoat Paint Experts",
            "ArtisanBrush Surfaces Pvt Ltd"
        ],
        unit: "per room",
        basePrice: 4200,
        multipleUnits: [
            { unit: "per room", price: "4200", isDefault: true, isCountable: true, isMerged: true, mergedUnit: "per day", description: "Per-room double coat premium washable sheen paint" },
            { unit: "per project", price: "18500", isDefault: false, isCountable: false, isMerged: false, mergedUnit: "per day", description: "Full apartment end-to-end painting package" }
        ],
        images: [
            "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1534349762230-e0cadf78f5da?auto=format&fit=crop&w=800&q=80"
        ],
        descriptionPoints: "Vacuum-assisted dust-free motorized wall sanding\nComplete crack bridging with elastomeric waterproof putty\nAnti-fungal primer coat followed by 2 coats of Royal Sheen paint\nTotal furniture masking with protective heavy plastic sheets\nDetailed post-painting site cleanup and floor scrubbing",
        facilityPoints: "1-Year Peeling & Flaking Protection Warranty\nDigital Laser Wall Measurement & Estimates\nCertified Asian Paints / Berger Trained Painters\nZero-VOC Odorless & Child-Safe Formulations\nDedicated Project Manager Assigned",
        addOns: [
            { name: "Geometric 3D Accent Texture Wall", price: "1800", unit: "per room", maxcount: "3", image: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=400&q=80" },
            { name: "Imported Seamless Wallpaper Installation", price: "1200", unit: "per room", maxcount: "4", image: "https://images.unsplash.com/photo-1534349762230-e0cadf78f5da?auto=format&fit=crop&w=400&q=80" }
        ],
        locationType: "Simple"
    },
    {
        category: "Event & Party Planning Services",
        subCategory: "Wedding Planner",
        titleTemplates: [
            "RoyalCrown Grand Royal Destination Wedding Planning",
            "EuphoriaMoments Luxury Theme Decor & Hospitality Coordination",
            "DivineKnots Full-Service Bridal, Sangeet & Mandap Curation",
            "CelestialVows Elite Wedding Design & Guest Concierge"
        ],
        companyTemplates: [
            "RoyalCrown Celebrations & Events",
            "Euphoria Moments Luxury Events",
            "DivineKnots Wedding Curators",
            "CelestialVows Event Studio"
        ],
        unit: "per event",
        basePrice: 45000,
        multipleUnits: [
            { unit: "per event", price: "45000", isDefault: true, isCountable: false, isMerged: true, mergedUnit: "per day", description: "Complete single or multi-day wedding celebration package" },
            { unit: "per day", price: "18000", isDefault: false, isCountable: true, isMerged: false, mergedUnit: "per day", description: "Per-day on-site event coordinator & hospitality team" }
        ],
        images: [
            "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=800&q=80"
        ],
        descriptionPoints: "End-to-end theme curation for Haldi, Mehendi, Sangeet & Reception\nCustom floral mandap engineering with fairy light canopy\nVendor contracting for celebrity DJs, choreographers & catering\nAirport and hotel transport logistics with personal escorts\nOn-stage cue management and bridal countdown assistance",
        facilityPoints: "Dedicated 24/7 Chief Event Director\n3D CAD Stage & Venue Visual Walkthroughs\nLive Timeline Management via Companion App\nCurated Network of 5-Star Vendors\nTransparent Line-Item Budget Tracking",
        addOns: [
            { name: "Cold Pyro Stage Sparkler & Dry Ice Fog Entry", price: "7500", unit: "per event", maxcount: "2", image: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=400&q=80" },
            { name: "Live Acoustic Sufi & Welcome Music Troupe", price: "14000", unit: "per session", maxcount: "2", image: "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=400&q=80" }
        ],
        locationType: "Rental"
    },
    {
        category: "Home Maintenance & Repair Services",
        subCategory: "Pest Control",
        titleTemplates: [
            "ShieldPest Herbal Odorless Termite & Cockroach Elimination",
            "BioSafe Advanced Residential Bedbug & Rodent Eradication",
            "EcoTermite Sub-Surface Barrier & Anti-Pest Proofing",
            "PestZero Organic Fogging & Kitchen Gel Treatment"
        ],
        companyTemplates: [
            "ShieldPest Environmental Technologies",
            "BioSafe Pest Eradicators LLP",
            "EcoTermite Defense Solutions",
            "PestZero Urban Sanitors"
        ],
        unit: "per service",
        basePrice: 999,
        multipleUnits: [
            { unit: "per service", price: "999", isDefault: true, isCountable: true, isMerged: false, mergedUnit: "per day", description: "Comprehensive flat or villa pest treatment" },
            { unit: "per visit", price: "499", isDefault: false, isCountable: true, isMerged: false, mergedUnit: "per day", description: "Periodic booster / inspection visit" }
        ],
        images: [
            "https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1585421514738-01798e348b17?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?auto=format&fit=crop&w=800&q=80"
        ],
        descriptionPoints: "Fipronil-based targeted dot baiting in kitchen cabinet joints\nOdorless herbal residual spraying along wall skirting and shafts\nDrain line biological treatment to curb drain flies and cockroaches\nUltrasonic rodent repellent installation for false ceilings\nNo requirement to vacate home or empty kitchen utensils",
        facilityPoints: "WHO-Approved 100% Odorless Green Formulations\nPet & Toddler Safe Certified Application\n90-Day Free Re-Service Warranty\nCertified Entomologist Formulated Protocols\nProtective PPE & Masked Operators",
        addOns: [
            { name: "Balcony Heavy-Duty Pigeon Netting", price: "1199", unit: "per room", maxcount: "3", image: "https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?auto=format&fit=crop&w=400&q=80" },
            { name: "Mosquito Ultra-Low Volume Cold Fogging", price: "499", unit: "per service", maxcount: "2", image: "https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?auto=format&fit=crop&w=400&q=80" }
        ],
        locationType: "Simple"
    },
    {
        category: "Home Maintenance & Repair Services",
        subCategory: "Carpentry and Woodwork",
        titleTemplates: [
            "WoodCraft Custom Furniture Repair & Modular Fitting",
            "ArtisanJoinery Precision Door, Hinge & Lock Installation",
            "TimberCare Antique Furniture Polishing & Restoration",
            "MasterWood Modular Kitchen Hinge & Drawer Slide Alignment"
        ],
        companyTemplates: [
            "WoodCraft Furniture Studios",
            "Artisan Joinery Works",
            "TimberCare Craft Works LLP",
            "MasterWood Interiors"
        ],
        unit: "per visit",
        basePrice: 449,
        multipleUnits: [
            { unit: "per visit", price: "449", isDefault: true, isCountable: true, isMerged: false, mergedUnit: "per day", description: "Initial 60-minute carpentry diagnosis and small repair" },
            { unit: "per hour", price: "220", isDefault: false, isCountable: true, isMerged: false, mergedUnit: "per day", description: "Per hour carpentry labor rate for custom fabrications" }
        ],
        images: [
            "https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1502005229762-ee1b2b8ba98f?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1540518614846-7ede433c4ef0?auto=format&fit=crop&w=800&q=80"
        ],
        descriptionPoints: "Hettich & Ebco hydraulic soft-close hinge installations\nMain door latch, Godrej smart lock and mortise fitting\nBed frame reinforcement, squeak removal and teakwood repair\nModular wardrobe telescopic drawer channel replacement\nPrecision laser spirit-level alignment for all cabinetry",
        facilityPoints: "Equipped with Cordless Bosch Circular Saws & Routers\nVacuum Dust Collection for Zero Indoor Wood Shavings\n30-Day Alignment Guarantee\nGenuine Stainless Steel Screws & Fittings\nUpfront Clear Quotations Before Work",
        addOns: [
            { name: "Digital Smart Fingerprint Lock Fitting", price: "649", unit: "per item", maxcount: "2", image: "https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=400&q=80" },
            { name: "Melamine Wood Polish Touchup", price: "399", unit: "per item", maxcount: "4", image: "https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=400&q=80" }
        ],
        locationType: "Simple"
    },
    {
        category: "Home Maintenance & Repair Services",
        subCategory: "Smart Home Setup",
        titleTemplates: [
            "SmartSphere Complete Home Automation & Voice Setup",
            "CyberNest IoT Smart Lighting, Security & CCTV Integration",
            "NextGen Automated Blinds, Climate & Sensor Network",
            "AuraSmart Multi-Room Audio & WiFi Mesh Synchronization"
        ],
        companyTemplates: [
            "SmartSphere IoT Technologies",
            "CyberNest Automation Labs",
            "NextGen Living Innovations",
            "AuraSmart Home Systems"
        ],
        unit: "per project",
        basePrice: 2899,
        multipleUnits: [
            { unit: "per project", price: "2899", isDefault: true, isCountable: false, isMerged: false, mergedUnit: "per day", description: "Full smart hub and device mesh linkage" },
            { unit: "per room", price: "799", isDefault: false, isCountable: true, isMerged: false, mergedUnit: "per day", description: "Per-room smart switchboard retrofitting" }
        ],
        images: [
            "https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=800&q=80"
        ],
        descriptionPoints: "Neutral & non-neutral smart touch switchboard wiring\nSeamless integration with Apple HomeKit, Alexa & Google Home\nAutomated geyser, curtains & AC trigger routines by room sensor\nMesh WiFi speed testing and zero-latency IoT VLAN setup\nDetailed family walkthrough & companion mobile app handoff",
        facilityPoints: "Certified IoT & Network Security Engineers\nLocal Offline Fallback Capability (Works Without Internet)\n90-Day Free Remote Software Diagnostics\nEnd-to-End Encryption Configuration\nNeat Wire Dressing with Cable Organizers",
        addOns: [
            { name: "Smart Video Doorbell & Chime Setup", price: "849", unit: "per unit", maxcount: "2", image: "https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=400&q=80" },
            { name: "Automated Motorized Curtain Track Setup", price: "999", unit: "per unit", maxcount: "4", image: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=400&q=80" }
        ],
        locationType: "Simple"
    },
    {
        category: "Home Maintenance & Repair Services",
        subCategory: "Appliance Repair",
        titleTemplates: [
            "QuickTech Washing Machine & Refrigerator Chip Repair",
            "MasterAppliance Microwave, Hob & Chimney Servicing",
            "CoolFix Front Load Washer Drum & Inverter PCB Repair",
            "ApexCare Commercial Oven & Kitchen Appliance Overhaul"
        ],
        companyTemplates: [
            "QuickTech Appliance Services",
            "MasterAppliance Care LLP",
            "CoolFix Electronics Care",
            "ApexCare Technical Hub"
        ],
        unit: "per visit",
        basePrice: 399,
        multipleUnits: [
            { unit: "per visit", price: "399", isDefault: true, isCountable: true, isMerged: false, mergedUnit: "per day", description: "Inspection and minor diagnosis charge" },
            { unit: "per task", price: "899", isDefault: false, isCountable: true, isMerged: false, mergedUnit: "per day", description: "Complete motor/PCB repair package" }
        ],
        images: [
            "https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1585338107529-13afc5f02586?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?auto=format&fit=crop&w=800&q=80"
        ],
        descriptionPoints: "Motor bearing, belt and water pump overhaul for washers\nInverter compressor PCB diagnosis and sensor calibration\nChimney baffle filter chemical degreasing & motor suction tuning\nMicrowave magnetron, capacitor and door switch replacement\nDigital multimeter load and insulation resistance verification",
        facilityPoints: "100% Genuine OEM Replacement Components\n90-Day Spare Parts Warranty\nTransparent Fixed Rate Card\nDoorstep Service in 60 Minutes\nOld Parts Returned to Customer",
        addOns: [
            { name: "Heavy Washing Machine Scalego Descaler Cycle", price: "249", unit: "per service", maxcount: "2", image: "https://images.unsplash.com/photo-1585338107529-13afc5f02586?auto=format&fit=crop&w=400&q=80" },
            { name: "Kitchen Chimney Carbon Filter Replacement", price: "599", unit: "per item", maxcount: "2", image: "https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=400&q=80" }
        ],
        locationType: "Simple"
    }
];

const ADDRESS_POOL = [
    "Flat 402, Lotus Grand Residency, MG Road, Indiranagar, Bengaluru, Karnataka",
    "Plot No. 18-B, Sector 29, Golf Course Road, Gurugram, Haryana",
    "Shop 14, High Street Arcade, Koregaon Park, Pune, Maharashtra",
    "Suite 501, Maker Towers, Cuffe Parade, South Mumbai, Maharashtra",
    "Villa 27, Palm Meadows, Whitefield Main Road, Bengaluru, Karnataka",
    "House 8-2-293, Road No. 12, Banjara Hills, Hyderabad, Telangana",
    "No. 45, 2nd Avenue, Anna Nagar West, Chennai, Tamil Nadu",
    "Plot 76, Sector V, Salt Lake City, Bidhannagar, Kolkata, West Bengal",
    "Tower C, Godrej Woods, Sector 43, Noida, Uttar Pradesh",
    "12-A, Civil Lines, Near Raj Bhavan, Jaipur, Rajasthan",
    "B-204, Green Glen Layout, Outer Ring Road, Bellandur, Bengaluru",
    "Row House 9, Viman Nagar Central, Pune, Maharashtra"
];

const BOOKING_TYPES = ["Automatic Booking", "Manual Booking", "Inquari Booking"];

export function getRandomDemoService(lastIndex = -1) {
    // Pick a new scenario different from last time
    let availableIndices = DEMO_SCENARIOS.map((_, i) => i);
    if (availableIndices.length > 1 && lastIndex >= 0) {
        availableIndices = availableIndices.filter(i => i !== lastIndex);
    }
    const selectedIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
    const scenario = DEMO_SCENARIOS[selectedIndex];

    // Dynamic randomized elements
    const randomTitle = scenario.titleTemplates[Math.floor(Math.random() * scenario.titleTemplates.length)];
    const randomCompany = scenario.companyTemplates[Math.floor(Math.random() * scenario.companyTemplates.length)];
    const randomAddress = ADDRESS_POOL[Math.floor(Math.random() * ADDRESS_POOL.length)];
    const randomPhone = `+91 ${9800000000 + Math.floor(Math.random() * 199999999)}`;
    const randomBookingType = BOOKING_TYPES[Math.floor(Math.random() * BOOKING_TYPES.length)];

    // Dynamic price variation (+/- 10%)
    const priceMultiplier = 0.9 + Math.random() * 0.2;
    const randomizedPricingUnits = scenario.multipleUnits.map(unit => ({
        ...unit,
        price: Math.max(99, Math.round((parseFloat(unit.price) * priceMultiplier) / 10) * 10).toString()
    }));

    // Dynamic add-ons with slight price adjustment
    const randomizedAddOns = scenario.addOns.map(addon => ({
        name: addon.name,
        price: Math.max(99, Math.round((parseFloat(addon.price) * priceMultiplier) / 10) * 10).toString(),
        unit: addon.unit,
        customUnit: '',
        maxcount: addon.maxcount || '3',
        image: addon.image,
        isCountable: true,
        isMerged: false,
        mergedUnit: 'per day'
    }));

    // Optional regional surcharge
    const locationsList = Math.random() > 0.4 ? [
        {
            locationName: "Airport & Outstation Zone",
            locationAddress: "International Airport Perimeter, Express Corridor",
            extraPrice: Math.floor(150 + Math.random() * 200),
            optionalInputsExtra: []
        }
    ] : [];

    return {
        index: selectedIndex,
        service: randomTitle,
        companyname: randomCompany,
        phonenumber: randomPhone,
        address: randomAddress,
        category: scenario.category,
        subCategory: scenario.subCategory,
        bookingType: randomBookingType,
        image1: scenario.images[0],
        image2: scenario.images[1],
        image3: scenario.images[2],
        descriptionPoints: scenario.descriptionPoints,
        facilityPoints: scenario.facilityPoints,
        pricingUnits: randomizedPricingUnits,
        inputs: randomizedAddOns,
        locationType: scenario.locationType,
        locationsList: locationsList
    };
}

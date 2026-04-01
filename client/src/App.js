import React from 'react';
import './App.css';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import LandingPage from "./screen/LandingPage"; // Match the file name exactly

import Homescreen from './screen/Homescreen';
import Bookingscreen from './screen/Bookingscreen';
import Registerscreen from './screen/Registerscreen';
import Loginscreen from './screen/Loginscreen';
import Adminscreen from './screen/Adminscreen';
import Profilescreen from './screen/Profilescreen';
import Pathner from './screen/Pathner';
import InformationScreen from './screen/Informationscreen';
import PostRequirement from './screen/PostRequirement';
import BidNotification from './components/BidNotification';
import About from './components/About'; // Import About component
import VendorServices from "./components/VendorService"; // Update the path if necessary
import Bidinputs from "./components/Bidinputs"; // Match the file name exactly
import { HelperPanel } from "./screen/HelperPanel";
import { HelperLogin } from './components/HelperLogin';
import SuperAdminDashboard from './screen/SuperAdminDashboard';
import MyOrders from './components/Order';
function App() {
  return (
    <div className="App">


      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/home" element={<Homescreen />} />
          <Route path="/" element={<Navigate to="/home" />} />
          <Route path="/register" element={<Registerscreen />} />
          <Route path="/login" element={<Loginscreen />} />
          <Route path="/book/:serviceid" element={<Bookingscreen />} />
          <Route path="/admin" element={<Adminscreen />} />
          <Route path="/profile" element={<Profilescreen />} />
          <Route path="/form" element={<Pathner />} />
          <Route path="/information" element={<InformationScreen />} />
          <Route path="/post-requirement" element={<PostRequirement />} />
          <Route path="/bid" element={<BidNotification userId={JSON.parse(localStorage.getItem('currentUser'))?.id} />} />
          <Route path="/informationscreen" element={<InformationScreen />} />
          <Route path="/adminscreen" element={<Adminscreen />} />
          <Route path="/about" element={<About />} /> {/* Fix for About route */}
          <Route path="/vendor/:vendorId" element={<VendorServices />} />
          <Route path="/bidinputs" element={<Bidinputs />} />
          <Route path="/helperpanel" element={<HelperPanel />} />
          <Route path="/helperlogin" element={<HelperLogin />} />
          <Route path="/superadmin" element={<SuperAdminDashboard />} />
          <Route path="/myorders" element={<MyOrders />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;

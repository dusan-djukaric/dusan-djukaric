import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import PrivateRoutes from "./utils/PrivateRoutes";
import Contact from "./components/contact/Contact";
import Biography from "./components/biography/Biography";
import Press from "./components/press/Press";
import Gallery from "./components/gallery/Gallery";
import Admin from "./components/admin/Admin";
import AddPictures from "./components/addPictures/AddPictures";
import { Helmet } from "react-helmet-async";
import Home from "./components/main-section/Home";
import Exhibitions from "./components/exhibitions/exhibitions";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  return (
    <>
      <Helmet>
        <title>Dusan Djukaric</title>
      </Helmet>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/rs" element={<Home />} />
          <Route path="/biography" element={<Biography />} />
          <Route path="/press" element={<Press />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/gallery/:paintingId" element={<Gallery />} />
          <Route path="/exhibitions" element={<Exhibitions />} />

          <Route element={<PrivateRoutes isAuthenticated={isAuthenticated} />}>
            <Route path="/adminDashboard" element={<AddPictures />} />
          </Route>
          <Route
            path="/admin"
            element={<Admin authenticated={setIsAuthenticated} />}
          />
        </Routes>
      </Router>
    </>
  );
}

export default App;

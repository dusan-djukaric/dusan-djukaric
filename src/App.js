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

const PERSON_LD_JSON = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "Dušan Đukarić",
  "alternateName": "Dusan Djukaric",
  "url": "https://www.dusandjukaric.com",
  "jobTitle": "Watercolor Artist",
  "description": "Serbian watercolor artist known for vibrant landscapes and urban scenes"
});

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  return (
    <>
      <Helmet>
        <title>Dusan Djukaric</title>
        <script type="application/ld+json">{PERSON_LD_JSON}</script>
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

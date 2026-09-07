import React from "react";
import AboutArt from "../hooks/AboutArt";
import AboutArtist from "../hooks/AboutArtist";
import BrowseGallery from "../hooks/BrowseGallery";
import Layout from "../layout/Layout";

function Biography() {
  return (
    <Layout>
      <div className="bg-neutral-50 pt-20">
        <AboutArtist />
        <AboutArt />
        <BrowseGallery />
      </div>
    </Layout>
  );
}

export default Biography;

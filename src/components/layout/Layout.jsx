import React from "react";
import NavBar from "../nav-bar/NavBar";
import Footer from "../footer/Footer";
import ShareButtons from "../shareButtons/ShareButtons";

function Layout({ children }) {
  return (
    <div>
      <NavBar />
      <ShareButtons />
      <main>{children}</main>
      <Footer />
    </div>
  );
}

export default Layout;

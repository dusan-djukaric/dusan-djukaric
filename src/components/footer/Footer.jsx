import React from "react";
import Signature from "../assets/dusandjukaric_signature.png";
import { FaSquareFacebook } from "react-icons/fa6";
import { FaInstagram } from "react-icons/fa";

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-white">
      <div className="flex flex-col items-center p-5">
        <img src={Signature} className="w-40" alt="djukaric-signature" />
        <div className="grid grid-cols-2 social-links mt-2">
          <a
            href="https://www.facebook.com/dusan.djukaric/"
            target="_blank"
            rel="noopener noreferrer"
            className="mr-4 text-2xl hover:animate-bounce"
          >
            <FaSquareFacebook />
          </a>
          <a
            href="https://www.instagram.com/djukaricdusan/"
            target="_blank"
            rel="noopener noreferrer"
            className="mr-4 text-2xl hover:animate-bounce"
          >
            <FaInstagram />
          </a>
        </div>
        <p className="text-center mt-4 text-xs">
          © {currentYear} Dusan Djukaric. All rights reserved.
        </p>

        <a
          href="https://www.instagram.com/_goatdev_/"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:animate-pulse"
        >
          <p className="text-center text-xs">Powered by goAT</p>
        </a>
      </div>
    </footer>
  );
}

export default Footer;

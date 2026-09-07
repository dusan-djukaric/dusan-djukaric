import React, { useState, useEffect } from "react";
import ContactImgFirst from "../assets/contactImg1.jpg";
import ContactImgSecond from "../assets/contactImg2.jpeg";
import Layout from "../layout/Layout";
import { useTranslation } from "react-i18next";
import i18next from "../../services/i18next";

function Contact() {
  const { t } = useTranslation();

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [fullName, setFullName] = useState("");
  const handleSendRequest = (e) => {
    e.preventDefault();
    
    // Input validation
    if (!subject.trim()) {
      alert("Please enter a subject.");
      return;
    }

    if (!fullName.trim()) {
      alert("Please enter your full name.");
      return;
    }

    if (!message.trim()) {
      alert("Please enter a message.");
      return;
    }

    // Sanitize inputs
    const sanitizedSubject = subject.replace(/[<>'"&]/g, '').trim();
    const sanitizedFullName = fullName.replace(/[<>'"&]/g, '').trim();
    const sanitizedMessage = message.replace(/[<>'"&]/g, '').trim();

    if (sanitizedSubject.length > 200) {
      alert("Subject must be less than 200 characters.");
      return;
    }

    if (sanitizedFullName.length > 100) {
      alert("Full name must be less than 100 characters.");
      return;
    }

    if (sanitizedMessage.length > 1000) {
      alert("Message must be less than 1000 characters.");
      return;
    }

    const fullMessage = `Full Name: ${sanitizedFullName} \n\nMessage: ${sanitizedMessage}`;
    const mailtoURL = `mailto:dusandjukaric@yahoo.com?subject=${encodeURIComponent(
      sanitizedSubject
    )}&body=${encodeURIComponent(fullMessage)}`;

    window.open(mailtoURL);
  };

  useEffect(() => {
    const storedLanguage = localStorage.getItem("selectedLanguage");
    if (storedLanguage) {
      i18next.changeLanguage(storedLanguage);
    }
  }, []);

  return (
    <Layout>
      <div className="mb-28 mt-32 mx-auto lg:w-full md:w-4/5 sm:w-5/6">
        <div className="flex flex-col justify-center text-center mb-14">
          <div className="mt-2">
            <p className="text-2xl text-gray-600 uppercase">{t("contactMe")}</p>
          </div>
        </div>
        <div className="flex flex-col lg:flex-row justify-center">
          <div
            className="w-full lg:w-1/2 bg-neutral-50 h-96 flex flex-col shadow-xl"
            style={{
              backgroundImage: `url(${ContactImgFirst})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <p className="text-center py-8 text-gray-500 pt-5 md:pt-10 text-xl">
              {t("helloMessage")}
            </p>
            <form className="ml-5 md:ml-10 flex flex-col">
              <input
                type="text"
                name="subject"
                id="subject"
                placeholder={t("subject")}
                className="bg-transparent border-b border-gray-400 w-64 p-1 mb-4"
                onChange={(e) => setSubject(e.target.value)}
              />
              <input
                type="text"
                name="fullName"
                id="fullName"
                placeholder={t("fullName")}
                className="bg-transparent border-b border-gray-400 w-64 p-1"
                onChange={(e) => setFullName(e.target.value)}
              />

              <textarea
                name="message"
                id="message"
                className="w-5/6 lg:w-3/4 mt-6 h-28 bg-transparent border border-gray-400 p-1"
                placeholder={t("message")}
                onChange={(e) => setMessage(e.target.value)}
              ></textarea>
              <button
                type="button"
                className="bg-transparent mt-4 w-20 text-gray-400 border border-gray-400 hover:text-gray-600 hover:border-gray-600 hover:shadow-md"
                onClick={handleSendRequest}
              >
                {t("sendBtn")}
              </button>
            </form>
          </div>
          <div
            className="w-full mt-8 lg:w-1/3 lg:mt-0 bg-neutral-300 h-96 flex flex-col opacity-90 shadow-xl"
            style={{
              backgroundImage: `url(${ContactImgSecond})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="flex flex-col my-auto mx-auto lg:mt-28 items-center lg:-ml-4">
              <div className="bg-white w-72 text-center shadow-xl">
                <p className="py-3 bg-gray-900 text-white text-left pl-4">
                  <ion-icon name="call-outline"></ion-icon>{" "}
                  <a href="tel:+381642200145">+381 642200145</a>
                </p>
              </div>
              <div className="bg-white w-72 mt-4 text-center shadow-xl">
                <p className="py-3 bg-gray-900 text-white text-left pl-4">
                  <ion-icon name="mail-outline"></ion-icon>{" "}
                  dusandjukaric@yahoo.com
                </p>
              </div>
              <div className="bg-white w-72 mt-4 text-center shadow-xl">
                <p className="py-3 bg-gray-900 text-white text-left pl-4">
                  <ion-icon name="logo-skype"></ion-icon> dusan.djukaric
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default Contact;

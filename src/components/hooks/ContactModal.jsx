import React, { useState } from "react";
import Modal from "react-modal";
import emailjs from "@emailjs/browser";

const SERVICE_ID = process.env.REACT_APP_EMAILJS_SERVICE_ID;
const TEMPLATE_ID = process.env.REACT_APP_EMAILJS_TEMPLATE_ID;
const PUBLIC_KEY = process.env.REACT_APP_EMAILJS_PUBLIC_KEY;

const overlayStyle = {
  overlay: { backgroundColor: "rgba(0,0,0,0.5)", zIndex: 60 },
  content: {
    top: "50%", left: "50%", right: "auto", bottom: "auto",
    transform: "translate(-50%, -50%)",
    padding: "1.5rem", maxWidth: "24rem", width: "100%",
    border: "none", borderRadius: 0,
  },
};

function ContactModal({ isOpen, onClose, paintingTitle, paintingUrl }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Fallback to mailto if EmailJS is not configured
    if (!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY) {
      const subject = `Request for ${paintingTitle}`;
      const body = `${message ? message + "\n\n" : ""}From: ${name} <${email}>\nPainting: ${paintingUrl}`;
      window.open(
        `mailto:dusandjukaric@yahoo.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
      );
      handleClose();
      return;
    }

    setStatus("sending");
    try {
      await emailjs.send(
        SERVICE_ID,
        TEMPLATE_ID,
        {
          from_name: name,
          from_email: email,
          painting_title: paintingTitle,
          painting_url: paintingUrl,
          message: message || `Interested in "${paintingTitle}"`,
        },
        PUBLIC_KEY
      );
      setStatus("sent");
    } catch (err) {
      console.error("EmailJS error:", err);
      setStatus("error");
    }
  };

  const handleClose = () => {
    setName("");
    setEmail("");
    setMessage("");
    setStatus("idle");
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={handleClose}
      contentLabel="Upit za akvarel"
      style={overlayStyle}
    >
      <button
        className="absolute top-3 right-3 text-gray-500 text-2xl leading-none hover:text-gray-800"
        onClick={handleClose}
      >
        &times;
      </button>

      {status === "sent" ? (
        <div className="text-center py-6">
          <p className="text-lg text-gray-700">Hvala! Poruka je uspešno poslata.</p>
          <button
            className="mt-4 border border-gray-400 px-4 py-2 text-sm hover:bg-gray-50"
            onClick={handleClose}
          >
            Zatvori
          </button>
        </div>
      ) : (
        <>
          <h2 className="text-base mb-1 text-gray-800">{paintingTitle}</h2>
          <p className="text-xs text-gray-400 mb-4">Upit za akvarel</p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Vaše ime *"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
            />
            <input
              type="email"
              placeholder="Vaš email *"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
            />
            <textarea
              placeholder="Poruka (opciono)"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-gray-500 resize-none"
            />
            {status === "error" && (
              <p className="text-red-500 text-xs">
                Greška pri slanju. Pokušajte ponovo.
              </p>
            )}
            <button
              type="submit"
              disabled={status === "sending"}
              className="border border-gray-600 py-2 text-sm hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {status === "sending" ? "Slanje..." : "Pošalji upit"}
            </button>
          </form>
        </>
      )}
    </Modal>
  );
}

export default ContactModal;

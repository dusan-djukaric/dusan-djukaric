import React, { useState, useEffect } from "react";

function InfoMessage() {
  const [isMessageVisible, setMessageVisible] = useState(false);

  const handleIconClick = () => {
    setMessageVisible(true);
  };

  const handleCloseClick = () => {
    setMessageVisible(false);
  };

  useEffect(() => {
    if (isMessageVisible) {
      // Onemogući skrolovanje kada se poruka prikaže
      document.body.style.overflow = "hidden";
    } else {
      // Omogući skrolovanje kada se poruka zatvori
      document.body.style.overflow = "auto";
    }
  }, [isMessageVisible]);

  return (
    <div>
      <div className="fixed inset-0 flex items-center justify-center z-50">
        {isMessageVisible && (
          <div className="bg-gray-900 text-white p-8">
            <h1 className="text-3xl mb-4">Important Message</h1>
            <p className="text-lg">
              Join us for the solo exhibition of Dusan Djukaric - Singidunum
              Gallery in Belgrade. July 20, 2023, at 6:00 PM - Don't miss this
              exceptional showcase of talent!
            </p>
            <button
              className="mt-4 px-4 py-2 bg-gray-300 text-gray-900 rounded"
              onClick={handleCloseClick}
            >
              Close
            </button>
          </div>
        )}
      </div>
      <div className="fixed bottom-10 right-10 z-50">
        <button className="text-2xl text-gray-900" onClick={handleIconClick}>
          <ion-icon name="alert-circle-outline"></ion-icon>
        </button>
      </div>
    </div>
  );
}

export default InfoMessage;

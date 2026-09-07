import { useEffect } from "react";

function Handlers({ handleClosePopup, prevImage, nextImage }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        handleClosePopup();
      } else if (event.key === "ArrowLeft") {
        prevImage();
      } else if (event.key === "ArrowRight") {
        nextImage();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleClosePopup, prevImage, nextImage]);

  return null;
}

export default Handlers;

import React, { useState, useEffect } from "react";
import { useSwipeable } from "react-swipeable";
import Handlers from "./Handlers";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";

function ShowPopup({
  showPopup,
  currentImage,
  handleClosePopup,
  handleSendRequest,
  handlePopupClick,
  currentImageArray,
  onNavigate,
  hideDescription = false,
}) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  useEffect(() => {
    const currentIndex = currentImageArray?.findIndex((img) => {
      return img.url === currentImage?.img;
    });
    setCurrentImageIndex(currentIndex);
  }, [currentImage, currentImageArray]);

  const prevImage = () => {
    if (currentImageIndex === 0) return;
    const newIndex = currentImageIndex - 1;
    setCurrentImageIndex(newIndex);
    onNavigate?.(currentImageArray[newIndex]);
  };

  const nextImage = () => {
    if (currentImageIndex === currentImageArray.length - 1) return;
    const newIndex = currentImageIndex + 1;
    setCurrentImageIndex(newIndex);
    onNavigate?.(currentImageArray[newIndex]);
  };

  const handlers = useSwipeable({
    onSwipedLeft: nextImage,
    onSwipedRight: prevImage,
    preventDefaultTouchmoveEvent: true,
    trackMouse: true,
  });

  if (!showPopup || !currentImage || !currentImageArray) {
    return null;
  }

  // When the painting isn't in the loaded array yet (deep pagination direct link),
  // currentImageIndex is -1. Fall back to the data from currentImage in that case.
  const activeEntry = currentImageIndex >= 0 ? currentImageArray[currentImageIndex] : null;
  const activeUrl = activeEntry?.url ?? currentImage.img;
  const activeMeta = activeEntry?.metadata ?? currentImage.metadata;
  const currentMeta = activeMeta;

  return (
    <>
      {currentMeta && (
        <Helmet>
          {(currentMeta["seotitle"] || currentMeta["seotitlesrb"]) && (
            <title>
              {(language === "eng" || language === "en") ? currentMeta["seotitle"] : (currentMeta["seotitlesrb"] || currentMeta["seotitle"])}
            </title>
          )}
          {(currentMeta["metadescription"] || currentMeta["metadescriptionsrb"]) && (
            <meta name="description" content={(language === "eng" || language === "en") ? currentMeta["metadescription"] : (currentMeta["metadescriptionsrb"] || currentMeta["metadescription"])} />
          )}
          {(currentMeta["keywords"] || currentMeta["keywordssrb"]) && (
            <meta name="keywords" content={(language === "eng" || language === "en") ? currentMeta["keywords"] : (currentMeta["keywordssrb"] || currentMeta["keywords"])} />
          )}
        </Helmet>
      )}
      <div
        className="fixed top-0 left-0 w-screen h-screen bg-white lg:bg-black lg:bg-opacity-75 flex justify-center items-start lg:items-center z-50 overflow-y-auto"
        onClick={handlePopupClick}
        {...handlers}
      >
        <div className="relative w-full lg:w-fit">

          {/* Close button — always visible, with background so it's legible over any painting colour */}
          <button
            className="popup-image absolute top-3 right-3 z-20 text-gray-800 text-4xl leading-none bg-white bg-opacity-80 rounded-full w-10 h-10 flex items-center justify-center"
            onClick={handleClosePopup}
          >
            &times;
          </button>

          <div className="flex flex-col lg:flex-row lg:items-stretch">

            {/* Image wrapper — relative so arrows can be positioned over it */}
            <div className="relative flex items-center justify-center">
              {activeMeta?.["sold"] === "true" && (
                <div className="absolute top-0 left-0 bg-white lg:bg-neutral-50 px-4 border-t border-r border-gray-200 z-10">
                  <p className="text-[20px]">SOLD</p>
                </div>
              )}
              <img
                src={activeUrl}
                alt={(language === "eng" || language === "en") ? (currentMeta?.["alttext"] || "Painting by Dusan Djukaric") : (currentMeta?.["alttextsrb"] || currentMeta?.["alttext"] || "Painting by Dusan Djukaric")}
                className="popup-image object-contain cursor-pointer max-h-[65vh] lg:max-h-none lg:h-[80vh] lg:w-auto"
              />

              {/* Navigation arrows — disabled when index is unknown (-1 = painting not yet in loaded list) */}
              <button
                className="absolute top-1/2 left-2 transform -translate-y-1/2 text-gray-800 lg:text-white text-4xl lg:text-5xl z-10 bg-white bg-opacity-60 lg:bg-black lg:bg-opacity-30 rounded-full px-2 py-1 disabled:opacity-20"
                onClick={(e) => { e.stopPropagation(); prevImage(); }}
                disabled={currentImageIndex <= 0}
              >
                &#8249;
              </button>
              <button
                className="absolute top-1/2 right-2 transform -translate-y-1/2 text-gray-800 lg:text-white text-4xl lg:text-5xl z-10 bg-white bg-opacity-60 lg:bg-black lg:bg-opacity-30 rounded-full px-2 py-1 disabled:opacity-20"
                onClick={(e) => { e.stopPropagation(); nextImage(); }}
                disabled={currentImageIndex < 0 || currentImageIndex === currentImageArray.length - 1}
              >
                &#8250;
              </button>
            </div>

            {/* Info panel */}
            <div className="popup-image flex lg:flex-col justify-between lg:justify-around bg-white lg:bg-neutral-50 w-full lg:w-[220px] xl:w-[260px] px-4 py-3">
              <div className="p-1">
                <p className="popup-image text-[17px] xl:text-[20px]">
                  {language === "eng" || language === "en"
                    ? activeMeta?.["title"]
                    : decodeURIComponent(activeMeta?.["titlesrb"] || '')}
                </p>
                <p className="popup-image text-[12px] xl:text-[14px] text-gray-500">
                  {t("dimension")}{" "}
                  {activeMeta?.["x_dim"]} x{" "}
                  {activeMeta?.["y_dim"]}{" "}
                  {t("cm")}
                </p>
                <p className="popup-image text-[12px] xl:text-[14px] text-gray-500">
                  {t("technique")}
                </p>
                {!hideDescription && (activeMeta?.["description"] || activeMeta?.["descriptionsrb"]) && (
                  <p className="popup-image text-[12px] text-gray-600 mt-3">
                    {language === "eng" || language === "en"
                      ? activeMeta?.["description"]
                      : decodeURIComponent(activeMeta?.["descriptionsrb"] || "")}
                  </p>
                )}
              </div>
              <button
                className="popup-image lg:mx-auto m-1 h-8 border-gray-600 rounded px-2 text-[25px] hover:shadow-md hover:bg-neutral-50 transition-all duration-300 ease-in"
                onClick={() =>
                  handleSendRequest(activeEntry || { url: activeUrl, metadata: activeMeta })
                }
              >
                <ion-icon name="mail-outline"></ion-icon>
              </button>
            </div>
          </div>
        </div>

        {showPopup && (
          <Handlers
            handleClosePopup={handleClosePopup}
            prevImage={prevImage}
            nextImage={nextImage}
          />
        )}
      </div>
    </>
  );
}

export default ShowPopup;

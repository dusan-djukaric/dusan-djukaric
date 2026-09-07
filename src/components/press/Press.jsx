import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import YouTube from "./YouTube";
import BrowseGallery from "../hooks/BrowseGallery";
import { useSwipeable } from "react-swipeable";
import Layout from "../layout/Layout";
import Handlers from "../hooks/Handlers";
import i18next from "../../services/i18next";
import apiClient from "../../services/apiClient";

function Press() {
  const { t, i18n } = useTranslation();
  const [pressData, setPressData] = useState(null);

  const [currentImageIndex, setCurrentImageIndex] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [currentImageArray, setCurrentImageArray] = useState([]);

  const imageRef = useRef(null);
  const popupRef = useRef(null);

  useEffect(() => {
    const storedLanguage = localStorage.getItem("selectedLanguage");
    if (storedLanguage) i18next.changeLanguage(storedLanguage);
  }, []);

  useEffect(() => {
    apiClient.getPress()
      .then(data => setPressData(data))
      .catch(err => console.error('Failed to load press data:', err));
  }, []);

  const openPopup = (imageIndex, imageArray) => {
    setCurrentImageIndex(imageIndex);
    setCurrentImageArray(imageArray);
    setShowPopup(true);
  };

  const closePopup = () => {
    setCurrentImageIndex(null);
    setShowPopup(false);
  };

  const prevImage = () => {
    if (currentImageIndex > 0) setCurrentImageIndex(i => i - 1);
  };

  const nextImage = () => {
    if (currentImageIndex < currentImageArray.length - 1) setCurrentImageIndex(i => i + 1);
  };

  const handlers = useSwipeable({
    onSwipedLeft: nextImage,
    onSwipedRight: prevImage,
    preventDefaultTouchmoveEvent: true,
    trackMouse: true,
  });

  const isSr = i18n.language === 'sr' || i18n.language === 'rs';

  if (!pressData) return <Layout><div className="py-40 text-center text-gray-400">{t("loading")}</div></Layout>;

  const { articles, moreArticles, videoIds } = pressData;

  return (
    <Layout>
      <div>
        {articles.map((article, index) => {
          const title = isSr ? article.titleSr : article.titleEn;
          const text = isSr ? article.textSr : article.textEn;
          const coverImage = article.images[0];
          const isEven = index % 2 === 0;
          const bg = isEven ? 'bg-neutral-100' : '';

          return (
            <div
              key={article.id}
              className={`py-10 px-10 lg:px-20 md:px-20 xl:px-40 p-10 items-center pt-28 ${bg}`}
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 justify-around items-center text-gray-700">

                {/* Text left on even, right on odd */}
                {isEven ? (
                  <>
                    <div>
                      <h1 className="xl:text-7xl md:text-5xl text-3xl lg:pb-10 pb-5">{title}</h1>
                      {text && text.split('\n').map((line, i) => (
                        <span key={i} className="text-lg">{line}<br /></span>
                      ))}
                      {text && <><br /><br /></>}
                      <span
                        className="cursor-pointer text-lg hover:text-gray-500"
                        onClick={() => openPopup(0, article.images)}
                      >
                        {t("readMore")} <ion-icon name="arrow-forward-outline"></ion-icon>
                      </span>
                    </div>
                    <div className="flex justify-center lg:justify-end">
                      <img
                        src={coverImage}
                        alt={title}
                        className="object-contain cursor-pointer xl:h-[600px] md:h-[400px] h-[400px] mt-4 lg:mt-0"
                        onClick={() => openPopup(0, article.images)}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="md:flex justify-start">
                      <img
                        src={coverImage}
                        alt={title}
                        className="object-contain cursor-pointer xl:h-[600px] md:h-[400px] h-[400px] mt-4 lg:mt-0 hidden lg:block"
                        onClick={() => openPopup(0, article.images)}
                      />
                    </div>
                    <div>
                      <h1 className="xl:text-7xl md:text-5xl text-3xl lg:pb-10 pb-5">{title}</h1>
                      {text && text.split('\n').map((line, i) => (
                        <span key={i} className="text-lg">{line}<br /></span>
                      ))}
                      {text && <><br /><br /></>}
                      <span
                        className="cursor-pointer text-lg hover:text-gray-500"
                        onClick={() => openPopup(0, article.images)}
                      >
                        <ion-icon name="arrow-back-outline"></ion-icon> {t("readMore")}
                      </span>
                      {/* Mobile image */}
                      <div className="flex justify-center">
                        <img
                          src={coverImage}
                          alt={title}
                          className="lg:hidden md:h-[400px] h-[400px] mt-4 object-contain cursor-pointer"
                          onClick={() => openPopup(0, article.images)}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}

        {/* More Articles */}
        {moreArticles?.images?.length > 0 && (
          <div className="py-10 px-10 lg:px-20 md:px-20 xl:px-40 p-10 items-center pt-28 bg-neutral-100">
            <div className="flex justify-start pr-10 pb-4 text-gray-700 pt-10">
              <p className="text-sm md:text-xl border-b-[0.5px] border-gray-600">
                {t("moreArticles1")}{" "}
                <span
                  className="cursor-pointer font-semibold hover:text-gray-500"
                  onClick={() => openPopup(0, moreArticles.images)}
                >
                  {t("moreArticles2")}
                </span>
                .
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="lg:px-10 md:px-4 px-4 py-20 text-gray-700">
        <p className="text-center text-3xl pb-14">{t("ytInterviews")}</p>
        <YouTube videoIds={videoIds} />
      </div>

      <div className="bg-neutral-100">
        <BrowseGallery />
      </div>

      {showPopup && currentImageIndex !== null && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
          onClick={closePopup}
          {...handlers}
        >
          <div className="relative" ref={popupRef}>
            <img
              src={currentImageArray[currentImageIndex]}
              alt=""
              className="popup-image object-contain cursor-pointer"
              style={{ height: "700px" }}
              ref={imageRef}
              onClick={(e) => e.stopPropagation()}
            />
            {currentImageArray.length > 1 && (
              <>
                <button
                  className="absolute top-1/2 left-2 transform -translate-y-1/2 text-white text-3xl z-10 bg-black bg-opacity-30 rounded-full px-1 disabled:opacity-20"
                  onClick={(e) => { e.stopPropagation(); prevImage(); }}
                  disabled={currentImageIndex === 0}
                >
                  &#8249;
                </button>
                <button
                  className="absolute top-1/2 right-2 transform -translate-y-1/2 text-white text-3xl z-10 bg-black bg-opacity-30 rounded-full px-1 disabled:opacity-20"
                  onClick={(e) => { e.stopPropagation(); nextImage(); }}
                  disabled={currentImageIndex === currentImageArray.length - 1}
                >
                  &#8250;
                </button>
              </>
            )}
            <button className="absolute -top-1 right-2 text-gray-600 text-2xl" onClick={closePopup}>
              &times;
            </button>
            <Handlers handleClosePopup={closePopup} prevImage={prevImage} nextImage={nextImage} />
          </div>
        </div>
      )}
    </Layout>
  );
}

export default Press;

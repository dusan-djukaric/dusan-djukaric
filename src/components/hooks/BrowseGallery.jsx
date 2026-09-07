import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import i18next from "../../services/i18next";

function BrowseGallery() {
  const { t } = useTranslation();

  useEffect(() => {
    const storedLanguage = localStorage.getItem("selectedLanguage");
    if (storedLanguage) {
      i18next.changeLanguage(storedLanguage);
    }
  }, []);
  return (
    <>
      <div className="text-center py-20">
        <h2 className="text-4xl">{t("shoping")}</h2>
        <p className="my-5">{t("shopingText")}</p>
        <a href="/gallery">
          <button className="bg-gray-900 text-white py-2 px-3 hover:text-gray-900 hover:bg-white border border-gray-900">
            {t("galleryBtn")}
          </button>
        </a>
      </div>
    </>
  );
}

export default BrowseGallery;

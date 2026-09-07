import React, { useEffect, useState } from "react";
import Filter from "./Filter";
import PayPal from "../hooks/PayPal";
import Layout from "../layout/Layout";
import { useTranslation } from "react-i18next";
import i18next from "../../services/i18next";

/**
 * Gallery component - Main gallery page
 * Displays the art gallery with filtering and search functionality
 */
function Gallery() {
  const { t } = useTranslation();
  const [language, setLanguage] = useState("eng");

  useEffect(() => {
    const storedLanguage = localStorage.getItem('selectedLanguage');
    if (storedLanguage) {
      i18next.changeLanguage(storedLanguage);
      setLanguage(storedLanguage);
    }
  }, []);

  return (
    <Layout>
      <div className="absolute top-14 right-0 left-0 z-40">
        <PayPal />
      </div>
      <section className="flex flex-col pt-20 pb-5 px-1 items-center">
        <h1 className="text-3xl mb-10 mt-14 text-center">
          {t("galleryTitle")}
        </h1>
        <Filter isAdmin={false} chosenLanguage={language} />
      </section>
    </Layout>
  );
}

export default Gallery;

import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import i18next from "../../services/i18next";
import Layout from "../layout/Layout";
import apiClient from "../../services/apiClient";

function Exhibitions() {
  const { t, i18n } = useTranslation();
  const [exhibitions, setExhibitions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedLanguage = localStorage.getItem("selectedLanguage");
    if (storedLanguage) {
      i18next.changeLanguage(storedLanguage);
    }
  }, []);

  useEffect(() => {
    apiClient.getExhibitions()
      .then(data => setExhibitions(data.exhibitions || []))
      .catch(err => console.error('Failed to load exhibitions:', err))
      .finally(() => setLoading(false));
  }, []);

  const isSr = i18n.language === 'sr' || i18n.language === 'rs';
  const locale = isSr ? 'sr-Latn-RS' : 'en-GB';

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <Layout>
      <div className="py-12 px-6 md:px-12 lg:px-20 bg-neutral-50 text-gray-700">
        <div className="text-center my-20">
          <h1 className="text-3xl md:text-4xl">{t("exhibitionsTitle")}</h1>
          <hr className="w-[130px] md:w-[250px] mx-auto mt-2 border-gray-400" />
          <p>{t("byDusan")}</p>
        </div>

        {loading && (
          <p className="text-center text-gray-400">{t("loading")}</p>
        )}

        {!loading && exhibitions.length === 0 && (
          <p className="text-center text-gray-400">{t("exhibitionsNote1")}</p>
        )}

        {exhibitions.map((ex) => {
          const title = isSr ? ex.titleSr : ex.titleEn;
          const location = isSr ? ex.locationSr : ex.locationEn;
          const note = isSr ? ex.noteSr : ex.noteEn;
          const dateLabel = ex.dateEnd
            ? `${formatDate(ex.dateStart)} – ${formatDate(ex.dateEnd)}`
            : formatDate(ex.dateStart);

          return (
            <div
              key={ex.id}
              className="max-w-6xl mx-auto mb-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"
            >
              {/* Text */}
              <div className="bg-white p-8 rounded shadow-md h-full flex flex-col justify-between">
                <h2 className="text-xl mb-4">{title}</h2>
                <div>
                  {dateLabel && (
                    <p className="mb-2">
                      <span className="text-gray-400 text-sm">{t("date")} </span>
                      {dateLabel}
                    </p>
                  )}
                  {ex.openingTime && (
                    <p className="mb-2">
                      <span className="text-gray-400 text-sm">{t("opening")} </span>
                      {ex.openingTime}
                    </p>
                  )}
                  {location && (
                    <p className="mb-2">
                      <span className="text-gray-400 text-sm">{t("location")} </span>
                      {ex.locationUrl ? (
                        <a
                          href={ex.locationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:underline"
                        >
                          {location}
                        </a>
                      ) : (
                        location
                      )}
                    </p>
                  )}
                </div>
                {note && (
                  <div>
                    {note.split('\n').map((line, i) => (
                      <p key={i} className="text-sm">{line}</p>
                    ))}
                  </div>
                )}
              </div>

              {/* Image */}
              {ex.imageUrl && (
                <div>
                  <img
                    src={ex.imageUrl}
                    alt={title}
                    className="w-full h-auto object-cover rounded shadow"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Layout>
  );
}

export default Exhibitions;

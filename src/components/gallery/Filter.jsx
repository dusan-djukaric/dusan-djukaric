import React, { useState, useEffect } from "react";
import ImgGallery from "../hooks/ImgGallery";
import { useTranslation } from "react-i18next";
import i18next from "../../services/i18next";

/**
 * Filter component - Gallery filtering and search
 * Provides search functionality and filter options for the gallery
 */
function Filter({ isAdmin, addedNewPicture, chosenLanguage }) {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("available");
  const [initialLoad, setInitialLoad] = useState(true);

  const handleFilterChange = (e) => {
    setSelectedFilter(e.target.value);
  };

  useEffect(() => {
    const storedLanguage = localStorage.getItem('selectedLanguage');
    if (storedLanguage) {
      i18next.changeLanguage(storedLanguage);
    }
  }, []);

  useEffect(() => {
    if (initialLoad) {
      setInitialLoad(false);
    } else {
      setSelectedFilter("available");
    }
  }, [initialLoad]);

  return (
    <>
      <div className="flex mb-12">
        <div className="mb-2 w-[200px] md:w-[380px] lg:w-[380px] border rounded-[10px] h-[2.5rem] pl-[15px] pr-[15px] shadow-sm flex items-center bg-white">
          <ion-icon name="search-outline" aria-hidden="true"></ion-icon>
          <input
            name="search"
            id="search"
            className="bg-transparent h-full w-full ml-[5px] focus:outline-none"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t("placeholderSearch")}
            aria-label="Search paintings"
          />
        </div>
        <select
          id="filter"
          name="filter"
          className="mb-2 border rounded-[10px] px-[15px] py-[5px] shadow-sm text-gray-500 bg-white ml-6 focus:outline-none"
          value={selectedFilter}
          onChange={handleFilterChange}
          aria-label="Filter paintings"
        >
          <option value="available">{t("available")}</option>
          <option value="sold">{t("sold")}</option>
        </select>
      </div>
      <ImgGallery
        filter={selectedFilter}
        searchTerm={searchTerm}
        isAdmin={isAdmin}
        addedNewPicture={addedNewPicture}
        chosenLanguage={chosenLanguage}
      />
    </>
  );
}

export default Filter;

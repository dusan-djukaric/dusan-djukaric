import React, { useEffect } from "react";
import BioImage1 from "../assets/dusandjukaricBio1.png";
import BioImage2 from "../assets/dusandjukaricBio2.jpeg";
import { useTranslation } from "react-i18next";
import i18next from "../../services/i18next";

function AboutArtist() {
  const { t } = useTranslation();

  useEffect(() => {
    const storedLanguage = localStorage.getItem("selectedLanguage");
    if (storedLanguage) {
      i18next.changeLanguage(storedLanguage);
    }
  }, []);

  return (
    <>
      <div>
        <h1 className="flex justify-center text-3xl pt-8 pb-4 text-gray-700 w-1/2 mx-auto text-center">
          {t("aboutArtist")}
        </h1>
        <hr className="w-[80px] mx-auto mt-2 border-gray-700" />

        {/* First paragraph */}
        <div className="sm: mx-10 text-gray-700 leading-7">
          <div className="flex flex-wrap items-center justify-around my-20">
            <img
              src={BioImage1}
              alt="Dusan Djukaric"
              className="lg:mb-0 md:mb-8 sm:mb-8 lg:hidden lg:w-1/3 md:w-3/4 w-full shadow-2xl object-cover"
            />

            <div className="lg:w-1/2 text-justify">
              <h1 className="text-3xl text-gray-700 text-left">
                {t("artistTitle1")} <br /> {t("artistTitle2")}
              </h1>
              <hr className="w-[80px] mt-2 border-gray-700" /> <br />
              <p>
                {t("artistText1")}
                <br />
                <br />
                {t("artistText2")}
                <br />
                <br />
                {t("artistText3")}
              </p>
            </div>

            <img
              src={BioImage1}
              alt="Dusan Djukaric"
              className="hidden lg:block lg:w-1/3 md:w-3/4 w-full shadow-2xl object-cover"
            />
          </div>

          {/* Second paragraph */}
          <div className="flex flex-wrap items-center justify-around pb-20 pt-10">
            <img
              src={BioImage2}
              alt="Dusan Djukaric"
              className="lg:mb-0 md:mb-8 sm:mb-8 lg:w-1/3 md:w-3/4 sm:w-full shadow-2xl"
            />
            <div className="w-full lg:w-1/2 text-justify">
              <p>
                {t("artistText4")}
                <br />
                <br />
                {t("artistText5")}
                <br />
                <br />
                {t("artistText6")}
                <br />
                <br />
                {t("artistText7")}
              </p>

              <br />
              <a href="/contact">
                <div className="flex justify-end">
                  <button className="bg-gray-900 text-white px-5 py-2 hover:text-gray-900 hover:bg-white border border-gray-900">
                    {t("contactBtn")}
                  </button>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default AboutArtist;

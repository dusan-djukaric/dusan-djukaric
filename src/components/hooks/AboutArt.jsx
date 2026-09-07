import React, { useEffect } from "react";
import ImgArt from "../assets/aboutArt4.jpeg";
import ImgArt2 from "../assets/aboutArt3.jpeg";
import { useTranslation } from "react-i18next";
import i18next from "../../services/i18next";

function AboutArt() {
  const { t } = useTranslation();

  useEffect(() => {
    const storedLanguage = localStorage.getItem("selectedLanguage");
    if (storedLanguage) {
      i18next.changeLanguage(storedLanguage);
    }
  }, []);

  return (
    <div className="bg-gray-100">
      <div>
        <h1 className="flex justify-center text-3xl pt-8 pb-4 text-gray-700 w-1/2 mx-auto text-center">
          {t("aboutWatercolor")}
        </h1>
        <hr className="w-[110px] mx-auto mt-2 border-gray-700" />
      </div>

      {/* First section */}
      <div className="flex flex-wrap items-center justify-around sm:mx-10 text-gray-700 leading-7 tracking-wider pt-20">
        <img
          src={ImgArt2}
          alt="About Art"
          className="lg:mb-0 md:mb-8 sm:mb-8 lg:hidden lg:w-1/3 md:w-3/4 w-full shadow-2xl object-cover"
        />
        <div className="w-full lg:w-2/5 text-justify">
          <h1 className="text-3xl text-gray-700 text-left">
            {t("watercolorTitle1")} <br /> {t("watercolorTitle2")}
          </h1>
          <hr className="w-[80px] mt-2 border-gray-700" /> <br />
          <p>
            {t("watercolorText1")} <br />
            <br />
            {t("watercolorText2")}
            <br />
            <br />
            {t("watercolorText3")}
            <br />
            <br />
            {t("artistDDj")}
          </p>
        </div>
        <img
          src={ImgArt2}
          alt="About Art"
          className="hidden lg:block lg:w-1/3 md:w-3/4 w-full shadow-2xl object-cover"
        />
      </div>

      {/* Second section */}
      <div className="sm:mx-10 text-gray-700 leading-7 tracking-wider pb-20">
        <div className="flex flex-wrap items-center justify-around my-20">
          <img
            src={ImgArt}
            alt="About Art"
            className="lg:mb-0 md:mb-8 sm:mb-8 lg:w-1/3 md:w-3/4 w-full shadow-2xl"
          />
          <p className="w-full lg:w-2/5 text-justify">
            {t("watercolorText4")}
            <br />
            <br />
            {t("watercolorText5")}
            <br />
            <br />
            {t("watercolorText6")}
            <br />
            <br />
            {t("watercolorText7")}
            <br />
            <br />
            {t("artistDDj")}
          </p>
        </div>
      </div>
    </div>
  );
}

export default AboutArt;

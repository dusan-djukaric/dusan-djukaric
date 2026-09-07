import React, { useEffect, useRef } from "react";
import Image from "../assets/homeimage.jpeg";
import Sliders from "../slider/Sliders";
import styled from "styled-components";
import Layout from "../layout/Layout";
import { useTranslation } from "react-i18next";
import i18next from "../../services/i18next";
import { FaAngleDown } from "react-icons/fa";

const SliderBar = styled.div``;

function HomeImage() {
  const { t } = useTranslation();
  const sliderRef = useRef(null);

  useEffect(() => {
    const storedLanguage = localStorage.getItem("selectedLanguage");
    if (storedLanguage) {
      i18next.changeLanguage(storedLanguage);
    }
  }, []);

  const handleScroll = () => {
    sliderRef.current.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <Layout>
      <div className="relative h-screen w-full">
        <img
          src={Image}
          alt="Home"
          className="w-full h-screen object-cover object-leftgit "
        />
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 object-cover position-right">
          <div className="p-4 mb-64 md:p-12 lg:p-24 lg:mb-0 md:mb-24 sm:mb-48 text-gray-600">
            <h1 className="text-sm md:text-5xl lg:text-4xl font-bold relative">
              <p className="text-[17px] sm:text-lg md:text-base lg:text-2xl leading-snug">
                {t("welcome")}
                <br />
                <span className="text-[25px] sm:text-2xl lg:text-4xl leading-snug">
                  {t("welcome_name")}
                </span>
              </p>
            </h1>

            <h2 className="text-[17px] sm:text-sm md:text-xl lg:text-2xl font-light mt-4 md:mt-5">
              {t("about1")}
              <br className="hidden md:block" /> {t("about2")}
            </h2>
          </div>
        </div>
        <div
          className="flex justify-center items-center absolute bottom-14 lg:bottom-5 inset-x-0 cursor-pointer animate-bounce"
          onClick={handleScroll}
        >
          <FaAngleDown className="text-2xl text-gray-600" />
        </div>
      </div>

      <div ref={sliderRef} className="pt-4">
        <SliderBar>
          <Sliders />
        </SliderBar>
      </div>
    </Layout>
  );
}

export default HomeImage;

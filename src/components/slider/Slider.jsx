import React, { useRef, useEffect } from "react";
import Slider from "react-slick";
import styled from "styled-components";
import SliderBar from "./SliderBar";
import ImageSliderOne from "../assets/sliderArt1.jpeg";
import ImageSliderTwo from "../assets/sliderArt2.jpeg";
import ImageSliderThree from "../assets/sliderArt3.jpeg";
import ImageSliderFour from "../assets/sliderArt4.jpeg";
import ImageSliderFive from "../assets/sliderArt5.jpeg";
import ImageSliderSix from "../assets/sliderArt6.jpeg";
import ImageSliderSeven from "../assets/sliderArt7.jpeg";
import ImageSliderEight from "../assets/sliderArt8.jpeg";
import ImageSliderNine from "../assets/sliderArt9.jpeg";
import ImageSliderTen from "../assets/sliderArt10.jpeg";
import { useTranslation } from "react-i18next";
import i18next from "../../services/i18next";

let data = [
  {
    img: ImageSliderOne,
  },
  {
    img: ImageSliderThree,
  },
  {
    img: ImageSliderTwo,
  },
  {
    img: ImageSliderFive,
  },
  {
    img: ImageSliderFour,
  },
  {
    img: ImageSliderSix,
  },
  {
    img: ImageSliderEight,
  },
  {
    img: ImageSliderSeven,
  },
  {
    img: ImageSliderTen,
  },
  {
    img: ImageSliderNine,
  },
];

var settings = {
  autoplay: true,
  autoplaySpeed: 1500,
  className: "center",
  centerMode: true,
  dots: false,
  infinite: true,
  speed: 500,
  slidesToShow: 3,
  slidesToScroll: 1,
  initialSlide: 0,
  arrows: false,
  responsive: [
    {
      breakpoint: 990,
      settings: {
        slidesToShow: 3,
        slidesToScroll: 1,
        infinite: true,
        dots: false,
        centerMode: false,
      },
    },
    {
      breakpoint: 600,
      settings: {
        slidesToShow: 2,
        slidesToScroll: 2,
        initialSlide: 2,
        centerMode: false,
      },
    },
    {
      breakpoint: 480,
      settings: {
        slidesToShow: 1,
        slidesToScroll: 1,
        centerMode: false,
      },
    },
  ],
};

function SliderComp() {
  const { t } = useTranslation();
  const sliderRef = useRef();

  useEffect(() => {
    sliderRef.current.slickPlay(); // Pokretanje automatskog pomeranja pri učitavanju komponente
    const storedLanguage = localStorage.getItem("selectedLanguage");
    if (storedLanguage) {
      i18next.changeLanguage(storedLanguage);
    }
  }, []);

  return (
    <Container>
      <h1 className="flex justify-center text-[20px] md:text-2xl lg:text-2xl text-gray-700 mb-10 border-b border-gray-700 pb-6 w-[280px] md:w-[400px] lg:w-[400px] mx-auto text-center">
        {t("slider")}
      </h1>
      <a href="/gallery">
        <Slider ref={sliderRef} {...settings}>
          {data?.map((item, i) => (
            <SliderBar item={item} key={i} />
          ))}
        </Slider>
      </a>
    </Container>
  );
}

export default SliderComp;

const Container = styled.div`
  position: relative;
`;

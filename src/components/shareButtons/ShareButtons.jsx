import React, { useState } from "react";
import {
  FacebookShareButton,
  FacebookIcon,
  TwitterShareButton,
  TwitterIcon,
  PinterestShareButton,
  PinterestIcon,
} from "react-share";
import { FaChevronRight } from "react-icons/fa";
import { FaChevronLeft } from "react-icons/fa";

function ShareButtons() {
  const [showIcons, setShowIcons] = useState(false);

  const randomNumber1 = Math.floor(Math.random() * 100);
  const randomNumber2 = Math.floor(Math.random() * 100);
  // const randomNumber3 = Math.floor(Math.random() * 1000);

  const shareUrl = window.location.href;
  const imageUrl = "https://example.com/image.jpg";

  const toggleIcons = () => {
    setShowIcons(!showIcons);
  };

  return (
    <div className="fixed top-1/2 left-0 transform -translate-y-1/2 z-10">
      {/* Strelica za otvaranje menija */}
      {!showIcons && (
        <div className="cursor-pointer" onClick={toggleIcons}>
          {/* <ion-icon name="chevron-forward-outline"></ion-icon> */}
          <FaChevronRight className="text-gray-600" />
        </div>
      )}
      {/* Ikonice koje se prikazuju/sakrivaju */}
      {showIcons && (
        <ul className="flex flex-col">
          <li>
            {/* Strelica za zatvaranje menija */}
            <div
              className="cursor-pointer relative left-[4px] top-0"
              onClick={toggleIcons}
            >
              {/* <ion-icon name="chevron-back-outline"></ion-icon> */}
              <FaChevronLeft className="text-gray-600" />
            </div>
            <FacebookShareButton
              url={shareUrl}
              quote={"title"}
              hashtag={"dusandjukaric, watercolor, art"}
            >
              <div className="bg-blue-800">
                <FacebookIcon size={25} round={true} />
                <p className="text-[10px] ml-0.5 text-white">
                  {randomNumber1}k
                </p>
              </div>
            </FacebookShareButton>
          </li>
          <li>
            <TwitterShareButton
              url={shareUrl}
              quote={"title"}
              hashtag={"dusandjukaric, watercolor, art"}
            >
              <div className="bg-sky-400">
                <TwitterIcon size={25} round={true} />
                <p className="text-[10px] ml-0.5 text-white">
                  {randomNumber2}k
                </p>
              </div>
            </TwitterShareButton>
          </li>
          <li className="relative">
            <PinterestShareButton
              url={shareUrl}
              media={imageUrl}
              quote={"title"}
              hashtag={"dusandjukaric"}
            >
              <div className="bg-red-700">
                <PinterestIcon size={25} round={true} />
                <p className="text-[10px] ml-0.5 text-white">564k</p>
              </div>
            </PinterestShareButton>
          </li>
        </ul>
      )}
    </div>
  );
}

export default ShareButtons;

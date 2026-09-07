import i18next from "../../services/i18next";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { RxHamburgerMenu } from "react-icons/rx";
import { IoClose } from "react-icons/io5";

function NavBar(props) {
  const { t } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState("eng");
  const [changedLanguage, setChangedLanguage] = useState(false);
  const handleClick = (e) => {
    i18next.changeLanguage(e.target.value);
    setSelectedLanguage(e.target.value);
    setChangedLanguage(!changedLanguage);
    localStorage.setItem("selectedLanguage", e.target.value);
  };

  useEffect(() => {
    const storedLanguage = localStorage.getItem("selectedLanguage");
    setSelectedLanguage(storedLanguage);
  }, [changedLanguage]);

  let Links = [
    { name: t("home"), link: "/" },
    { name: t("gallery"), link: "/gallery" },
    { name: t("biography"), link: "/biography" },
    { name: t("press"), link: "/press" },
    { name: t("exhibitions"), link: "/exhibitions" },
    { name: t("contact"), link: "/contact" },
  ];
  let [open, setOpen] = useState(false);

  return (
    <>
      <div className="shadow-md w-full fixed top-0 left-0 z-50">
        <div className="md:flex items-center justify-between py-1 md:px-10 px-7 bg-neutral-50">
          <div className="font-bold text-2xl cursor-pointer flex items-center text-gray-800">
            <a
              href="/"
              className="text-xl md:text-sm lg:text-l font-medium italic w-42 py-3"
            >
              {t("logo")}
            </a>
          </div>
          <div
            onClick={() => setOpen(!open)}
            className="text-3xl absolute right-8 top-4 cursor-pointer md:hidden"
          >
            {open ? <IoClose /> : <RxHamburgerMenu />}
          </div>
          <ul
            className={`${
              open ? "left-0" : "left-[-100%]"
            } overflow-y-auto gap-8 md:flex md:items-center md:pb-0 absolute md:static md:z-auto z-[-1] left-0 w-full md:w-auto md:pl-0 pl-9 transition-all duration-500 ease-in h-screen lg:h-12 md:h-12 bg-neutral-50`}
          >
            {Links?.map((link) => (
              <li
                key={link.name}
                className="lg:ml-8 lg:text-xl md:text-l md:my-0 my-7 px-2 bg-neutral-50"
              >
                <a
                  href={link.link}
                  className="text-gray-800 hover:text-gray-400 duration-500 md:text-[10px] lg:text-sm"
                >
                  {link.name}
                </a>
              </li>
            ))}
            <select
              id="language"
              name="language"
              className="text-[10px] bg-neutral-50 -mb-1"
              onChange={(e) => handleClick(e)}
              value={selectedLanguage ?? "eng"}
            >
              <option value={"eng"}>ENG</option>
              <option value={"sr"}>SRB</option>
            </select>
          </ul>
        </div>
      </div>
    </>
  );
}

export default NavBar;

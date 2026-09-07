import React, {useEffect} from "react";
import { useTranslation } from "react-i18next";
import i18next from "../../services/i18next";

function Info() {
  const { t } = useTranslation();
  useEffect(() => {
    const storedLanguage = localStorage.getItem('selectedLanguage');
    if (storedLanguage) {
      i18next.changeLanguage(storedLanguage);
    }
  }, []);

  return (
    <div className="flex justify-around bg-gray-100 py-2 opacity-70">
      <div className="flex md:flex-col lg:flex-row md:text-center bg-gray-100 relative">
        <p className="px-20 font-bold">{t("info")}</p>
      </div>
    </div>
  );
}

export default Info;

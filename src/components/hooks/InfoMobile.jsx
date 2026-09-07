import React from "react";
import { useTranslation } from "react-i18next";

const InfoMobile = ({ onClose }) => {
  const { t } = useTranslation();

  return (
    <div className="fixed bottom-0 left-0 w-full bg-black bg-opacity-50 text-white p-4 text-center">
      <span className="absolute top-2 right-2 cursor-pointer" onClick={onClose}>
        &times;
      </span>
      <p>{t("info")}</p>
    </div>
  );
};

export default InfoMobile;

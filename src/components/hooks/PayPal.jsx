import React, {useEffect} from "react";
import { useTranslation } from "react-i18next";
import i18next from "../../services/i18next";

function PayPal() {
  const { t } = useTranslation();

  useEffect(() => {
    const storedLanguage = localStorage.getItem('selectedLanguage');
    if (storedLanguage) {
      i18next.changeLanguage(storedLanguage);
    }
  }, []);

  return (
    <div className="flex justify-around bg-gray-100 py-1 opacity-60">
      <div className="flex bg-gray-100 relative">
        <p className="mr-4 text-sm">{t("payPal")}</p>
      </div>
    </div>
  );
}

export default PayPal;

import React from "react";
import { useTranslation } from "react-i18next";

const ContactPage = () => {
  const { t } = useTranslation();
  const onSubmitHandler = (event) => {
    event.preventDefault();
  };
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-74px)] bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full mx-4 text-center">
        <h1 className="text-3xl font-bold mb-4">{t("contact.title")}</h1>
        <p className="text-gray-600 mb-4">{t("contact.description")}</p>
        <form onSubmit={onSubmitHandler} className="space-y-4">
          <div>
            <label className="block text-left text-gray-700 mb-2" htmlFor="name">
              {t("contact.name")}
            </label>
            <input
              type="text"
              id="name"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-left text-gray-700 mb-2" htmlFor="email">
              {t("contact.email")}
            </label>
            <input
              type="email"
              id="email"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-left text-gray-700 mb-2" htmlFor="message">
              {t("contact.message")}
            </label>
            <textarea
              id="message"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            ></textarea>
          </div>
          <button
            type="submit"
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            {t("contact.send")}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ContactPage;

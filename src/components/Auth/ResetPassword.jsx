import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../../services/api";
import { useForm } from "react-hook-form";
import { Divider } from "@mui/material";
import InputField from "../InputField/InputField";
import toast from "react-hot-toast";
import Buttons from "../../utils/Buttons";
import { useTranslation } from "react-i18next";

const ResetPassword = () => {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      email: "",
    },
    mode: "onTouched",
  });

  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();

  const handleResetPassword = async (data) => {
    const { password } = data;

    const token = searchParams.get("token");

    setLoading(true);
    try {
      const formData = new URLSearchParams();

      formData.append("token", token);
      formData.append("newPassword", password);
      await api.post("/auth/public/reset-password", formData, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });
      toast.success(t("toast.resetSuccess"));
      reset();
    } catch (error) {
      toast.error(t("toast.resetError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-74px)] flex justify-center items-center">
      <form
        onSubmit={handleSubmit(handleResetPassword)}
        className="sm:w-112.5 w-90  shadow-custom py-8 sm:px-8 px-4"
      >
        <div>
          <h1 className="font-montserrat text-center font-bold text-2xl">{t("auth.resetTitle")}</h1>
          <p className="text-slate-600 text-center">{t("auth.resetDescription")}</p>
        </div>
        <Divider className="font-semibold pb-4"></Divider>

        <div className="flex flex-col gap-2 mt-4">
          <InputField
            label={t("auth.password")}
            required
            id="password"
            type="password"
            message={t("auth.passwordRequired")}
            placeholder={t("auth.resetPasswordPlaceholder")}
            register={register}
            errors={errors}
            min={6}
          />
           <InputField
                  label="Confirm Password"
                  required
                  id="confirmPassword"
                  className="w-full"
                  type="password"
                  message="*Confirm Password is required"
                  placeholder={t("auth.confirmPasswordPlaceholder")}
                  register={register }
                  errors={errors}
                  min={6}
                  validate={(value) => value === watch("password") || "Passwords do not match"}
                />{" "}
        </div>
        <Buttons
          disabled={loading}
          onClickhandler={() => {}}
          className="bg-customRed font-semibold text-white w-full py-2 hover:text-slate-400 transition-colors duration-100 rounded-sm my-3"
          type="text"
        >
          {loading ? <span>{t("auth.loading")}</span> : t("auth.submit")}
        </Buttons>
        <p className=" text-sm text-slate-700 ">
          <Link className=" underline hover:text-black" to="/login">
            {t("auth.backLogin")}
          </Link>
        </p>
      </form>
    </div>
  );
};

export default ResetPassword;

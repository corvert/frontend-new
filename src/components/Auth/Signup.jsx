import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../../services/api";
import { FcGoogle } from "react-icons/fc";
import { FaGithub } from "react-icons/fa";
import Divider from "@mui/material/Divider";
import Buttons from "../../utils/Buttons";
import InputField from "../InputField/InputField";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useMyContext } from "../../store/ContextApi";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

const Signup = () => {
  const apiUrl = import.meta.env.VITE_API_URL;
  const [role, setRole] = useState();
  const [loading, setLoading] = useState(false);
  // Access the token and setToken function using the useMyContext hook from the ContextProvider
  const { token } = useMyContext();
  const navigate = useNavigate();
  const { t } = useTranslation();

  //react hook form initialization
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors },
  } = useForm({
    defaultValues: {
      username: "",
      email: "",
      password: "",
    },
    mode: "onTouched",
  });

  useEffect(() => {
    setRole("ROLE_USER");
  }, []);

  const onSubmitHandler = async (data) => {
    const { username, email, password } = data;
    const sendData = {
      username,
      email,
      password,
      role: [role],
    };

    try {
      setLoading(true);
      const response = await api.post("/auth/public/signup", sendData);
      toast.success(t("toast.registerSuccess"));
      reset();
      if (response.data) {
        navigate("/login");
      }
    } catch (error) {
      // Add an error programmatically by using the setError function provided by react-hook-form
      //setError(keyword,message) => keyword means the name of the field where I want to show the error

      if (error?.response?.data?.message === "Error: Username is already taken!") {
        setError("username", { message: "username is already taken" });
      } else if (error?.response?.data?.message === "Error: Email is already in use!") {
        setError("email", { message: "Email is already in use" });
      }
    } finally {
      setLoading(false);
    }
  };

  //if there is token  exist navigate to the user to the home page if he tried to access the login page
  useEffect(() => {
    if (token) navigate("/");
  }, [navigate, token]);

  return (
    <div className="min-h-[calc(100vh-74px)] flex justify-center items-center">
      <form
        onSubmit={handleSubmit(onSubmitHandler)}
        className="sm:w-112.5 w-90  shadow-custom py-6 sm:px-8 px-4"
      >
        <div>
          <h1 className="font-montserrat text-center font-bold text-2xl">
            {t("auth.registerTitle")}
          </h1>
          <p className="text-slate-600 text-center">{t("auth.registerDescription")}</p>
          <div className="flex items-center justify-between gap-1 py-5 ">
            <a
              href={`${apiUrl}/oauth2/authorization/google`}
              className="flex gap-1 items-center justify-center flex-1 border p-2 shadow-sm shadow-slate-200 rounded-md hover:bg-slate-300 transition-all duration-300"
            >
              <span>
                <FcGoogle className="text-2xl" />
              </span>
              <span className="font-semibold sm:text-customText text-xs">
                {t("auth.loginGoogle")}
              </span>
            </a>
            <a
              href={`${apiUrl}/oauth2/authorization/github`}
              className="flex gap-1 items-center justify-center flex-1 border p-2 shadow-sm shadow-slate-200 rounded-md hover:bg-slate-300 transition-all duration-300"
            >
              <span>
                <FaGithub className="text-2xl" />
              </span>
              <span className="font-semibold sm:text-customText text-xs">
                {t("auth.loginGithub")}
              </span>
            </a>
          </div>

          <Divider className="font-semibold">{t("auth.or")}</Divider>
        </div>

        <div className="flex flex-col gap-2">
          <InputField
            label={t("auth.username")}
            required
            id="username"
            type="text"
            message={t("auth.usernameRequired")}
            placeholder={t("auth.usernamePlaceholder")}
            register={register}
            errors={errors}
          />{" "}
          <InputField
            label={t("auth.email")}
            required
            id="email"
            type="email"
            message={t("auth.emailRequired")}
            placeholder={t("auth.emailPlaceholder")}
            register={register}
            errors={errors}
          />
          <InputField
            label={t("auth.password")}
            required
            id="password"
            type="password"
            message={t("auth.passwordRequired")}
            placeholder={t("auth.passwordPlaceholder")}
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
                  placeholder="Confirm new Password"
                  register={register }
                  errors={errors}
                  min={6}
                  validate={(value) => value === watch("password") || "Passwords do not match"}
                />
        </div>
        <Buttons
          disabled={loading}
          onClickhandler={() => {}}
          className="bg-customRed font-semibold flex justify-center text-white w-full py-2 hover:text-slate-400 transition-colors duration-100 rounded-sm my-3"
          type="text"
        >
          {loading ? <span>{t("auth.loading")}</span> : t("auth.register")}
        </Buttons>

        <p className="text-center text-sm text-slate-700 mt-2">
          {t("auth.hasAccount")}{" "}
          <Link className="font-semibold underline hover:text-black" to="/login">
            {t("auth.login")}
          </Link>
        </p>
      </form>
    </div>
  );
};

export default Signup;

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import api from "../../services/api";
import { jwtDecode } from "jwt-decode";
import InputField from "../InputField/InputField";
import { FcGoogle } from "react-icons/fc";
import { FaGithub } from "react-icons/fa";
import Divider from "@mui/material/Divider";
import Buttons from "../../utils/Buttons";
import toast from "react-hot-toast";
import { useMyContext } from "../../store/ContextApi";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

const apiUrl = import.meta.env.VITE_API_URL;

const Login = () => {
  // Step 1: Login method and Step 2: Verify 2FA
  const [step, setStep] = useState(1);
  const [jwtToken, setJwtToken] = useState("");
  const [loading, setLoading] = useState(false);
  // Access the token and setToken function using the useMyContext hook from the ContextProvider
  const { setToken, token } = useMyContext();
  const navigate = useNavigate();
  const { t } = useTranslation();

  //react hook form initialization
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      username: "",
      password: "",
      code: "",
    },
    mode: "onTouched",
  });

  const handleSuccessfulLogin = (token, decodedToken) => {
    const user = {
      username: decodedToken.sub,
      roles: decodedToken.roles ? decodedToken.roles.split(",") : [],
    };
    localStorage.setItem("JWT_TOKEN", token);
    localStorage.setItem("USER", JSON.stringify(user));

    //store the token on the context state  so that it can be shared any where in our application by context provider
    setToken(token);

    navigate("/notes");
  };

  //function for handle login with credentials
  const onLoginHandler = async (data) => {
    try {
      setLoading(true);
      const response = await api.post("/auth/public/signin", data);

      //showing success message with react hot toast
      toast.success(t("toast.loginSuccess"));

      //reset the input field by using reset() function provided by react hook form after submission
      reset();

      if (response.status === 200 && response.data.jwtToken) {
        setJwtToken(response.data.jwtToken);
        const decodedToken = jwtDecode(response.data.jwtToken);
        if (decodedToken.is2faEnabled) {
          setStep(2); // Move to 2FA verification step
        } else {
          handleSuccessfulLogin(response.data.jwtToken, decodedToken);
        }
      } else {
        toast.error(t("toast.loginFailed"));
      }
    } catch (error) {
      if (error) {
        toast.error(t("toast.invalidCredentials"));
      }
    } finally {
      setLoading(false);
    }
  };

  //function for verify 2fa authentication
  const onVerify2FaHandler = async (data) => {
    const code = data.code;
    setLoading(true);

    try {
      const formData = new URLSearchParams();
      formData.append("code", code);
      formData.append("jwtToken", jwtToken);

      await api.post("/auth/public/verify-2fa-login", formData, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      const decodedToken = jwtDecode(jwtToken);
      handleSuccessfulLogin(jwtToken, decodedToken);
    } catch (error) {
      console.error("2FA verification error", error);
      toast.error(t("toast.invalid2fa"));
    } finally {
      setLoading(false);
    }
  };

  //if there is token  exist navigate  the user to the home page if he tried to access the login page
  useEffect(() => {
    if (token) navigate("/");
  }, [navigate, token]);

  //step1 will render the login form and step-2 will render the 2fa verification form
  return (
    <div className="min-h-[calc(100vh-74px)] flex justify-center items-center">
      {step === 1 ? (
        <React.Fragment>
          <form
            onSubmit={handleSubmit(onLoginHandler)}
            className="sm:w-112.5 w-90  shadow-custom py-8 sm:px-8 px-4"
          >
            <div>
              <h1 className="font-montserrat text-center font-bold text-2xl">
                {t("auth.loginHere")}
              </h1>
              <p className="text-slate-600 text-center">{t("auth.loginDescription")}</p>
              <div className="flex items-center justify-between gap-1 py-5 ">
                <Link
                  to={`${apiUrl}/oauth2/authorization/google`}
                  className="flex gap-1 items-center justify-center flex-1 border p-2 shadow-sm shadow-slate-200 rounded-md hover:bg-slate-300 transition-all duration-300"
                >
                  <span>
                    <FcGoogle className="text-2xl" />
                  </span>
                  <span className="font-semibold sm:text-customText text-xs">
                    {t("auth.loginGoogle")}
                  </span>
                </Link>
                <Link
                  to={`${apiUrl}/oauth2/authorization/github`}
                  className="flex gap-1 items-center justify-center flex-1 border p-2 shadow-sm shadow-slate-200 rounded-md hover:bg-slate-300 transition-all duration-300"
                >
                  <span>
                    <FaGithub className="text-2xl" />
                  </span>
                  <span className="font-semibold sm:text-customText text-xs">
                    {t("auth.loginGithub")}
                  </span>
                </Link>
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
                label={t("auth.password")}
                required
                id="password"
                type="password"
                message={t("auth.passwordRequired")}
                placeholder={t("auth.passwordPlaceholder")}
                register={register}
                errors={errors}
              />
            </div>
            <Buttons
              disabled={loading}
              onClickhandler={() => {}}
              className="bg-customRed font-semibold text-white w-full py-2 hover:text-slate-400 transition-colors duration-100 rounded-sm my-3"
              type="submit"
            >
              {loading ? <span>{t("auth.loading")}</span> : t("auth.login")}
            </Buttons>
            <p className=" text-sm text-slate-700 ">
              <Link className=" underline hover:text-black" to="/forgot-password">
                {t("auth.forgotPassword")}
              </Link>
            </p>

            <p className="text-center text-sm text-slate-700 mt-6">
              {t("auth.noAccount")}{" "}
              <Link className="font-semibold underline hover:text-black" to="/signup">
                {t("nav.signup")}
              </Link>
            </p>
          </form>
        </React.Fragment>
      ) : (
        <React.Fragment>
          <form
            onSubmit={handleSubmit(onVerify2FaHandler)}
            className="sm:w-112.5 w-90  shadow-custom py-8 sm:px-8 px-4"
          >
            <div>
              <h1 className="font-montserrat text-center font-bold text-2xl">
                {t("auth.verify2fa")}
              </h1>
              <p className="text-slate-600 text-center">{t("auth.verify2faDescription")}</p>

              <Divider className="font-semibold pb-4"></Divider>
            </div>

            <div className="flex flex-col gap-2 mt-4">
              <InputField
                label={t("auth.enterCode")}
                required
                id="code"
                type="text"
                message={t("auth.codeRequired")}
                placeholder={t("auth.codePlaceholder")}
                register={register}
                errors={errors}
              />
            </div>
            <Buttons
              disabled={loading}
              onClickhandler={() => {}}
              className="bg-customRed font-semibold text-white w-full py-2 hover:text-slate-400 transition-colors duration-100 rounded-sm my-3"
              type="submit"
            >
              {loading ? <span>{t("auth.loading")}</span> : t("auth.verify2faButton")}
            </Buttons>
          </form>
        </React.Fragment>
      )}
    </div>
  );
};

export default Login;

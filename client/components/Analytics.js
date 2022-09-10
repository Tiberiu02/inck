import Script from "next/script";
import { useEffect } from "react";

export function AnalyticsScript() {
  /* Google tag (gtag.js) */
  useEffect(() => {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      dataLayer.push(arguments);
    };

    gtag("js", new Date());

    gtag("config", "G-M75NLE2CYF");
  }, []);

  return <Script async src="https://www.googletagmanager.com/gtag/js?id=G-M75NLE2CYF" />;
}

export function TrackSignUp(email) {
  gtag("event", "sign_up", {
    event_label: "New Sign Up",
    email_provider: email.split("@")[1],
  });
}

export function TrackLogin(email) {
  gtag("event", "login", {
    event_label: "User Login",
    email_provider: email.split("@")[1],
  });
}

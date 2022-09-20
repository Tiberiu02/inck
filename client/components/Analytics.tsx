import Script from "next/script";
import { useEffect } from "react";

declare global {
  var dataLayer: any[];
  function gtag(...params: any[]);
}

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
    enail: email,
    email_provider: email.split("@")[1],
  });
}

export function TrackLogin(email) {
  gtag("event", "login", {
    event_label: "User Login",
    email: email,
    email_provider: email.split("@")[1],
  });
}

export function TrackNoteCreation(type) {
  gtag("event", "note_creation", {
    event_label: "Note Creation",
    note_type: type,
  });
}

export function TrackFolderCreation(type) {
  gtag("event", "folder_creation", {
    event_label: "Folder Creation",
  });
}

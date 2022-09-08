export function AnalyticsScript() {
  /* Google tag (gtag.js) */
  return (
    <script
      async
      src="https://www.googletagmanager.com/gtag/js?id=G-M75NLE2CYF"
      onLoad={() => {
        window.dataLayer = window.dataLayer || [];
        function gtag() {
          dataLayer.push(arguments);
        }
        gtag("js", new Date());

        gtag("config", "G-M75NLE2CYF");
      }}
    ></script>
  );
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

(() => {
  const isSecureProductionOrigin =
    window.location.protocol === "https:" &&
    window.location.hostname !== "localhost" &&
    window.location.hostname !== "127.0.0.1";

  if (!("serviceWorker" in navigator) || !isSecureProductionOrigin) {
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js", { scope: "/" }).then(
      (registration) => {
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") {
            registration.update().catch(() => undefined);
          }
        });
      },
      (error) => {
        console.warn("No se ha podido registrar el service worker de Rondapp.", error);
      },
    );
  });
})();

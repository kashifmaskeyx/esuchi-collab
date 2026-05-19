export const defaultProfileSettings = {
  theme: "system",
  density: "comfortable",
  defaultView: "dashboard",
  timezone: "Asia/Katmandu",
  currency: "USD",
  stockAlertThreshold: "10",
  shipmentAlertWindow: "3",
  emailAlerts: true,
  lowStockAlerts: true,
  shipmentAlerts: true,
  returnAlerts: true,
};

const STORAGE_KEY = "esuchiProfileSettings";

export const readProfileSettings = () => {
  try {
    return {
      ...defaultProfileSettings,
      ...JSON.parse(localStorage.getItem(STORAGE_KEY)),
    };
  } catch {
    return defaultProfileSettings;
  }
};

export const saveProfileSettings = (settings) => {
  const nextSettings = {
    ...defaultProfileSettings,
    ...settings,
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSettings));
  applyProfileSettings(nextSettings);
  window.dispatchEvent(
    new CustomEvent("esuchi-profile-settings-change", {
      detail: nextSettings,
    }),
  );

  return nextSettings;
};

export const applyProfileSettings = (settings = readProfileSettings()) => {
  const root = document.documentElement;
  const prefersDark =
    window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false;
  const theme =
    settings.theme === "system"
      ? prefersDark
        ? "dark"
        : "light"
      : settings.theme;

  root.dataset.theme = theme;
  root.dataset.density = settings.density || "comfortable";
};

export const getDefaultUserLandingPath = () => {
  const view = readProfileSettings().defaultView;
  const paths = {
    dashboard: "/dashboard",
    inventory: "/inventory",
    shipment: "/shipment",
    orders: "/orders",
  };

  return paths[view] || "/dashboard";
};

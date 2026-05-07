import { Outlet, useLoaderData, useLocation, useRouteError } from "react-router";
import { useEffect, useState } from "react";
import { NavMenu } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { AppProvider as PolarisProvider } from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  // eslint-disable-next-line no-undef
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export default function App() {
  const { apiKey } = useLoaderData();
  const location = useLocation();
  const [isClientReady, setIsClientReady] = useState(false);
  const search = location.search || "";

  useEffect(() => {
    let secondFrame;
    const frame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => setIsClientReady(true));
    });

    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(secondFrame);
    };
  }, []);

  return (
    <AppProvider embedded apiKey={apiKey}>
      <PolarisProvider i18n={enTranslations}>
        <NavMenu>
          <a href={`/app${search}`}>Dashboard</a>
          <a href={`/app/additional${search}`}>Fulfillment Logs</a>
          <a href={`/app/settings${search}`}>Settings</a>
        </NavMenu>

        {isClientReady ? (
          <Outlet />
        ) : (
          <div style={{ minHeight: "320px" }} />
        )}
      </PolarisProvider>
    </AppProvider>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};

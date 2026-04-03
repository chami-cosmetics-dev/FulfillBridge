/* global process */

import { Page, Card, Text, BlockStack, TextField, Button, Banner } from "@shopify/polaris";
import { useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  const appUrl = new URL(request.url).origin;

  return { 
    authKey: process.env.X_ADAPT_KEY || "your_secret_key",
    appUrl,
  };
};

export default function Settings() {
  const { authKey, appUrl } = useLoaderData();
  const shopify = useAppBridge();
  
  const endpoint = appUrl
    ? `${appUrl}/api/updateAdaptDetails`
    : "/api/updateAdaptDetails";

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    shopify.toast.show(`${label} copied to clipboard`);
  };

  return (
    <Page title="Settings">
      <BlockStack gap="500">
        <Banner title="Connection Ready" tone="info">
          <p>Use these credentials in your Adapt logistics system to enable automated fulfillment sync.</p>
        </Banner>

        <Card>
          <BlockStack gap="400">
            <Text variant="headingMd" as="h2">API Integration Credentials</Text>
            
            <BlockStack gap="200">
              <TextField
                label="Your Fulfillment Endpoint"
                value={endpoint}
                readOnly
                connectedRight={
                  <Button onClick={() => copyToClipboard(endpoint, "Endpoint")}>Copy</Button>
                }
                helpText="Paste this URL into the 'Webhook URL' section of your Adapt system."
              />
            </BlockStack>

            <BlockStack gap="200">
              <TextField
                label="Security Key (X-Adapt-Key)"
                value={authKey}
                type="password"
                readOnly
                connectedRight={
                  <Button onClick={() => copyToClipboard(authKey, "API Key")}>Copy</Button>
                }
                helpText="Use this key for authentication in your API headers."
              />
            </BlockStack>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="200">
            <Text variant="headingMd" as="h2">Data Syncing</Text>
            <Text as="p">
              This app currently syncs <strong>Unfulfilled</strong> orders only. If an order is already fulfilled in Shopify, the sync will be ignored to prevent duplicate notifications.
            </Text>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}

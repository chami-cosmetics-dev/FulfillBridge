/* global process */

import { Page, Card, Text, BlockStack, TextField, Button, InlineStack, Badge } from "@shopify/polaris";
import { useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  const appUrl = process.env.SHOPIFY_APP_URL || new URL(request.url).origin;

  return { 
    authKey: process.env.X_ADAPT_KEY || "your_secret_key",
    appUrl,
  };
};

export default function Settings() {
  const { authKey, appUrl } = useLoaderData();
  const shopify = useAppBridge();
  
  const endpoint = appUrl
    ? `${appUrl}/api/updateFulfillmentDetails`
    : "/api/updateFulfillmentDetails";

  const sampleBody = JSON.stringify(
    {
      shop: "your-test-store.myshopify.com",
      invoiceNumber: "#1001",
    },
    null,
    2,
  );

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    shopify.toast.show(`${label} copied to clipboard`);
  };

  return (
    <Page title="Settings">
      <BlockStack gap="400">
        <Card>
          <BlockStack gap="300">
            <InlineStack align="space-between" blockAlign="center" gap="300">
              <Text variant="headingMd" as="h2">Review testing flow</Text>
              <Badge tone="info">No warehouse login required</Badge>
            </InlineStack>
            <Text as="p" tone="subdued">
              The external warehouse action is simulated by sending an authenticated Postman request to the fulfillment API endpoint below.
            </Text>
            <ol style={{ margin: 0, paddingLeft: "1.25rem" }}>
              <li>Create or select an existing unfulfilled Shopify order.</li>
              <li>Copy the endpoint, header name, API key, and sample JSON body from this page.</li>
              <li>Send the request in Postman, then confirm the order is fulfilled and appears in Fulfillment History.</li>
            </ol>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="400">
            <Text variant="headingMd" as="h2">API Integration Credentials</Text>
            <Text as="p" tone="subdued">
              Use these values in Postman or cURL to test automated fulfillment for an existing unfulfilled Shopify order.
            </Text>
            
            <BlockStack gap="200">
              <TextField
                label="Your Fulfillment Endpoint"
                value={endpoint}
                readOnly
                connectedRight={
                  <Button onClick={() => copyToClipboard(endpoint, "Endpoint")}>Copy</Button>
                }
                helpText="Send a POST request to this URL from Postman or your external fulfillment system."
              />
            </BlockStack>

            <BlockStack gap="200">
              <TextField
                label="Request Method"
                value="POST"
                readOnly
                connectedRight={
                  <Button onClick={() => copyToClipboard("POST", "Request method")}>Copy</Button>
                }
                helpText="Use POST when sending the fulfillment request."
              />
            </BlockStack>

            <BlockStack gap="200">
              <TextField
                label="Security Header Value"
                value={authKey}
                type="password"
                readOnly
                connectedRight={
                  <Button onClick={() => copyToClipboard(authKey, "API Key")}>Copy</Button>
                }
                helpText="Add this value to the X-Fulfillment-Key request header."
              />
            </BlockStack>

            <BlockStack gap="200">
              <TextField
                label="Content-Type Header"
                value="application/json"
                readOnly
                connectedRight={
                  <Button onClick={() => copyToClipboard("application/json", "Content-Type")}>Copy</Button>
                }
                helpText="Send the request body as JSON."
              />
            </BlockStack>

            <BlockStack gap="200">
              <TextField
                label="Security Header Name"
                value="X-Fulfillment-Key"
                readOnly
                connectedRight={
                  <Button onClick={() => copyToClipboard("X-Fulfillment-Key", "Header name")}>Copy</Button>
                }
                helpText="Use this as the request header name in Postman or cURL."
              />
            </BlockStack>

            <BlockStack gap="200">
              <TextField
                label="Postman JSON Body Example"
                value={sampleBody}
                multiline={4}
                readOnly
                connectedRight={
                  <Button onClick={() => copyToClipboard(sampleBody, "Sample body")}>Copy</Button>
                }
                helpText="Use an existing unfulfilled Shopify test order number. The API call creates the fulfillment and records the result in Fulfillment History."
              />
            </BlockStack>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="200">
            <Text variant="headingMd" as="h2">Fulfillment behavior</Text>
            <Text as="p">
              This app fulfills <strong>Unfulfilled</strong> orders only after a valid API request is received. Already fulfilled orders are skipped to avoid duplicate fulfillment.
            </Text>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}

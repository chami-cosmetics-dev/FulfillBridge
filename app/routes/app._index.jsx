/* global process */

import { useLoaderData } from "react-router";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineStack,
  Badge,
  Box,
  Divider,
  Button,
  Banner,
  ProgressBar,
} from "@shopify/polaris";
import { ExternalIcon, LinkIcon } from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const appUrl = new URL(request.url).origin;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  let metrics = {
    totalCalls: 0,
    todayCalls: 0,
    successCount: 0,
    skippedCount: 0,
  };

  try {
    const [totalCalls, todayCalls, successCount, skippedCount] = await Promise.all([
      db.adaptSyncLog.count({ where: { shop: session.shop } }),
      db.adaptSyncLog.count({
        where: {
          shop: session.shop,
          createdAt: { gte: startOfToday },
        },
      }),
      db.adaptSyncLog.count({
        where: { shop: session.shop, status: "success" },
      }),
      db.adaptSyncLog.count({
        where: { shop: session.shop, status: "already_fulfilled" },
      }),
    ]);

    metrics = { totalCalls, todayCalls, successCount, skippedCount };
  } catch (error) {
    console.error("⚠️ Dashboard metrics unavailable:", error.message);
  }

  const processedCount = metrics.successCount + metrics.skippedCount;
  const successRate = processedCount > 0 ? Math.round((metrics.successCount / processedCount) * 100) : 0;

  return {
    shop: session.shop,
    appUrl,
    authKey: process.env.X_ADAPT_KEY || "••••••••",
    ...metrics,
    successRate,
  };
};

export default function Index() {
  const { shop, appUrl, authKey, totalCalls, todayCalls, successCount, skippedCount, successRate } = useLoaderData();
  const successTone = successRate >= 95 ? "success" : successRate >= 80 ? "warning" : "critical";

  return (
    <Page title="Fulfillment Overview">
      <BlockStack gap="500">

        <Banner title="System active" tone="success">
          <p>Order data from Adapt is successfully syncing to <strong>{shop}</strong>.</p>
        </Banner>

        <Layout>
          <Layout.Section>
            <BlockStack gap="400">
              <InlineStack gap="400" align="stretch">
                <Box flex="1">
                  <Card>
                    <BlockStack gap="200">
                      <Text variant="headingSm" as="h3" tone="subdued">API CALLS TODAY</Text>
                      <Text variant="heading2xl" as="p">{todayCalls}</Text>
                      <Text as="p" tone="subdued">Requests received through `updateAdaptDetails`.</Text>
                    </BlockStack>
                  </Card>
                </Box>
                <Box flex="1">
                  <Card>
                    <BlockStack gap="200">
                      <Text variant="headingSm" as="h3" tone="subdued">TOTAL API CALLS</Text>
                      <Text variant="heading2xl" as="p">{totalCalls}</Text>
                      <Text as="p" tone="subdued">All-time API requests for this store.</Text>
                    </BlockStack>
                  </Card>
                </Box>
                <Box flex="1">
                  <Card>
                    <BlockStack gap="200">
                      <InlineStack align="space-between">
                        <Text variant="headingSm" as="h3" tone="subdued">SUCCESS RATE</Text>
                        <Badge tone={successTone}>{successRate}%</Badge>
                      </InlineStack>
                      <ProgressBar progress={successRate} tone={successTone} size="small" />
                      <InlineStack align="space-between">
                        <Text as="span" tone="subdued">Fulfilled: {successCount}</Text>
                        <Text as="span" tone="subdued">Skipped: {skippedCount}</Text>
                      </InlineStack>
                    </BlockStack>
                  </Card>
                </Box>
              </InlineStack>

              <Card>
                <BlockStack gap="300">
                  <Text variant="headingMd" as="h2">Integration Details</Text>
                  <Text as="p" tone="subdued">
                    Your external logistics system (Adapt) is connected. Invoices generated in Adapt automatically mark the corresponding Shopify orders as fulfilled.
                  </Text>
                  <Divider />
                  <Box paddingBlockStart="200">
                    <BlockStack gap="200">
                      <InlineStack align="space-between">
                        <Text as="span" fontWeight="semibold">Endpoint URL</Text>
                        <Text as="span" variant="code">{`${appUrl}/api/updateAdaptDetails`}</Text>
                      </InlineStack>
                      <InlineStack align="space-between">
                        <Text as="span" fontWeight="semibold">Security Header</Text>
                        <Text as="span" variant="code">{authKey}</Text>
                      </InlineStack>
                    </BlockStack>
                  </Box>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <BlockStack gap="400">
              <Card>
                <BlockStack gap="300">
                  <Text variant="headingMd" as="h2">Quick Actions</Text>
                  <Button 
                    fullWidth 
                    variant="primary" 
                    icon={ExternalIcon} 
                    url={`https://${shop}/admin/orders`} 
                    target="_blank"
                  >
                    View Shopify Orders
                  </Button>
                  <Button fullWidth icon={LinkIcon} url="/app/additional">
                    View Sync History
                  </Button>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="200">
                  <Text variant="headingMd" as="h2">System Notes</Text>
                  <Text as="p" tone="subdued">
                    Sync activity is based on live requests to `/api/updateAdaptDetails`.
                  </Text>
                  <Text as="p" tone="subdued">
                    If orders are not appearing, check Adapt request logs and Shopify order names (invoice number mapping).
                  </Text>
                  <Button variant="tertiary" url="#">Contact Support</Button>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>

        </Layout>
      </BlockStack>
    </Page>
  );
}

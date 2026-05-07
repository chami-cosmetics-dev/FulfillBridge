/* global process */

import { useLoaderData, useLocation } from "react-router";
import {
  Page,
  Card,
  Text,
  BlockStack,
  InlineStack,
  Badge,
  Box,
  Button,
  ProgressBar,
} from "@shopify/polaris";
import { ExternalIcon, LinkIcon } from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const visibleLogWhere = {
    shop: session.shop,
    NOT: {
      message: {
        contains: "Prisma session table does not exist",
      },
    },
  };

  let metrics = {
    totalCalls: 0,
    todayCalls: 0,
    successCount: 0,
    skippedCount: 0,
    failedCount: 0,
    latestSync: null,
  };

  try {
    const [totalCalls, todayCalls, successCount, skippedCount, failedCount, latestSync] = await Promise.all([
      db.adaptSyncLog.count({ where: visibleLogWhere }),
      db.adaptSyncLog.count({
        where: {
          ...visibleLogWhere,
          createdAt: { gte: startOfToday },
        },
      }),
      db.adaptSyncLog.count({
        where: { ...visibleLogWhere, status: "success" },
      }),
      db.adaptSyncLog.count({
        where: { ...visibleLogWhere, status: "already_fulfilled" },
      }),
      db.adaptSyncLog.count({
        where: {
          ...visibleLogWhere,
          status: { in: ["failed", "error", "not_found", "invalid_request"] },
        },
      }),
      db.adaptSyncLog.findFirst({
        where: visibleLogWhere,
        orderBy: { createdAt: "desc" },
        select: {
          createdAt: true,
          invoiceNo: true,
          status: true,
        },
      }),
    ]);

    metrics = { totalCalls, todayCalls, successCount, skippedCount, failedCount, latestSync };
  } catch (error) {
    console.error("⚠️ Dashboard metrics unavailable:", error.message);
  }

  const successRate = metrics.totalCalls > 0 ? Math.round((metrics.successCount / metrics.totalCalls) * 100) : 0;

  return {
    shop: session.shop,
    ...metrics,
    successRate,
  };
};

function MetricCard({ label, value, helpText, tone }) {
  return (
    <Card>
      <BlockStack gap="150">
        <Text variant="headingSm" as="h3" tone="subdued">{label}</Text>
        <Text variant="headingXl" as="p" tone={tone}>{value}</Text>
        <Text as="p" tone="subdued">{helpText}</Text>
      </BlockStack>
    </Card>
  );
}

export default function Index() {
  const {
    shop,
    totalCalls,
    todayCalls,
    successCount,
    skippedCount,
    failedCount,
    latestSync,
    successRate,
  } = useLoaderData();
  const location = useLocation();
  const successTone = successRate >= 95 ? "success" : successRate >= 80 ? "warning" : "critical";
  const settingsUrl = `/app/settings${location.search}`;
  const historyUrl = `/app/additional${location.search}`;
  const latestSyncText = latestSync
    ? `${latestSync.invoiceNo?.startsWith("#") ? latestSync.invoiceNo : `#${latestSync.invoiceNo}`} on ${new Date(latestSync.createdAt).toLocaleString()}`
    : "No fulfillment requests yet.";
  const hasActivity = totalCalls > 0;

  return (
    <Page
      title="Fulfillment Overview"
      subtitle="Monitor automated fulfillment requests for this store."
    >
      <BlockStack gap="400">
        <Card>
          <InlineStack align="space-between" blockAlign="center" gap="400">
            <BlockStack gap="150">
              <InlineStack gap="200" blockAlign="center">
                <Badge tone="success">System active</Badge>
                <Text as="span" tone="subdued">{shop}</Text>
              </InlineStack>
              <Text as="p">Ready to receive authenticated fulfillment requests.</Text>
            </BlockStack>
            <InlineStack gap="200">
              <Button
                variant="primary"
                icon={LinkIcon}
                url={settingsUrl}
              >
                API settings
              </Button>
              <Button
                icon={ExternalIcon}
                url={`https://${shop}/admin/orders`}
                target="_blank"
              >
                Orders
              </Button>
              <Button
                icon={LinkIcon}
                url={historyUrl}
              >
                History
              </Button>
            </InlineStack>
          </InlineStack>
        </Card>

        <InlineStack gap="300" align="start">
          <Box flex="1">
            <MetricCard
              label="Today"
              value={todayCalls}
              helpText="API requests"
            />
          </Box>
          <Box flex="1">
            <MetricCard
              label="Fulfilled"
              value={successCount}
              helpText="Orders completed"
              tone="success"
            />
          </Box>
          <Box flex="1">
            <MetricCard
              label="Skipped"
              value={skippedCount}
              helpText="Already fulfilled"
            />
          </Box>
          <Box flex="1">
            <MetricCard
              label="Failed"
              value={failedCount}
              helpText="Need attention"
              tone={failedCount > 0 ? "critical" : undefined}
            />
          </Box>
        </InlineStack>

        <Card>
          <BlockStack gap="300">
            <InlineStack align="space-between" blockAlign="center" gap="400">
              <BlockStack gap="100">
                <Text variant="headingMd" as="h2">Activity summary</Text>
                <Text as="p" tone="subdued">{latestSyncText}</Text>
              </BlockStack>
              <InlineStack gap="200" blockAlign="center">
                <Badge tone={successTone}>{hasActivity ? `${successRate}% success` : "No requests yet"}</Badge>
                <Button
                  icon={LinkIcon}
                  url={historyUrl}
                >
                  View history
                </Button>
              </InlineStack>
            </InlineStack>

            <ProgressBar progress={hasActivity ? successRate : 0} tone={successTone} size="small" />

            <InlineStack gap="400">
              <Box flex="1">
                <Text as="p" tone="subdued">Total requests: {totalCalls}</Text>
              </Box>
              <Box flex="1">
                <Text as="p" tone="subdued">Fulfilled: {successCount}</Text>
              </Box>
              <Box flex="1">
                <Text as="p" tone="subdued">Skipped: {skippedCount}</Text>
              </Box>
              <Box flex="1">
                <Text as="p" tone={failedCount > 0 ? "critical" : "subdued"}>Failed: {failedCount}</Text>
              </Box>
            </InlineStack>
          </BlockStack>
        </Card>

        <Card>
          <InlineStack gap="500" align="start">
            <Box flex="1">
              <BlockStack gap="150">
                <Text variant="headingMd" as="h2">Testing flow</Text>
                <Text as="p" tone="subdued">
                  Create an unfulfilled Shopify order, send the Postman request from Settings, then confirm the result in Fulfillment History.
                </Text>
              </BlockStack>
            </Box>
            <Box flex="1">
              <BlockStack gap="150">
                <Text variant="headingMd" as="h2">Fulfillment behavior</Text>
                <Text as="p" tone="subdued">
                  The API only fulfills orders with open fulfillment work. Already fulfilled orders are skipped to avoid duplicate actions.
                </Text>
              </BlockStack>
            </Box>
          </InlineStack>
        </Card>
      </BlockStack>
    </Page>
  );
}

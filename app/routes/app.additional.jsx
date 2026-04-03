import { useLoaderData } from "react-router";
import { Page, Card, DataTable, BlockStack, Badge, EmptyState } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  const logs = await db.adaptSyncLog.findMany({
    where: { shop: session.shop },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return { logs, shop: session.shop };
};

function getStatusBadge(status, id) {
  switch (status) {
    case "success":
      return <Badge key={id} tone="success">Fulfilled</Badge>;
    case "already_fulfilled":
      return <Badge key={id} tone="attention">Skipped (Already Fulfilled)</Badge>;
    case "not_found":
      return <Badge key={id} tone="critical">Order Not Found</Badge>;
    case "failed":
    case "error":
      return <Badge key={id} tone="critical">Failed</Badge>;
    case "invalid_request":
      return <Badge key={id} tone="warning">Invalid Request</Badge>;
    default:
      return <Badge key={id}>{status}</Badge>;
  }
}

export default function FulfillmentLogs() {
  const { logs } = useLoaderData();

  const rows = logs.map((log) => [
    log.invoiceNo?.startsWith("#") ? log.invoiceNo : `#${log.invoiceNo}`,
    new Date(log.createdAt).toLocaleString(),
    log.shop,
    getStatusBadge(log.status, log.id),
    log.message || "-",
  ]);

  return (
    <Page title="Fulfillment History" subtitle="Track every order synced from your Adapt system.">
      <BlockStack gap="500">
        {rows.length > 0 ? (
          <Card padding="0">
            <DataTable
              columnContentTypes={["text", "text", "text", "text", "text"]}
              headings={["Order Number", "Sync Date", "Store", "Status", "Message"]}
              rows={rows}
              footerContent={`Showing ${rows.length} recent syncs`}
            />
          </Card>
        ) : (
          <Card>
            <EmptyState
              heading="No sync activity yet"
              image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
            >
              <p>Once you send your first request from Adapt, logs will appear here.</p>
            </EmptyState>
          </Card>
        )}
      </BlockStack>
    </Page>
  );
}

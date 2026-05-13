/* global process */

import { authenticate, unauthenticated } from "../shopify.server";
import { json } from "@remix-run/node";
import db from "../db.server";

function isBrowserRequest(request) {
  const accept = request.headers.get("accept") || "";
  return request.method === "GET" && accept.includes("text/html");
}

function apiInfoResponse() {
  return new Response(
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Fulfillment API Endpoint</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #f6f6f7;
        color: #202223;
      }
      main {
        width: min(680px, calc(100% - 32px));
        padding: 32px;
        background: #ffffff;
        border: 1px solid #dfe3e8;
        border-radius: 8px;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
      }
      h1 {
        margin: 0 0 12px;
        font-size: 24px;
        line-height: 1.25;
      }
      p {
        margin: 0 0 16px;
        line-height: 1.5;
      }
      code {
        display: inline-block;
        padding: 3px 6px;
        border-radius: 4px;
        background: #f1f2f3;
        font-size: 14px;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>This is an API endpoint</h1>
      <p>This URL is not meant to be opened directly in a web browser.</p>
      <p>Use Postman, cURL, or your fulfillment system to send an authenticated <code>POST</code> request with the <code>X-Fulfillment-Key</code> header and a JSON body containing <code>shop</code> and <code>invoiceNumber</code>.</p>
    </main>
  </body>
</html>`,
    {
      status: 405,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        Allow: "POST",
      },
    },
  );
}

async function logSyncEvent({ shop, invoiceNo, status, message }) {
  if (!shop || !invoiceNo) return;

  try {
    await db.adaptSyncLog.create({
      data: {
        shop,
        invoiceNo: String(invoiceNo),
        status,
        message,
      },
    });
  } catch (error) {
    console.error("⚠️ Failed to store sync log:", error.message);
  }
}

async function handleRequest(args) {
  const { request } = args;
  let shopDomain = null;
  let invoiceNo = null;
  const authHeader =
    request.headers.get("X-Fulfillment-Key") ||
    request.headers.get("X-Adapt-Key");

  if (!authHeader && isBrowserRequest(request)) {
    return apiInfoResponse();
  }

  // 1. AUTHENTICATION (Internal Session OR External API Key)
  if (authHeader) {
    if (!process.env.X_ADAPT_KEY || authHeader !== process.env.X_ADAPT_KEY) {
      return json({ error: "Unauthorized" }, { status: 401 });
    }
  } else {
    try {
      const { session } = await authenticate.admin(request);
      shopDomain = session.shop;
    } catch (e) {
      return json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // 2. DATA PARSING
  try {
    const url = new URL(request.url);
    invoiceNo = url.searchParams.get("invoiceNo") || url.searchParams.get("invoiceNumber");
    if (!shopDomain) shopDomain = url.searchParams.get("shop");

    if (request.method !== "GET") {
      const contentType = request.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const body = await request.json();
        invoiceNo = invoiceNo || body.invoiceNumber || body.invoiceNo;
        if (!shopDomain) shopDomain = body.shop;
      } else {
        const formData = await request.formData();
        invoiceNo = invoiceNo || formData.get("invoiceNumber") || formData.get("invoiceNo");
        if (!shopDomain) shopDomain = formData.get("shop");
      }
    }
  } catch (err) {
    console.error("⚠️ Parser Error:", err.message);
  }

  if (!invoiceNo || !shopDomain) {
    await logSyncEvent({
      shop: shopDomain,
      invoiceNo,
      status: "invalid_request",
      message: "Invoice Number and shop are required",
    });
    return json({ error: "Invoice Number is required" }, { status: 400 });
  }

  // 3. SHOPIFY FULFILLMENT LOGIC
  try {
    const { admin } = await unauthenticated.admin(shopDomain);
    const searchQuery = invoiceNo.startsWith("#") ? invoiceNo : `#${invoiceNo}`;

    const orderResponse = await admin.graphql(
      `#graphql
      query getOrder($query: String!) {
        orders(first: 1, query: $query) {
          edges {
            node {
              id
              fulfillmentOrders(first: 5, displayable: true) {
                edges { node { id status } }
              }
            }
          }
        }
      }`,
      { variables: { query: `name:${searchQuery}` } },
    );

    const orderData = await orderResponse.json();
    const orderNode = orderData?.data?.orders?.edges?.[0]?.node;

    if (!orderNode) {
      await logSyncEvent({
        shop: shopDomain,
        invoiceNo,
        status: "not_found",
        message: `Order ${searchQuery} not found`,
      });
      return json({ error: `Order ${searchQuery} not found` }, { status: 404 });
    }

    const openFulfillments = orderNode.fulfillmentOrders.edges
      .filter((edge) => edge.node.status === "OPEN")
      .map((edge) => ({ fulfillmentOrderId: edge.node.id }));

    if (openFulfillments.length === 0) {
      await logSyncEvent({
        shop: shopDomain,
        invoiceNo,
        status: "already_fulfilled",
        message: "Order is already fulfilled",
      });
      return json({ status: "info", message: "Order is already fulfilled" });
    }

    const fulfillMutation = await admin.graphql(
      `#graphql
      mutation fulfillmentCreate($fulfillment: FulfillmentInput!) {
        fulfillmentCreate(fulfillment: $fulfillment) {
          fulfillment { id }
          userErrors { message }
        }
      }`,
      { variables: { fulfillment: { lineItemsByFulfillmentOrder: openFulfillments } } },
    );

    const result = await fulfillMutation.json();
    const finalId = result.data?.fulfillmentCreate?.fulfillment?.id;

    if (!finalId) {
      await logSyncEvent({
        shop: shopDomain,
        invoiceNo,
        status: "failed",
        message: "Shopify fulfillment failed",
      });
      return json({ error: "Shopify fulfillment failed", details: result.data?.fulfillmentCreate?.userErrors }, { status: 400 });
    }

    // SUCCESS LOG FOR FLY LOGS
    console.log(`✅ Success: ${searchQuery} fulfilled.`);
    await logSyncEvent({
      shop: shopDomain,
      invoiceNo,
      status: "success",
      message: `Order ${searchQuery} fulfilled successfully`,
    });

    // THIS IS THE SUCCESS DATA
    return json({
      status: "success",
      message: `Order ${searchQuery} fulfilled successfully!`,
      fulfillment_id: finalId
    });

  } catch (error) {
    console.error("🔥 Server Error:", error.message);
    await logSyncEvent({
      shop: shopDomain,
      invoiceNo,
      status: "error",
      message: error.message,
    });
    return json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function loader(args) { return handleRequest(args); }
export async function action(args) { return handleRequest(args); }

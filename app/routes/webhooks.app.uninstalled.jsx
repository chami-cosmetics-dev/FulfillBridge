import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  const { shop, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // Webhook requests can trigger multiple times and after an app has already been uninstalled.
  // Always remove sessions for the shop so reinstall starts a fresh OAuth flow.
  await db.session.deleteMany({ where: { shop } });

  return new Response();
};

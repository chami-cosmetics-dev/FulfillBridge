import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  console.log("👉 BOT REACHED WEBHOOK ENDPOINT");
  
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const { topic, shop } = await authenticate.webhook(request);
    console.log(`✅ VERIFIED: Received ${topic} for ${shop}`);
    return new Response(null, { status: 200 });
  } catch (error) {
    console.error("❌ HMAC FAILED:", error.message);
    // Return 401 so the bot knows the secret is the problem
    return new Response("Unauthorized", { status: 401 });
  }
};

export const loader = () => {
  console.log("👉 BOT REACHED LOADER (GET)");
  return new Response("Webhook endpoint active", { status: 200 });
};
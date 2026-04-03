import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const { topic, shop } = await authenticate.webhook(request);
    console.log(`Compliance webhook verified: ${topic} for ${shop}`);
    return new Response(null, { status: 200 });
  } catch (error) {
    console.error("Compliance webhook HMAC verification failed:", error.message);
    return new Response("Bad Request", { status: 400 });
  }
};


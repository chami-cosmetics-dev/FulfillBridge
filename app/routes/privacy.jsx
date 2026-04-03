import { Card, Text, BlockStack } from "@shopify/polaris";

export default function PrivacyPolicy() {
  return (
    <div style={{ padding: "40px", maxWidth: "800px", margin: "0 auto" }}>
      <BlockStack gap="500">
        <Text variant="headingXl" as="h1">Privacy Policy for Adapt Fulfillment</Text>
        <Card>
          <BlockStack gap="300">
            <Text variant="headingMd" as="h2">1. Data We Collect</Text>
            <Text as="p">We access Order and Fulfillment data to provide automation services. We do not sell your data.</Text>
            
            <Text variant="headingMd" as="h2">2. Data Usage</Text>
            <Text as="p">Information is used solely to match invoice numbers from your Adapt system to Shopify orders.</Text>
            
            <Text variant="headingMd" as="h2">3. Data Retention</Text>
            <Text as="p">We only store data required for the app to function. You can request data deletion at any time.</Text>
          </BlockStack>
        </Card>
      </BlockStack>
    </div>
  );
}

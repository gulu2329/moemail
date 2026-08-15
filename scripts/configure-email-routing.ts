import Cloudflare from "cloudflare";

const apiToken = process.env.CLOUDFLARE_API_TOKEN;
const zoneId = "71eeb062ef2b66865fef72a5c696a811";
const domain = "gulu2329.dpdns.org";
const workerName = "email-receiver-worker";

const required = {
  CLOUDFLARE_API_TOKEN: apiToken,
};

const missing = Object.entries(required)
  .filter(([, value]) => !value)
  .map(([name]) => name);

if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
}

const client = new Cloudflare({ apiToken });

const main = async () => {
  console.log(`Configuring Email Routing for ${domain}...`);

  const tokenVerification = await fetch(
    "https://api.cloudflare.com/client/v4/user/tokens/verify",
    { headers: { Authorization: `Bearer ${apiToken}` } }
  );

  if (!tokenVerification.ok) {
    throw new Error(`Cloudflare API Token verification failed (${tokenVerification.status}).`);
  }

  console.log("Cloudflare API Token is valid.");

  const updatedSettings = await client.emailRouting.enable({
    zone_id: zoneId,
    body: {},
  });

  console.log(
    `Email Routing DNS configured (enabled=${updatedSettings.enabled}, status=${updatedSettings.status}).`
  );

  const catchAll = await client.emailRouting.rules.catchAlls.update({
    zone_id: zoneId,
    name: "MoeMail catch-all",
    enabled: true,
    matchers: [{ type: "all" }],
    actions: [{ type: "worker", value: [workerName] }],
  });

  console.log(
    `Catch-all verified (enabled=${catchAll.enabled}, worker=${workerName}).`
  );
};

main().catch((error) => {
  console.error("Failed to configure Email Routing:", error);
  process.exit(1);
});

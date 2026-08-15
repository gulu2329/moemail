import Cloudflare, { NotFoundError } from "cloudflare";

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

  let settings;
  try {
    settings = await client.emailRouting.get({ zone_id: zoneId });
  } catch (error) {
    if (!(error instanceof NotFoundError)) throw error;
  }

  if (!settings?.enabled || settings.status !== "ready") {
    const updatedSettings = await client.emailRouting.dns.create({
      zone_id: zoneId,
      name: domain,
    });

    console.log(
      `Email Routing DNS configured (enabled=${updatedSettings.enabled}, status=${updatedSettings.status}).`
    );
  } else {
    console.log("Email Routing DNS is already enabled and ready.");
  }

  const catchAll = await client.emailRouting.rules.catchAlls.update({
    zone_id: zoneId,
    name: "MoeMail catch-all",
    enabled: true,
    matchers: [{ type: "all" }],
    actions: [{ type: "worker", value: [workerName] }],
  });

  const finalSettings = await client.emailRouting.get({ zone_id: zoneId });
  await client.emailRouting.dns.get({ zone_id: zoneId });

  console.log(
    `Email Routing verified (enabled=${finalSettings.enabled}, status=${finalSettings.status}).`
  );
  console.log(
    `Catch-all verified (enabled=${catchAll.enabled}, worker=${workerName}).`
  );
};

main().catch((error) => {
  console.error("Failed to configure Email Routing:", error);
  process.exit(1);
});

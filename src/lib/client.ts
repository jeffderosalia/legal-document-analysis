import { Client, createClient, createPlatformClient, PlatformClient } from "@osdk/client";
import { $ontologyRid } from "@legal-document-analysis/sdk";
import { createPublicOauthClient } from "@osdk/oauth";

const url = import.meta.env.VITE_FOUNDRY_API_URL;
const clientId = import.meta.env.VITE_FOUNDRY_CLIENT_ID;
const redirectUrl = import.meta.env.VITE_FOUNDRY_REDIRECT_URL;

checkEnv(url, "VITE_FOUNDRY_API_URL");
checkEnv(clientId, "VITE_FOUNDRY_CLIENT_ID");
checkEnv(redirectUrl, "VITE_FOUNDRY_REDIRECT_URL");

function checkEnv(
  value: string | undefined,
  name: string,
): asserts value is string {
  if (value == null) {
    throw new Error(`Missing environment variable: ${name}`);
  }
}


export const auth = createPublicOauthClient(
  clientId,
  url,
  redirectUrl,
  )

export const platformClient: PlatformClient = createPlatformClient(url, auth);



  /**
 * Initialize the client to interact with the Ontology SDK
 */
const client: Client = createClient(
  url,
  $ontologyRid,
  auth,
);

export default client;

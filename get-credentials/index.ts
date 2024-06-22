import fs from "fs/promises";
import path from "path";
import process from "process";

import { authenticate } from "@google-cloud/local-auth";
import { OAuth2Client } from "google-auth-library";
import dotenv from "dotenv";

interface IAuthParams {
  scopes: string[] | undefined;
  tokenPath: string;
  credentialsPath: string;
}

// Load environment variables
dotenv.config();

/**
 * Serializes credentials to a file compatible with GoogleAuth.fromJSON.
 * @param client - OAuth2Client instance
 * @param authParams - auth params object
 */
const saveCredentials = async (
  client: OAuth2Client,
  authParams: IAuthParams
): Promise<void> => {
  const { tokenPath, credentialsPath } = authParams;

  // Read the credentials file
  const content = await fs.readFile(credentialsPath, "utf8");
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;

  // Save the client token to a file
  const payload = JSON.stringify({
    type: "authorized_user",
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(tokenPath, payload);
};

/**
 * Get credentials for the scopes and save them to a file.
 * @param authParams - auth params object
 */
const getCredentials = async (authParams: IAuthParams): Promise<void> => {
  const { scopes, credentialsPath } = authParams;

  // Make sure that the SCOPES are provided
  if (!scopes) {
    throw new Error("Please provide SCOPES in a .env file.");
  }

  // Authenticate and get the client
  const client = await authenticate({
    scopes,
    keyfilePath: credentialsPath,
  });

  // Save the credentials to a file
  if (client.credentials) {
    await saveCredentials(client, authParams);
  }
};

(async () => {
  // Configure auth params
  const authParams = {
    scopes: process.env.SCOPES?.split(","),
    tokenPath: path.join(process.cwd(), "token.json"),
    credentialsPath: path.join(process.cwd(), "credentials.json"),
  } satisfies IAuthParams;

  // Get credentials
  try {
    await getCredentials(authParams);
    console.log("Saved credentials in `token.json`");
  } catch (error) {
    console.error("Error getting credentials");
    console.error(error);
    process.exit(1);
  }
})();

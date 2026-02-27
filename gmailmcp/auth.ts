/**
 * One-time OAuth2 authentication script.
 * Run this ONCE to generate your token.json file:
 *   node dist/auth.js
 */

import { google } from "googleapis";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

const CREDENTIALS_PATH = path.join(__dirname, "..", "credentials.json");
const TOKEN_PATH = path.join(__dirname, "..", "token.json");

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.settings.basic",
  "https://www.googleapis.com/auth/gmail.labels",
  "https://www.googleapis.com/auth/gmail.readonly",
];

async function main() {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    console.error(`❌ credentials.json not found at: ${CREDENTIALS_PATH}`);
    console.error("Please download it from Google Cloud Console and place it in this directory.");
    process.exit(1);
  }

  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, "utf8"));
  const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;

  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
  });

  console.log("\n🔐 Gmail Filters MCP - One-time Authorization\n");
  console.log("1. Open this URL in your browser:\n");
  console.log("   " + authUrl + "\n");
  console.log("2. Sign in with your Google account and grant permissions.");
  console.log("3. Copy the authorization code from the redirect page.\n");

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  rl.question("4. Paste the authorization code here: ", async (code) => {
    rl.close();
    try {
      const { tokens } = await oAuth2Client.getToken(code.trim());
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
      console.log("\n✅ token.json saved successfully!");
      console.log("You can now start the MCP server with: npm start\n");
    } catch (err) {
      console.error("❌ Error retrieving access token:", err);
      process.exit(1);
    }
  });
}

main();

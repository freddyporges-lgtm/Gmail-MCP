import { google, gmail_v1 } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import * as fs from "fs";
import * as path from "path";

const CREDENTIALS_PATH = path.join(process.cwd(), "credentials.json");
const TOKEN_PATH = path.join(process.cwd(), "token.json");

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.settings.basic",
  "https://www.googleapis.com/auth/gmail.labels",
  "https://www.googleapis.com/auth/gmail.readonly",
];

let _gmailClient: gmail_v1.Gmail | null = null;

function getOAuthClient(): OAuth2Client {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    throw new Error(
      `credentials.json not found. Please download it from Google Cloud Console and place it at: ${CREDENTIALS_PATH}`
    );
  }

  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, "utf8"));
  const { client_secret, client_id, redirect_uris } =
    credentials.installed || credentials.web;

  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  if (!fs.existsSync(TOKEN_PATH)) {
    throw new Error(
      `token.json not found. Please run the auth script first:\n  npm run auth\n  node dist/auth.js`
    );
  }

  const token = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf8"));
  oAuth2Client.setCredentials(token);

  // Auto-save refreshed tokens
  oAuth2Client.on("tokens", (tokens) => {
    const current = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf8"));
    const updated = { ...current, ...tokens };
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(updated, null, 2));
  });

  return oAuth2Client;
}

export function getGmailClient(): gmail_v1.Gmail {
  if (!_gmailClient) {
    const auth = getOAuthClient();
    _gmailClient = google.gmail({ version: "v1", auth });
  }
  return _gmailClient;
}

export type { gmail_v1 };

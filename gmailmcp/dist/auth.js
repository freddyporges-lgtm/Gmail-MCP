"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// auth.ts
var import_googleapis = require("googleapis");
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
var readline = __toESM(require("readline"));
var CREDENTIALS_PATH = path.join(__dirname, "..", "credentials.json");
var TOKEN_PATH = path.join(__dirname, "..", "token.json");
var SCOPES = [
  "https://www.googleapis.com/auth/gmail.settings.basic",
  "https://www.googleapis.com/auth/gmail.labels",
  "https://www.googleapis.com/auth/gmail.readonly"
];
async function main() {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    console.error(`\u274C credentials.json not found at: ${CREDENTIALS_PATH}`);
    console.error("Please download it from Google Cloud Console and place it in this directory.");
    process.exit(1);
  }
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, "utf8"));
  const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
  const oAuth2Client = new import_googleapis.google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent"
  });
  console.log("\n\u{1F510} Gmail Filters MCP - One-time Authorization\n");
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
      console.log("\n\u2705 token.json saved successfully!");
      console.log("You can now start the MCP server with: npm start\n");
    } catch (err) {
      console.error("\u274C Error retrieving access token:", err);
      process.exit(1);
    }
  });
}
main();

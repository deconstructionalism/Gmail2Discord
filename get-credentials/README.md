# Get Credentials

This repo is used to get Google Cloud Oauth2 credentials for the [Google Cloud SDK](https://cloud.google.com/sdk/) and save them to a JSON file.

## Prerequisites

### Local

- [Node.js](https://nodejs.org/en/)

### Google Cloud Platform

- [Google Cloud Platform Account](https://cloud.google.com/)
- [A Project within the Google Cloud Platform Account](https://developers.google.com/workspace/guides/create-project)
- [Oauth 2.0 "Desktop" type Client ID and Secret for the project(https://developers.google.com/identity/protocols/oauth2)

## Setup

1. Clone this repo
2. Install the required packages:

```bash
npm install
```

3. Copy `.env.example` to `.env` and fill in `SCOPE` as a comma separated list of scopes for which you want to generate credentials.

## Usage

1. Run the script:

```bash
npm run get-creds
```

2. Your browser will open and you will be prompted to log in to your Google account and grant permissions to the scopes you specified.

> Your credentials will be saved to `token.json` in the root of the project.

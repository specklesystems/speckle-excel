<h1 align="center">
  <img src="https://user-images.githubusercontent.com/2679513/131189167-18ea5fe1-c578-47f6-9785-3748178e4312.png" width="150px"/><br/>
  Speckle | Excel
</h1>

<p align="center">
  <a href="https://speckle.community"><img src="https://img.shields.io/discourse/users?server=https%3A%2F%2Fspeckle.community&style=flat-square&logo=discourse&logoColor=white" alt="Community forum users"></a>
  <a href="https://speckle.systems"><img src="https://img.shields.io/badge/https://-speckle.systems-royalblue?style=flat-square" alt="website"></a>
  <a href="https://docs.speckle.systems"><img src="https://img.shields.io/badge/docs-docs.speckle.systems-orange?style=flat-square&logo=read-the-docs&logoColor=white" alt="docs"></a>
</p>

> Status: deprecated; not compatible with Speckle v3.
> Retained as open source for reference and community use.
> No active maintenance or feature updates are planned.

<h3 align="center">
  Speckle Connector for Excel
</h3>

## Introduction

This repository contains the Speckle Excel Connector, originally released as an early alpha. It enabled sending and receiving data between Microsoft Excel and the Speckle platform. The project is no longer maintained and is not compatible with Speckle v3. For modern workflows, use current SDKs and APIs documented at docs.speckle.systems

## Developing and debugging

Note: the instructions below are preserved for archival purposes.

### App setup

You need a Speckle App. The server must be on https. Do not use a local server on http://localhost:3000.

Use: https://app.speckle.systems/

In the server frontend, register a new app.

Example values for an app while the Excel add-in runs on https://localhost:3000:

- Name: ExcelConnector
- Redirect URL: `https://localhost:3000`
- Permissions: `streams:read, streams:write, profile:read, profile:email, users:read`

Then in your local `speckle-excel` repo:

- Duplicate `.env sample` to `.env.local`
- Add your `app id` and `secret`
- Set `BASE_URL=https://localhost:3000`

### Running locally

```bash
npm install
npm run serve
<h1 align="center">
  <img src="https://user-images.githubusercontent.com/2679513/131189167-18ea5fe1-c578-47f6-9785-3748178e4312.png" width="150px"/><br/>
  Speckle | Excel
</h1>

<p align="center">
  <a href="https://twitter.com/SpeckleSystems"><img src="https://img.shields.io/twitter/follow/SpeckleSystems?style=social" alt="Twitter Follow"></a>
  <a href="https://speckle.community"><img src="https://img.shields.io/discourse/users?server=https%3A%2F%2Fspeckle.community&amp;style=flat-square&amp;logo=discourse&amp;logoColor=white" alt="Community forum users"></a>
  <a href="https://speckle.systems"><img src="https://img.shields.io/badge/https://-speckle.systems-royalblue?style=flat-square" alt="website"></a>
  <a href="https://speckle.guide/dev/"><img src="https://img.shields.io/badge/docs-speckle.guide-orange?style=flat-square&amp;logo=read-the-docs&amp;logoColor=white" alt="docs"></a>
</p>

> **Status:** This connector is **deprecated** and **not compatible with Speckle v3**.  
> It is retained here as open source for reference and community use only.  
> There are currently **no plans for active maintenance or feature updates.**

<h3 align="center">
  Speckle Connector for Excel
</h3>

## Introduction

This repository contains the **Speckle Excel Connector**, originally released as an early alpha version.  
It allowed users to send and receive data between Microsoft Excel and the Speckle platform.

While the project remains open source, it is no longer maintained or compatible with the latest Speckle v3 platform.  
Developers and users are encouraged to explore Speckle’s newer APIs and SDKs for modern data workflows.

## Documentation

Comprehensive developer and user documentation can be found on our documentation portal:

#### 📚 [Speckle Docs](https://speckle.guide/dev/)

## Developing & Debugging

### App Setup

To develop and debug this connector, you will need to set up a Speckle App.

The server on which the app runs must be on `https`, so **do not use** a local Speckle server at `http://localhost:3000/` — it will not work.

You can use one of the public test servers:

- `https://latest.speckle.dev/`
- `https://speckle.xyz/`

Then open the server frontend and register a new app under your profile. Example configuration:

- **Name:** ExcelConnector  
- **Redirect URL:** `https://localhost:3000`  
- **Permissions:** `streams:read, streams:write, profile:read, profile:email, users:read`

Take note of the `app id` and `secret`, then in your local `speckle-excel` repo:

1. Duplicate `.env sample` → `.env.local`
2. Fill in your `app id` and `secret`
3. Set `BASE_URL=https://localhost:3000`

### Running the Connector Locally

Run it locally with the following commands:

```bash
npm install     # first time setup
npm run serve   # start the local Vue app
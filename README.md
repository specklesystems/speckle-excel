<h1 align="center">
  <img src="https://user-images.githubusercontent.com/2679513/131189167-18ea5fe1-c578-47f6-9785-3748178e4312.png" width="150px"/><br/>
  Speckle | Excel
</h1>

<p align="center"><a href="https://twitter.com/SpeckleSystems"><img src="https://img.shields.io/twitter/follow/SpeckleSystems?style=social" alt="Twitter Follow"></a> <a href="https://speckle.community"><img src="https://img.shields.io/discourse/users?server=https%3A%2F%2Fspeckle.community&amp;style=flat-square&amp;logo=discourse&amp;logoColor=white" alt="Community forum users"></a> <a href="https://speckle.systems"><img src="https://img.shields.io/badge/https://-speckle.systems-royalblue?style=flat-square" alt="website"></a> <a href="https://speckle.guide/dev/"><img src="https://img.shields.io/badge/docs-speckle.guide-orange?style=flat-square&amp;logo=read-the-docs&amp;logoColor=white" alt="docs"></a></p>

> Speckle is the first AEC data hub that connects with your favorite AEC tools. Speckle exists to overcome the challenges of working in a fragmented industry where communication, creative workflows, and the exchange of data are often hindered by siloed software and processes. It is here to make the industry better.

<h3 align="center">
    Speckle Connector for Excel
</h3>


## Introduction

This repo holds Speckle's Excel Connector, it's currently released as early alpha.

## Documentation

Comprehensive developer and user documentation can be found in our:

#### 📚 [Speckle Docs website](https://speckle.guide/dev/)

## Developing & Debugging

### App Set up

For developing and debugging this connector you'll need to set up a Speckle App.
The server on which the app runs must be on `https`, so **do not use a local Speckle server** on `http://localhost:3000/` as it will not work.

You can use `https://latest.speckle.dev/` or `https://speckle.xyz/`.

Now open up its frontend, and under your profile register a new app.

I've used the following values since my excel-connector app is running at `https://localhost:3000`:

- name: ExcelConnector
- redirect url: `https://localhost:3000`
- permissions: `streams:read, streams:write, profile:read, profile:email, users:read`

Take note of the `app id` and `secret`, then in your speckle-excel repo:

- duplicate `.env sample` to `.env.local`
- then fill it in with your new `app id` and `secret`
- note that the `BASE_URL=https://localhost:3000`

### Running the connector locally

Run it locally:

- `npm install` (first time only)
- `npm run serve`
- _You might be prompted to install some certificates, go ahead and accept_
- _Wait for the the process to start the Vue app, then in a separate terminal either_
  - `npm run excel` will run excel desktop and sideload the plugin
  - `npm run excel:web` will run excel web, open the document defined in `packages.json` and sideload the plugin

If this worked out well, you should see the connector sideloaded correctly:

![image](https://user-images.githubusercontent.com/2679513/119171684-cdf3da00-ba5c-11eb-87a5-bee798f96f90.png)

## Contributing

Please make sure you read the [contribution guidelines](.github/CONTRIBUTING.md) for an overview of the best practices we try to follow.

## Community

The Speckle Community hangs out on [the forum](https://discourse.speckle.works), do join and introduce yourself & feel free to ask us questions!

## License

Unless otherwise described, the code in this repository is licensed under the Apache-2.0 License. Please note that some modules, extensions or code herein might be otherwise licensed. This is indicated either in the root of the containing folder under a different license file, or in the respective file's header. If you have any questions, don't hesitate to get in touch with us via [email](mailto:hello@speckle.systems).

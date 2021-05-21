# Speckle Excel Connector

[![Twitter Follow](https://img.shields.io/twitter/follow/SpeckleSystems?style=social)](https://twitter.com/SpeckleSystems) [![Community forum users](https://img.shields.io/discourse/users?server=https%3A%2F%2Fdiscourse.speckle.works&style=flat-square&logo=discourse&logoColor=white)](https://discourse.speckle.works) [![website](https://img.shields.io/badge/https://-speckle.systems-royalblue?style=flat-square)](https://speckle.systems) [![docs](https://img.shields.io/badge/docs-speckle.guide-orange?style=flat-square&logo=read-the-docs&logoColor=white)](https://speckle.guide/dev/)

## Introduction

This repo holds Speckle's Excel Connector, it's currently released as early alpha.

## Documentation

Comprehensive developer and user documentation can be found in our:

#### 📚 [Speckle Docs website](https://speckle.guide/dev/)

## Developing & Debugging

Register the app:

- create a Speckle App on your server
- duplicate `.env sample` to `.env.local`
- then fill it in with your variables

Run it locally:

- `npm install`
- `npm run serve`
- *You might be prompted to install some certificates, go ahead and accept*
- *Wait for the the process to start the Vue app, then in a separate terminal either*
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
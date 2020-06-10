# Puente Backend Application

[![Build Status](https://travis-ci.org/hopetambala/puente-node-cloudcode.svg?branch=master)](https://travis-ci.org/hopetambala/puente-node-cloudcode)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/505de309137b4acabb8def858cf7a6e8)](https://www.codacy.com/app/hopetambala/puente-node-cloudcode?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=hopetambala/puente-node-cloudcode&amp;utm_campaign=Badge_Grade)
[![codecov](https://codecov.io/gh/hopetambala/puente-node-cloudcode/branch/master/graph/badge.svg)](https://codecov.io/gh/hopetambala/puente-node-cloudcode)
![](https://img.shields.io/badge/parse_server-✓-blueviolet.svg)

Cloud Code is easy to use because it’s built on the JavaScript SDK for parse-server. The only difference is that this code runs in our Parse Server rather than running on the user’s mobile device. When we update our Cloud Code, it becomes available to all mobile environments instantly. 

For a resource guide:
https://docs.parseplatform.org/cloudcode/guide/

## Table of Contents

- [Build and run](#build-and-run)
  * [Build](#build)
  * [Run](#run-in-two-terminals)
- [Development](#development)
  * [Node and Parse](#node-and-parse)
  * [Back4App](#back4app)
- [Testing](#testing)
  * [JSBin](#jsbin)
  * [Local](#locally-testing-queries)
- [General Infrastructure Info](#guide)
  * [Parse Server](#parse-server)
  * [MongoDB Installations](#mongodb-installations)

## Build and run

### Build
1. Install or update npm (`sudo apt install npm`, `npm install -g npm`)
2. Clone Puente-Node-Cloudcode repo `git clone https://github.com/hopetambala/puente-node-cloudcode.git` or fork this repo
3. `cd puente-node-cloudcode`
4. Run `npm install`

### Run in Two Terminals
After installation
1. Open one terminal instance and do following: `sudo mongod` to start mongo instance.(Look at the below guide on how to setup `mongod` on your machine
2. In another terminal, serve the application locally by running `npm run start`.
3. (Optionally), if you want to start the application with the dashboard, run `npm run start-with-dash`

Changes made in your code will be automatically reloaded on http://localhost:4040/dashboard.

## Development

### Node and Parse

This application is built with [Parse Server](https://reactjs.org) and [Back4App](https://github.com/back4app). Support for GraphQL will be added soon.

Here are some quick commands to get started in Node:

- `npm install`: Install Node dependencies
- `npm run start`: Start the development server.
- `npm run start-with-dash`: Start the server with Parse Dashboard
- `npm run test`: Run the test suit
- `npm run lint`: Run the ESLinter.

Here are some custom commands for this specific project (after you install):

- `npm release`: Create a release of this web application
- `npm gh-prune`: Remove deleted remote branches on local machine.

### Back4app

To get ramped onto the project with Back4App these following steps must be taken:
- [Setting up the b4a cli](https://www.back4app.com/docs/command-line-tool/parse-server-setup) 
- [Connect your Parse/Back4app app to Back4app Web Service](https://www.back4app.com/docs/command-line-tool/connect-to-back4app)
- `cd <PROJECT_MAIN_DIRECTORY>`
- Run `b4a add` and choose the project you've created in Back4app Web Service
- Run `b4a develop` to see changes live with Back4app Web Service

## Testing

### Jest

You need two terminals to do testing in Jest. One terminal should be running `npm run start` or `npm run start-with-dash` to have the application running. The other terminal will use `npm run test`.

### JSBin
Checkout our pre-setup [JSBin](https://jsbin.com/gizeteg/edit?js,console) to play with our sample server

### Locally testing queries

Checkout the [sample.html](test-queries/sample.html) for configuration with our sample server


## Guide

### Parse Server

**Parse Server** is an open source version of the Parse backend that can be deployed to any infrastructure that can run `Node.js`. It works with the Express web application framework and can be added to existing web applications, or run by itself. Its repository is on [Github](https://github.com/parse-community/parse-server).

Parse offer a backend to store data, push notifications, social media integration for our app etc. The features provided tend to be helpful in prototyping quickly.

- **General Purpose**: Open Source
- **Hosting**: Self-hosting or Parse Server Hosting providers. Supports local testing and development
- **Custom Code**: Supported via Cloud Code
- **Database**: Mongo DB
- **Push**: Support push notifications for Android, iOS. Also users can manage Push Notifications campaigns
- **Storage**: No restricted time limits and no file storage restrictions. Control over backup, restore and database indexes
- **Ideal for**: General purpose applications


### MongoDB Installations

**MongoDB** is a document database designed for ease of development and scaling. Its repository is on [Github](https://github.com/mongodb/mongo).

This application requires the use of Mongo, [here's an explanation of how to install it on Mac OS](https://ademirgabardo.wordpress.com/2016/02/02/installing-and-running-mongodb-on-mac-osx-for-beginners/). 

## Troubleshooting

### Not able to push to Github
Make sure to keep your `mongod` command running while pushing to origin.
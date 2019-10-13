# Puente Backend Application

[![Build Status](https://travis-ci.org/hopetambala/puente-node-cloudcode.svg?branch=master)](https://travis-ci.org/hopetambala/puente-node-cloudcode)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/505de309137b4acabb8def858cf7a6e8)](https://www.codacy.com/app/hopetambala/puente-node-cloudcode?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=hopetambala/puente-node-cloudcode&amp;utm_campaign=Badge_Grade)
[![codecov](https://codecov.io/gh/hopetambala/puente-node-cloudcode/branch/master/graph/badge.svg)](https://codecov.io/gh/hopetambala/puente-node-cloudcode)
![](https://img.shields.io/badge/parse_server-✓-blueviolet.svg)



Cloud Code is easy to use because it’s built on the JavaScript SDK for parse-server. The only difference is that this code runs in our Parse Server rather than running on the user’s mobile device. When we update your Cloud Code, it becomes available to all mobile environments instantly. 

For a resource guide:
https://docs.parseplatform.org/cloudcode/guide/

## Development

This application is built with [Parse Server](https://reactjs.org) and [Back4App](https://github.com/back4app). Support for GraphQL will be added soon

Here are some quick commands to get started:

- `npm install`: Install Node dependencies
- `npm start`: Start the hot reloading development server.
- `npm test`: Run the test suit
- `npm lint`: Run the ESLinter.


Here are some custom commands for this specific project (after you install):

- `npm release`: Create a release of this web application
- `npm gh-prune`: Remove deleted remote branches on local machine.


# Guide

## Parse Server

**Parse Server** is an open source version of the Parse backend that can be deployed to any infrastructure that can run `Node.js`. It works with the Express web application framework and can be added to existing web applications, or run by itself. Its repository is on [Github](https://github.com/parse-community/parse-server).

Parse offer a backend to store data, push notifications, social media integration for our app etc. The features provided tend to be helpful in prototyping quickly.

- **General Purpose**: Open Source
- **Hosting**: Self-hosting or Parse Server Hosting providers. Supports local testing and development
- **Custom Code**: Supported via Cloud Code
- **Database**: Mongo DB
- **Push**: Support push notifications for Android, iOS. Also users can manage Push Notifications campaigns
- **Storage**: No restricted time limits and no file storage restrictions. Control over backup, restore and database indexes
- **Ideal for**: General purpose applications


## MongoDB Installations

**MongoDB** is a document database designed for ease of development and scaling. Its repository is on [Github](https://github.com/mongodb/mongo).

This application requires the use of Mongo, [here's an explanation of how to install it on Mac OS](https://ademirgabardo.wordpress.com/2016/02/02/installing-and-running-mongodb-on-mac-osx-for-beginners/). 



# Steps to Run

Open one Terminal Instance and do following:
```
sudo mongod 
```
to start mongo instance

Open another terminal instance and do following inside puente-node-cloudcode folder
```
npm run start 
```




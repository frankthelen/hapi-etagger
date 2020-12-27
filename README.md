# hapi-etagger

Hapi server plug-in for etags and HTTP 304 support.
It utilizes the popular [etag](https://www.npmjs.com/package/etag) library.

[![Build Status](https://travis-ci.org/frankthelen/hapi-etagger.svg?branch=master)](https://travis-ci.org/frankthelen/hapi-etagger)
[![Coverage Status](https://coveralls.io/repos/github/frankthelen/hapi-etagger/badge.svg?branch=master)](https://coveralls.io/github/frankthelen/hapi-etagger?branch=master)
[![node](https://img.shields.io/node/v/hapi-etagger.svg)]()
[![code style](https://img.shields.io/badge/code_style-airbnb-brightgreen.svg)](https://github.com/airbnb/javascript)
[![License Status](http://img.shields.io/npm/l/hapi-etagger.svg)]()

Tested with

* Hapi 20 on Node 12/14/15
* Hapi 19 on Node 12/14/15

## Install

```bash
npm install hapi-etagger
```

## Purpose

This plug-in provides a simple way to support etags and HTTP 304.

By default, it adds etags and HTTP 304 support to all requests that meet the following criteria:

* method is GET
* status code is 2xx
* response payload is a String, a stringifyable object or a Buffer

It is possible to opt-out.

## Usage

Register the plugin with Hapi server like this:

```js
const Hapi = require('@hapi/hapi');
const etags = require('hapi-etagger');

const server = new Hapi.Server({
  port: 3000,
});

const provision = async () => {
  await server.register(etags);
  // ...
  await server.start();
};

provision();
```

You can opt-out by route configuration, e.g.:

```js
server.route({
  method: 'GET',
  path: '/example/{id}',
  options: {
    // ...
    plugins: {
      'hapi-etagger': {
        enabled: false, // opt-out
      },
    },
  },
  // ...
});
```

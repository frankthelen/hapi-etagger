// const Hapi = require('@hapi/hapi');
const Joi = require('joi');
const Boom = require('@hapi/boom');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const hapiETagger = require('..');

chai.use(chaiAsPromised);
chai.use(sinonChai);

global.chai = chai;
global.sinon = sinon;
global.expect = chai.expect;
global.should = chai.should();

const hapiVersions = ['hapi19', 'hapi20'];

hapiVersions.forEach((hapiVersion) => {
  // eslint-disable-next-line import/no-dynamic-require, global-require
  const Hapi = require(hapiVersion);

  describe(`${hapiVersion}`, async () => {
    describe('hapi-etagger', async () => {
      let server;

      beforeEach(async () => {
        server = new Hapi.Server({
          port: 9004,
          // debug: {
          //   request: ['error'],
          // },
        });
        server.validator(Joi);
        await server.register([hapiETagger]);
        await server.start();
      });

      afterEach(async () => {
        await server.stop();
      });

      it('should not do anything if opted out', async () => {
        const payload = 'ok';
        await server.route({
          method: 'GET',
          path: '/test',
          handler: async () => payload,
          options: {
            plugins: {
              'hapi-etagger': {
                enabled: false, // opt-out
              },
            },
          },
        });
        const res1 = await server.inject({
          url: '/test',
        });
        expect(res1.statusCode).to.be.equal(200);
        expect(res1.payload).to.be.equals(payload);
        expect(res1.headers).not.has.property('etag');
      });

      it('should not do anything if status code is 400', async () => {
        await server.route({
          method: 'GET',
          path: '/test',
          handler: async (request, h) => h.response({ error: 'foo' }).code(400),
        });
        const res1 = await server.inject({
          url: '/test',
        });
        expect(res1.statusCode).to.be.equal(400);
        expect(res1.headers).not.has.property('etag');
      });

      it('should not do anything if responding an error (Boom)', async () => {
        await server.route({
          method: 'GET',
          path: '/test',
          handler: async () => Boom.badRequest('foo'),
        });
        const res1 = await server.inject({
          url: '/test',
        });
        expect(res1.statusCode).to.be.equal(400);
        expect(res1.headers).not.has.property('etag');
      });

      it('should not do anything if method is POST', async () => {
        await server.route({
          method: 'POST',
          path: '/test',
          handler: async (request, h) => h.continue,
        });
        const res1 = await server.inject({
          method: 'POST',
          url: '/test',
        });
        expect(res1.statusCode).to.be.equal(204);
        expect(res1.headers).not.has.property('etag');
      });

      it('should not do anything if payload is `undefined`', async () => {
        await server.route({
          method: 'GET',
          path: '/test',
          handler: async (request, h) => h.response(),
        });
        const res1 = await server.inject({
          url: '/test',
        });
        expect(res1.statusCode).to.be.equal(204);
        expect(res1.headers).not.has.property('etag');
      });

      it('should not do anything if payload is `null`', async () => {
        await server.route({
          method: 'GET',
          path: '/test',
          handler: async (request, h) => h.response(null),
        });
        const res1 = await server.inject({
          url: '/test',
        });
        expect(res1.statusCode).to.be.equal(204);
        expect(res1.headers).not.has.property('etag');
      });

      it('should not do anything if payload is a number', async () => {
        await server.route({
          method: 'GET',
          path: '/test',
          handler: async (request, h) => h.response(42),
        });
        const res1 = await server.inject({
          url: '/test',
        });
        expect(res1.statusCode).to.be.equal(200);
        expect(res1.headers).not.has.property('etag');
      });

      const testcases = [{
        name: 'payload is a string',
        payload: 'this is a plain string',
      }, {
        name: 'payload is an empty string',
        payload: '',
        statusCode: 204,
      }, {
        name: 'payload is a string + joi validation',
        payload: 'this is a plain string',
        joi: {
          schema: Joi.string(),
        },
      }, {
        name: 'payload is an object',
        payload: {
          description: 'this is an object',
          foo: ['bar', 'baz'],
        },
        getPayload: (res) => JSON.parse(res.payload),
      }, {
        name: 'payload is an empty object',
        payload: {},
        getPayload: (res) => JSON.parse(res.payload),
      }, {
        name: 'payload is an object + joi validation',
        payload: {
          description: 'this is an object',
          foo: ['bar', 'baz'],
        },
        getPayload: (res) => JSON.parse(res.payload),
        joi: {
          schema: Joi.object().keys({
            description: Joi.string(),
            foo: Joi.array().items(Joi.string()),
          }),
        },
      }, {
        name: 'payload is a buffer',
        payload: Buffer.from([0x62, 0x75, 0x66, 0x66, 0x65, 0x72]),
        getPayload: (res) => res.rawPayload,
      }, {
        name: 'payload is an empty buffer',
        payload: Buffer.from([]),
        getPayload: (res) => res.rawPayload,
        statusCode: 204,
      }];

      testcases.forEach(({
        name, payload, getPayload = (res) => res.payload, statusCode = 200, joi = {},
      }) => {
        it(`should provide etag and http 304 if ${name}`, async () => {
          await server.route({
            method: 'GET',
            path: '/test',
            handler: async () => payload,
            options: {
              response: {
                ...joi,
              },
            },
          });
          const res1 = await server.inject({
            url: '/test',
          });
          expect(res1.statusCode).to.be.equal(statusCode);
          expect(getPayload(res1)).to.be.deep.equals(payload);
          expect(res1.headers).has.property('etag').which.has.lengthOf.at.least(30);
          const { etag } = res1.headers;
          const res2 = await server.inject({
            url: '/test',
            headers: {
              'If-None-Match': etag,
            },
          });
          expect(res2.statusCode).to.be.equal(304);
          expect(res2.payload).to.be.empty;
          expect(res2.rawPayload).to.be.empty;
        });
      });
    });
  });
});

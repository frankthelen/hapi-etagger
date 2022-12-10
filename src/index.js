const stringify = require('fast-safe-stringify');
const etag = require('etag');
const { name } = require('../package.json');

const register = (server, options) => {
  server.ext('onPreResponse', (request, h) => {
    const { route, method, response } = request;
    if (response instanceof Error) return h.continue;

    const routeOptions = route.settings.plugins[name] || {};
    const { enabled = true } = routeOptions;
    if (!enabled) return h.continue; // opt-out

    if (method !== 'get') return h.continue;
    const { statusCode, source: payload } = response;
    if (!(statusCode >= 200 && statusCode < 300)) return h.continue;
    if (payload === undefined || payload === null) return h.continue;

    let data;
    if (payload instanceof String || typeof payload === 'string') {
      data = payload;
    } else if (payload instanceof Buffer) {
      data = payload;
    } else if (payload instanceof Object && typeof payload === 'object') {
      data = stringify(payload);
    } else {
      return h.continue;
    }

    const responseHttp304 = h.entity({
      etag: etag(data, options).replace(/"/g, ''), // remove enclosing `"` because hapi adds them again
    });
    if (responseHttp304) return responseHttp304;

    return h.continue;
  });
};

module.exports = {
  name,
  register,
};

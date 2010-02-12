var assert      = require('assert'),
    http        = require('http'),
    path        = require('path'),
    querystring = require('querystring'),
    sys         = require('sys'),
    url         = require('url');

var Client = exports.Client = function (params) {
  this.params = params;
  this.raw = params.raw || 'raw';
  this.client = http.createClient(params.port || 8098,
                                  params.host || 'localhost');
}

sys.inherits(Client, process.EventEmitter);

Client.prototype.makeLinkHeader = function(links) {
//  [
//    { doc: "/memos/memo0", tag="author" },
//    { doc: "/memos/memo1", tag="author" },
//    { doc: "/memos/memo2", tag="author" },
//  ]
  var self = this;
  var pieces = links.map(function (val) {
    return '</' + self.raw + val.doc + '>; riaktag="' + val.tag + '"';
  });
  return pieces.join(", ");
}

Client.prototype.documentPath = function(bucket, key) {
  return path.join('/', this.raw, bucket, key);
}

Client.prototype.store = function(bucket, key, data, params) {
  assert.ok(bucket);
  assert.ok(key);

  var headers = (params && params.headers) || {};

    switch (params && params.type) {
      case "json":
        headers['content-type'] = "application/json";
        data = JSON.stringify(data);
        break;

      case "binary":
        headers['content-type'] = "application/octet-stream";
        break;

      case undefined:
      case "text":
        headers['content-type'] = "text/plain";
        break;

      default:
        headers['content-type'] = params.type;
    }

  var document_path = this.documentPath(bucket, key);

  if (params) {
    var query = {};
    ['r', 'w', 'dw'].forEach(function (f) {
      if (params[f]) query[f] = params[f];
    });
    if (Object.keys(query).length > 0)
      document_path += '?' + querystring.stringify(query);
  }

  return this.makeRequest('PUT', document_path,
                          headers, data);
}

Client.prototype.fetch = function(bucket, key, params) {
  var document_path = this.documentPath(bucket, key);

  if (params && 'r' in params) {
    document_path += '?' + 'r=' + params.r;
  }
  return this.makeRequest('GET', this.documentPath(bucket, key));
}

Client.prototype.remove = function(bucket, key, params) {
  return this.makeRequest('DELETE', this.documentPath(bucket, key));
}

Client.prototype.walk = function(start, spec) {
  // walk(['bucket', 'key'], [['_', 'author', 1]]);
  // walk(['bucket', 'key'], [['people', 'author', 1]]);
  var document_path = this.documentPath(start[0], start[1]);

  document_path +=
    '/' + spec.map(function (step) {
      return step.map(function (value) { return value || '_'; });
  })
  .join('/');

  debug('document_path: ' + document_path);

  return this.makeRequest('GET', document_path);
}

Client.prototype.makeRequest = function(method, url, headers, data) {
  assert.ok(method);
  assert.ok(url);

  var request = this.client.request(method, url, headers);
  var promise = new process.Promise();

  if (data) request.sendBody(data);

  request.finish(function (response) {
    var body = "";
    response.addListener("body", function (chunk) { body += chunk; });
    response.addListener("complete", function () {
      var resp = { headers: response.headers, data: body };
      if (   response.statusCode < 200
          || response.statusCode >= 300) {
        promise.emitError(resp, response.statusCode);
        return;
      }

      // don't try to json parse a response if there's no content
      if (response.statusCode != 204
          && response.headers['content-type'] == 'application/json'
          && Number(response.headers['content-length'])) {
        resp.data = JSON.parse(body);
      }
      promise.emitSuccess(resp, response.statusCode);
    });
  });

  return promise;
}

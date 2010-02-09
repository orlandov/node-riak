var assert = require('assert'),
    http   = require('http'),
    path   = require('path'),
    sys    = require('sys'),
    url    = require('url');

var Client = exports.Client = function (params) {
  this.params = params;
  this.raw = params.raw || 'raw';
  this.client = http.createClient(params.port || 8098,
                                  params.host || 'localhost');
}

sys.inherits(Client, process.EventEmitter);

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

  return this.makeRequest('PUT', this.documentPath(bucket, key),
                          headers, data);
}

Client.prototype.fetch = function(bucket, key, params) {
  return this.makeRequest('GET', this.documentPath(bucket, key));
}

Client.prototype.remove = function(bucket, key, params) {
  return this.makeRequest('DELETE', this.documentPath(bucket, key));
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

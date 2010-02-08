var sys = require("sys"),
    http = require("http"),
    url = require("url"),
    assert = require("assert"),
    path = require("path");

var debug = sys.debug;

var Client = exports.Client = function (params) {
  this.params = params;
  this.raw = params.raw || "raw";
  this.client = http.createClient(params.port || 8098,
                                  params.host || localhost);
}

sys.inherits(Client, process.EventEmitter);

Client.prototype.documentPath = function(bucket, key) {
  return path.join("/", this.raw, bucket, key);
}

Client.prototype.store = function(bucket, key, data, params) {
  sys.puts("storing!");
  assert.ok(bucket);
  assert.ok(key);

  var document_path = this.documentPath(bucket, key);

  debug("url was"+ document_path);

  var headers = {};
  if (params) {
    if (params.type == "json") {
      headers['Content-type'] = "application/json";
      data = JSON.stringify(data);
    }
  }

  return this.makeRequest('PUT', document_path, headers, data);
}

Client.prototype.fetch = function(bucket, key, params) {
  sys.puts("fetching!");
  return this.makeRequest('GET', url);
}

Client.prototype.makeRequest = function (method, url, headers, data) {
  assert.ok(method);
  assert.ok(url);

  var request = this.client.request(method, url, headers);

  debug("--- " + inspect([method, url, headers]));
  if (data) request.sendBody(data);

  var promise = new process.Promise();
  request.finish(function (response) {
    var body = "";
    response.addListener("body", function (chunk) { body += chunk; });
    response.addListener("complete", function () {
      debug("got a complete response '" + body + "'");
      promise.emitSuccess(body);
    });
      
  });

  return promise;
}

// vim:sw=2:ts=2

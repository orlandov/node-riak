var assert      = require('assert'),
    http        = require('http'),
    multipart   = require('multipart');
    path        = require('path'),
    querystring = require('querystring'),
    sys         = require('sys'),
    url         = require('url');

var Client = exports.Client = function (params) {
  this.params = params;
  this.raw = params.raw || 'riak';
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

  if (!headers['content-type']) {
    switch (params && params.type) {
      case "json":
        headers['content-type'] = "application/javascript";
        data = JSON.stringify(data);
        break;

      case "binary":
        headers['content-type'] = "application/octet-stream";
        break;

      // if the data is an object and no
      case undefined:
        if (typeof data === "object") {
          headers['content-type'] = "application/javascript";
          data = JSON.stringify(data);
          break;
        }
      case "text":
        headers['content-type'] = "text/plain";
        break;

      default:
        headers['content-type'] = params.type;
    }
  }

  var document_path = this.documentPath(bucket, key);

  if (params) {
    var query = {};
    ['r', 'w', 'dw', 'returnbody'].forEach(function (f) {
      if (params[f]) { query[f] = params[f]; }
    });
    if (Object.keys(query).length > 0) {
      document_path += '?' + querystring.stringify(query);
    }
  }

  return this.makeRequest('PUT', document_path, headers, data);
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

  // walk(['bucket', 'key'], [['_', 'author', 1]])
  // => /raw/bucket/key/_,author,1

  var document_path = this.documentPath(start[0], start[1])
    + '/' + spec.map(function (step) {
      return step.map(function (value) {
        return encodeURIComponent(value || '_'); });
  }).join('/');

  debug('document_path: ' + document_path);

  return this.makeRequest('GET', document_path);
}

Client.prototype.makeRequest = function(method, url, headers, data) {
  assert.ok(method);
  assert.ok(url);

  var request = this.client.request(method, url, headers);
  var promise = new process.Promise();

  if (data) request.write(data);

  request.addListener('response', function (response) {
    var body = "";
    response.addListener("data", function (chunk) { body += chunk; });
    response.addListener("end", function () {
      var resp = { headers: response.headers, data: body };
      if (   response.statusCode < 200
          || response.statusCode >= 300) {
        promise.emitError(resp, response.statusCode);
        return;
      }

      // don't try to json parse a response if there's no content
      if (response.statusCode != 204
          && (response.headers['content-type'] == 'application/json' ||
              response.headers['content-type'] == 'application/javascript')
          && Number(response.headers['content-length'])) {
        resp.data = JSON.parse(body);
      }
      promise.emitSuccess(resp, response.statusCode);
    });
  });
  request.close();

  return promise;
}

// MapReduce functions

function LinkStep(linkspec) {
  this.linkspec = linkspec;
}

// TODO extend this to support serverside JS functions
function MapStep(func) {
  this.func = func;
}

function ReduceStep(reducespec) {
  this.reducespec = reducespec;
}

exports.link = function (linkspec) {
  return new LinkStep(linkspec);
};

exports.map = function (func) {
  return new MapStep(func);
};

exports.reduce = function (reducespec) {
  return new ReduceStep(reducespec);
};

Client.prototype.mapReduce = function (inputs, stepsIn, params) {
  var query = [];

  stepsIn.forEach(function (step) {
    if (step instanceof MapStep) {
      debug("step was a map");
      query.push({
        map: { keep: true, language: 'javascript', source: step.func }
      });
    }
  });

  var mapred = JSON.stringify({ inputs: inputs, query: query });
  var document_path = '/mapred';
  debug(mapred);
  return this.makeRequest('POST', document_path, { "content-type": "application/javascript" }, mapred);
}

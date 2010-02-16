#!/usr/bin/env node

process.mixin(GLOBAL, require('assert'));
process.mixin(GLOBAL, require('sys'));

var multipart = require('multipart');
var Riak = require('riak');

var db = new Riak.Client({
  host: 'localhost',
  port: 8098,
});

var plan = 7;
var tc = 0;

/*
  /people/alice
    employee => /companies/widgets_inc
    author => /post/post0
    author => /post/post1
    author => /post/post2
*/

function parseMessage(resp) {
  var message = new process.EventEmitter();
  message.headers = resp.headers;

  message.body = resp.data.substr(1)
  // This is an ugly hack to fix the way Riak's multipart responses are
  // formatted. They seem to violate rfc 2045's decree that all lines be
  // terminated with \r\n (it terminates them with \n). Node's multipart mime
  // parser is quite strict about this so we need to mangle the message.
  // Should this ever stop being the case, this substitution should be
  // removed.
    .replace(/([^\r]?)\n/g, "$1\r\n");

  var mp = multipart.parse(message);
  mp.addListener('partBegin', function () {
    debug('Beginning a part');
  });
  mp.addListener('partEnd', function () {
    debug('End a part');
  });
  mp.addListener('complete', function () {
    debug('Completed parsing message');
    equal(mp.parts[0].parts.length, 3);
    tc++;
  });
  mp.addListener('error', function () {
    debug('Multipart parse error!');
  });

  // feed the parser the message in chunks
  var chunkSize = 1000;
  var body = message.body;
  process.nextTick(function s () {
    if (body) {
      message.emit("body", body.substr(0, chunkSize));
      body = body.substr(chunkSize);
      process.nextTick(s);
    } else {
      message.emit("complete");
    }
  });
}

function addAuthor() {
  db.store('people', 'alice', 'writer extraordinare')
  .addCallback(function () {
    tc++;
    var headers = {
        'link': db.makeLinkHeader([
          { doc: '/memos/memo0', tag: 'author' },
          { doc: '/memos/memo1', tag: 'author' },
          { doc: '/memos/memo2', tag: 'author' }
        ])
    };
    db.store('people', 'alice', undefined,
             { headers: headers })
    .addCallback(function () {
      tc++;
      db.walk( ['people', 'alice'], [['_', 'author', 1]])
      .addCallback(function (resp) {
        tc++;

        parseMessage(resp);
      });
    });
  });
}

var linkData = [
    { doc: "/memo/memo0", tag: "author" },
    { doc: "/memo/memo1", tag: "author" },
    { doc: "/memo/memo2", tag: "author" }
];

// TODO figure out a method to launch these in parallel (promise.Group ?)
db.store('memos', 'memo0', 'memo the first')
.addCallback(function () {

  tc++;
  equal(db.makeLinkHeader(linkData),
       '</raw/memo/memo0>; riaktag="author", ' +
       '</raw/memo/memo1>; riaktag="author", ' +
       '</raw/memo/memo2>; riaktag="author"');

  db.store('memos', 'memo1', 'memo the second')
  .addCallback(function () {
    tc++;

    db.store('memos', 'memo2', 'memo the third')
    .addCallback(function () {

      tc++;
      addAuthor();
    });
  });
});

process.addListener("exit", function () {
  equal(tc, plan);
  debug("All tests done!");
});

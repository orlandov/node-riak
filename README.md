NAME
----

node-riak - an client library for Riak

SYNOPSIS
--------

Low Level Interface
-------------------

    // intialize client
    var db = new Riak.Client({
      host: 'localhost',
      port: 8098,
    });

    // store nyarlathotep in deities as plain text with an 'r' value of 1, and
    // return the content again (content is not returned by default)
    db.store('deities', 'nyarlathotep', "The crawling chaos", { returnbody: 1, r: 1 })
    .addCallback(function (resp, statusCode) {
      // ...
    });

    // store cthulhu as binary and update the vclock
    db.store('deities', 'cthulhu',
             { type: 'binary', headers: { 'x-riak-vclock': '...' })
    .addCallback(function (resp, statusCode) {
      // ...
    });

    // fetch azathoth from deities
    db.fetch('deities', 'azathoth')
    .addCallback(function (resp, statusCode) {
      sys.debug(inspect(resp.headers));
      sys.debug(inspect(resp.data));
      var vclock = resp.headers['x-riak-vclock'];
    });

    // Errback fired if there was an error
    db.fetch('deities', 'yog-sothoth')
    .addErrback(function (data, statusCode) {
      if (statusCode == 404 ) { ... }
    }

MapReduce
---------

    // intialize client
    var db = new Riak.Client({
      host: 'localhost',
      port: 8098,
    });

    db.mapReduce(
        [ ['bucket0', 'key0'],        // buckets/keys to use
          ['bucket0', 'key1'] ],

        [ Riak.map("function () {}"), // phases
          Riak.map("function () {}"),
          // reduce and link phases are not yet inplemented
          Riak.reduce("function () {}") ]
    ).addCallback(function (resp) {
      ...
    });

High Level Interface (not yet implemented)
------------------------------------------

    // intialize client
    var db = new Riak.Client({
      host: 'localhost',
      port: 8098,
    });

    var bucket = db.bucket('posts');

    bucket.get('post-fail').addErrback(function (error) {
      // doesn't exist or something
    });

    bucket.get('post0', { r: 2 }).addCallback(function(object) {
      debug(object.data.title);

      object.links.push(['mybucket', 'mykey', 'mytag']);

      if (!object.data.views)
        object.data.views = 1;
      else
        object.data.views++;

      object.store({ w: 2 }).addCallback(function () {
        debug('object saved!');
      });
    });


DESCRIPTION
-----------

A basic wrapper around Node's HTTP facilities for communicating with a Riak
server's "raw" HTTP interface.

The client methods `fetch`, `store`, and `remove` return promises which fire
when the Riak server responds to the request.  The success callback is called
with two arguments: an object with properties `header` and `data`; and an
integer HTTP response status code.

If the content-type of the response is application/json the `data` property
will be the parsed JSON object.

If the HTTP response code isn't in the 2XX range an errback will be fired
instead of a promise. It will have the same arguments as described in the
success case above.

TESTS
-----

By default the node-riak tests run on localhost:8098 on the `node-riak-test-pots`

    NODE_LIB=lib node tests/test_riak.js

TODO
----

Lots.

- MapReduce reduce phases
- MapReduce link phases
- move high level error handling stuff into a higher level API and let the low
  level api only wrap Node's HTTP facilities.

SEE ALSO
--------

* http://bitbucket.org/basho/riak/src/tip/doc/raw-http-howto.txt
* http://github.com/frank06/node-riak


AUTHOR
------

Orlando Vazquez [ovazquez@gmail.com]

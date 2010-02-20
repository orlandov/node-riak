NAME
----

node-riak - an client library for Riak

SYNOPSIS
--------

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

SEE ALSO
--------

* http://bitbucket.org/basho/riak/src/tip/doc/raw-http-howto.txt
* http://github.com/frank06/node-riak


AUTHOR
------

Orlando Vazquez [ovazquez@gmail.com]

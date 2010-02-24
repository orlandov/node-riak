#!/usr/bin/env node

process.mixin(GLOBAL, require('assert'));
process.mixin(GLOBAL, require('sys'));

var Riak = require('riak');

var plan = 7;
var tc = 0;

var db = new Riak.Client({
  host: 'localhost',
  port: 8098,
});

var mahbucket = "foo";

// TODO use parallel promise pattern to clean up these nested cb's
function deletePosts() {
  var count = 3;
  var cb = function (resp) {
    if (count-- === 0) {
      addPosts();
    }
    else {
      var key = 'post' + count;
      var promise = db.remove(mahbucket, key);
      promise.addCallback(function () {
        debug("Removed " + key);
        process.nextTick(cb);
      });
      promise.addErrback(function (resp, code) {
        // only allow 404 not found errors
        equal(code, 404);
        debug("Key didn't exist anyway: " + key);
        process.nextTick(cb);
      });;
    }
  };
  cb();
}

function addPosts() {
  debug("Adding posts");
  db.store(mahbucket, 'post0', { x: "foo" }).addCallback(function (resp) {
    db.store(mahbucket, 'post1', { x: "bar" }) .addCallback(function (resp) {
      db.store(mahbucket, 'post2', { x: "baz" }) .addCallback(function (resp) {
        debug("Added posts");
        mapReduce();
      });
    });
  });
}

function mapReduce() {
  debug("mapReducing");
  db.mapReduce(
      [[mahbucket, 'post0'],        // buckets/keys to use
       [mahbucket, 'post1'],
       [mahbucket, 'post2']],

      [
      Riak.map("function (v) { return [v]; }"), // phases
//        Riak.link("..."),
//        Riak.map("function () {}"),
//        Riak.reduce("function () {}")]
      ]
  ).addCallback(function (resp) {
    debug(inspect(arguments));
  });
}

var link = Riak.link("foobar");
equal(link.linkspec, "foobar");
var map = Riak.map("foobar");
equal(map.func, "foobar");

deletePosts();

#!/usr/bin/env node

process.mixin(GLOBAL, require('assert'));
process.mixin(GLOBAL, require('sys'));

var Riak = require('riak');

var jjj = JSON.stringify;

var db = new Riak.Client({
  host: 'localhost',
  port: 8098,
});

var plan = 6;
var tc = 0;

var str = "Ya'll are brutalizing me" + Math.random();
var mahbucket = 'node-riak-test-posts';

db.store(mahbucket, 'post0', str).addCallback(function (resp) {
  tc++;
  equal(typeof resp.headers, 'object');

  db.fetch(mahbucket, 'post0').addCallback(function (resp) {
    ok("x-riak-vclock" in resp.headers);
    tc++;
    equal(str, resp.data);

    db.remove(mahbucket, 'post0').addCallback(function (resp, code) {
      equal(code, 204);
      tc++;
      db.remove(mahbucket, 'post0').addErrback(function (resp, code) {
         equal(code, 404);
         tc++;
      });
    });
  });
});

db.store(mahbucket, 'post1', { foo: "bar" }, { type: 'json' })
.addCallback(function () {
  tc++;
  db.fetch(mahbucket, 'post1').addCallback(function (resp) {
    tc++;
    var vclock = resp.headers['x-riak-vclock'];
    db.store(mahbucket, 'post1', { foo: "bar" },
             { type: 'json', headers: { 'x-riak-vclock': vclock } })
    .addCallback(function (resp, code) {
      tc++;
      equal(code, 204);
    });
    deepEqual(resp.data, { foo: "bar" });
  });
});

process.addListener("exit", function () {
  equal(tc, plan);
  debug("All tests done!");
});

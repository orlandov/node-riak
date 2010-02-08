#!/usr/bin/env node

process.mixin(GLOBAL, require('assert'));
process.mixin(GLOBAL, require('sys'));

var Riak = require('riak');

var jjj = JSON.stringify;

var db = new Riak.Client({
    host: 'localhost',
    port: 8098,
});

db.store('rules', 'dancing', 'Dancing is forbidden')
.addCallback(function (obj) {
  puts("store() callback "+inspect(arguments));

  db.fetch('rules', 'dancing')
  .addCallback(function (obj) {
    puts("fetch callback "+inspect(obj));
  });
});

// vim:sw=2:ts=2

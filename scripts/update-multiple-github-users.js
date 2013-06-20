#!/usr/bin/env node

'use strict';

var update    =  require('..')
  , argv      =  process.argv
  , usernames =  argv.slice(2)

if (!usernames.length) {
  console.error('Usage: update-github-repos <username1> [username2...]');
  process.exit(1);
}

update(usernames, function () {
  console.error('Successfully updated ', usernames);
});

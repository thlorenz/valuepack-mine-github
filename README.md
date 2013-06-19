# valuepack-mine-github [![build status](https://secure.travis-ci.org/thlorenz/valuepack-mine-github.png)](http://travis-ci.org/thlorenz/valuepack-mine-github)

Mines github for user and repository data. 

Supports [valuepack](https://github.com/thlorenz/valuepack), the community driven rating system for nodejs modules on
npm in order to help in selecting the right one.

Read more [about its goals](https://github.com/thlorenz/valuepack/blob/master/goals.md).

## functions

The entire public API is exposed via the index file:

```js
exports.fetchGithubRepos    =  require('./lib/fetch-github-repos');
exports.storeGithubRepos    =  require('./lib/store-github-repos');
exports.updateGithubRepos   =  require('./lib/update-github-repos');
exports.clientIdSecretQuery =  require('./lib/client-id-secret-query');
exports.updateMultipleUsers =  require('./lib/update-multiple-github-users');
```

## scripts

You can play with scripts inside `./scripts`.

### environment variables

The following environment variables are considered by the scripts:

### github app tokens

used to increase github rate limit to 5K

- `VALUEPACK_GITHUB_CLIENT_ID`
- `VALUEPACK_GITHUB_CLIENT_SECRET`

### database path

- `VALUEPACK_MINE_DB` the path at which the leveldb data is stored (defaults to `valuepack-mine-npm/store/valuepack-mine.db`)

Make sure to include them every time you execute a script or add the following to your `.bashrc` (example):

```sh
export VALUEPACK_GITHUB_CLIENT_ID=0i0d0
export VALUEPACK_GITHUB_CLIENT_SECRET=0s0e0c0r0e0t
export VALUEPACK_MINE_DB=~/.valuepack/valuepack-mine.db
```

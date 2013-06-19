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

You can run the below scripts without these, but will run will hit the unauthorized rate limit (60/hr) fairly quick.

### database path

- `VALUEPACK_MINE_DB` the path at which the leveldb data is stored (defaults to `valuepack-mine-npm/store/valuepack-mine.db`)

Make sure to include them every time you execute a script or add the following to your `.bashrc` (example):

### client id and secret

```sh
export VALUEPACK_GITHUB_CLIENT_ID=0i0d0
export VALUEPACK_GITHUB_CLIENT_SECRET=0s0e0c0r0e0t
```

### initializing the data store

An init script is provided that creates a leveldb database at `~/.valuepack`.

Do one of the following:

`npm run init`
or
`cd scripts && ./init.sh`

### fetch and store user data

Run the update multiple users script:

    ./update-multiple-github-users.js substack isaacs visionmedia

**Note:** Only `JavaScript` or `CoffeeScript` (I'm being nice ;) ) repos are stored.
**Note:** Forks are currently ignored as well, but that may changej

### query the data

Make sure to pass the `--read` flag in order to run queries, if not passed it is assumed that you pass the path to a
json file which contains user data you want to store.

```sh
# how many of substack modules are prefixed with node-
./store-github-repos.js --read --keys | grep substack/node- | wc -l

# how many of TJ's modules are express related
./store-github-repos.js --read --keys | grep visionmedia/express | wc -l

# show all of isaacs modules related to npm
./store-github-repos.js --read --keys | grep isaacs/npm

# show all users stored in your database
./store-github-repos.js --read --keys --users

# show all their metadata (i.e. when the user data was last modified)
./store-github-repos.js --read --values --meta
```

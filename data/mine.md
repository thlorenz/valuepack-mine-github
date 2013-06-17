# fields

fields from the npm registry db and github that will be useful to store

- fields to be indexed in **bold**
- fields we may not need in *italic*

## github users

Try to get one for each npm user

    curl -k https://api.github.com/users/<username>

- **login** (username)
- `public_repos` (count)
- followers (count)
- following (count)

#### urls

May not need to store or even get them since they can be constructed from user/rep

- `followers_url`
- `repos_url`

### Followers

via `followers_url`

    curl -k https://api.github.com/users/<username>/followers

- login

has lots more info about each follower, but login should be all we need

### Repos

via `repos_url`

    curl -k https://api.github.com/users/<username>/repos

- name
- **fullname** (`<user>/<reponame>`)
- *description*
- fork (true|false) - may ignore forks for now
- forks (count)
- watchers (count)
- language: (only include 'JavaScript|CoffeeScript' for now
- `open_issues` (count)
- `has_issues` (is user allowing to post issues)
- `created_at` (Date) these two may be needed to value maturity/liveliness
- `updated_at` (Date) 

#### urls

May not need to store them since they can be constructed from user/rep

- `stargazers_url`
- `issues_url`
- `pulls_url`

Follow stargazers, issues and pulls to get more info about the quality of each repo

### [events](http://developer.github.com/v3/activity/events/)

    curl -k https://api.github.com/users/<username>/received_events

Potentially these could be used to get delta info about others that follow, star a repo or PR on one for a given user.
We'd just need to filter all events that are about the user or one of his/her repos.

This is a whole lot info that comes down in one request and maybe a way to work within the github rate limit.

### Repos vs. User Info

Each repo includes certain user info as well. The following values are missing from it however:

- public repos: don't need this, just count number of repos returned
- **followers:** only need this if we don't need to know who is following, otherwise we can just count 'em when we get 'em
- following: probably don't need it
- `public_gists`: may not need this

### Determine who starred what

Two options:

#### For each user determine what repos he starred

    curl https://api.github.com/users/thlorenz/starred

Advantage: get this once per user
Disadvantage: a bit harder to analyze

#### For each repo figure out who starred it

    curl https://api.github.com/repos/isaacs/abbrev-js/stargazers

Advantage: somewhat easier to analyze
Disadvantage: get this once for every repo

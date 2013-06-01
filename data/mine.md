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
- fork (true|false)
- forks (count)
- watchers (count)
- `stargazers_url`
- `issues_url`
- `pulls_url`
- `created_at` (Date)
- `updated_at` (Date)

Follow stargazers, issues and pulls to get more info about the quality of each repo

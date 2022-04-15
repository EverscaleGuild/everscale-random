# 🚀 Everscale random

## Develop environment require

- `POSIX` (bash, grep, cut, sort, etc)
- `nvm` https://github.com/nvm-sh/nvm
- `yarn` https://yarnpkg.com/getting-started/install


### Dependencies

```shell
nvm use $(yarn --ignore-engines --silent nvm)
yarn install
```

## Develop

```shell
yarn start
```

## Publish

```shell
URL=/everscale-random/ yarn release
```

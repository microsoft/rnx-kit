# Website

This website is built using [Starlight](https://starlight.astro.build/), a
documentation framework built on [Astro](https://astro.build/).

### Installation

```
$ yarn
```

### Local Development

```
$ yarn start
```

This command starts a local development server. Most changes are reflected live
without having to restart the server.

### Build

```
$ yarn build
```

This command generates static content into the `dist` directory, and fails if
there are any broken internal links. Use `yarn preview` to serve it locally.

### Deployment

The website is deployed to GitHub Pages by the `build` workflow on every push to
`main`.

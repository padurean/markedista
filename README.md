# markedista
Static site generator based on [npm](https://www.npmjs.com/),
[marked](https://marked.js.org/#/README.md#README.md) and [yaml-front-matter](https://github.com/dworthen/js-yaml-front-matter)

## usage
- add some markdown post(s) in the *posts-md/to-render* folder
- edit *header.html* and *footer.html* in the *fragments* folder
- run `npm run render` => html files will be generated in the *posts* folder
- to serve with live reload during development:
  - install the [LiveReload](http://livereload.com/extensions/) browser extension
  - `npm i -g lr serve` to install [livery](https://github.com/shannonmoeller/livery) and
    [serve](https://github.com/zeit/serve) globally
  - then run `lr | serve`
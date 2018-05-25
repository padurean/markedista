<img src="markedista.svg" height="32">

Static site generator based on [npm](https://www.npmjs.com/),
[marked](https://marked.js.org/#/README.md#README.md) and
[jsdom](https://github.com/jsdom/jsdom)

## usage
- add some markdown post(s) in the *posts-src/to-render* folder
- edit *header.html* and *footer.html* in the *posts-src/fragments* folder
- run `npm run render` => html files will be generated in the *posts* folder
- to serve with live reload during development:
  - install the [LiveReload](http://livereload.com/extensions/) browser extension
  - `npm i -g lr serve` to install [livery](https://github.com/shannonmoeller/livery) and
    [serve](https://github.com/zeit/serve) globally
  - then run `lr | serve`
  - **NOTE**: `npm run render` will have to be run in another terminal session

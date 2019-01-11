<img src="images/markedista-logo.svg" height="32">

Static site generator based on [npm](https://www.npmjs.com/),
[marked](https://marked.js.org/#/README.md#README.md) and
[jsdom](https://github.com/jsdom/jsdom) (check `devDependencies` in [package.json](package.json)
for more details)

## demo
https://padurean.github.io/markedista/

## usage
- add some markdown post(s) in the *_src/_posts/_to-render* folder
- edit html templates from the *_src/_templates* folder
- run `npm run render` => html files will be generated in the *posts* folder, rendered markdown
files will be moved to the *_src/_rendered* folder
- deploy the root folder to any static host
- to serve with live reload during development:
  - install the [LiveReload](http://livereload.com/extensions/) browser extension
  - `npm i -g lr serve` to install [livery](https://github.com/shannonmoeller/livery) and
    [serve](https://github.com/zeit/serve) globally
  - then run `lr | serve`
  - **NOTE**: `npm run render` will have to be run in another terminal session

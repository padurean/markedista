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

## benchmark
- benchmark results on a MacBook Pro (Late 2012, 2,9 GHz Intel Core i7, 8 GB 1600 MHz DDR3, SSD):
```
===> Summary:
3003 files found in total (= 3000 to render + 3 already rendered) of which:
3003 files successfully processed
<===
DONE in 107s 17ms
$ ~/w/g/markedista (master)> node --version
v10.1.0
$ ~/w/g/markedista (master)> npm --version
6.1.0
```
- to run the benchmark on your machine:
  - uncomment the penultimate line in `scripts/render.js`:
  `createBenchmarkMds('posts-src/rendered/second-post.md', 3000)`
    - this will make x copies of the md file you specify in the folder to render:
      - replace the value of the 1st arg with the path to the md file you wish
      to make copies of
      - replace the value of the 2nd arg with the number of copies you wish to make
  - run `npm run render`
  - after it finishes, check the summary
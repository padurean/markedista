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

- run `npm run minifycss` to minify css (in case there were some changes in any (s)css file(s))
- run `npm run minifyjs` to minify js (in case there were some changes in any js file(s))

## update dependencies

- use `npm outdated` to discover dependencies that are out of date
- use `npm update` to perform safe dependency upgrades
- use `npm install <packagename>@latest` to upgrade to the **latest major** version of a package
- use `npx npm-check-updates -u` and `npm install` to upgrade **all** dependencies to their **latest major** versions

const fs = require('fs')
var uglifyjs = require("uglify-js")
const colors = require('colors')
colors.setTheme({
  silly: 'rainbow',
  input: 'grey',
  verbose: 'cyan',
  prompt: 'grey',
  info: 'green',
  data: 'grey',
  help: 'cyan',
  warn: 'yellow',
  debug: 'blue',
  error: 'red'
})

const enc = 'utf8'

const inputFilesForIndexPage = [
  '_src/_js/_vendor/jquery-3.3.1.min.js',
  '_src/_js/main.js'
]
const inputFilesForTagsPage = [
  '_src/_js/_vendor/jquery-3.3.1.min.js',
  '_src/_js/tags.js'
]
const inputFilesForPostPage = [
  '_src/_js/_vendor/jquery-3.3.1.min.js',
  '_src/_js/_vendor/highlight/highlight.pack.js',
  '_src/_js/post.js'
]

const config = {
  forIndexPage: {
    input: {
      'file1.js': fs.readFileSync(inputFilesForIndexPage[0], enc),
      'file2.js': fs.readFileSync(inputFilesForIndexPage[1], enc)
    },
    output: 'bundle-main.min.js'
  },
  forTagsPage: {
    input: {
      'file1.js': fs.readFileSync(inputFilesForTagsPage[0], enc),
      'file2.js': fs.readFileSync(inputFilesForTagsPage[1], enc)
    },
    output: 'bundle-tags.min.js'
  },
  forPostPage: {
    input: {
      'file1.js': fs.readFileSync(inputFilesForPostPage[0], enc),
      'file2.js': fs.readFileSync(inputFilesForPostPage[1], enc),
      'file3.js': fs.readFileSync(inputFilesForPostPage[2], enc)
    },
    output: 'bundle-post.min.js'
  }
}

function minifyToFile(input, output) {
  const minified = uglifyjs.minify(input).code
  console.info('to:\n  %s'.info, output)
  fs.writeFileSync(output, minified, enc)  
}

console.info(
  'Minifying JS files for index page:\n  %s'.info,
  inputFilesForIndexPage.join('\n  '))
minifyToFile(config.forIndexPage.input, config.forIndexPage.output)

console.info(
  '\nMinifying JS files for tags page:\n  %s'.info,
  inputFilesForTagsPage.join('\n  '))
minifyToFile(config.forTagsPage.input, config.forTagsPage.output)

console.info(
  '\nMinifying JS files for post page:\n  %s'.info,
  inputFilesForPostPage.join('\n  '))
minifyToFile(config.forPostPage.input, config.forPostPage.output)
  
console.info('\nDONE.'.info)
import { default as fs } from 'fs'
import { default as uglifyjs } from 'uglify-es'
import { default as colors } from 'colors'
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
  '_src/_js/hamburger-init.js',
  '_src/_js/_vendor/moment-2.22.2.min.js',
  '_src/_js/main.js'
]
const inputFilesForTagsPage = [
  '_src/_js/_vendor/jquery-3.3.1.min.js',
  '_src/_js/hamburger-init.js',
  '_src/_js/_vendor/moment-2.22.2.min.js',
  '_src/_js/tags.js'
]
const inputFilesForPostPage = [
  '_src/_js/_vendor/jquery-3.3.1.min.js',
  '_src/_js/_vendor/highlight/highlight.pack.js',
  '_src/_js/hamburger-init.js',
  '_src/_js/_vendor/moment-2.22.2.min.js',
  '_src/_js/_vendor/clipboard.min.js',
  '_src/_js/post.js'
]
const inputFilesForPostPageWithGallery = [
  '_src/_js/_vendor/jquery-3.3.1.min.js',
  '_src/_js/_vendor/jquery.mobile-events-2.0.0.min.js',
  '_src/_js/_vendor/featherlight-1.7.13/release/featherlight.min.js',
  '_src/_js/_vendor/featherlight-1.7.13/release/featherlight.gallery.min.js',
  '_src/_js/_vendor/highlight/highlight.pack.js',
  '_src/_js/hamburger-init.js',
  '_src/_js/_vendor/moment-2.22.2.min.js',
  '_src/_js/_vendor/clipboard.min.js',
  '_src/_js/post.js',
  '_src/_js/post-gallery-init.js'
]

const config = {
  forIndexPage: {
    input: {
      'file1.js': fs.readFileSync(inputFilesForIndexPage[0], enc),
      'file2.js': fs.readFileSync(inputFilesForIndexPage[1], enc),
      'file3.js': fs.readFileSync(inputFilesForIndexPage[2], enc),
      'file4.js': fs.readFileSync(inputFilesForIndexPage[3], enc)
    },
    output: 'bundle-main.min.js'
  },
  forTagsPage: {
    input: {
      'file1.js': fs.readFileSync(inputFilesForTagsPage[0], enc),
      'file2.js': fs.readFileSync(inputFilesForTagsPage[1], enc),
      'file3.js': fs.readFileSync(inputFilesForTagsPage[2], enc),
      'file4.js': fs.readFileSync(inputFilesForTagsPage[3], enc)
    },
    output: 'bundle-tags.min.js'
  },
  forPostPage: {
    input: {
      'file1.js': fs.readFileSync(inputFilesForPostPage[0], enc),
      'file2.js': fs.readFileSync(inputFilesForPostPage[1], enc),
      'file3.js': fs.readFileSync(inputFilesForPostPage[2], enc),
      'file4.js': fs.readFileSync(inputFilesForPostPage[3], enc),
      'file5.js': fs.readFileSync(inputFilesForPostPage[4], enc),
      'file6.js': fs.readFileSync(inputFilesForPostPage[5], enc)
    },
    output: 'bundle-post.min.js'
  },
  forPostPageWithGallery: {
    input: {
      'file1.js': fs.readFileSync(inputFilesForPostPageWithGallery[0], enc),
      'file2.js': fs.readFileSync(inputFilesForPostPageWithGallery[1], enc),
      'file3.js': fs.readFileSync(inputFilesForPostPageWithGallery[2], enc),
      'file4.js': fs.readFileSync(inputFilesForPostPageWithGallery[3], enc),
      'file5.js': fs.readFileSync(inputFilesForPostPageWithGallery[4], enc),
      'file6.js': fs.readFileSync(inputFilesForPostPageWithGallery[5], enc),
      'file7.js': fs.readFileSync(inputFilesForPostPageWithGallery[6], enc),
      'file8.js': fs.readFileSync(inputFilesForPostPageWithGallery[7], enc),
      'file9.js': fs.readFileSync(inputFilesForPostPageWithGallery[8], enc),
      'file10.js': fs.readFileSync(inputFilesForPostPageWithGallery[9], enc)
    },
    output: 'bundle-post-with-gallery.min.js'
  }
}

function minifyToFile(input, output) {
  const minifyResult = uglifyjs.minify(input)
  if (minifyResult.error) {
    console.error('error: minify failed: %s', minifyResult.error)
    return
  }
  const minified = minifyResult.code
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

console.info(
  '\nMinifying JS files for post page with gallery:\n  %s'.info,
  inputFilesForPostPageWithGallery.join('\n  '))
minifyToFile(config.forPostPageWithGallery.input, config.forPostPageWithGallery.output)

console.info('\nDONE.'.info)

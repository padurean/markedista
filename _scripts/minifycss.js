import { default as fs } from 'fs'
import { default as sass } from 'node-sass'
import { default as CleanCSS } from 'clean-css'
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

const config = {
  forIndexPage: {
    input: [
      '_src/_css/hamburgers.min.css',
      '_src/_css/main.css'
    ],
    output: 'bundle-main.min.css'
  },
  forPostPage: {
    input: [
      '_src/_css/hamburgers.min.css',
      '_src/_js/_vendor/highlight/styles/atom-one-light.css',
      '_src/_css/main.css'
    ],
    output: 'bundle-post.min.css'
  },
  forPostPageWithGallery: {
    input: [
      '_src/_css/hamburgers.min.css',
      '_src/_js/_vendor/highlight/styles/atom-one-light.css',
      '_src/_js/_vendor/featherlight-1.7.13/release/featherlight.min.css',
      '_src/_js/_vendor/featherlight-1.7.13/release/featherlight.gallery.min.css',
      '_src/_css/main.css'
    ],
    output: 'bundle-post-with-gallery.min.css'
  }
}

const cleanCSS = new CleanCSS({ compatibility: 'ie7', rebase: false })

function compileScss(input, output) {
  const compiled = sass.renderSync({file: input})
  console.info('to:\n  %s'.info, output)
  fs.writeFileSync(output, compiled.css, enc)
}

function minifyToFile(input, output) {
  const minified = cleanCSS.minify(input).styles
  console.info('to:\n  %s'.info, output)
  fs.writeFileSync(output, minified, enc)
}

const inputScssFile = '_src/_css/main.scss'
const outputCssFile = '_src/_css/main.css'
console.info('Compiling SCSS:\n  %s'.info, inputScssFile)
compileScss(inputScssFile, outputCssFile)

console.info(
  '\nMinifying CSS files for index page:\n  %s'.info,
  config.forIndexPage.input.join('\n  '))
minifyToFile(config.forIndexPage.input, config.forIndexPage.output)

console.info(
  '\nMinifying CSS files for post page:\n  %s'.info,
  config.forPostPage.input.join('\n  '))
minifyToFile(config.forPostPage.input, config.forPostPage.output)

console.info(
  '\nMinifying CSS files for post page with gallery:\n  %s'.info,
  config.forPostPageWithGallery.input.join('\n  '))
minifyToFile(config.forPostPageWithGallery.input, config.forPostPageWithGallery.output)

console.info('\nDONE.'.info)

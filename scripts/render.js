const fs = require('fs')
const {promisify} = require('util')
const marked = require('marked')
const frontmatter = require('yaml-front-matter')
const jsdom = require('jsdom')
const { JSDOM } = jsdom
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

const toRenderDirPath = 'posts-src/to-render'
const renderedDirPath = 'posts-src/rendered'
const htmlOutputDirPath = 'posts'
const fragmentsDirPath = 'posts-src/fragments'
const enc = 'utf8'

const readDir = promisify(fs.readdir)
const readFile = promisify(fs.readFile)
const writeFile = promisify(fs.writeFile)
const renameFile = promisify(fs.rename)

function validateMeta(meta) {
  const errors = []
  if (typeof meta.date === 'undefined' || meta.date.length === 0)
    errors.push('date')
  if (typeof meta.title === 'undefined' || meta.title.length === 0)
    errors.push('title')
  if (typeof meta.description === 'undefined' || meta.description.length === 0)
    errors.push('description')
  return errors
}

const render = async () => {
  try {
    const startedAt = process.hrtime()
    const mdFileNameToMeta = new Map()
    let invalidMetaCounter = 0
    console.info(`Scanning ${toRenderDirPath} for md files to render ...`.info)
    const mdFilesNames = await readDir(toRenderDirPath)
    if (mdFilesNames.length > 0)
      console.info(`${mdFilesNames.length} new md files found`.info)
    else
      return console.warn('No new md files found'.warn)
    console.info(`Reading header & footer from ${fragmentsDirPath} folder ...`.info)
    const headerHtml = await readFile(`${fragmentsDirPath}/header.html`, enc)
    const footerHtml = await readFile(`${fragmentsDirPath}/footer.html`, enc)
    const documentDom = new JSDOM(headerHtml+footerHtml)
    let { document } = documentDom.window
    const postTitleElem = document.querySelector("#post-title")
    const postDateElem = document.querySelector('#post-date')
    const postBodyElem = document.querySelector('#post-body')
    mdFilesNames.forEach(async mdFileName => {
      try {
        console.info(`${mdFileName} - Reading file ...`.info)
        const mdFilePath = `${toRenderDirPath}/${mdFileName}`
        const mdContentAndMeta = await readFile(mdFilePath, enc)
        console.info(`${mdFileName} - Parsing frontmatter ...`.info)
        const meta = frontmatter.loadFront(mdContentAndMeta)
        const metaErrors = validateMeta(meta)
        if (metaErrors.length > 0) {
          invalidMetaCounter++
          const metaErrorsStr = metaErrors.join(', ')
          return console.error(
            `${mdFileName} - Skipped - misses frontmatter: ${metaErrorsStr}`.error)
        }
        console.info(`${mdFileName} - Rendering to HTML ...`.info)
        const mdContent = meta.__content
        const renderedHtml = marked(mdContent)
        console.info(`${mdFileName} - Injecting metadata and aggregating HTML ...`.info)
        const {date, title, description} = {...meta}
        postTitleElem.textContent = title
        // NOTE: date elem textContent will be overwritten on client side
        if (typeof date === 'string') { // when frontmatter is JSON
          postDateElem.setAttribute('datetime', date)
          postDateElem.textContent = new Date(date).toLocaleString()
        } else /*if (typeof date === 'object')*/ { // when frontmatter is YAML
          postDateElem.setAttribute('datetime', date.toISOString())
          postDateElem.textContent = date.toLocaleString()
        }
        postBodyElem.innerHTML = renderedHtml
        const htmlContent = documentDom.serialize()
        const lastIndexOfDot = mdFileName.lastIndexOf('.')
        const htmlFileName = mdFileName.substr(0, lastIndexOfDot)+'.html'
        const htmlFilePath = `${htmlOutputDirPath}/${htmlFileName}`
        console.info(`${mdFileName} - Writing to ${htmlFilePath} ...`.info)
        await writeFile(htmlFilePath, htmlContent)
        const renderedMdFilePath = `${renderedDirPath}/${mdFileName}`
        console.info(`${mdFileName} - Moving to ${renderedDirPath} ...`.info)
        await renameFile(mdFilePath, renderedMdFilePath)
        mdFileNameToMeta.set(mdFileName, {
          date: date,
          title: title,
          description: description,
          htmlFileName: htmlFileName
        })
        if (mdFileNameToMeta.size + invalidMetaCounter === mdFilesNames.length) {
          const postsJsonFilePath = `${htmlOutputDirPath}/posts.json`
          console.info(`Generating ${postsJsonFilePath} ...`.info)
          mdFileNameToMeta[Symbol.iterator] = function* () {
            yield* [...this.entries()].sort((a, b) =>
            new Date(b[1].date).getTime() - new Date(a[1].date).getTime())
          }
          const mdFileNameToMetaJson = JSON.stringify([...mdFileNameToMeta], null, 2)
          await writeFile(postsJsonFilePath, mdFileNameToMetaJson)
          const took = process.hrtime(startedAt)
          const tookStr =
            `${took[0]>0?took[0]+'s ':''}${Math.round(took[1]/1000000)}ms`
          console.info(`DONE in ${tookStr}`.info)
        }
      } catch (e) {
        console.error(`${mdFileName} FAILED!\t${e}`.error)
      }
    })
  } catch (e) {
    console.error(`FAILED!\t${e}`.error)
  }
}
render()
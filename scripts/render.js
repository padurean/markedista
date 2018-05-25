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

const config = {
  toRenderDirPath: 'posts-src/to-render',
  renderedDirPath: 'posts-src/rendered',
  fragmentsDirPath: 'posts-src/fragments',
  htmlOutputDirPath: 'posts',
  postsJsonFilePath: `posts/posts.json`,
  enc: 'utf8',
  ignoreFiles: [ '.gitkeep' ]
}

const readDir = promisify(fs.readdir)
const readFile = promisify(fs.readFile)
const writeFile = promisify(fs.writeFile)
const renameFile = promisify(fs.rename)

function validateMeta(meta, errorPrefix) {
  const errors = []
  if (typeof meta.date === 'undefined' || meta.date.length === 0)
    errors.push('date')
  if (typeof meta.title === 'undefined' || meta.title.length === 0)
    errors.push('title')
  if (typeof meta.description === 'undefined' || meta.description.length === 0)
    errors.push('description')
  if (errors.length > 0) {
    const errorsStr = errors.join(', ')
    console.error(
      `${errorPrefix} - misses frontmatter: ${errorsStr}`.error)
    return false
  }
  return true
}

async function scanDir(path, logMsg, skip) {
  console.info(`Scanning ${path} for ${logMsg} ...`.info)
  const mdFilesNames = (await readDir(path)).filter(
    f => config.ignoreFiles.indexOf(f) < 0 &&
    (skip ? !skip.has(f) : true)
  )
  if (mdFilesNames.length > 0) {
    console.info(`${mdFilesNames.length} ${logMsg} found`.info)
  } else
    console.warn(`No ${logMsg} found`.warn)
  return mdFilesNames  
}

function withHtmlExtension(fileName) {
  const lastIndexOfDot = fileName.lastIndexOf('.')
  return fileName.substr(0, lastIndexOfDot)+'.html'
}

function renderMarkdownAndUpdateDom(logPrefix, meta, elements) {
  console.info(`${logPrefix} - Injecting metadata ...`.info)
  elements.titleElem.textContent = meta.title
  // for JSON frontmatter, date is parsed as string, for YAML, it is parsed as object
  elements.dateElem.setAttribute(
    'datetime',
    typeof meta.date === 'string' ? meta.date : meta.date.toISOString()
  )
  console.info(`${logPrefix} - Rendering markdown and injecting ...`.info)
  elements.bodyElem.innerHTML = marked(meta.__content)
}

async function writePostsJson(metaFileNameToMeta) {
  console.info(`Generating ${config.postsJsonFilePath} ...`.info)
  metaFileNameToMeta[Symbol.iterator] = function* () {
    yield* [...this.entries()].sort((a, b) =>
    new Date(b[1].date).getTime() - new Date(a[1].date).getTime())
  }
  const mdFileNameToMetaJson = JSON.stringify([...metaFileNameToMeta]/*, null, 2*/)
  await writeFile(config.postsJsonFilePath, mdFileNameToMetaJson)
}

function computeAndLogTotalDuration(startedAt) {
  const took = process.hrtime(startedAt)
  const tookMs = Math.round(took[1]/1000000)
  return `${took[0]>0?took[0]+'s ':''}${tookMs}ms`
}

const state = {
  mdFileNameToMeta: new Map(),
  invalidMetaCounter: 0,
  totalCounter: function() { 
    return this.mdFileNameToMeta.size + this.invalidMetaCounter
  },
  updateMeta: function(mdFileName, meta) {
    this.mdFileNameToMeta.set(mdFileName, {
      title: meta.title,
      date: meta.date,
      description: meta.description,
      htmlFileName: meta.htmlFileName
    })
  }
}

async function prepareDom() {
  console.info(`Reading header and footer from ${config.fragmentsDirPath} folder ...`.info)
  const headerHtml = await readFile(`${config.fragmentsDirPath}/header.html`, config.enc)
  const footerHtml = await readFile(`${config.fragmentsDirPath}/footer.html`, config.enc)
  const documentDom = new JSDOM(headerHtml+footerHtml)
  const { document } = documentDom.window
  return { 
    documentDom: documentDom,
    elements: {
      titleElem: document.querySelector("#post-title"),
      dateElem: document.querySelector('#post-date'),
      bodyElem: document.querySelector('#post-body')
    }
  }
}

async function renderFile(mdFileName, elements, documentDom) {
  console.info(`${mdFileName} - Reading file ...`.info)
  const mdFilePath = `${config.toRenderDirPath}/${mdFileName}`
  const mdContentAndMeta = await readFile(mdFilePath, config.enc)
  console.info(`${mdFileName} - Parsing frontmatter ...`.info)
  const meta = frontmatter.loadFront(mdContentAndMeta)
  if (!validateMeta(meta, `${mdFileName} - Skipped`)) {
    state.invalidMetaCounter++
  } else {
    renderMarkdownAndUpdateDom(mdFileName, meta, elements)
    const htmlContent = documentDom.serialize()
    meta.htmlFileName = withHtmlExtension(mdFileName)
    const htmlFilePath = `${config.htmlOutputDirPath}/${meta.htmlFileName}`
    console.info(`${mdFileName} - Writing to ${htmlFilePath} ...`.info)
    await writeFile(htmlFilePath, htmlContent)
    const renderedMdFilePath = `${config.renderedDirPath}/${mdFileName}`
    console.info(`${mdFileName} - Moving to ${config.renderedDirPath} ...`.info)
    await renameFile(mdFilePath, renderedMdFilePath)
    state.updateMeta(mdFileName, meta)
  }
}

async function updateStateMetaFromRenderedFile(mdFileNameRendered) {
  const mdFilePathRendered = `${config.renderedDirPath}/${mdFileNameRendered}`
  const mdContentAndMetaRendered = await readFile(mdFilePathRendered, config.enc)
  console.info(`${mdFileNameRendered} - Parsing frontmatter ...`.info)
  const metaRendered = frontmatter.loadFront(mdContentAndMetaRendered)
  if (!validateMeta(metaRendered, `${mdFileNameRendered} - Skipped`)) {
    state.invalidMetaCounter++
  } else {
    metaRendered.htmlFileName = withHtmlExtension(mdFileNameRendered)
    state.updateMeta(mdFileNameRendered, metaRendered)
  }
}

const render = async () => {
  try {
    const startedAt = process.hrtime()
    const mdFilesNames = await scanDir(config.toRenderDirPath, 'md file(s) to render')
    if (mdFilesNames.length === 0)
      return
    const { documentDom, elements } = await prepareDom()
    mdFilesNames.forEach(async mdFileName => {
      try {
        await renderFile(mdFileName, elements, documentDom)
        if (state.totalCounter() === mdFilesNames.length) {
          const mdFilesNamesRendered = await scanDir(
            config.renderedDirPath, 'previously rendered md file(s)', state.mdFileNameToMeta)
          if (mdFilesNamesRendered.length > 0) {
            mdFilesNamesRendered.forEach(async mdFileNameRendered => {
              try {
                await updateStateMetaFromRenderedFile(mdFileNameRendered)
                if (state.totalCounter() === mdFilesNames.length + mdFilesNamesRendered.length) {
                  await writePostsJson(state.mdFileNameToMeta)
                  const took = computeAndLogTotalDuration(startedAt)
                  console.info(`DONE in ${took}`.info)
                }
              } catch (e) {
                console.error(`${mdFileNameRendered} - FAILED to read!`.error, e)
              }
            })
          } else {
            await writePostsJson(state.mdFileNameToMeta)
            const took = computeAndLogTotalDuration(startedAt)
            console.info(`DONE in ${took}`.info)
          }
        }
      } catch (e) {
        console.error(`${mdFileName} FAILED!`.error, e)
      }
    })
  } catch (e) {
    console.error(`FAILED!`.error, e)
  }
}
render()
const fs = require('fs')
const {promisify} = require('util')
const log = require('loglevel')
log.setLevel(log.levels.WARN/*DEBUG*/)
const marked = require('marked')
const frontmatter = require('yaml-front-matter')
const jsdom = require('jsdom')
const { JSDOM } = jsdom
const minify = require('html-minifier').minify
const del = require('del')
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
  toRenderDirPath: '_src/_posts/_to-render',
  renderedDirPath: '_src/_posts/_rendered',
  templatesDirPath: '_src/_templates',
  htmlOutputDirPath: 'posts',
  pagesDirPath: 'page',
  postNavJsonFileName: `nav.json`,
  tagsJsonsDirPath: 'posts/tags',
  tagsPageDirPath: 'tags',
  cssFiles: {
    forIndexPage: 'bundle-main.min.css',
    forPostPage: 'bundle-post.min.css'
  },
  jsFiles: {
    forIndexPage: 'bundle-main.min.js',
    forPostPage: 'bundle-post.min.js'
  },
  enc: 'utf8',
  ignoreFiles: [ '.gitkeep' ],
  postsPerPage: 2,
  minifyHtmlOpts: {
    removeComments: true,
    collapseWhitespace: true
  }
}

const readDir = promisify(fs.readdir)
const readFile = promisify(fs.readFile)
const writeFile = promisify(fs.writeFile)
const renameFile = promisify(fs.rename)

function validateFrontmatter(meta, errorPrefix) {
  const errors = []
  if (typeof meta.date === 'undefined' || meta.date.length === 0)
    errors.push('date')
  if (typeof meta.title === 'undefined' || meta.title.length === 0)
    errors.push('title')
  if (typeof meta.description === 'undefined' || meta.description.length === 0)
    errors.push('description')
  if (typeof meta.tags === 'undefined' || meta.tags.length === 0)
    errors.push('tags')
  if (errors.length > 0) {
    const errorsStr = errors.join(', ')
    log.error(
      `${errorPrefix} - misses frontmatter: ${errorsStr}`.error)
    return false
  }
  const regEx = /^\w+$/ // one or more word characters:  [a-zA-Z0-9_]
  const invalidTags = []
  for (const tag of meta.tags) {
    if (!regEx.test(tag))
      invalidTags.push(tag)
  }
  if (invalidTags.length > 0) {
    log.error(`${errorPrefix} - has invalid tag(s): ${invalidTags.join(', ')}`.error)
  }
  return invalidTags.length === 0
}

async function scanDir(path, logMsg, skip) {
  log.info(`Scanning ${path} for ${logMsg} ...`.info)
  const filesNames = (await readDir(path)).filter(
    f => config.ignoreFiles.indexOf(f) < 0 &&
    (skip ? !skip.has(f) : true)
  )
  if (filesNames.length > 0) {
    log.info(`${filesNames.length} ${logMsg} found`.info)
  } else
    log.warn(`No ${logMsg} found`.warn)
  return filesNames  
}

function renderMarkdownAndUpdateDom(logPrefix, meta, elements) {
  log.info(`${logPrefix} - Injecting metadata ...`.info)
  elements.metaDescriptionElem.setAttribute('content', meta.description)
  elements.metaKeywordsElem.setAttribute('content', meta.tags.join(', '))
  elements.pageTitleElem.textContent = meta.title
  elements.titleElem.textContent = meta.title
  const postDateStr = typeof meta.date === 'string' ?
      meta.date : // for JSON frontmatter date is just a string
      meta.date.toISOString() // for YAML date is parsed as Date object
  elements.dateElem.setAttribute('datetime', postDateStr)
  elements.dateElem.textContent = postDateStr
  const tagsLinksArr = meta.tags.map(tag =>
    `<a href="../../${config.tagsPageDirPath}/?tags=${tag}"><span class="grey-text">&num;</span>${tag}</a>`)
  elements.tagsElem.innerHTML = tagsLinksArr.join(' ')
  log.info(`${logPrefix} - Rendering markdown and injecting HTML ...`.info)
  elements.bodyElem.innerHTML = marked(meta.__content)
}

function disableBtn(btnElem) {
  btnElem.setAttribute('href', '#')
  btnElem.setAttribute('onclick', 'event.preventDefault()')
  btnElem.classList.add('disabled')
}
function enableBtn(btnElem, hrefValue) {
  btnElem.setAttribute('href', hrefValue)
  btnElem.removeAttribute('onclick')
  btnElem.classList.remove('disabled')
}

function postMetaToSummaryHtml(postMeta, postHtmlFilePath, tagsPagePath) {
  const postDateStr = typeof postMeta.date === 'string' ?
    postMeta.date : // for JSON frontmatter date is just a string
    postMeta.date.toISOString() // for YAML date is parsed as Date object
  const postSummaryFrag = JSDOM.fragment(state.dom.postSummaryHtml)
  postSummaryFrag.querySelector('.post-link').setAttribute('href', postHtmlFilePath)
  postSummaryFrag.querySelector('.post-title').textContent = postMeta.title
  const postDateElem = postSummaryFrag.querySelector('.post-date')
  postDateElem.setAttribute('datetime', postDateStr)
  postDateElem.textContent = postDateStr
  postSummaryFrag.querySelector('.post-description').textContent = postMeta.description
  const tagsHtmlArr = postMeta.tags.map(tag =>
    `<a href="${tagsPagePath}/?tags=${tag}"><span class="grey-text">&num;</span>${tag}</a>`)
  postSummaryFrag.querySelector('.post-tags').innerHTML = tagsHtmlArr.join(' ')
  return postSummaryFrag
}

async function renderPages() {
  if (state.mdFileNameToMeta.size === 0)
    return
  
  const nbPages = Math.ceil(state.mdFileNameToMeta.size / config.postsPerPage)
  log.info(`Rendering ${nbPages} pages ...`.info)
  
  state.mdFileNameToMeta[Symbol.iterator] = function* () {
    yield* [...this.entries()].sort((a, b) =>
    new Date(b[1].date).getTime() - new Date(a[1].date).getTime())
  }

  const postsForCurrPageFragsArr = []
  let postIndexInPage = 0
  let i = 0

  del.sync([config.pagesDirPath])
  fs.mkdirSync(config.pagesDirPath)
  for (const [mdFileName, postMeta] of state.mdFileNameToMeta) {
    const currPage = Math.floor(i / config.postsPerPage) + 1
    const { elements, documentDom, postPath, tagsPagePath } = currPage === 1 ?
      {
        elements: state.dom.elementsMainPage,
        documentDom: state.dom.documentDomMainPage,
        postPath: `${config.htmlOutputDirPath}/${postMeta.name}`,
        tagsPagePath: `${config.tagsPageDirPath}`
      } :
      {
        elements: state.dom.elementsSecondaryPage,
        documentDom: state.dom.documentDomSecondaryPage,
        postPath: `../../${config.htmlOutputDirPath}/${postMeta.name}`,
        tagsPagePath: `../../${config.tagsPageDirPath}`
      }

    const postSummaryFrag = postMetaToSummaryHtml(postMeta, postPath, tagsPagePath)
    elements.postsSectionElem.append(postSummaryFrag)

    const pageCompleted =
      postIndexInPage+1 === config.postsPerPage || i+1 === state.mdFileNameToMeta.size
    if (pageCompleted) {
      if (currPage === 1)
        disableBtn(elements.btnNewerElem)
      else
        enableBtn(
          elements.btnNewerElem,
          currPage === 2 ? '../../' : `../../${config.pagesDirPath}/${currPage - 1}`)
      
      if (currPage === nbPages)
        disableBtn(elements.btnOlderElem)
      else
        enableBtn(
          elements.btnOlderElem,
          `${currPage > 1 ? '../../' : ''}${config.pagesDirPath}/${currPage + 1}`)
      
      let currPagePath = 'index.html'
      if (currPage > 1) {
        const currPageDir = `${config.pagesDirPath}/${currPage}`
        fs.mkdirSync(currPageDir)
        currPagePath = `${currPageDir}/${currPagePath}`
      }
      log.info(`Writing page ${currPage} to ${currPagePath} ...`.info)
      await writeFile(currPagePath, minify(documentDom.serialize(), config.minifyHtmlOpts))
      elements.postsSectionElem.textContent = ''
      postIndexInPage = 0
    } else {
      postIndexInPage++
    }
    i++
  }
}

async function writePostsNavInfoJson() {
  log.info(`Generating ${config.postNavJsonFileName} in each post folder ...`.info)
  const metaArr = [...state.mdFileNameToMeta.values()]//.sort((a, b) =>
    // new Date(b.date).getTime() - new Date(a.date).getTime())
  for (var i = 0; i < metaArr.length; i++) {
    const postNavInfo = {
      'olderPost': (i < metaArr.length-1 ?
        `../${metaArr[i+1].name}` :
        null),
      'newerPost': (i > 0 ? 
        `../${metaArr[i-1].name}` :
        null)
    }
    const postNavFilePath =
    `${config.htmlOutputDirPath}/${metaArr[i].name}/${config.postNavJsonFileName}`
    log.info(`Writing ${postNavFilePath} ...`.info)
    await writeFile(postNavFilePath, JSON.stringify(postNavInfo/*, null, 2*/))
  }
}

async function writePostsTagsJson() {
  log.info(`Generating tags json files in ${config.tagsJsonsDirPath} ...`.info)
  del.sync([config.tagsJsonsDirPath])
  fs.mkdirSync(config.tagsJsonsDirPath)
  const postMetasPerTag = new Map()
  for (const [mdFileName, postMeta] of state.mdFileNameToMeta) {
    for (const tag of postMeta.tags) {
      let tagMetasArr = postMetasPerTag.get(tag)
      if (!tagMetasArr)
        tagMetasArr = []
      tagMetasArr.push(postMeta)
      postMetasPerTag.set(tag, tagMetasArr)
    }
  }

  const postsTagsAndCountersArr = []
  for (const [tag, postMetasArr] of postMetasPerTag) {
    const tagJsonFileName = `${config.tagsJsonsDirPath}/${tag}.json`
    log.info(`Writing ${tagJsonFileName} ...`.info)
    await writeFile(tagJsonFileName, JSON.stringify(postMetasArr/*, null, 2*/))

    postsTagsAndCountersArr.push([tag, postMetasArr.length])
  }
  postsTagsAndCountersArr.sort((a, b) => b[1] - a[1])
  const allTagsJsonFileName = `${config.tagsJsonsDirPath}/all-tags.json`
  log.info(`Writing ${allTagsJsonFileName} ...`.info)
  await writeFile(allTagsJsonFileName, JSON.stringify(postsTagsAndCountersArr/*, null, 2*/))

  const postSummaryFrag = JSDOM.fragment(state.dom.postSummaryHtml)
  const postSummaryTemplateElem = postSummaryFrag.querySelector('.post-summary')
  state.dom.elementsTagsPage.postsSummaryTemplateSectionElem.append(postSummaryFrag)

  del.sync([config.tagsPageDirPath])
  fs.mkdirSync(config.tagsPageDirPath)
  const tagsPageFileName = `${config.tagsPageDirPath}/index.html`
  log.info(`Writing ${tagsPageFileName} ...`.info)
  writeFile(tagsPageFileName, minify(state.dom.documentDomTagsPage.serialize(), config.minifyHtmlOpts))
}

function computeAndLogTotalDuration(startedAt) {
  const took = process.hrtime(startedAt)
  const tookMs = Math.round(took[1]/1000000)
  return `${took[0]>0?took[0]+'s ':''}${tookMs}ms`
}

const state = {
  mdFileNameToMeta: new Map(),
  invalidMetaCounter: 0,
  mdFilesNames: [],
  mdFilesNamesRendered: [],
  dom: {},
  updateMeta: function(mdFileName, meta) {
    this.mdFileNameToMeta.set(mdFileName, {
      title: meta.title,
      date: meta.date,
      description: meta.description,
      tags: meta.tags,
      name: meta.name
    })
  },
  done: function() {
    const nbProcessed = this.mdFileNameToMeta.size + this.invalidMetaCounter
    const nbTotal = this.mdFilesNames.length + this.mdFilesNamesRendered.length
    return nbProcessed === nbTotal
  }
}

function prepareJsdom(headHtml, footerHtml, layoutHtml, homePath, cssPath, jsPath) {
  const documentDom = new JSDOM(layoutHtml)
  const document = documentDom.window.document
  const headElem = document.querySelector('head')
  const bodyElem = document.querySelector('body')
  const btnGoHomeElems = document.querySelector('.btn-go-home')
  
  headElem.append(JSDOM.fragment(headHtml))
  bodyElem.append(JSDOM.fragment(footerHtml))

  btnGoHomeElems.setAttribute('href', homePath)
  
  const cssLinkElem = document.createElement('link')
  cssLinkElem.setAttribute('rel', 'stylesheet')
  cssLinkElem.setAttribute('href', cssPath)
  headElem.append(cssLinkElem)

  const jsLinkElem = document.createElement('script')
  jsLinkElem.setAttribute('type', 'text/javascript')
  jsLinkElem.setAttribute('src', jsPath)
  bodyElem.append(jsLinkElem)

  return documentDom
}

async function prepareDom() {
  log.info(`Reading header and footer from ${config.templatesDirPath} folder ...`.info)
  
  const commonHeadHtml = await readFile(`${config.templatesDirPath}/common-head.tpl.html`, config.enc)
  const commonFooterHtml = await readFile(`${config.templatesDirPath}/common-footer.tpl.html`, config.enc)
  const postSummaryHtml = await readFile(`${config.templatesDirPath}/post-summary.tpl.html`, config.enc)
  
  const layoutMainPageHtml = await readFile(`${config.templatesDirPath}/layout-main-page.tpl.html`, config.enc)
  const layoutTagsPageHtml = await readFile(`${config.templatesDirPath}/layout-tags-page.tpl.html`, config.enc)
  const layoutPostPageHtml = await readFile(`${config.templatesDirPath}/layout-post-page.tpl.html`, config.enc)
  
  const documentDomMainPage = prepareJsdom(
    commonHeadHtml,
    commonFooterHtml,
    layoutMainPageHtml,
    '.',
    'bundle-main.min.css',
    'bundle-main.min.js')
  const documentMainPage = documentDomMainPage.window.document

  const documentDomSecondaryPage = prepareJsdom(
    commonHeadHtml,
    commonFooterHtml,
    layoutMainPageHtml,
    '../..',
    '../../bundle-main.min.css',
    '../../bundle-main.min.js')
  const documentSecondaryPage = documentDomSecondaryPage.window.document

  const documentDomTagsPage = prepareJsdom(
    commonHeadHtml,
    commonFooterHtml,
    layoutTagsPageHtml,
    '..',
    '../bundle-main.min.css',
    '../bundle-tags.min.js')
  const documentTagsPage = documentDomTagsPage.window.document
  
  const documentDomPostPage = prepareJsdom(
    commonHeadHtml,
    commonFooterHtml,
    layoutPostPageHtml,
    '../..',
    '../../bundle-post.min.css',
    '../../bundle-post.min.js')
  const documentPostPage = documentDomPostPage.window.document
  
  state.dom = { 
    documentDomMainPage: documentDomMainPage,
    elementsMainPage: {
      postsSectionElem: documentMainPage.querySelector("#posts"),
      btnOlderElem: documentMainPage.querySelector("#btn-older"),
      btnNewerElem: documentMainPage.querySelector("#btn-newer")
    },
    documentDomSecondaryPage: documentDomSecondaryPage,
    elementsSecondaryPage: {
      postsSectionElem: documentSecondaryPage.querySelector("#posts"),
      btnOlderElem: documentSecondaryPage.querySelector("#btn-older"),
      btnNewerElem: documentSecondaryPage.querySelector("#btn-newer")
    },
    documentDomTagsPage: documentDomTagsPage,
    elementsTagsPage: {
      postsSummaryTemplateSectionElem: documentTagsPage.querySelector("#post-summary-template-section"),
    },
    postSummaryHtml: postSummaryHtml,
    documentDomPostPage: documentDomPostPage,
    elementsPostPage: {
      metaDescriptionElem: documentPostPage.querySelector("meta[name='description']"),
      metaKeywordsElem: documentPostPage.querySelector("meta[name='keywords']"),
      pageTitleElem: documentPostPage.querySelector("title"),
      titleElem: documentPostPage.querySelector("#post-title"),
      dateElem: documentPostPage.querySelector('#post-date'),
      bodyElem: documentPostPage.querySelector('#post-body'),
      tagsElem: documentPostPage.querySelector('#tags-container')
    }
  }
}

async function renderPost(mdFileName) {
  log.info(`${mdFileName} - Reading file ...`.info)
  const mdFilePath = `${config.toRenderDirPath}/${mdFileName}`
  const mdContentAndMeta = await readFile(mdFilePath, config.enc)
  log.info(`${mdFileName} - Parsing frontmatter ...`.info)
  const meta = frontmatter.loadFront(mdContentAndMeta)
  if (!validateFrontmatter(meta, `${mdFileName} - Skipped`)) {
    state.invalidMetaCounter++
  } else {
    renderMarkdownAndUpdateDom(mdFileName, meta, state.dom.elementsPostPage)
    const htmlContent = minify(state.dom.documentDomPostPage.serialize(), config.minifyHtmlOpts)
    meta.name = mdFileName.substr(0, mdFileName.lastIndexOf('.'))

    const postOutputDirPath = `${config.htmlOutputDirPath}/${meta.name}`
    if (!fs.existsSync(postOutputDirPath))
      fs.mkdirSync(postOutputDirPath)
    const postOutputFilePath = `${postOutputDirPath}/index.html`
    log.info(`${mdFileName} - Writing to ${postOutputFilePath} ...`.info)
    await writeFile(postOutputFilePath, htmlContent)
    const renderedMdFilePath = `${config.renderedDirPath}/${mdFileName}`
    log.info(`${mdFileName} - Moving to ${config.renderedDirPath} ...`.info)
    await renameFile(mdFilePath, renderedMdFilePath)
    state.updateMeta(mdFileName, meta)
  }
}

async function updateStateMetaFromRenderedFile(mdFileNameRendered) {
  const mdFilePathRendered = `${config.renderedDirPath}/${mdFileNameRendered}`
  const mdContentAndMetaRendered = await readFile(mdFilePathRendered, config.enc)
  log.info(`${mdFileNameRendered} - Parsing frontmatter ...`.info)
  const metaRendered = frontmatter.loadFront(mdContentAndMetaRendered)
  if (!validateFrontmatter(metaRendered, `${mdFileNameRendered} - Skipped`)) {
    state.invalidMetaCounter++
  } else {
    metaRendered.name = mdFileNameRendered.substr(0, mdFileNameRendered.lastIndexOf('.'))
    state.updateMeta(mdFileNameRendered, metaRendered)
  }
}

async function scanForUnlinkedPosts() {
  const postsNames = new Map(
    [...state.mdFileNameToMeta].map(([mdFileName, v]) => 
      [mdFileName.substr(0, mdFileName.lastIndexOf('.')), 0])
  )
  let tagsJsonsDirName = config.tagsJsonsDirPath.split('/')
  tagsJsonsDirName = tagsJsonsDirName[tagsJsonsDirName.length - 1]
  postsNames.set(tagsJsonsDirName, 1)
  const unlinkedHtmlFiles =
    await scanDir(config.htmlOutputDirPath, 'unlinked post(s)', postsNames)
  if (unlinkedHtmlFiles.length > 0)
    log.warn(
      `Unlinked post(s) in ${config.htmlOutputDirPath} folder:\n%s\n`.warn +
      `You should probably delete ${unlinkedHtmlFiles.length > 1 ? 'them' : 'it'}`.warn,
      JSON.stringify(unlinkedHtmlFiles, null, 2))
}

async function finish(startedAt) {
  await renderPages()
  await writePostsNavInfoJson()
  await writePostsTagsJson()
  await scanForUnlinkedPosts()
  const took = computeAndLogTotalDuration(startedAt)
  
  const nbMeta = state.mdFileNameToMeta.size
  const nbInvalidMeta = state.invalidMetaCounter
  const nbToRender = state.mdFilesNames.length
  const nbAlreadyRendered = state.mdFilesNamesRendered.length
  const nbTotal = nbToRender + nbAlreadyRendered
  // we do not use log here as this has to be independent of log.level
  console.info(
    '===> Summary:\n'.info +
    `${nbTotal} files found in total (= ${nbToRender} to render + `.info +
    `${nbAlreadyRendered} already rendered) of which:\n`.info +
    `${nbMeta} files successfully processed\n`.info +
    (nbInvalidMeta > 0 ? `${nbInvalidMeta} skipped: missing frontmatter\n`.error : '') +
    '<===\n'.info +
    `DONE in ${took}`.info
  )
}

const render = async () => {
  try {
    const startedAt = process.hrtime()
    state.mdFilesNames = await scanDir(config.toRenderDirPath, 'md file(s) to render')
    if (state.mdFilesNames.length === 0)
      return
    await prepareDom()
    state.mdFilesNames.forEach(async mdFileName => {
      try {
        await renderPost(mdFileName)
        if (state.done()) {
          state.mdFilesNamesRendered = await scanDir(
            config.renderedDirPath, 'previously rendered md file(s)', state.mdFileNameToMeta)
          if (state.mdFilesNamesRendered.length > 0) {
            state.mdFilesNamesRendered.forEach(async mdFileNameRendered => {
              try {
                await updateStateMetaFromRenderedFile(mdFileNameRendered)
                if (state.done())
                  await finish(startedAt)
              } catch (e) {
                log.error(`${mdFileNameRendered} - FAILED to read!`.error, e)
              }
            })
          } else
            await finish(startedAt)
        }
      } catch (e) {
        log.error(`${mdFileName} FAILED!`.error, e)
      }
    })
  } catch (e) {
    log.error(`FAILED!`.error, e)
  }
}

async function createBenchmarkMds(sourceMdFilePath, nbCopies) {
  const sourceMdFilePathArr = sourceMdFilePath.split('/')
  const sourceMdFileName = sourceMdFilePathArr[sourceMdFilePathArr.length-1]
  const lastIndexOfDot = sourceMdFileName.lastIndexOf('.')
  const sourceMdFileNameNoExt = sourceMdFileName.substr(0, lastIndexOfDot)
  for (var i = 0; i < nbCopies; i++) {
    const newSourceMdFilePath = `${config.toRenderDirPath}/${sourceMdFileNameNoExt}-${i+1}.md`
    fs.createReadStream(sourceMdFilePath).pipe(fs.createWriteStream(newSourceMdFilePath))
  }
}

// createBenchmarkMds('_src/_posts/_rendered/second-post.md', 3000)
render()
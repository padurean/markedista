const fs = require('fs')
const log = require('loglevel')
log.setLevel(log.levels.WARN/*DEBUG*/)
const marked = require('marked')
const frontmatter = require('yaml-front-matter')
const jsdom = require('jsdom')
const { JSDOM } = jsdom
const minify = require('html-minifier').minify
const del = require('del')
const Feed = require('feed')
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
  rssFeedDirPath: 'feed',
  rssFileName: 'rss.xml',
  imagesDirPath: 'images',
  enc: 'utf8',
  ignoreFiles: [ '.gitkeep' ],
  postsPerPage: 2,
  minifyHtmlOpts: {
    removeComments: true,
    collapseWhitespace: true
  },
  // !make sure it has the trailing slash /
  baseUrl: 'https://padurean.github.io/markedista/'
}

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

function scanDir(path, logMsg, skip) {
  log.info(`Scanning ${path} for ${logMsg} ...`.info)
  const filesNames = fs.readdirSync(path).filter(
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

  elements.socialMeta.ogTitleElem.setAttribute('content', meta.title)
  elements.socialMeta.twitterTitleElem.setAttribute('content', meta.title)
  elements.socialMeta.ogDescriptionElem.setAttribute('content', meta.description)
  elements.socialMeta.twitterDescriptionElem.setAttribute('content', meta.description)

  const thumbnailUrl = meta.thumbnail ?
    `${config.baseUrl}${meta.thumbnail}` :
    `${config.baseUrl}${config.imagesDirPath}/markedista-logotype.png`
  elements.socialMeta.ogImageElem.setAttribute('content', thumbnailUrl)
  elements.socialMeta.ogImageSecureUrlElem.setAttribute('content', thumbnailUrl)
  elements.socialMeta.twitterImageElem.setAttribute('content', thumbnailUrl)

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
  const siteUrlForFbComments = !meta.gallery ?
    state.dom.siteUrlForFbComments :
    state.dom.siteUrlForFbCommentsPostPageWithGallery
  elements.fbCommentsElem.setAttribute(
    'data-href', `${siteUrlForFbComments}${config.htmlOutputDirPath}/${meta.name}/`)
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

function renderPages() {
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
      fs.writeFileSync(currPagePath, minify(documentDom.serialize(), config.minifyHtmlOpts))
      elements.postsSectionElem.textContent = ''
      postIndexInPage = 0
    } else {
      postIndexInPage++
    }
    i++
  }
}

function generatePostsNavInfoJson() {
  log.info(`Generating ${config.postNavJsonFileName} in each post folder ...`.info)
  const metaArr = [...state.mdFileNameToMeta.values()].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime())
  for (var i = 0; i < metaArr.length; i++) {
    const postNavInfo = {
      'olderPost': (i < metaArr.length-1 ?
        `${metaArr[i+1].name}` :
        null),
      'newerPost': (i > 0 ? 
        `${metaArr[i-1].name}` :
        null)
    }
    const postNavFilePath =
    `${config.htmlOutputDirPath}/${metaArr[i].name}/${config.postNavJsonFileName}`
    log.info(`Writing ${postNavFilePath} ...`.info)
    fs.writeFileSync(postNavFilePath, JSON.stringify(postNavInfo/*, null, 2*/))
  }
}

function generatePostsTagsJson() {
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
    fs.writeFileSync(tagJsonFileName, JSON.stringify(postMetasArr/*, null, 2*/))

    postsTagsAndCountersArr.push([tag, postMetasArr.length])
  }
  postsTagsAndCountersArr.sort((a, b) => b[1] - a[1])
  const allTagsJsonFileName = `${config.tagsJsonsDirPath}/all-tags.json`
  log.info(`Writing ${allTagsJsonFileName} ...`.info)
  fs.writeFileSync(allTagsJsonFileName, JSON.stringify(postsTagsAndCountersArr/*, null, 2*/))

  const postSummaryFrag = JSDOM.fragment(state.dom.postSummaryHtml)
  const postSummaryTemplateElem = postSummaryFrag.querySelector('.post-summary')
  state.dom.elementsTagsPage.postsSummaryTemplateSectionElem.append(postSummaryFrag)

  del.sync([config.tagsPageDirPath])
  fs.mkdirSync(config.tagsPageDirPath)
  const tagsPageFileName = `${config.tagsPageDirPath}/index.html`
  log.info(`Writing ${tagsPageFileName} ...`.info)
  fs.writeFileSync(tagsPageFileName, minify(state.dom.documentDomTagsPage.serialize(), config.minifyHtmlOpts))
}

function generateRssFeed() {
  log.info(`Generating feed in ${config.rssFeedDirPath} ...`.info)
  const now = new Date()
  const author = {
    name: 'Valentin Padurean',
    email: 'padureanvalentin@yahoo.com',
    link: 'https://github.com/padurean'
  }
  const feed = new Feed({
    title: 'Markedista',
    description: 'Static Blog Generator based on npm, marked and jsdom',
    id: config.baseUrl,
    link: config.baseUrl,
    image: `${config.baseUrl}${config.imagesDirPath}/markedista-logotype.png`,
    favicon: `${config.baseUrl}favicon.ico`,
    copyright: `${now.getFullYear()}, Valentin Padurean`,
    updated: now, // optional, default = today
    generator: 'Markedista', // optional, default = 'Feed for Node.js'
    feedLinks: {
      atom: `${config.baseUrl}${config.rssFeedDirPath}/${config.rssFileName}`,
    },
    author: author
  })
  feed.addCategory('Static Blog Generator')
  feed.addCategory('Markdown')
  for (const [mdFileName, postMeta] of state.mdFileNameToMeta) {
    const feedItem = {
      title: postMeta.title,
      id: postMeta.name,
      link: `${config.baseUrl}${config.htmlOutputDirPath}/${postMeta.name}/`,
      description: postMeta.description,
      content: postMeta.description,
      date: new Date(postMeta.date),
      // image: postMeta.image,
      author: [author]
    }
    if (postMeta.thumbnail)
      feedItem.image = `${config.baseUrl}${postMeta.thumbnail}`
    feed.addItem(feedItem)
  }
  if (!fs.existsSync(config.rssFeedDirPath))
    fs.mkdirSync(config.rssFeedDirPath)
  const feedFilePath = `${config.rssFeedDirPath}/${config.rssFileName}`
  log.info(`Writing ${feedFilePath} ...`.info)
  fs.writeFileSync(feedFilePath, feed.rss2())
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
      name: meta.name,
      gallery: meta.gallery,
      thumbnail: meta.thumbnail
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
  headElem.append(JSDOM.fragment(headHtml))
  bodyElem.append(JSDOM.fragment(footerHtml))

  const titleElem = document.querySelector('title')
  const title = titleElem.textContent
  const descriptionElem = document.querySelector('meta[name="description"]')
  const description = descriptionElem.getAttribute('content')
  const btnGoHomeElems = document.querySelector('.btn-go-home')

  const ogTitleElem = document.createElement('meta')
  ogTitleElem.setAttribute('name', 'og:title')
  ogTitleElem.setAttribute('content', title)
  headElem.append(ogTitleElem)
  const twitterTitleElem = document.createElement('meta')
  twitterTitleElem.setAttribute('name', 'twitter:title')
  twitterTitleElem.setAttribute('content', title)
  headElem.append(twitterTitleElem)

  const ogDescriptionElem = document.createElement('meta')
  ogDescriptionElem.setAttribute('name', 'og:description')
  ogDescriptionElem.setAttribute('content', description)
  headElem.append(ogDescriptionElem)
  const twitterDescriptionElem = document.createElement('meta')
  twitterDescriptionElem.setAttribute('name', 'twitter:description')
  twitterDescriptionElem.setAttribute('content', description)
  headElem.append(twitterDescriptionElem)

  const logotypeImageUrl =
    `${config.baseUrl}${config.imagesDirPath}/markedista-logotype.png`
  const ogImageElem = document.createElement('meta')
  ogImageElem.setAttribute('name', 'og:image')
  ogImageElem.setAttribute('content', logotypeImageUrl)
  headElem.append(ogImageElem)
  const ogImageElemSecureUrl = document.createElement('meta')
  ogImageElemSecureUrl.setAttribute('name', 'og:image:secure_url')
  ogImageElemSecureUrl.setAttribute('content', logotypeImageUrl)
  headElem.append(ogImageElemSecureUrl)
  const twitterImageElem = document.createElement('meta')
  twitterImageElem.setAttribute('name', 'twitter:image')
  twitterImageElem.setAttribute('content', logotypeImageUrl)
  headElem.append(twitterImageElem)

  const faviconLinkElem = document.createElement('link')
  faviconLinkElem.setAttribute('rel', 'shortcut icon')
  faviconLinkElem.setAttribute('href', `${homePath}/favicon.ico`)
  headElem.append(faviconLinkElem)

  const feedUrl = `${config.baseUrl}${config.rssFeedDirPath}/${config.rssFileName}`
  const rssLinkElem = document.createElement('link')
  rssLinkElem.setAttribute('rel', 'alternate')
  rssLinkElem.setAttribute('type', 'application/rss+xml')
  rssLinkElem.setAttribute('title', title)
  rssLinkElem.setAttribute('href', feedUrl)
  headElem.append(rssLinkElem)

  const cssLinkElem = document.createElement('link')
  cssLinkElem.setAttribute('rel', 'stylesheet')
  cssLinkElem.setAttribute('href', cssPath)
  headElem.append(cssLinkElem)

  const jsLinkElem = document.createElement('script')
  jsLinkElem.setAttribute('type', 'text/javascript')
  jsLinkElem.setAttribute('src', jsPath)
  bodyElem.append(jsLinkElem)

  btnGoHomeElems.setAttribute('href', homePath)

  const subscribeViaRss = 'Subscribe via RSS'
  const rssAnchorImgElem = document.createElement('img')
  rssAnchorImgElem.setAttribute('src', `${homePath}/${config.imagesDirPath}/rss.svg`)
  rssAnchorImgElem.setAttribute('alt', subscribeViaRss)
  const rssAnchorElem = document.createElement('a')
  rssAnchorElem.setAttribute('rel', 'alternate')
  rssAnchorElem.setAttribute('type', 'application/rss+xml')
  rssAnchorElem.setAttribute('href', feedUrl)
  rssAnchorElem.setAttribute('class', 'subscribe-via-rss')
  rssAnchorElem.setAttribute('title', subscribeViaRss)
  rssAnchorElem.append(rssAnchorImgElem)
  const footerElem = document.querySelector('footer')
  footerElem.append(rssAnchorElem)

  return documentDom
}

function prepareDom() {
  log.info(`Reading header and footer from ${config.templatesDirPath} folder ...`.info)
  
  const commonHeadHtml = fs.readFileSync(`${config.templatesDirPath}/common-head.tpl.html`, config.enc)
  const commonFooterHtml = fs.readFileSync(`${config.templatesDirPath}/common-footer.tpl.html`, config.enc)
  const postSummaryHtml = fs.readFileSync(`${config.templatesDirPath}/post-summary.tpl.html`, config.enc)
  
  const layoutMainPageHtml = fs.readFileSync(`${config.templatesDirPath}/layout-main-page.tpl.html`, config.enc)
  const layoutTagsPageHtml = fs.readFileSync(`${config.templatesDirPath}/layout-tags-page.tpl.html`, config.enc)
  const layoutPostPageHtml = fs.readFileSync(`${config.templatesDirPath}/layout-post-page.tpl.html`, config.enc)
  
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
  const fbCommentsElem = documentPostPage.querySelector('.fb-comments')
  let siteUrlForFbComments = fbCommentsElem.getAttribute('data-href')
  siteUrlForFbComments += (siteUrlForFbComments.endsWith('/') ? '' : '/')

  const documentDomPostPageWithGallery = prepareJsdom(
    commonHeadHtml,
    commonFooterHtml,
    layoutPostPageHtml,
    '../..',
    '../../bundle-post-with-gallery.min.css',
    '../../bundle-post-with-gallery.min.js')
  const documentPostPageWithGallery = documentDomPostPageWithGallery.window.document
  const fbCommentsElemPostPageWithGallery = documentPostPageWithGallery.querySelector('.fb-comments')
  let siteUrlForFbCommentsPostPageWithGallery = fbCommentsElemPostPageWithGallery.getAttribute('data-href')
  siteUrlForFbCommentsPostPageWithGallery += (siteUrlForFbCommentsPostPageWithGallery.endsWith('/') ? '' : '/')
  
  state.dom = { 
    documentDomMainPage: documentDomMainPage,
    elementsMainPage: {
      postsSectionElem: documentMainPage.querySelector('#posts'),
      btnOlderElem: documentMainPage.querySelector('#btn-older'),
      btnNewerElem: documentMainPage.querySelector('#btn-newer')
    },

    documentDomSecondaryPage: documentDomSecondaryPage,
    elementsSecondaryPage: {
      postsSectionElem: documentSecondaryPage.querySelector('#posts'),
      btnOlderElem: documentSecondaryPage.querySelector('#btn-older'),
      btnNewerElem: documentSecondaryPage.querySelector('#btn-newer')
    },

    documentDomTagsPage: documentDomTagsPage,
    elementsTagsPage: {
      postsSummaryTemplateSectionElem: documentTagsPage.querySelector('#post-summary-template-section'),
    },

    postSummaryHtml: postSummaryHtml,
    
    documentDomPostPage: documentDomPostPage,
    siteUrlForFbComments: siteUrlForFbComments,
    elementsPostPage: {
      metaDescriptionElem: documentPostPage.querySelector('meta[name="description"]'),
      metaKeywordsElem: documentPostPage.querySelector('meta[name="keywords"]'),
      socialMeta: {
        ogTitleElem: documentPostPage.querySelector('meta[name="og:title"]'),
        twitterTitleElem: documentPostPage.querySelector('meta[name="twitter:title"]'),
        ogDescriptionElem: documentPostPage.querySelector('meta[name="og:description"]'),
        twitterDescriptionElem: documentPostPage.querySelector('meta[name="twitter:description"]'),
        ogImageElem: documentPostPage.querySelector('meta[name="og:image"]'),
        ogImageSecureUrlElem: documentPostPage.querySelector('meta[name="og:image:secure_url"]'),
        twitterImageElem: documentPostPage.querySelector('meta[name="twitter:image"]')
      },
      pageTitleElem: documentPostPage.querySelector('title'),
      titleElem: documentPostPage.querySelector('#post-title'),
      dateElem: documentPostPage.querySelector('#post-date'),
      bodyElem: documentPostPage.querySelector('#post-body'),
      tagsElem: documentPostPage.querySelector('#tags-container'),
      fbCommentsElem: fbCommentsElem
    },

    documentDomPostPageWithGallery: documentDomPostPageWithGallery,
    siteUrlForFbCommentsPostPageWithGallery: siteUrlForFbCommentsPostPageWithGallery,
    elementsPostPageWithGallery: {
      metaDescriptionElem: documentPostPageWithGallery.querySelector('meta[name="description"]'),
      metaKeywordsElem: documentPostPageWithGallery.querySelector('meta[name="keywords"]'),
      socialMeta: {
        ogTitleElem: documentPostPageWithGallery.querySelector('meta[name="og:title"]'),
        twitterTitleElem: documentPostPageWithGallery.querySelector('meta[name="twitter:title"]'),
        ogDescriptionElem: documentPostPageWithGallery.querySelector('meta[name="og:description"]'),
        twitterDescriptionElem: documentPostPageWithGallery.querySelector('meta[name="twitter:description"]'),
        ogImageElem: documentPostPageWithGallery.querySelector('meta[name="og:image"]'),
        ogImageSecureUrlElem: documentPostPageWithGallery.querySelector('meta[name="og:image:secure_url"]'),
        twitterImageElem: documentPostPageWithGallery.querySelector('meta[name="twitter:image"]')
      },
      pageTitleElem: documentPostPageWithGallery.querySelector('title'),
      titleElem: documentPostPageWithGallery.querySelector('#post-title'),
      dateElem: documentPostPageWithGallery.querySelector('#post-date'),
      bodyElem: documentPostPageWithGallery.querySelector('#post-body'),
      tagsElem: documentPostPageWithGallery.querySelector('#tags-container'),
      fbCommentsElem: fbCommentsElemPostPageWithGallery
    }
  }
}

function renderPost(mdFileName) {
  log.info(`${mdFileName} - Reading file ...`.info)
  const mdFilePath = `${config.toRenderDirPath}/${mdFileName}`
  const mdContentAndMeta = fs.readFileSync(mdFilePath, config.enc)
  log.info(`${mdFileName} - Parsing frontmatter ...`.info)
  const meta = frontmatter.loadFront(mdContentAndMeta)
  if (!validateFrontmatter(meta, `${mdFileName} - Skipped`)) {
    state.invalidMetaCounter++
  } else {
    meta.name = mdFileName.substr(0, mdFileName.lastIndexOf('.'))
    renderMarkdownAndUpdateDom(
      mdFileName,
      meta,
      !meta.gallery ?
        state.dom.elementsPostPage :
        state.dom.elementsPostPageWithGallery
    )
    const htmlContent = minify(
      !meta.gallery ?
        state.dom.documentDomPostPage.serialize() :
        state.dom.documentDomPostPageWithGallery.serialize(),
      config.minifyHtmlOpts
    )

    const postOutputDirPath = `${config.htmlOutputDirPath}/${meta.name}`
    if (!fs.existsSync(postOutputDirPath))
      fs.mkdirSync(postOutputDirPath)
    const postOutputFilePath = `${postOutputDirPath}/index.html`
    log.info(`${mdFileName} - Writing to ${postOutputFilePath} ...`.info)
    fs.writeFileSync(postOutputFilePath, htmlContent)
    const renderedMdFilePath = `${config.renderedDirPath}/${mdFileName}`
    log.info(`${mdFileName} - Moving to ${config.renderedDirPath} ...`.info)
    fs.renameSync(mdFilePath, renderedMdFilePath)
    state.updateMeta(mdFileName, meta)
  }
}

function updateStateMetaFromRenderedFile(mdFileNameRendered) {
  const mdFilePathRendered = `${config.renderedDirPath}/${mdFileNameRendered}`
  const mdContentAndMetaRendered = fs.readFileSync(mdFilePathRendered, config.enc)
  log.info(`${mdFileNameRendered} - Parsing frontmatter ...`.info)
  const metaRendered = frontmatter.loadFront(mdContentAndMetaRendered)
  if (!validateFrontmatter(metaRendered, `${mdFileNameRendered} - Skipped`)) {
    state.invalidMetaCounter++
  } else {
    metaRendered.name = mdFileNameRendered.substr(0, mdFileNameRendered.lastIndexOf('.'))
    state.updateMeta(mdFileNameRendered, metaRendered)
  }
}

function scanAndLogUnlinkedPosts() {
  const postsNames = new Map(
    [...state.mdFileNameToMeta].map(([mdFileName, v]) => 
      [mdFileName.substr(0, mdFileName.lastIndexOf('.')), 0])
  )
  let tagsJsonsDirName = config.tagsJsonsDirPath.split('/')
  tagsJsonsDirName = tagsJsonsDirName[tagsJsonsDirName.length - 1]
  postsNames.set(tagsJsonsDirName, 1)
  const unlinkedHtmlFiles =
    scanDir(config.htmlOutputDirPath, 'unlinked post(s)', postsNames)
  if (unlinkedHtmlFiles.length > 0)
    log.warn(
      `Unlinked post(s) in ${config.htmlOutputDirPath} folder:\n%s\n`.warn +
      `You should probably delete ${unlinkedHtmlFiles.length > 1 ? 'them' : 'it'}`.warn,
      JSON.stringify(unlinkedHtmlFiles, null, 2))
}

function finish(startedAt) {
  renderPages()
  generatePostsNavInfoJson()
  generatePostsTagsJson()
  generateRssFeed()
  scanAndLogUnlinkedPosts()
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

const render = () => {
  try {
    const startedAt = process.hrtime()
    state.mdFilesNames = scanDir(config.toRenderDirPath, 'md file(s) to render')
    if (state.mdFilesNames.length === 0)
      return
    prepareDom()
    state.mdFilesNames.forEach(mdFileName => {
      try {
        renderPost(mdFileName)
        if (state.done()) {
          state.mdFilesNamesRendered = scanDir(
            config.renderedDirPath, 'previously rendered md file(s)', state.mdFileNameToMeta)
          if (state.mdFilesNamesRendered.length > 0) {
            state.mdFilesNamesRendered.forEach(mdFileNameRendered => {
              try {
                updateStateMetaFromRenderedFile(mdFileNameRendered)
                if (state.done())
                  finish(startedAt)
              } catch (e) {
                log.error(`${mdFileNameRendered} - FAILED to read!`.error, e)
              }
            })
          } else
            finish(startedAt)
        }
      } catch (e) {
        log.error(`${mdFileName} FAILED!`.error, e)
      }
    })
  } catch (e) {
    log.error(`FAILED!`.error, e)
  }
}

function createBenchmarkMds(sourceMdFilePath, nbCopies) {
  const sourceMdFilePathArr = sourceMdFilePath.split('/')
  const sourceMdFileName = sourceMdFilePathArr[sourceMdFilePathArr.length-1]
  const lastIndexOfDot = sourceMdFileName.lastIndexOf('.')
  const sourceMdFileNameNoExt = sourceMdFileName.substr(0, lastIndexOfDot)
  const sourceMd = fs.readFileSync(sourceMdFilePath, config.enc)
  for (let i = 0; i < nbCopies; i++) {
    const newSourceMdFilePath = `${config.toRenderDirPath}/${sourceMdFileNameNoExt}-${i+1}.md`
    fs.writeFileSync(newSourceMdFilePath, sourceMd)
  }
}

// createBenchmarkMds('_src/_posts/_to-render/seed-post.md', 4999)
render()
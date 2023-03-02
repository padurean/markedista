import { default as fs } from 'fs'
import { default as log } from'loglevel'
log.setLevel(log.levels.WARN/*DEBUG*/)

import { marked } from 'marked'
const renderer = {
  // override checkbox rendering
  checkbox(checked) {
    return `<input type="checkbox" ${checked ? 'checked' : ''}>`;
  }
};
marked.use({ renderer });

import { default as frontmatter } from 'yaml-front-matter'
import { default as jsdom } from 'jsdom'
const { JSDOM } = jsdom
import { minify } from 'html-minifier'
import { deleteSync as del } from 'del'
import { default as Feed } from 'pfeed'
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
  // channel categories used when generating the site feed xml
  siteCategories: ['Tech', 'Static Blog Generator', 'Markdown'],
  imagesDirPath: 'images',
  logoImgFileName: 'markedista-logotype.png',
  enc: 'utf8',
  ignoreFiles: ['.gitkeep'],
  postsPerPage: 3,
  minifyHtmlOpts: {
    removeComments: true,
    collapseWhitespace: true
  },
  // !make sure it has the trailing slash /
  baseUrl: 'https://padurean.github.io/markedista/',
  social: {
    twitter: 'vpadure',
    facebook: 'vpadurean',
    github: 'padurean',
    linkedin: 'vpadure'
  },
  cssFiles: {
    main: { name: 'bundle-main.min.css', version: 1 },
    post: { name: 'bundle-post.min.css', version: 1 },
    postWithGallery: { name: 'bundle-post-with-gallery.min.css', version: 1 }
  },
  jsFiles: {
    main: { name: 'bundle-main.min.js', version: 1 },
    tags: { name: 'bundle-tags.min.js', version: 1 },
    post: { name: 'bundle-post.min.js', version: 1 },
    postWithGallery: { name: 'bundle-post-with-gallery.min.js', version: 1 }
  }
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

function renderMarkdownAndUpdateDom(logPrefix, meta, document, elements) {
  log.info(`${logPrefix} - Injecting metadata ...`.info)
  elements.metaDescriptionElem.setAttribute('content', meta.description)
  elements.metaKeywordsElem.setAttribute('content', meta.tags.join(', '))

  const canonicalUrl = `${config.baseUrl}${config.htmlOutputDirPath}/${meta.name}/`
  elements.socialMeta.canonicalUrlElem.setAttribute('href', canonicalUrl)
  elements.socialMeta.ogUrlElem.setAttribute('content', canonicalUrl)
  elements.socialMeta.ogTitleElem.setAttribute('content', meta.title)
  elements.socialMeta.twitterTitleElem.setAttribute('content', meta.title)
  elements.socialMeta.ogDescriptionElem.setAttribute('content', meta.description)
  elements.socialMeta.twitterDescriptionElem.setAttribute('content', meta.description)

  const thumbnailUrl = meta.thumbnailUrl ||
    `${config.baseUrl}${config.imagesDirPath}/${config.logoImgFileName}`
  elements.socialMeta.ogImageElem.setAttribute('content', thumbnailUrl)
  elements.socialMeta.ogImageSecureUrlElem.setAttribute('content', thumbnailUrl)
  elements.socialMeta.twitterImageElem.setAttribute('content', thumbnailUrl)

  const oldArticleTagElems = elements.headElem.querySelectorAll('meta[property="article:tag"]')
  oldArticleTagElems.forEach(el => el.remove())
  const faviconLinkElem = elements.headElem.querySelector('link[rel="shortcut icon"]')
  for (const tag of meta.tags) {
    const metaArticleTagElem = document.createElement('meta')
    metaArticleTagElem.setAttribute('property', 'article:tag')
    metaArticleTagElem.setAttribute('content', tag)
    elements.headElem.insertBefore(metaArticleTagElem, faviconLinkElem)
  }

  if (meta.thumbnail) {
    elements.postThumbnailElem.setAttribute(
      'src',
      meta.thumbnail.indexOf('http') === 0 ?
        meta.thumbnail :
        `../../${meta.thumbnail}`)
    elements.postThumbnailElem.classList.remove('hidden')
  } else {
    elements.postThumbnailElem.setAttribute('src', '')
    elements.postThumbnailElem.classList.add('hidden')
  }

  if (meta.cover) {
    elements.postCoverElem.setAttribute(
      'src',
      meta.cover.indexOf('http') === 0 ?
        meta.cover :
        `../../${meta.cover}`)
    elements.postCoverElem.classList.remove('hidden')
  } else {
    elements.postCoverElem.setAttribute('src', '')
    elements.postCoverElem.classList.add('hidden')
  }

  elements.pageTitleElem.textContent = meta.title
  elements.titleElem.textContent = meta.title
  const postDateStr = typeof meta.date === 'string' ?
    meta.date : // for JSON frontmatter date is just a string
    meta.date.toISOString() // for YAML date is parsed as Date object
  elements.dateElem.setAttribute('datetime', postDateStr)
  elements.dateElem.textContent = postDateStr

  const titleUrlSafe = encodeURIComponent('\n' + meta.title + '\n')
  const tagsUrlSafe = encodeURIComponent(meta.tags.join(','))
  const twitterShareUrl =
    `https://twitter.com/share?url=${canonicalUrl}&text=${titleUrlSafe}&hashtags=${tagsUrlSafe}`
  const facebookShareUrl =
    `https://www.facebook.com/sharer.php?u=${canonicalUrl}`
  const linkedinShareUrl =
    `https://www.linkedin.com/shareArticle?mini=true&url=${canonicalUrl}`
  elements.shareBtns.twitter.setAttribute('href', twitterShareUrl)
  elements.shareBtns.facebook.setAttribute('href', facebookShareUrl)
  elements.shareBtns.linkedin.setAttribute('href', linkedinShareUrl)

  const tagsLinksArr = meta.tags.map(tag =>
    `<a href="../../${config.tagsPageDirPath}/?tags=${tag}"><span class="grey-text">&num;</span>${tag}</a>`)
  elements.tagsElem.innerHTML = tagsLinksArr.join(' ')
  elements.tagsInputElem.setAttribute('value', meta.tags.join(','))
  elements.postIdInputElem.setAttribute('value', meta.name)
  log.info(`${logPrefix} - Rendering markdown and injecting HTML ...`.info)
  elements.bodyElem.innerHTML = marked.parse(meta.__content)
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

function postMetaToSummaryHtml(postMeta, homePath, postHtmlFilePath, tagsPagePath) {
  const postDateStr = typeof postMeta.date === 'string' ?
    postMeta.date : // for JSON frontmatter date is just a string
    postMeta.date.toISOString() // for YAML date is parsed as Date object
  const postSummaryFrag = JSDOM.fragment(state.dom.postSummaryHtml)

  postSummaryFrag.querySelectorAll('.post-link').forEach(function (postLinkElem) {
    postLinkElem.setAttribute('href', postHtmlFilePath)
  });
  postSummaryFrag.querySelector('.post-read-more').setAttribute('href', postHtmlFilePath)

  const postThumbnailElem = postSummaryFrag.querySelector('.post-thumbnail')
  if (postMeta.thumbnail) {
    const thumbnailUrlOrPath = postMeta.thumbnail.indexOf('http') === 0 ?
      postMeta.thumbnail :
      `${homePath}/${postMeta.thumbnail}`
    postThumbnailElem.setAttribute('src', thumbnailUrlOrPath)
  } else
    postThumbnailElem.parentNode.removeChild(postThumbnailElem)

  const postCoverElem = postSummaryFrag.querySelector('.post-cover')
  if (postMeta.cover) {
    const coverUrlOrPath = postMeta.cover.indexOf('http') === 0 ?
      postMeta.cover :
      `${homePath}/${postMeta.cover}`
    postCoverElem.setAttribute('src', coverUrlOrPath)
  } else
    postCoverElem.parentNode.removeChild(postCoverElem)

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

function preparePageNavigation(homePath, currPage, nbPages, paginationBtnElems, pageNavElem) {
  if (nbPages <= 1) {
    pageNavElem.classList.add('invisible')
    return
  }
  pageNavElem.classList.remove('invisible')

  const btnsOlder = [
    paginationBtnElems.btnOlder1,
    paginationBtnElems.btnOlder2,
    paginationBtnElems.btnOlder3,
    paginationBtnElems.btnOlder4,
    paginationBtnElems.btnOlder5,
    paginationBtnElems.btnOlder6,
    paginationBtnElems.btnOlder7,
    paginationBtnElems.btnOlder8,
    paginationBtnElems.btnOlder9
  ]
  const btnsNewer = [
    paginationBtnElems.btnNewer1,
    paginationBtnElems.btnNewer2,
    paginationBtnElems.btnNewer3,
    paginationBtnElems.btnNewer4,
    paginationBtnElems.btnNewer5,
    paginationBtnElems.btnNewer6,
    paginationBtnElems.btnNewer7,
    paginationBtnElems.btnNewer8,
    paginationBtnElems.btnNewer9
  ]
  if (btnsNewer.length !== btnsOlder.length)
    log.error(`Number of pagination buttons has to be the same`.error)
  const maxNbBtns = btnsNewer.length

  for (const btnOlder of btnsOlder) {
    btnOlder.classList.add('hidden')
  }
  for (const btnNewer of btnsNewer) {
    btnNewer.classList.add('hidden')
  }

  paginationBtnElems.btnCurr.innerHTML = currPage
  let nbOlder = 0
  let nbNewer = 0
  if (currPage === nbPages) {
    paginationBtnElems.btnLast.classList.add('hidden')
    paginationBtnElems.btnFirst.classList.remove('hidden')
    paginationBtnElems.btnFirst.setAttribute('href', `${homePath}/`)
    paginationBtnElems.btnFirst.innerHTML = 1
    paginationBtnElems.btnCurr.classList.add('older', 'final')
    nbNewer = maxNbBtns > nbPages ? nbPages - 2 : maxNbBtns
  } else if (currPage === 1) {
    paginationBtnElems.btnLast.classList.remove('hidden')
    paginationBtnElems.btnLast.setAttribute('href', `${homePath}/${config.pagesDirPath}/${nbPages}/`)
    paginationBtnElems.btnLast.innerHTML = nbPages
    paginationBtnElems.btnFirst.classList.add('hidden')
    paginationBtnElems.btnCurr.classList.add('newer', 'final')
    nbOlder = maxNbBtns > nbPages ? nbPages - 2 : maxNbBtns
  } else {
    paginationBtnElems.btnLast.classList.remove('hidden')
    paginationBtnElems.btnLast.setAttribute('href', `${homePath}/${config.pagesDirPath}/${nbPages}/`)
    paginationBtnElems.btnLast.innerHTML = nbPages
    paginationBtnElems.btnFirst.classList.remove('hidden')
    paginationBtnElems.btnFirst.setAttribute('href', `${homePath}/`)
    paginationBtnElems.btnFirst.innerHTML = 1

    nbNewer = currPage - 2
    nbOlder = nbPages - 1 - currPage
    if (nbNewer + nbOlder > maxNbBtns) {
      const maxNbBtnsHalf = Math.floor(maxNbBtns / 2)
      const maxNbBtnsEven = maxNbBtnsHalf * 2
      if (nbNewer > maxNbBtnsHalf && nbOlder < maxNbBtnsHalf) {
        nbNewer = maxNbBtnsEven - nbOlder
      } else if (nbNewer < maxNbBtnsHalf && nbOlder > maxNbBtnsHalf) {
        nbOlder = maxNbBtnsEven - nbNewer
      } else {
        nbNewer = maxNbBtnsHalf
        nbOlder = maxNbBtnsHalf
      }
    }
  }

  for (let i = 0; i < nbNewer; i++) {
    const p = currPage - i - 1
    const pPath = `${homePath}/${config.pagesDirPath}/${p}/`
    const b = btnsNewer[i]
    b.classList.remove('hidden')
    b.setAttribute('href', pPath)
    if (i === nbNewer - 1 && p > 2) {
      b.innerHTML = '...'
      b.classList.add('gap')
    } else {
      b.innerHTML = p
      b.classList.remove('gap')
    }
  }
  for (let j = 0; j < nbOlder; j++) {
    const p = currPage + j + 1
    const pPath = `${homePath}/${config.pagesDirPath}/${p}/`
    const b = btnsOlder[j]
    b.classList.remove('hidden')
    b.setAttribute('href', pPath)
    if (j === nbOlder - 1 && p < nbPages - 1) {
      b.innerHTML = '...'
      b.classList.add('gap')
    } else {
      b.innerHTML = p
      b.classList.remove('gap')
    }
  }
}

function generatePages() {
  if (state.mdFileNameToMeta.size === 0)
    return

  const nbPages = Math.ceil(state.mdFileNameToMeta.size / config.postsPerPage)
  log.info(`Rendering ${nbPages} pages ...`.info)

  state.mdFileNameToMeta[Symbol.iterator] = function* () {
    yield* [...this.entries()].sort((a, b) =>
      new Date(b[1].date).getTime() - new Date(a[1].date).getTime())
  }

  let postIndexInPage = 0
  let i = 0

  del([config.pagesDirPath])
  fs.mkdirSync(config.pagesDirPath)
  for (const [mdFileName, postMeta] of state.mdFileNameToMeta) {
    const currPage = Math.floor(i / config.postsPerPage) + 1
    const { elements, documentDom, homePath, postPath, tagsPagePath } = currPage === 1 ?
      {
        elements: state.dom.elementsMainPage,
        documentDom: state.dom.documentDomMainPage,
        homePath: '.',
        postPath: `${config.htmlOutputDirPath}/${postMeta.name}/`,
        tagsPagePath: `${config.tagsPageDirPath}`
      } :
      {
        elements: state.dom.elementsSecondaryPage,
        documentDom: state.dom.documentDomSecondaryPage,
        homePath: '../..',
        postPath: `../../${config.htmlOutputDirPath}/${postMeta.name}/`,
        tagsPagePath: `../../${config.tagsPageDirPath}`
      }

    const postSummaryFrag = postMetaToSummaryHtml(postMeta, homePath, postPath, tagsPagePath)
    elements.postsSectionElem.append(postSummaryFrag)

    const pageCompleted =
      postIndexInPage + 1 === config.postsPerPage || i + 1 === state.mdFileNameToMeta.size
    if (pageCompleted) {
      let canonicalUrl = config.baseUrl
      if (currPage > 1)
        canonicalUrl += `${config.pagesDirPath}/${currPage}/`
      elements.socialMeta.canonicalUrlElem.setAttribute('href', canonicalUrl)
      elements.socialMeta.ogUrlElem.setAttribute('content', canonicalUrl)

      preparePageNavigation(homePath, currPage, nbPages, elements.paginationBtnElems, elements.pageNavElem)

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
  for (let i = 0; i < metaArr.length; i++) {
    const postNavInfo = {
      'olderPost': (i < metaArr.length - 1 ?
        `${metaArr[i + 1].name}` :
        null),
      'newerPost': (i > 0 ?
        `${metaArr[i - 1].name}` :
        null)
    }
    const postNavFilePath =
      `${config.htmlOutputDirPath}/${metaArr[i].name}/${config.postNavJsonFileName}`
    log.info(`Writing ${postNavFilePath} ...`.info)
    fs.writeFileSync(postNavFilePath, JSON.stringify(postNavInfo/*, null, 2*/))
  }
}

function generateTagsPageAndJson() {
  log.info(`Generating tags json files in ${config.tagsJsonsDirPath} ...`.info)
  del([config.tagsJsonsDirPath])
  fs.mkdirSync(config.tagsJsonsDirPath)
  const postMetasPerTag = new Map()
  const latestPostsArr = []
  const MAX_LATEST_POSTS = 10
  let latestsPostsCounter = 0;
  for (const [mdFileName, postMeta] of state.mdFileNameToMeta) {
    for (const tag of postMeta.tags) {
      let tagMetasArr = postMetasPerTag.get(tag)
      if (!tagMetasArr)
        tagMetasArr = []
      tagMetasArr.push(postMeta)
      postMetasPerTag.set(tag, tagMetasArr)
    }

    if (latestsPostsCounter < MAX_LATEST_POSTS) {
      latestPostsArr.push(postMeta)
      latestsPostsCounter++;
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

  const latestPostsJsonFileName = `${config.tagsJsonsDirPath}/latest-posts.json`
  log.info(`Writing ${latestPostsJsonFileName} ...`.info)
  fs.writeFileSync(latestPostsJsonFileName, JSON.stringify(latestPostsArr/*, null, 2*/))

  const canonicalUrl = `${config.baseUrl}${config.tagsPageDirPath}/`
  state.dom.elementsTagsPage.socialMeta.canonicalUrlElem.setAttribute('href', canonicalUrl)
  state.dom.elementsTagsPage.socialMeta.ogUrlElem.setAttribute('content', canonicalUrl)

  const postSummaryFrag = JSDOM.fragment(state.dom.postSummaryHtml)
  state.dom.elementsTagsPage.postSummaryTemplateSectionElem.append(postSummaryFrag)

  del([config.tagsPageDirPath])
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
    image: `${config.baseUrl}${config.imagesDirPath}/${config.logoImgFileName}`,
    favicon: `${config.baseUrl}favicon.ico`,
    copyright: `${now.getFullYear()}, Valentin Padurean`,
    updated: now, // optional, default = today
    generator: 'Markedista', // optional, default = 'Feed for Node.js'
    feedLinks: {
      atom: `${config.baseUrl}${config.rssFeedDirPath}/${config.rssFileName}`,
    },
    author: author
  })
  for (const category of config.siteCategories) {
    feed.addCategory(category)
  }
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
    if (postMeta.thumbnailUrl)
      feedItem.thumbnail = {
        url: postMeta.thumbnailUrl //,
        // height: 240,
        // width: 240,
        // time: "12:05:01.123"
      }
    feed.addItem(feedItem)
  }
  if (!fs.existsSync(config.rssFeedDirPath))
    fs.mkdirSync(config.rssFeedDirPath)
  const feedFilePath = `${config.rssFeedDirPath}/${config.rssFileName}`
  log.info(`Writing ${feedFilePath} ...`.info)
  let rss2 = feed.rss2()
  fs.writeFileSync(feedFilePath, rss2)
}

function computeTotalDuration(startedAt) {
  const took = process.hrtime(startedAt)
  const tookMs = Math.round(took[1] / 1000000)
  return `${took[0] > 0 ? took[0] + 's ' : ''}${tookMs}ms`
}

const state = {
  mdFileNameToMeta: new Map(),
  invalidMetaCounter: 0,
  mdFilesNames: [],
  mdFilesNamesRendered: [],
  dom: {},
  updateMeta: function (mdFileName, meta) {
    this.mdFileNameToMeta.set(mdFileName, {
      title: meta.title,
      date: meta.date,
      description: meta.description,
      tags: meta.tags,
      name: meta.name,
      gallery: meta.gallery,
      thumbnail: meta.thumbnail,
      thumbnailUrl: meta.thumbnailUrl,
      cover: meta.cover,
      coverUrl: meta.coverUrl
    })
  },
  done: function () {
    const nbProcessed = this.mdFileNameToMeta.size + this.invalidMetaCounter
    const nbTotal = this.mdFilesNames.length + this.mdFilesNamesRendered.length
    return nbProcessed === nbTotal
  }
}

function prepareSocialMetaElems(document, headElem, title, description, isArticle) {
  const twitterCardElem = document.createElement('meta')
  twitterCardElem.setAttribute('name', 'twitter:card')
  twitterCardElem.setAttribute('content', 'summary')
  headElem.append(twitterCardElem)

  const twitterSiteElem = document.createElement('meta')
  twitterSiteElem.setAttribute('name', 'twitter:site')
  twitterSiteElem.setAttribute('content', `@${config.social.twitter}`)
  headElem.append(twitterSiteElem)

  const ogTypeElem = document.createElement('meta')
  ogTypeElem.setAttribute('property', 'og:type')
  ogTypeElem.setAttribute('content', isArticle ? 'article' : 'website')
  headElem.append(ogTypeElem)

  const canonicalUrlElem = document.createElement('link')
  canonicalUrlElem.setAttribute('rel', 'canonical')
  canonicalUrlElem.setAttribute('href', '')
  headElem.append(canonicalUrlElem)

  const ogUrlElem = document.createElement('meta')
  ogUrlElem.setAttribute('property', 'og:url')
  ogUrlElem.setAttribute('content', '')
  headElem.append(ogUrlElem)

  const ogTitleElem = document.createElement('meta')
  ogTitleElem.setAttribute('property', 'og:title')
  ogTitleElem.setAttribute('content', title)
  headElem.append(ogTitleElem)
  const twitterTitleElem = document.createElement('meta')
  twitterTitleElem.setAttribute('name', 'twitter:title')
  twitterTitleElem.setAttribute('content', title)
  headElem.append(twitterTitleElem)

  const ogDescriptionElem = document.createElement('meta')
  ogDescriptionElem.setAttribute('property', 'og:description')
  ogDescriptionElem.setAttribute('content', description)
  headElem.append(ogDescriptionElem)
  const twitterDescriptionElem = document.createElement('meta')
  twitterDescriptionElem.setAttribute('name', 'twitter:description')
  twitterDescriptionElem.setAttribute('content', description)
  headElem.append(twitterDescriptionElem)

  const logotypeImageUrl =
    `${config.baseUrl}${config.imagesDirPath}/${config.logoImgFileName}`
  const ogImageElem = document.createElement('meta')
  ogImageElem.setAttribute('property', 'og:image')
  ogImageElem.setAttribute('content', logotypeImageUrl)
  headElem.append(ogImageElem)
  const ogImageElemSecureUrl = document.createElement('meta')
  ogImageElemSecureUrl.setAttribute('property', 'og:image:secure_url')
  ogImageElemSecureUrl.setAttribute('content', logotypeImageUrl)
  headElem.append(ogImageElemSecureUrl)
  const twitterImageElem = document.createElement('meta')
  twitterImageElem.setAttribute('name', 'twitter:image')
  twitterImageElem.setAttribute('content', logotypeImageUrl)
  headElem.append(twitterImageElem)
}

function prepareIcons(document, headElem, homePath) {
  const faviconLinkElem = document.createElement('link')
  faviconLinkElem.setAttribute('rel', 'shortcut icon')
  faviconLinkElem.setAttribute('href', `${homePath}/favicon.ico`)
  headElem.append(faviconLinkElem)

  const appleIconElem = document.createElement('link')
  appleIconElem.setAttribute('rel', 'apple-touch-icon')
  appleIconElem.setAttribute('sizes', '180x180')
  appleIconElem.setAttribute('href', `${homePath}/${config.imagesDirPath}/icon-180.png`)
  headElem.append(appleIconElem)

  const msIconSElem = document.createElement('meta')
  msIconSElem.setAttribute('name', 'msapplication-square70x70logo')
  msIconSElem.setAttribute('content', `${homePath}/${config.imagesDirPath}/icon-70-no-bg.png`)
  headElem.append(msIconSElem)

  const msIconMElem = document.createElement('meta')
  msIconMElem.setAttribute('name', 'msapplication-square150x150logo')
  msIconMElem.setAttribute('content', `${homePath}/${config.imagesDirPath}/icon-150-no-bg.png`)
  headElem.append(msIconMElem)

  const msIconLElem = document.createElement('meta')
  msIconLElem.setAttribute('name', 'msapplication-square310x310logo')
  msIconLElem.setAttribute('content', `${homePath}/${config.imagesDirPath}/icon-310-no-bg.png`)
  headElem.append(msIconLElem)

  const msIconLRElem = document.createElement('meta')
  msIconLRElem.setAttribute('name', 'msapplication-wide310x150logo')
  msIconLRElem.setAttribute('content', `${homePath}/${config.imagesDirPath}/icon-310x150-no-bg.png`)
  headElem.append(msIconLRElem)

  const msTileColorElem = document.createElement('meta')
  msTileColorElem.setAttribute('name', 'msapplication-TileColor')
  msTileColorElem.setAttribute('content', '#ffffff')
  headElem.append(msTileColorElem)
}

function prepareJsdom(headHtml, headerHtml, footerHtml, layoutHtml, homePath, cssPath, jsPath, isArticle) {
  const documentDom = new JSDOM(layoutHtml)
  const document = documentDom.window.document

  const headElem = document.querySelector('head')
  const bodyElem = document.querySelector('body')
  const headerElem = bodyElem.querySelector('header')
  headElem.append(JSDOM.fragment(headHtml))
  headerElem.append(JSDOM.fragment(headerHtml))
  bodyElem.append(JSDOM.fragment(footerHtml))

  headerElem.querySelector('.btn-go-home').setAttribute('href', `${homePath}/`)
  const socialImgNodes = headerElem.querySelector('.social-icon-links-in-menu').querySelectorAll('img')
  for (const imgNode of socialImgNodes) {
    imgNode.setAttribute('src', `${homePath}/${imgNode.getAttribute('src')}`)
  }

  const titleElem = document.querySelector('title')
  const title = titleElem.textContent
  const descriptionElem = document.querySelector('meta[name="description"]')
  const description = descriptionElem.getAttribute('content')
  const btnGoHomeElems = document.querySelector('.btn-go-home')
  const homePageLinkElems = document.querySelector('.home-page-link')
  const aboutPageLinkElems = document.querySelector('.about-page-link')

  prepareSocialMetaElems(document, headElem, title, description, isArticle)

  prepareIcons(document, headElem, homePath)

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

  btnGoHomeElems.setAttribute('href', `${homePath}/`)
  homePageLinkElems.setAttribute('href', `${homePath}/`)
  aboutPageLinkElems.setAttribute('href', `${homePath}/about/`)

  const footerElem = document.querySelector('footer')
  const footerBtnGoHomeElems = footerElem.querySelector('.btn-go-home')
  if (footerBtnGoHomeElems) {
    footerBtnGoHomeElems.setAttribute('href', `${homePath}/`)
  }
  const socialIconLinksElem = footerElem.querySelector('.social-icon-links')
  const githubIconElem = socialIconLinksElem.querySelector('.github-icon-link')
  const githubIconPath = githubIconElem.getAttribute('src')
  githubIconElem.setAttribute('src', `${homePath}/${githubIconPath}`)
  const twitterIconElem = socialIconLinksElem.querySelector('.twitter-icon-link')
  const twitterIconPath = twitterIconElem.getAttribute('src')
  twitterIconElem.setAttribute('src', `${homePath}/${twitterIconPath}`)
  const linkedinIconElem = socialIconLinksElem.querySelector('.linkedin-icon-link')
  const linkedinIconPath = linkedinIconElem.getAttribute('src')
  linkedinIconElem.setAttribute('src', `${homePath}/${linkedinIconPath}`)
  const facebookIconElem = socialIconLinksElem.querySelector('.facebook-icon-link')
  const facebookIconPath = facebookIconElem.getAttribute('src')
  facebookIconElem.setAttribute('src', `${homePath}/${facebookIconPath}`)

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
  footerElem.insertBefore(rssAnchorElem, socialIconLinksElem)

  return documentDom
}

function selectElementsForPage(doc) {
  return {
    socialMeta: {
      canonicalUrlElem: doc.querySelector('link[rel="canonical"]'),
      ogUrlElem: doc.querySelector('meta[property="og:url"]')
    },
    postsSectionElem: doc.querySelector('#posts'),
    pageNavElem: doc.querySelector('#page-nav'),
    paginationBtnElems: {
      btnLast: doc.querySelector('#btn-last-page'),
      btnOlder9: doc.querySelector('#btn-older-page-9'),
      btnOlder8: doc.querySelector('#btn-older-page-8'),
      btnOlder7: doc.querySelector('#btn-older-page-7'),
      btnOlder6: doc.querySelector('#btn-older-page-6'),
      btnOlder5: doc.querySelector('#btn-older-page-5'),
      btnOlder4: doc.querySelector('#btn-older-page-4'),
      btnOlder3: doc.querySelector('#btn-older-page-3'),
      btnOlder2: doc.querySelector('#btn-older-page-2'),
      btnOlder1: doc.querySelector('#btn-older-page-1'),
      btnCurr: doc.querySelector('#btn-current-page'),
      btnNewer1: doc.querySelector('#btn-newer-page-1'),
      btnNewer2: doc.querySelector('#btn-newer-page-2'),
      btnNewer3: doc.querySelector('#btn-newer-page-3'),
      btnNewer4: doc.querySelector('#btn-newer-page-4'),
      btnNewer5: doc.querySelector('#btn-newer-page-5'),
      btnNewer6: doc.querySelector('#btn-newer-page-6'),
      btnNewer7: doc.querySelector('#btn-newer-page-7'),
      btnNewer8: doc.querySelector('#btn-newer-page-8'),
      btnNewer9: doc.querySelector('#btn-newer-page-9'),
      btnFirst: doc.querySelector('#btn-first-page')
    }
  }
}

function selectElementsForPostPage(document, fbCommentsElem) {
  return {
    headElem: document.querySelector('head'),
    metaDescriptionElem: document.querySelector('meta[name="description"]'),
    metaKeywordsElem: document.querySelector('meta[name="keywords"]'),
    socialMeta: {
      canonicalUrlElem: document.querySelector('link[rel="canonical"]'),
      ogUrlElem: document.querySelector('meta[property="og:url"]'),
      ogTitleElem: document.querySelector('meta[property="og:title"]'),
      twitterTitleElem: document.querySelector('meta[name="twitter:title"]'),
      ogDescriptionElem: document.querySelector('meta[property="og:description"]'),
      twitterDescriptionElem: document.querySelector('meta[name="twitter:description"]'),
      ogImageElem: document.querySelector('meta[property="og:image"]'),
      ogImageSecureUrlElem: document.querySelector('meta[property="og:image:secure_url"]'),
      twitterImageElem: document.querySelector('meta[name="twitter:image"]')
    },
    postThumbnailElem: document.querySelector('.post-thumbnail'),
    postCoverElem: document.querySelector('.post-cover'),
    pageTitleElem: document.querySelector('title'),
    titleElem: document.querySelector('#post-title'),
    dateElem: document.querySelector('#post-date'),
    bodyElem: document.querySelector('#post-body'),
    shareBtns: {
      twitter: document.querySelector('#btn-share-twitter'),
      facebook: document.querySelector('#btn-share-facebook'),
      linkedin: document.querySelector('#btn-share-linkedin')
    },
    tagsElem: document.querySelector('#tags-container'),
    tagsInputElem: document.querySelector('#tags-input'),
    postIdInputElem: document.querySelector('#post-id-input'),
    fbCommentsElem: fbCommentsElem
  }
}

function prepareDom() {
  log.info(`Reading header and footer from ${config.templatesDirPath} folder ...`.info)

  const commonHeadHtml = fs.readFileSync(`${config.templatesDirPath}/common-head.tpl.html`, config.enc)
  const commonHeaderHtml = fs.readFileSync(`${config.templatesDirPath}/common-header.tpl.html`, config.enc)
  const commonFooterHtml = fs.readFileSync(`${config.templatesDirPath}/common-footer.tpl.html`, config.enc)
  const postSummaryHtml = fs.readFileSync(`${config.templatesDirPath}/post-summary.tpl.html`, config.enc)

  const layoutMainPageHtml = fs.readFileSync(`${config.templatesDirPath}/layout-main-page.tpl.html`, config.enc)
  const layoutTagsPageHtml = fs.readFileSync(`${config.templatesDirPath}/layout-tags-page.tpl.html`, config.enc)
  const layoutPostPageHtml = fs.readFileSync(`${config.templatesDirPath}/layout-post-page.tpl.html`, config.enc)

  const documentDomMainPage = prepareJsdom(
    commonHeadHtml,
    commonHeaderHtml,
    commonFooterHtml,
    layoutMainPageHtml,
    '.',
    `${config.cssFiles.main.name}?${config.cssFiles.main.version}`,
    `${config.jsFiles.main.name}?${config.jsFiles.main.version}`,
    false)
  const documentMainPage = documentDomMainPage.window.document

  const documentDomSecondaryPage = prepareJsdom(
    commonHeadHtml,
    commonHeaderHtml,
    commonFooterHtml,
    layoutMainPageHtml,
    '../..',
    `../../${config.cssFiles.main.name}?${config.cssFiles.main.version}`,
    `../../${config.jsFiles.main.name}?${config.jsFiles.main.version}`,
    false)
  const documentSecondaryPage = documentDomSecondaryPage.window.document

  const documentDomTagsPage = prepareJsdom(
    commonHeadHtml,
    commonHeaderHtml,
    commonFooterHtml,
    layoutTagsPageHtml,
    '..',
    `../${config.cssFiles.main.name}?${config.cssFiles.main.version}`,
    `../${config.jsFiles.tags.name}?${config.jsFiles.tags.version}`,
    false)
  const documentTagsPage = documentDomTagsPage.window.document

  const documentDomPostPage = prepareJsdom(
    commonHeadHtml,
    commonHeaderHtml,
    commonFooterHtml,
    layoutPostPageHtml,
    '../..',
    `../../${config.cssFiles.post.name}?${config.cssFiles.post.version}`,
    `../../${config.jsFiles.post.name}?${config.jsFiles.post.version}`,
    true)
  const documentPostPage = documentDomPostPage.window.document
  const fbCommentsElem = documentPostPage.querySelector('.fb-comments')
  let siteUrlForFbComments = fbCommentsElem.getAttribute('data-href')
  siteUrlForFbComments += (siteUrlForFbComments.endsWith('/') ? '' : '/')
  documentPostPage.querySelector('#other-post-summary-template-section').append(JSDOM.fragment(postSummaryHtml))

  const documentDomPostPageWithGallery = prepareJsdom(
    commonHeadHtml,
    commonHeaderHtml,
    commonFooterHtml,
    layoutPostPageHtml,
    '../..',
    `../../${config.cssFiles.postWithGallery.name}?${config.cssFiles.postWithGallery.version}`,
    `../../${config.jsFiles.postWithGallery.name}?${config.jsFiles.postWithGallery.version}`,
    true)
  const documentPostPageWithGallery = documentDomPostPageWithGallery.window.document
  const fbCommentsElemPostPageWithGallery = documentPostPageWithGallery.querySelector('.fb-comments')
  let siteUrlForFbCommentsPostPageWithGallery = fbCommentsElemPostPageWithGallery.getAttribute('data-href')
  siteUrlForFbCommentsPostPageWithGallery += (siteUrlForFbCommentsPostPageWithGallery.endsWith('/') ? '' : '/')
  documentPostPageWithGallery.querySelector('#other-post-summary-template-section').append(JSDOM.fragment(postSummaryHtml))

  state.dom = {
    documentDomMainPage: documentDomMainPage,
    elementsMainPage: selectElementsForPage(documentMainPage),

    documentDomSecondaryPage: documentDomSecondaryPage,
    elementsSecondaryPage: selectElementsForPage(documentSecondaryPage),

    documentDomTagsPage: documentDomTagsPage,
    elementsTagsPage: {
      socialMeta: {
        canonicalUrlElem: documentTagsPage.querySelector('link[rel="canonical"]'),
        ogUrlElem: documentTagsPage.querySelector('meta[property="og:url"]')
      },
      postSummaryTemplateSectionElem: documentTagsPage.querySelector('#post-summary-template-section'),
    },

    postSummaryHtml: postSummaryHtml,

    documentDomPostPage: documentDomPostPage,
    siteUrlForFbComments: siteUrlForFbComments,
    elementsPostPage: selectElementsForPostPage(documentPostPage, fbCommentsElem),

    documentDomPostPageWithGallery: documentDomPostPageWithGallery,
    siteUrlForFbCommentsPostPageWithGallery: siteUrlForFbCommentsPostPageWithGallery,
    elementsPostPageWithGallery: selectElementsForPostPage(documentPostPageWithGallery, fbCommentsElemPostPageWithGallery)
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
    meta.thumbnailUrl = (!meta.thumbnail || meta.thumbnail.indexOf('http') === 0) ?
      meta.thumbnail :
      `${config.baseUrl}${meta.thumbnail}`
    meta.coverUrl = (!meta.cover || meta.cover.indexOf('http') === 0) ?
      meta.cover :
      `${config.baseUrl}${meta.cover}`
    renderMarkdownAndUpdateDom(
      mdFileName,
      meta,
      !meta.gallery ?
        state.dom.documentDomPostPage.window.document :
        state.dom.documentDomPostPageWithGallery.window.document,
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
    metaRendered.thumbnailUrl = (!metaRendered.thumbnail || metaRendered.thumbnail.indexOf('http') === 0) ?
      metaRendered.thumbnail :
      `${config.baseUrl}${metaRendered.thumbnail}`
    metaRendered.coverUrl = (!metaRendered.cover || metaRendered.cover.indexOf('http') === 0) ?
      metaRendered.cover :
      `${config.baseUrl}${metaRendered.cover}`
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
  generatePages()
  generatePostsNavInfoJson()
  generateTagsPageAndJson()
  generateRssFeed()
  scanAndLogUnlinkedPosts()
  const took = computeTotalDuration(startedAt)

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
  const sourceMdFileName = sourceMdFilePathArr[sourceMdFilePathArr.length - 1]
  const lastIndexOfDot = sourceMdFileName.lastIndexOf('.')
  const sourceMdFileNameNoExt = sourceMdFileName.substr(0, lastIndexOfDot)
  const sourceMd = fs.readFileSync(sourceMdFilePath, config.enc)
  for (let i = 0; i < nbCopies; i++) {
    const newSourceMdFilePath = `${config.toRenderDirPath}/${sourceMdFileNameNoExt}-${i + 1}.md`
    fs.writeFileSync(newSourceMdFilePath, sourceMd)
  }
}

// createBenchmarkMds('_src/_posts/_to-render/seed-post.md', 4999)
render()

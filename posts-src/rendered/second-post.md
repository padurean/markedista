---
date: 2018-05-16T12:23:06+03:00
title: Second Post Title
description: This is the 2nd post description
tags: [ tag2, tag3 ]
---
GFM-Example
===========

GitHub Flavored Markdown Example


Index
---
* source

~~~
 This is head1
 =============

 This is head 2
 --------------
~~~

* result

This is head1
=============

This is head 2
--------------

table (PHP-Markdown style)
---

* source

~~~
First Header  | Second Header
------------- | -------------
Content Cell  | Content Cell
Content Cell  | Content Cell
~~~

* result

First Header  | Second Header
------------- | -------------
Content Cell  | Content Cell
Content Cell  | Content Cell


* source

~~~
| Item      | Value |
| --------- | -----:|
| Computer  | $1600 |
| Phone     |   $12 |
| Pipe      |    $1 |
~~~

* result

| Item      | Value |
| --------- | -----:|
| Computer  | $1600 |
| Phone     |   $12 |
| Pipe      |    $1 |


code
---

* source


    ```
    this is code block
    ```


* result

```
this is code block
```


* source


    ```ruby
    get '/' do
      "Hello world "
    end
    ```


* result

```ruby
get '/' do
  "Hello world "
end
```

* other ruby example

```ruby
get '/' do
  "Hello world "
end
```

* some scala example:


```scala
trait TSDBWriter
  protected implicit val scheduler: Scheduler
  protected val metrics = Metrics.openTSDBMetrics

  def config: TSDBConfig

  def publishMessages(tsDataPoints: List[TSDataPoint]): Task[Continue]

  def persistLeadershipValue(status: LeadershipStatus, now: DateTime): Task[Continue] =
    val metric = "assetEngine.leadershipState"
    val dp = TSDataPoint(
      metric = metric,
      timestamp = now.getMillis,
      value = if (status.isMaster) 1 else 0,
      tags = Map("host" -> s"${status.hostname}/${status.address}")
    )

    publishMessages(List(dp))

  case class SomeCaseClass(attr1: String, attr2: Double)
```


* some javascript examples:

```javascript
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
const postsJsonFilePath = `${htmlOutputDirPath}/posts.json`
const enc = 'utf8'
const ignoreFiles = [ '.gitkeep' ]

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

async function writePostsJson(metaFileNameToMeta) {
  console.info(`Generating ${postsJsonFilePath} ...`.info)
  metaFileNameToMeta[Symbol.iterator] = function* () {
    yield* [...this.entries()].sort((a, b) =>
    new Date(b[1].date).getTime() - new Date(a[1].date).getTime())
  }
  const mdFileNameToMetaJson = JSON.stringify([...metaFileNameToMeta]/*, null, 2*/)
  await writeFile(postsJsonFilePath, mdFileNameToMetaJson)
}

function computeAndLogTotalDuration(startedAt) {
  const took = process.hrtime(startedAt)
  const tookMs = Math.round(took[1]/1000000)
  const tookStr = `${took[0]>0?took[0]+'s ':''}${tookMs}ms`
  console.info(`DONE in ${tookStr}`.info)
}

const render = async () => {
  try {
    const startedAt = process.hrtime()
    const mdFileNameToMeta = new Map()
    let invalidMetaCounter = 0
    console.info(`Scanning ${toRenderDirPath} for md files to render ...`.info)
    const mdFilesNames = (await readDir(toRenderDirPath)).filter(f => ignoreFiles.indexOf(f) < 0)
    if (mdFilesNames.length > 0) {
      console.info(`${mdFilesNames.length} new md files found`.info)
    } else
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
        // NOTE: date elem textContent will be written on client side
        if (typeof date === 'string') { // when frontmatter is JSON
          postDateElem.setAttribute('datetime', date)
          // postDateElem.textContent = new Date(date).toLocaleString()
        } else /*if (typeof date === 'object')*/ { // when frontmatter is YAML
          postDateElem.setAttribute('datetime', date.toISOString())
          // postDateElem.textContent = date.toLocaleString()
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
          console.info(`Scanning ${renderedDirPath} for previously rendered md files ...`.info)
          const mdFilesNamesRendered = (await readDir(renderedDirPath)).filter(f => {
            return ignoreFiles.indexOf(f) < 0 && !mdFileNameToMeta.has(f)
          })
          if (mdFilesNamesRendered.length > 0) {
            console.info(`${mdFilesNamesRendered.length} previously rendered md files found`.info)
            mdFilesNamesRendered.forEach(async mdFileNameRendered => {
              try {
                const mdFilePathRendered = `${renderedDirPath}/${mdFileNameRendered}`
                const mdMeta = await readFile(mdFilePathRendered, enc)
                console.info(`${mdFileNameRendered} - Parsing frontmatter from rendered file ...`.info)
                const metaParsed = frontmatter.loadFront(mdMeta)
                const metaParsedErrors = validateMeta(metaParsed)
                if (metaParsedErrors.length > 0) {
                  invalidMetaCounter++
                  const metaParsedErrorsStr = metaParsedErrors.join(', ')
                  return console.error(
                    `${mdFileNameRendered} - Skipped - misses frontmatter: ${metaParsedErrorsStr}`.error)
                }
                const lastIndexOfDotParsed = mdFileNameRendered.lastIndexOf('.')
                const htmlFileNameParsed = mdFileNameRendered.substr(0, lastIndexOfDotParsed)+'.html'
                mdFileNameToMeta.set(mdFileNameRendered, {
                  date: metaParsed.date,
                  title: metaParsed.title,
                  description: metaParsed.description,
                  htmlFileName: htmlFileNameParsed
                })
                if (mdFileNameToMeta.size + invalidMetaCounter === mdFilesNames.length + mdFilesNamesRendered.length) {
                  await writePostsJson(mdFileNameToMeta)
                  computeAndLogTotalDuration(startedAt)
                }
              } catch (e) {
                console.error(`${mdFileNameRendered} - FAILED to read (for frontmatter only)!\t${e}`.error)
              }
            })
          } else {
            console.warn(
              `No rendered md files found => ${postsJsonFilePath} content will probably `.warn +
              `be incomplete (unless there were no previously rendered files before this run)`.warn)
            await writePostsJson(mdFileNameToMeta)
            computeAndLogTotalDuration(startedAt)
          }
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
```


autolink
--------

* source

```
http://mukaer.com
```

* result

http://mukaer.com



strikethrough
-------------

* source

```
this is ~~good~~ bad
```

* result

this is ~~good~~ bad


Task Lists
---------

* source

```
- [x] @mentions, #refs, [links](), **formatting**, and <del>tags</del> supported
- [x] list syntax required (any unordered or ordered list supported)
- [x] this is a complete item
- [ ] this is an incomplete item
```

* result

- [x] @mentions, #refs, [links](), **formatting**, and <del>tags</del> supported
- [x] list syntax required (any unordered or ordered list supported)
- [x] this is a complete item
- [ ] this is an incomplete item



superscript
----------

* source

```
this is the 2^(nd) time
```

* result


this is the 2^(nd) time


underline
---------
* source

```
This is _underlined_ but this is still *italic*
```

* result

This is _underlined_ but this is still *italic*


highlight
--------

* source

```
This is ==highlighted==
```

* result

This is ==highlighted==

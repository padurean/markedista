---
date: 2018-05-16T12:23:06+03:00
title: Second Post Title
description: This is the 2nd post description
tags: [ tag2, tag3, tag4, tag5, tag6 ]
gallery: true
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

![Foggy Road](../../photos/foggy-road.jpg "Foggy Road")

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

![To the Black Lodge](../../photos/to-the-black-lodge.jpg "To the Black Lodge")

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
```


autolink
--------

* source

```
http://mukaer.com
```

* result

http://mukaer.com

![Factory Clouds](../../photos/factory-and-clouds.jpg "Factory Clouds")


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


emphasis: bold, italic and strikethrough
--------------------------
* source

```
This is __bold__, **also bold**
This is _italic_, *also italic*
Combined emphasis with **bold and _italic_**.
This is ~~strikethrough~~
```

* result

This is __bold__, **also bold**

This is _italic_, *also italic*

Combined emphasis with **bold and _italic_**.

This is ~~strikethrough~~


superscript and superscript
---------------------------

* source

```
superscript: 2<sup>nd</sup>
subscript: log<sub>5</sub>n
```

* result

superscript: 2<sup>nd</sup>

subscript: log<sub>5</sub>n

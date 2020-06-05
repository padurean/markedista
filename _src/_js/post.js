var config = {
  homePath: '../../'
};
var state = {
  pageNavSectionElem: null,
  btnNewerPostElem: null,
  btnOlderPostElem: null,
  locationPathNormalized: null
}

function renderPostDate() {
  var postDateJqElem = $('#post-date');
  var postDateISOStr = postDateJqElem.attr('datetime');
  var postMoment = moment(postDateISOStr);
  postDateJqElem.text(postMoment.toDate().toLocaleDateString());
  postDateJqElem.parent().find('.post-ago').text(postMoment.fromNow());
  postDateJqElem.parent().animate( { opacity: 1 }, 1000 );
  // OR:
  // postDateJqElem.parent().removeClass('invisible');
}

function highlightCodeBlocks() {
  // disable lang auto-detection first
  hljs.configure({languages: []});
  $('pre code').each(function(i, block) {
    hljs.highlightBlock(block);
  });
}

function getShareWindowOptions() {
  var width = window.innerWidth > 768 ?
    window.innerWidth / 2 :
    window.innerWidth - 20;
  var height = window.innerHeight > 414 ?
    window.innerHeight / 2 :
    window.innerHeight - 20;
  var left = (window.innerWidth - width) / 2;
  var top = (window.innerHeight - height) / 2;

  return [
    'resizable,scrollbars,status',
    'height=' + height,
    'width=' + width,
    'left=' + left,
    'top=' + top,
  ].join();
}
function prepareShareButtons() {
  $('.share-btns-container > a').each(function(index) {
    var thisJqElem = $(this);
    if (thisJqElem.attr('id') !== 'btn-share-copy-link') {
      thisJqElem.click(function(e) {
        e.preventDefault();
        var win = window.open(
          thisJqElem.attr('href'),
          thisJqElem.attr('title').replace(/\s+/g, ''),
          getShareWindowOptions()
        );
        win.opener = null;
      });
    } else {
      thisJqElem.click(function(e) { e.preventDefault(); });
    }
  });
  var clipboard = new ClipboardJS('#btn-share-copy-link', {
    text: function() { return window.location.href; }
  });
  clipboard.on('success', function(e) {
    $("#copy-link-tooltip").show().delay(2000).fadeOut();
  });
}

function enableOlderNewerBtns(navInfo) {
  var pathPrefixArr = state.locationPathNormalized.split('/');
  pathPrefixArr = pathPrefixArr.slice(0, pathPrefixArr.length-2);
  var pathPrefix = pathPrefixArr.join('/') + '/';
  if (navInfo.newerPost) {
    state.btnNewerPostElem.attr('href', pathPrefix + navInfo.newerPost + '/');
    state.btnNewerPostElem.removeClass('disabled');
  } else {
    state.btnNewerPostElem.addClass('disabled');
    state.btnNewerPostElem.click(function(e) { e.preventDefault(); });
  }
  if (navInfo.olderPost) {
    state.btnOlderPostElem.attr('href', pathPrefix + navInfo.olderPost + '/');
    state.btnOlderPostElem.removeClass('disabled');
  } else {
    state.btnOlderPostElem.addClass('disabled');
    state.btnOlderPostElem.click(function(e) { e.preventDefault(); });
  }
  state.pageNavSectionElem.removeClass('invisible');
}

function renderRelatedOrNewestPosts(posts, containerJqElem, postSummaryBluePrint) {
  var postsSummariesElements = [];
  for (var iPost = 0; iPost < posts.length; iPost++) {
    var post = posts[iPost];
    var postSummaryElem = postSummaryBluePrint.clone();
    var postLinkElem = postSummaryElem.find('.post-link');
    var postLinkHrefValue = '../' + post.name + '/';
    postLinkElem.attr('href', postLinkHrefValue);
    var postThumbnailElem = postSummaryElem.find('.post-thumbnail');
    if (post.thumbnail) {
      var thumbnailUrlOrPath = post.thumbnail.indexOf('http') === 0 ?
        post.thumbnail :
        config.homePath + post.thumbnail;
      postThumbnailElem.attr('src', thumbnailUrlOrPath);
    } else
      postThumbnailElem.remove();
    postSummaryElem.find('.post-title').text(post.title);
    var postDateStr = (typeof post.date === 'string' ? post.date : post.date.toISOString());
    var postDateElem = postSummaryElem.find('.post-date');
    postDateElem.attr('datetime', postDateStr);
    var postMoment = moment(postDateStr);
    postDateElem.text(postMoment.toDate().toLocaleDateString());
    postDateElem.parent().find('.post-ago').text(postMoment.fromNow());
    postDateElem.parent().removeClass('invisible');
    postsSummariesElements.push(postSummaryElem);
  }
  containerJqElem.append(postsSummariesElements);
}

function renderRelatedAndNewestPosts(relatedPosts, newestPosts) {
  var postSummaryBluePrint =
    $('#other-post-summary-template-section').find('.post-summary');
  postSummaryBluePrint.find('.post-cover').remove();
  postSummaryBluePrint.find('.post-description').remove();
  postSummaryBluePrint.find('.post-read-more').remove();
  postSummaryBluePrint.find('.tags-container').remove();

  var containerRelated = $('#related-posts');
  var containerNewest = $('#newest-posts');
  if (relatedPosts.length > 0) {
    renderRelatedOrNewestPosts(relatedPosts, containerRelated, postSummaryBluePrint);
    containerRelated.slideDown();
  } else {
    containerRelated.remove();
    if (newestPosts.length > 0) {
      containerNewest.addClass('no-related');
    }
  }
  if (newestPosts.length > 0) {
    renderRelatedOrNewestPosts(newestPosts, containerNewest, postSummaryBluePrint);
    containerNewest.slideDown();
  } else
    containerNewest.remove();
}

function fetchLatestPostsAndRender(thisPostName, relatedPosts) {
  $.get('../tags/latest-posts.json', function(latestPosts) {
    var posts = [];
    for (var i = 0, c = 0; c < MAX_NEWEST_POSTS && i < latestPosts.length; i++) {
      var post = latestPosts[i];
      if (post.name === thisPostName)
        continue;
      posts.push(post);
      c++;
    }
    renderRelatedAndNewestPosts(relatedPosts, posts);
  });
}

var MAX_RELATED_POSTS = 5;
var MAX_NEWEST_POSTS = 5; // not more than 10 (this value can be altered in render.js)
function fetchAndRenderRelatedAndNewestPosts() {
  var thisPostName = $('#post-id-input').attr('value');

  var ajaxRequestsForTags = [];
  var tags = $('#tags-input').attr('value').split(',');
  for (var i = 0; i < tags.length; i++) {
    var postMetasForCurrTagUrl = '../tags/'+tags[i]+'.json';
    ajaxRequestsForTags.push($.get(postMetasForCurrTagUrl));
  }

  $.when.apply(null, ajaxRequestsForTags)
    .done(function() {
      var responses = ajaxRequestsForTags.length > 1 ? arguments : [arguments];
      var skipPostsNames = [ thisPostName ];
      var relatedPostsPerTag = [];
      var nbRelatedPostsAvailable = 0;
      for (var iArg = 0; iArg < responses.length; iArg++) {
        var postsArr = responses[iArg][0];
        if (postsArr.length === 1 && $.inArray(postsArr[0].name, skipPostsNames) >= 0)
          continue;
        relatedPostsPerTag.push([]);
        for (var iPost = 0; iPost < postsArr.length; iPost++) {
          var post = postsArr[iPost];
          if ($.inArray(post.name, skipPostsNames) >= 0)
            continue;
          relatedPostsPerTag[relatedPostsPerTag.length-1].push(post);
          nbRelatedPostsAvailable++;
          skipPostsNames.push(post.name);
          // no need to gather more related posts for a tag than the maximum specified for all tags combined
          if (relatedPostsPerTag[relatedPostsPerTag.length-1].length === MAX_RELATED_POSTS)
            break;
        }
      }
      relatedPostsPerTag.sort(function(a, b) {
        if (a.length == 0 && b.length == 0)
          return 0;
        else if (a.length > 0 && b.length == 0)
          return 1;
        else if (a.length == 0 && b.length > 0)
          return -1;
        else
          return (new Date(b[0].date).getTime() - new Date(a[0].date).getTime());
      });

      var relatedPosts = [];
      var relatedPostsCounter = 0;
      var iTag = 0;
      var iRelatedPostAbs = 0;
      var iRelatedPost = 0;
      // "safety break" to prevent endless looping in case some logic error "sneaked in":
      var MAX_CYCLES = 100;
      var cycle = 0;
      // take the 1st post for each tag, then the 2nd post for each tag and so on
      // this way the finally-picked related posts will be from more diverse tags
      // (not all of them for a single tag if there were related posts for other tags)
      while (
        cycle < MAX_CYCLES &&
        relatedPostsCounter < MAX_RELATED_POSTS &&
        iTag < relatedPostsPerTag.length &&
        iRelatedPostAbs < nbRelatedPostsAvailable
      ) {
        cycle++;
        var relatedPostsForCurrTag = relatedPostsPerTag[iTag];
        if (iRelatedPost < relatedPostsForCurrTag.length) {
          relatedPosts.push(relatedPostsForCurrTag[iRelatedPost]);
          relatedPostsCounter++;
          iRelatedPostAbs++;
        }
        iTag++;
        if (iTag === relatedPostsPerTag.length) {
          iTag = 0;
          iRelatedPost++;
        }
      }
      if (cycle === MAX_CYCLES && console && console.log)
        console.log('Probably infinite loop: cycle = MAX_CYCLES = ' + cycle);
      relatedPosts.sort(function(a, b) {
        return (new Date(b.date).getTime() - new Date(a.date).getTime());
      });
      fetchLatestPostsAndRender(thisPostName, relatedPosts);
    })
    .fail(function() {
      fetchLatestPostsAndRender(thisPostName, relatedPosts);
    });
}

function setEmbeddedVideoHeight() {
  $('iframe.embedded-video').each(function(index) {
    var elem = $(this);
    var height = Math.round(elem.width() * 9/16);
    elem.attr('height', height);
  });
}

function customizeContent() {
  $('li:has(p > input[type="checkbox"])').addClass('todo-item');
  $('li:has(p > input[type="checkbox"][checked])').addClass('done');
}

function registerPageScrollListener() {
  var scrollProgressBarElem = $('#scroll-progress-bar');
  var articleElem = $('#post-body');
  var windowJq = $(window);
  windowJq.scroll(function() {
    // calculate the percentage the user has scrolled down the page
    var scrollWin = windowJq.scrollTop();
    var articleHeight = articleElem.outerHeight(false) - windowJq.height();
    if (articleHeight <= 0) return;
    var articleOffsetTop = articleElem.offset().top;
    if (scrollWin >= articleOffsetTop) {
      if(scrollWin <= (articleOffsetTop + articleHeight)){
        scrollProgressBarElem.css('width', ((scrollWin - articleOffsetTop) / articleHeight) * 100 + "%");
        scrollProgressBarElem.removeClass('complete');
      } else {
        scrollProgressBarElem.css('width',"100%");
        scrollProgressBarElem.addClass('complete');
      }
    } else {
      scrollProgressBarElem.css('width',"0px");
    }
  });
}

$(function(){
  document.addEventListener("touchstart", function(){}, true);
  renderPostDate();
  setTimeout(highlightCodeBlocks, 0);
  registerPageScrollListener();
  $('#year-placeholder').text(new Date().getFullYear());
  state.pageNavSectionElem = $('#page-nav');
  state.btnNewerPostElem = $('#btn-newer-post');
  state.btnOlderPostElem = $('#btn-older-post');
  var locPath = location.pathname;
  state.locationPathNormalized =
    locPath + (locPath.charAt(locPath.length - 1) === '/' ? '' : '/');
  var navJsonRequestSettings = {
    url: state.locationPathNormalized + 'nav.json',
    dataType: "json" // ,
    // cache: false,
    // headers: { "cache-control": "no-cache" }
  }
  $.get(navJsonRequestSettings)
    .done(enableOlderNewerBtns)
    .fail(function() { // retry
      setTimeout(function() {
        $.get(navJsonRequestSettings)
          .done(enableOlderNewerBtns)
          .fail(function() {
            state.pageNavSectionElem.addClass('hidden');
          });
      }, 1000);
    });
  prepareShareButtons();
  setEmbeddedVideoHeight();
  $(window).on("orientationchange", function(event) {
    setEmbeddedVideoHeight();
  });
  customizeContent();
  fetchAndRenderRelatedAndNewestPosts();
});
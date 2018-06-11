var state = {
  pageNavSectionElem: null,
  btnNewerPostElem: null,
  btnOlderPostElem: null,
  locationPathNormalized: null
}

function renderPostDate() {
  var postDateJqElem = $('#post-date');
  var postDateISOStr = postDateJqElem.attr('datetime');
  postDateJqElem.text(new Date(postDateISOStr).toLocaleString());
}

function highlightCodeBlocks() {
  $('pre code').each(function(i, block) {
    hljs.highlightBlock(block);
  });
}

function enableOlderNewerBtns(navInfo) {
  var pathPrefixArr = state.locationPathNormalized.split('/');
  pathPrefixArr = pathPrefixArr.slice(0, pathPrefixArr.length-2);
  var pathPrefix = pathPrefixArr.join('/') + '/';
  if (navInfo.newerPost) {
    state.btnNewerPostElem.attr('href', pathPrefix + navInfo.newerPost);
    state.btnNewerPostElem.removeClass('disabled');
  }
  if (navInfo.olderPost) {
    state.btnOlderPostElem.attr('href', pathPrefix + navInfo.olderPost);
    state.btnOlderPostElem.removeClass('disabled');
  }
  state.pageNavSectionElem.removeClass('invisible');
}

$(function(){
  renderPostDate();
  setTimeout(highlightCodeBlocks, 0);
  $('#year-placeholder').text(new Date().getFullYear());
  state.pageNavSectionElem = $('#page-nav');
  state.btnNewerPostElem = $('#btn-newer-post');
  state.btnOlderPostElem = $('#btn-older-post');
  var locPath = location.pathname;
  state.locationPathNormalized =
    locPath + (locPath.charAt(locPath.length - 1) === '/' ? '' : '/');
  var navJsonRequestSettings = {
    url: state.locationPathNormalized + 'nav.json',
    //--> Otherwise subsequent post page loads on iOS will result in GET nav.json failing :(
    //    See: http://chadschroeder.blogspot.com/2013/01/jquery-ajax-and-aggressive-ios-caching.html
    cache: false,
    headers: { "cache-control": "no-cache" }
    //<--
  }
  //==> TODO OGG: remove
  $.ajaxSetup({
    error: function(xhr, status, error) {
      alert('An AJAX error occured for request '+this.type+' ' +this.url+ '\nError: ' + error);
    }
  });
  //<==
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
});
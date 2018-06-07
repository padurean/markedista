var state = {
  btnNewerPost: null,
  btnOlderPost: null,
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
    state.btnNewerPost.attr('href', pathPrefix + navInfo.newerPost);
    state.btnNewerPost.removeClass('disabled');
  }
  if (navInfo.olderPost) {
    state.btnOlderPost.attr('href', pathPrefix + navInfo.olderPost);
    state.btnOlderPost.removeClass('disabled');
  }
}

$(function(){
  renderPostDate();
  setTimeout(highlightCodeBlocks, 0);
  $('#year-placeholder').text(new Date().getFullYear());
  state.btnNewerPost = $('#btn-newer-post');
  state.btnOlderPost = $('#btn-older-post');
  var locPath = location.pathname;
  state.locationPathNormalized =
    locPath + (locPath.charAt(locPath.length - 1) === '/' ? '' : '/');
  var navJsonRequestSettings = {
    url: state.locationPathNormalized + 'nav.json'//,
    // cache: false
  }
  $.get(navJsonRequestSettings)
    .done(enableOlderNewerBtns)
    .fail(function() { // retry
      setTimeout(function() {
        $.get(navJsonRequestSettings).done(enableOlderNewerBtns);
      }, 3000);
    });
});
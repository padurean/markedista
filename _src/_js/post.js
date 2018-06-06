var state = {
  btnNewerPost: null,
  btnOlderPost: null
}

function renderPostDate() {
  var postDateJqElem = $('#post-date');
  var postDateISOStr = postDateJqElem.attr('datetime');
  postDateJqElem.text(new Date(postDateISOStr).toLocaleString());
}

function highlightCodeBlocks() {
  $('pre code').each(function(i, block) {
    hljs.highlightBlock(block);
    hljs.lineNumbersBlock(block);
  });
}

function enableOlderNewerBtns(navInfo) {
  if (navInfo.newerPost) {
    state.btnNewerPost.attr('href', navInfo.newerPost);
    state.btnNewerPost.removeClass('disabled');
  }
  if (navInfo.olderPost) {
    state.btnOlderPost.attr('href', navInfo.olderPost);
    state.btnOlderPost.removeClass('disabled');
  }
}

$(function(){
  renderPostDate();
  setTimeout(highlightCodeBlocks, 0);
  $('#year-placeholder').text(new Date().getFullYear());
  state.btnNewerPost = $('#btn-newer-post');
  state.btnOlderPost = $('#btn-older-post');
  var navJsonRequestSettings = {
    url: './nav.json',
    cache: false
  }
  $.get(navJsonRequestSettings)
    .done(enableOlderNewerBtns)
    .fail(function() { // retry
      setTimeout(function() {
        $.get(navJsonRequestSettings).done(enableOlderNewerBtns);
      }, 3000);
    });
});
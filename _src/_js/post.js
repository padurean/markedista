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

function enableOlderNewerBtns() {
  $.get('./nav.json', function(navInfo) {
    if (navInfo.newerPost) {
      var btnNewerPost = $('#btn-newer-post');
      btnNewerPost.attr('href', navInfo.newerPost);
      btnNewerPost.removeClass('disabled');
    }
    if (navInfo.olderPost) {
      var btnOlderPost = $('#btn-older-post');
      btnOlderPost.attr('href', navInfo.olderPost);
      btnOlderPost.removeClass('disabled');
    }
  });
}

$(function(){
  renderPostDate();
  setTimeout(highlightCodeBlocks, 0);
  $('#year-placeholder').text(new Date().getFullYear());
  enableOlderNewerBtns();
});
var state = {
  postsPath: '/posts/',
  postsJsonPath: '/posts/posts.json'
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

function enableOlderNewerBtns() {
  var pathPiecesArr = window.location.pathname.split('/');
  var htmlFileName = pathPiecesArr[pathPiecesArr.length-1];
  $.get(state.postsJsonPath, function(posts) {
    if (posts.length <= 1)
      return;
    var currPostIndex = -1;
    if (posts.findIndex) {
      currPostIndex = posts.findIndex(function(elem) {
        return elem[1].htmlFileName === htmlFileName;
      });
    } else {
      for (var i = 0; i < posts.length; i++) {
        var post = state.posts[i];
        if (post[1].htmlFileName === htmlFileName) {
          currPostIndex = i;
          break;
        }
      }
    }
    if (currPostIndex < 0)
      return;
    if (currPostIndex > 0) {
      var btnNewerPost = $('#btn-newer-post');
      btnNewerPost.attr('href', state.postsPath + posts[currPostIndex-1][1].htmlFileName);
      btnNewerPost.removeClass('disabled');
    }
    if (currPostIndex < posts.length-1) {
      var btnOlderPost = $('#btn-older-post');
      btnOlderPost.attr('href', state.postsPath + posts[currPostIndex+1][1].htmlFileName);
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
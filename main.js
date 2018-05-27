var state = {
  postsPath: './posts/',
  postsJsonPath: './posts/posts.json',
  pageSize: 2,
  currPage: 1,
  posts: [],
  nbPages: 0,
  postsJqElem: null,
  btnOlderJqElem: null,
  btnNewerJqElem: null
}
function indexOf(search, arr) {
  return arr.indexOf ? arr.indexOf(search) : $.inArray(search, arr);
}
function postToHtml(post) {
  var date = new Date(post.date).toLocaleString();
  var postPath = state.postsPath + post.htmlFileName;
  var postHtml =
    '\t<article class="post-summary">\n' +
    '\t\t<a href="' + postPath + '"><h2 id="post-title" class="post-title">' + post.title + '</h2></a>\n' +
    '\t\t<time id="post-date" class="post-date" datetime="' + post.date + '">' + date + '</time>\n' +
    '\t\t<p>' + post.description + '</p>\n' +
    '\t</article>';
  return postHtml;
}
function renderPostsPage() {
  var postsHtmlArr = ['\n'];
  for (
    var i = (state.currPage-1) * state.pageSize;
    i < state.currPage * state.pageSize && i < state.posts.length;
    i++
  ) {
    var post = state.posts[i][1];
    postsHtmlArr.push(postToHtml(post));
  }
  state.postsJqElem.html(postsHtmlArr.join('\n'));
}
function renderPostsForTag(tag) {
  var postsHtmlArr = [ '\n\t<span>Posts with tag</span> <a>'+tag+'</a>:' ];
  for (var i = 0; i < state.posts.length; i++) {
    var post = state.posts[i][1];
    if (indexOf(tag, post.tags) >= 0)
      postsHtmlArr.push(postToHtml(post));
  }
  postsHtmlArr.push(
    '\t<br><a href="#" class="btn" onclick="window.history.go(-1); return false;">' +
    '<span class="btn-arrow-icon">&laquo;</span> Go Back</a><br>\n'
  );
  state.postsJqElem.html(postsHtmlArr.join('\n'));
}
function goToCurrentPage() {
  var newUrl = state.currPage > 1 ? './?page='+state.currPage : './';
  if (history.pushState) {
    window.history.pushState('', '', newUrl)
    renderPostsPage();
  } else {
    window.location = newUrl;
  }
}
function toggleNextPrevPageBtns() {
  if (state.currPage === state.nbPages) {
    state.btnOlderJqElem.addClass('disabled');
  } else {
    state.btnOlderJqElem.removeClass('disabled');
  }
  if (state.currPage === 1) {
    state.btnNewerJqElem.addClass('disabled');
  } else {
    state.btnNewerJqElem.removeClass('disabled');
  }
}
function goToNextPageClb(e) {
  e.preventDefault();
  if (state.nbPages > 1 && state.currPage < state.nbPages) {
    state.currPage++;
    toggleNextPrevPageBtns();
    goToCurrentPage();
  }
}
function goToPrevPageClb(e) {
  e.preventDefault();
  if (state.nbPages > 1 && state.currPage > 1) {
    state.currPage--;
    toggleNextPrevPageBtns();
    goToCurrentPage();
  }
}
$(function(){
  $.get(state.postsJsonPath, function(posts) {
    state.posts = posts;
    state.nbPages = Math.ceil(state.posts.length / state.pageSize);
    state.postsJqElem = $('#posts');
    state.btnOlderJqElem = $('#btn-older');
    state.btnNewerJqElem = $('#btn-newer');
    var tag = null;
    var queryParamsArr = location.search.replace('?', '').split('=');
    if (queryParamsArr.length >= 2) {
      // tags view
      var indexOfTag = indexOf('tag', queryParamsArr);
      if (indexOfTag >= 0 && indexOfTag < queryParamsArr.length-1) {
        tag = queryParamsArr[indexOfTag + 1];
      }
      // posts view
      else {
        if (state.nbPages > 1) {
          var indexOfPage = indexOf('page', queryParamsArr);
          if (indexOfPage >= 0 && indexOfPage < queryParamsArr.length-1)
            state.currPage = parseInt(queryParamsArr[indexOfPage + 1]);
        }
      }
    }
    if (!tag) {
      renderPostsPage();
      state.btnOlderJqElem.on('click', goToNextPageClb);
      state.btnNewerJqElem.on('click', goToPrevPageClb);
      toggleNextPrevPageBtns();
    } else {
      state.btnOlderJqElem.hide();
      state.btnNewerJqElem.hide();
      renderPostsForTag(tag);
    }
    $('#year-placeholder').text(new Date().getFullYear());
  });
});
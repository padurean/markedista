var config = {
  htmlOutputDirPath: '../posts/',
  homePath: '../'
};
var state = {
  tags: [],
  allTags: null,
  filteredPosts: [],
  showOnlyPostsMatchingAllTags: true,
  showAllTags: false,
  filterViewElem: null,
  postSummaryTemplateSectionElem: null,
  postsSectionElem: null,
  btnAllTagsElem: null,
  btnClearTagsElem: null,
  postsCountElem: null
};

function extractQueryParam(name, defaultValue) {
  var value = defaultValue;
  var queryParamsArr = location.search.replace('?', '').split('&');
  for (var i = 0; i < queryParamsArr.length; i++) {
    var currQuery = queryParamsArr[i];
    if (currQuery.indexOf(name+'=') === 0) {
      var currQueryArr = currQuery.split('=');
      if (currQueryArr.length === 2)
        value = currQueryArr[1].trim();
      break;
    }
  }
  return value;
}

function updatedQueryString(name, updatedValue) {
  var updated = [];
  var queryParamsArr = location.search.replace('?', '').split('&');
  var namAlreadyInQuery = false;
  for (var i = 0; i < queryParamsArr.length; i++) {
    var currQuery = queryParamsArr[i];
    var updatedQuery = currQuery;
    if (currQuery.indexOf(name+'=') === 0) {
      var currQueryArr = currQuery.split('=');
      if (currQueryArr.length === 2)
        currQueryArr[1] = updatedValue;
      updatedQuery = currQueryArr.join('=');
      namAlreadyInQuery = true;
    }
    updated.push(updatedQuery);
  }
  if (!namAlreadyInQuery) {
    updated.push(name + '=' + updatedValue);
  }
  if (updated.length > 0)
    return ('?' + updated.join('&'));
  else
    return '';
}

function getTagsFromQueryParams() {
  var tagsArr = [];
  var tagsStr = extractQueryParam('tags', '');
  if (tagsStr.length > 0) {
    var tagsArrNonUnique = tagsStr.split(',');
    for (var iTagNonUnique = 0; iTagNonUnique < tagsArrNonUnique.length; iTagNonUnique++) {
      var tag = tagsArrNonUnique[iTagNonUnique];
      if ($.inArray(tag, tagsArr) < 0)
        tagsArr.push(tag);
    }
  }
  return tagsArr;
}

function updateTagsInQueryParams(updatedTags) {
  if (updatedTags.length === 0) {
    location = '..'; // go home
    return;
  }
  location.search = updatedQueryString('tags', updatedTags.join(','));
}

function getShowAllTagsFromQueryParams() {
  return extractQueryParam('showAllTags', false) === 'true';
}

function removeTagClb(event, tag) {
  event.preventDefault();
  var updatedTags = [];
  for (var i = 0; i < state.tags.length; i++) {
    var currTag = state.tags[i];
    if (currTag !== tag)
      updatedTags.push(currTag);
  }
  updateTagsInQueryParams(updatedTags);
}

function addTagClb(event, tag) {
  event.preventDefault();
  state.tags.push(tag);
  updateTagsInQueryParams(state.tags);
}

function tagToBtnHtml(tag, isFilteredTag) {
  var unfiltered = isFilteredTag ? '' : ' unfiltered';
  var clb = isFilteredTag ? 'remove' : 'add';
  var title = isFilteredTag ? 'Remove' : 'Add';
  var diezColor = isFilteredTag ? 'gold' : 'aliceblue';
  var iconClass = isFilteredTag ? 'remove' : 'add';
  var icon = isFilteredTag ? '-' : '+';
  return '<a href="#" onclick="' + clb + 'TagClb(event, \'' + tag + '\');" class="btn' +
    unfiltered + '"' + ' title="' + title + ' tag"><span class="' +diezColor + '-text">&num;</span>' +
    tag + '<span class="' + iconClass + '-icon">' + icon + '</span></a>';
}

function renderFilterView() {
  var tagsBtnsHtmlArr = [];
  var tags = state.showAllTags && state.allTags && state.allTags.length > 0 ?
    state.allTags : state.tags;
  for (var i = 0; i < tags.length; i++) {
    var tag = tags[i];
    var isFilteredTag = $.inArray(tag, state.tags) >= 0;
    tagsBtnsHtmlArr.push(tagToBtnHtml(tag, isFilteredTag));
  }
  state.filterViewElem.html(tagsBtnsHtmlArr.join(''));
  state.btnClearTagsElem.removeClass('invisible');
}

function renderFilteredPosts() {
  if (state.filteredPosts.length === 0) {
    state.postsSectionElem.html('');
    state.postsCountElem.text('No Posts');
    return;
  }
  state.postsCountElem.text('Rendering ' + state.filteredPosts.length + ' posts ...');
  var postSummaryBluePrint = state.postSummaryTemplateSectionElem.find('.post-summary');
  var postsSummariesElements = [];
  for (var i = 0; i < state.filteredPosts.length; i++) {
    var post = state.filteredPosts[i];
    var postSummaryElem = postSummaryBluePrint.clone();
    var postLinkElem = postSummaryElem.find('.post-link');
    var postLinkHrefValue = config.htmlOutputDirPath + post.name + '/';
    postLinkElem.attr('href', postLinkHrefValue);
    postSummaryElem.find('.post-read-more').attr('href', postLinkHrefValue);
    
    var postThumbnailElem = postSummaryElem.find('.post-thumbnail');
    if (post.thumbnail) {
      var thumbnailUrlOrPath = post.thumbnail.indexOf('http') === 0 ?
        post.thumbnail :
        config.homePath + post.thumbnail;
      postThumbnailElem.attr('src', thumbnailUrlOrPath);
    } else
      postThumbnailElem.remove();

    var postCoverElem = postSummaryElem.find('.post-cover');
    if (post.cover) {
      var coverUrlOrPath = post.cover.indexOf('http') === 0 ?
        post.cover :
        config.homePath + post.cover;
      postCoverElem.attr('src', coverUrlOrPath);
    } else
      postCoverElem.remove();

    postSummaryElem.find('.post-title').text(post.title);
    var postDateStr = (typeof post.date === 'string' ? post.date : post.date.toISOString());
    var postDateElem = postSummaryElem.find('.post-date');
    postDateElem.attr('datetime', postDateStr);
    var postMoment = moment(postDateStr);
    postDateElem.text(postMoment.toDate().toLocaleDateString());
    postDateElem.parent().find('.post-ago').text(postMoment.fromNow());
    postDateElem.parent().removeClass('invisible');
    postSummaryElem.find('.post-description').text(post.description);
    var tagsHtmlArr = [];
    for (var iTag = 0; iTag < post.tags.length; iTag++) {
      var tag = post.tags[iTag];
      var isFilteredTag = $.inArray(tag, state.tags) >= 0;
      var clbName = isFilteredTag ? 'removeTagClb' : 'addTagClb';
      var tooltip = isFilteredTag ? 'Remove tag' : 'Add tag';
      var htmlClass = isFilteredTag? ' class="filtered-tag-link"' : '';
      tagsHtmlArr.push(
        '<a href="#" onclick="' + clbName + '(event, \'' + tag + '\');" title="' + tooltip + '"'
        + htmlClass + '><span class="grey-text">&num;</span>'+tag+'</a>');
    }
    postSummaryElem.find('.post-tags').html(tagsHtmlArr.join(' '));
    postsSummariesElements.push(postSummaryElem);
  }
  state.postsSectionElem.text('');
  state.postsSectionElem.append(postsSummariesElements);
  var nbPosts = postsSummariesElements.length;
  var nbPostsInfo = nbPosts > 0 ?
    (nbPosts > 1 ? nbPosts + ' Posts:' : '1 Post:') :
    'No Posts';
  state.postsCountElem.text(nbPostsInfo);
}

function fetchAndRenderPostsForTags() {
  state.postsCountElem.text('Loading posts ...');
  state.postsCountElem.removeClass('invisible');

  var ajaxRequestsForTags = [];
  for (var i = 0; i < state.tags.length; i++) {
    var postMetasForCurrTagUrl = '../posts/tags/'+state.tags[i]+'.json';
    ajaxRequestsForTags.push($.get(postMetasForCurrTagUrl));
  }
  
  $.when.apply(null, ajaxRequestsForTags)
    .done(function() {
      var filteredPosts = [];
      var filteredPostsNames = [];
      var responses = ajaxRequestsForTags.length > 1 ? arguments : [arguments];
      for (var iArg = 0; iArg < responses.length; iArg++) {
        var postsArr = responses[iArg][0];
        if (state.showOnlyPostsMatchingAllTags) {
          for (var iPost = 0; iPost < postsArr.length; iPost++) {
            var post = postsArr[iPost];
            if ($.inArray(post.name, filteredPostsNames) >= 0)
              continue;
            var matchingTagsCounter = 0;
            for (var iTag = 0; iTag < state.tags.length; iTag++) {
              var tag = state.tags[iTag];
              if ($.inArray(tag, post.tags) >= 0)
                matchingTagsCounter++;
            }
            if (matchingTagsCounter ===  state.tags.length) {
              filteredPosts.push(post);
              filteredPostsNames.push(post.name);
            }
          }
        } else {
          for (var iTag = 0; iTag < state.tags.length; iTag++) {
            var tag = state.tags[iTag];
            for (var iPost = 0; iPost < postsArr.length; iPost++) {
              var post = postsArr[iPost];
              if ($.inArray(tag, post.tags) >= 0 && $.inArray(post.name, filteredPostsNames) < 0) {
                filteredPosts.push(post);
                filteredPostsNames.push(post.name);
              }
            }
          }
        }
      }
      filteredPosts.sort(function(a, b) {
        return (new Date(b.date).getTime() - new Date(a.date).getTime());
      });
      state.filteredPosts = filteredPosts;
      renderFilteredPosts();
    })
    .fail(function() {
      renderFilteredPosts();
    });
}

function showAllTags() {
  state.btnAllTagsElem.removeClass('show');
  state.btnAllTagsElem.addClass('hide');
  state.btnAllTagsElem.removeClass('invisible');
  if (state.allTags) {
    renderFilterView();
  } else {
    $.get('../posts/tags/all-tags.json', function(allTags) {
      state.allTags = [];
      for (var i = 0; i < allTags.length; i++) {
        var tag = allTags[i][0];
        if ($.inArray(tag, state.allTags))
          state.allTags.push(tag);
      }
      renderFilterView();
    });
  }
}
function hideAllTags() {
  state.btnAllTagsElem.removeClass('hide');
  state.btnAllTagsElem.addClass('show');
  state.btnAllTagsElem.removeClass('invisible');
  renderFilterView();
}

function pushState(query, clb) {
  if ('pushState' in history) {
    clb();
    history.pushState("", document.title, location.pathname + query);
  } else {
    location = location.pathname + query;
  }
}

function showOrHideAllTags() {
  if (state.showAllTags)
    showAllTags();
  else
    hideAllTags();
}

function allTagsClb(event) {
  event.preventDefault();
  state.showAllTags = !state.showAllTags;
  var updatedQuery = updatedQueryString('showAllTags', state.showAllTags);
  pushState(updatedQuery, showOrHideAllTags)
}

$(function() {
  document.addEventListener("touchstart", function(){}, true);
  var tags = getTagsFromQueryParams();
  if (tags.length > 0) {
    state.tags = tags;
    state.showAllTags = getShowAllTagsFromQueryParams();
    state.filterViewElem = $('#tags-filter-view');
    state.postSummaryTemplateSectionElem = $('#post-summary-template-section');
    state.postsSectionElem = $('#posts');
    state.btnAllTagsElem = $('#btn-all-tags');
    state.btnAllTagsElem.click(allTagsClb);
    state.btnClearTagsElem = $('#btn-clear-tags');
    state.postsCountElem = $('#posts-count');
    showOrHideAllTags();
    fetchAndRenderPostsForTags();
  } else {
    alert('No tag specified.');
  }
  $('#year-placeholder').text(new Date().getFullYear());
});
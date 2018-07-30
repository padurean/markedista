$(function(){
  $('.post-date').each(function(index) {
    var postDateJqElem = $(this);
    var postDateISOStr = postDateJqElem.attr('datetime');
    postDateJqElem.text(new Date(postDateISOStr).toLocaleString());
    postDateJqElem.parent().animate( { opacity: 1 }, 1000 );
    // OR:
    // postDateJqElem.parent().removeClass('invisible');
  });
  $('#year-placeholder').text(new Date().getFullYear());
});
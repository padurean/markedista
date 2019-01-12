$(function(){
  document.addEventListener("touchstart", function(){}, true);
  $('.post-date').each(function(index) {
    var postDateJqElem = $(this);
    var postMoment = moment(postDateJqElem.attr('datetime'));
    postDateJqElem.text(postMoment.toDate().toLocaleDateString());
    postDateJqElem.parent().find('.post-ago').text(postMoment.fromNow());
    postDateJqElem.parent().animate( { opacity: 1 }, 1000 );
    // OR:
    // postDateJqElem.parent().removeClass('invisible');
  });
  $('#year-placeholder').text(new Date().getFullYear());
});
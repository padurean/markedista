$(function(){
  $('.post-date').text(function(i, origText) {
    return new Date(origText).toLocaleString();
  });
  $('#year-placeholder').text(new Date().getFullYear());
});
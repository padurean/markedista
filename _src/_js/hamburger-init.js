$(function(){
  var hamburgerJqElem = $('.hamburger');
  var navMainJqElem = $('#nav-main');
  hamburgerJqElem.on('click', function(e) {
    hamburgerJqElem.toggleClass('is-active');
    navMainJqElem.slideToggle(250);
  });
});
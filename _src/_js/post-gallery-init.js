$(function(){
  var imgs = $('.full-post .post-body img');
  imgs.css('cursor', 'pointer');
  imgs.featherlightGallery({
    targetAttr: 'src',
    previousIcon: '&#9001;'/*'&#9664;'*/,     /* Code that is used as previous icon */
    nextIcon: '&#9002;'/*'&#9654;'*/,         /* Code that is used as next icon */
    galleryFadeIn: 200,          /* fadeIn speed when slide is loaded */
    galleryFadeOut: 200          /* fadeOut speed before slide is loaded */
  });
});
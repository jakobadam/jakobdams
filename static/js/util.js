// Convert an element to an email link, e.g.,
// <span class="email">
//   <span class="user">user</span>
//   <span class="domain">domain</span>
//</span>
// to an email link
jQuery.fn.email = function(){
  return this.each(function(){
    var to = ['m', 'a', 'ilto'].join('');
    var node = $(this);
    var domain = node.find('.domain').text();
    var user = node.find('.user').text();
    var m = '<a href="' + to + ':' + user + '&#64;' + domain + '">' + user + '&#64;' + domain + '</a>'; 
    node.html(m);
  });
};

// Placeholder logic for input elements
jQuery.fn.hint = function (blurClass) {
  return this.each(function () {
    if (!blurClass) { 
      blurClass = 'blur';
    }
    var $input = jQuery(this),
        title = $input.attr('placeholder'),
        $form = jQuery(this.form),
        $win = jQuery(window);

    function remove() {
      if ($input.val() === title && $input.hasClass(blurClass)) {
        $input.val('').removeClass(blurClass);
      }
    }

    if (title) { 
      $input.blur(function () {
        if (this.value === '') {
          $input.val(title).addClass(blurClass);
        }
      }).focus(remove).blur();
      $form.submit(remove);
      $win.unload(remove);
    }
  });
};

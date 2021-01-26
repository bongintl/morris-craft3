/* global $ */
module.exports = page => {
    $('.entry--accordion .entry__image, .entry--accordion .entry__caption, .entry--accordion .entry__caption--secondary', page).click(function(){
        
        let $parent = $(this).parent('.entry--accordion');
        let $body = $parent.find('.entry__body');
        $body.slideToggle();
        console.log('test');
        
    });
}
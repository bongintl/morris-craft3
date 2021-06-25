/* global $ */
module.exports = page => {
  $(".list:not(.list--expanded) .list__title", page).click(function () {
    $(this)
      .siblings(".list__items")
      .slideToggle("slow", function () {});
  });
  $(".list:not(.list--expanded) .item__title", page).click(function () {
    $(this)
      .siblings(".item__content")
      .slideToggle("slow", function () {});
  });
};

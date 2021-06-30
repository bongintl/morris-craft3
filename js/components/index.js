var config = require("../config");

var fns = [
  // require('./page'),
  require("./vw"),
  require("./title"),
  require("./accordion"),
  require("./menu"),
  require("./filter"),
  require("./map/map"),
  require("./asset"),
  require("./slide-toggle"),
  require("./contact-map"),
];

module.exports = (ctx, next) => {
  fns.forEach(fn => ctx.elements.pages.forEach(page => fn(page, ctx)));
  next();
};

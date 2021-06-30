require("custom-event-polyfill");
var queryString = require("query-string");
var page = require("page");

var panels = require("./panels");
var pages = require("./pages");
var slider = require("./slider");
var loadTemplate = require("./utils/loadTemplate");
// var initialHTML = require('./utils/initialHTML')
var transition = require("./transition");
var components = require("./components");
var layouts = require("./layouts");
var { BREAKPOINT } = require("./config");

var firstLoad = true;

document.body.classList.add("color--" + (new Date().getHours() % 8));

var wrap = fn => (ctx, next) => {
  var r = fn(ctx);
  r instanceof Promise ? r.then(next) : next();
};
var route = (path, panelSizes) => {
  page(
    path,
    wrap(() => {
      if (firstLoad) {
        document.body.classList.remove("cloak");
        panels.animate(layouts.slider(), 0, 0);
      }
    }),
    slider,
    loadTemplate,
    transition,
    pages,
    components,
    wrap(ctx => {
      var sizes = panelSizes();
      var query = queryString.parse(ctx.querystring);
      var side = Number(query.side || 0);
      return panels.animate(sizes, panels.getOffset(sizes, side));
    }),
    () => (firstLoad = false)
  );
  // page.exit( path, wrap(() => document.body.classList.remove( 'route_' + name )))
};

// Specify all routes explicitly, because using a wildcard breaks linking to assets

route("/", layouts.menu);

route("/work/:slug", layouts.default);

route("/about", layouts.menu);
route("/about/:slug", layouts.default);
route("/people", layouts.menu);
route("/people/:slug", layouts.default);
route("/awards", layouts.menu);
route("/contact", layouts.menu);

route("/voices", layouts.menu);
route("/voices/:slug", layouts.default);

route("/map", layouts.default);

route("/all", layouts.menu);

page();

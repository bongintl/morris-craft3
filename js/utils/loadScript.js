const promises = {};

const loadScript = url => {
    if (!promises[url]) {
        promises[url] = new Promise(resolve => {
            var script = document.createElement( 'script' );
            script.onload = resolve;
            script.type = 'text/javascript';
            script.src = url;
            document.body.appendChild( script );
        })
    }
    return promises[url];
}


module.exports = loadScript
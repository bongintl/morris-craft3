const wait = delay => new Promise(resolve => setTimeout(resolve, delay));

var pages = [ null, null ];
var panels = [ ...document.querySelectorAll( '.panel' ) ];

var back = null;
var backContainer = document.querySelector('.divider__back');

var title = null;
var titleContainer = document.body;

var fadeOut = el => {
    el.style.opacity = 0;
    return wait(1000)
        .then(() => el.parentNode.removeChild( el ))
}
var fadeIn = ( container, el ) => {
    el.style.opacity = 0;
    container.appendChild( el );
    el.dispatchEvent( new CustomEvent('resize', { detail: container.getBoundingClientRect().width }))
    return wait(100).then(() => el.style.opacity = 1)
}

var transition = ( container, oldEl, newEl ) => {
    if ( oldEl && newEl && oldEl.id !== '' && oldEl.id === newEl.id ) {
        newEl.dataset.skipped = true;
        return oldEl;
    }
    if ( oldEl )
        fadeOut( oldEl )
            .then(() => oldEl.dispatchEvent(new CustomEvent("remove")));
    if ( newEl ) fadeIn( container, newEl );
    return newEl;
}

panels.forEach( ( panel, i ) => {
    panel.addEventListener( 'resize', ({ detail }) => {
        if ( !pages[ i ] ) return;
        var w = pages[ i ].getBoundingClientRect().width;
        pages[ i ].dispatchEvent( new CustomEvent( 'resize', { detail: w } ));
    })
})

module.exports = ( ctx, next ) => {
    var nextPages = [ ...ctx.document.querySelectorAll( '.page' ) ];
    var nextBack = ctx.document.querySelector( '.divider__back a' );
    var nextTitle = ctx.document.querySelector( '.title' );
    pages[ 0 ] = transition( panels[ 0 ], pages[ 0 ], nextPages[ 0 ] );
    pages[ 1 ] = transition( panels[ 1 ], pages[ 1 ], nextPages[ 1 ] );
    back = transition( backContainer, back, nextBack );
    title = transition( titleContainer, title, nextTitle );
    ctx.elements = {
        title,
        back,
        pages: pages.filter( ( p, i ) => nextPages[ i ] === p )
    }
    next();
}
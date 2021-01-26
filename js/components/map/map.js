const styles = require('./mapStyles.js')
const loadScript = require('../../utils/loadScript');

const dispatch = (eventName, detail) =>
    window.dispatchEvent(new CustomEvent(eventName, { detail }))
const listen = events => {
    for (const eventName in events) {
        window.addEventListener(eventName, events[eventName]);
    };
    return () => {
        for ( const eventName in events ) {
            window.removeEventListener(eventName, events[eventName]);
        }
    }
}

const initMap = (containerEl, page) => {
    /* global google */
    const { Map, LatLng, LatLngBounds, OverlayView } = google.maps;
    const mapEl = containerEl.querySelector('.map-container__map');
    const map = new Map( mapEl, {
        zoom: 1,
        center: new google.maps.LatLng( 0, 0 ),
        mapTypeControl: false,
        zoomControl: false,
        streetViewControl: false,
        rotateControl: false,
        fullscreenControl: false,
        scrollwheel: false,
        styles: styles.noLabels,
        gestureHandling: 'greedy'
    });
    
    const containPoints = points => {
        const bounds = new LatLngBounds();
        points.forEach(point => bounds.extend(point));
        map.fitBounds(bounds);
    }
    
    class MocoOverlay extends OverlayView {
        constructor (elements) {
            super()
            this.items = elements.map(element => ({
                element,
                latLng: new LatLng(Number( element.dataset.lat ), Number( element.dataset.lng )),
                category: element.dataset.category
            }))
            this.containerOverlay = document.createElement('div');
            this.containerOverlay.classList.add("map-container__overlay");
            this.containerOverlay.addEventListener("click", e => {
                e.stopPropagation();
                this.setActive(null)
            });
            elements.forEach((element, i) => {
                element.addEventListener('click', e => {
                    e.stopPropagation();
                    this.setActive(i)
                })
            })
            containPoints(this.items.map(item => item.latLng))
        }
        onAdd() {
            const panes = this.getPanes();
            panes.overlayMouseTarget.appendChild(this.containerOverlay); 
            this.items.forEach(item => {
                panes.overlayMouseTarget.appendChild(item.element);    
            })
        }
        draw() {
            const projection = this.getProjection();
            this.items.forEach(({ element, latLng }) => {
                const position = projection.fromLatLngToDivPixel( latLng )
                element.style.transform = `translate(${position.x}px, ${position.y}px`;
            })
        }
        updateFilters (filterState) {
            const points = [];
            this.items.forEach(item => {
                item.element.classList.toggle("map-item_hidden", !filterState[item.category]);
                if ( filterState[item.category] ) points.push(item.latLng);
            })
            if (points.length) containPoints(points);
        }
        setActive (index) {
            this.items.forEach((item, i) => item.element.classList.toggle("map-item_active", i === index));
            this.containerOverlay.classList.toggle('map-container__overlay_active', index !== null)
        }
    }
    const overlay = new MocoOverlay([...containerEl.querySelectorAll('.map-item')]);
    overlay.setMap(map);
    
    const controls = containerEl.querySelector(".map-container__controls")
    controls.children[0].addEventListener('click', () => {
        map.setZoom(map.getZoom() + 1)
    })
    controls.children[1].addEventListener('click', () => {
        map.setZoom(map.getZoom() - 1)
    })
    
    const cleanup = listen({
        "filterUpdate": ({ detail: state }) => {
            overlay.updateFilters(state)
        },
        "setView": ({detail: {lat, lng, zoom}}) => {
            map.panTo(new LatLng(lat, lng));
            map.setZoom(zoom);
        }
    })
    
    page.addEventListener("remove", cleanup);
    mapEl.addEventListener("click", () => overlay.setActive(null));
}

const initControls = (containerEl) => {
    const filters = [...containerEl.querySelectorAll('.map-filters__category')]
    const filterState = filters.reduce((state, el) => {
        state[el.dataset.filter] = true;
        return state;
    }, {})
    const update = (newValues) => {
        for (const key in newValues ) filterState[key] = newValues[key];
        filters.forEach(el => {
            const isActive = filterState[el.dataset.filter];
            el.classList.toggle("map-filters__category_active", isActive)
        })
        dispatch("filterUpdate", filterState);
    }
    filters.forEach(el => {
        el.addEventListener("click", () => {
            const newFilters = {};
            filters.forEach(el2 => newFilters[el2.dataset.filter] = el2 === el);
            update(newFilters)
        })
    })
    containerEl.querySelector(".map-filters__clear").addEventListener("click", e => {
        update(filters.reduce((state, el) => {
            state[el.dataset.filter] = true;
            return state;
        }, {}))
    })
    const views = [...containerEl.querySelectorAll(".map-views__view")];
    views.forEach(el => {
        el.addEventListener("click", () => {
            dispatch("setView", {
                lng: Number(el.dataset.lng),
                lat: Number(el.dataset.lat),
                zoom: Number(el.dataset.zoom)
            })
        })
    })
}

module.exports = (page, context) => {
    const mapContainerEl = page.querySelector('.map-container');
    if ( mapContainerEl ) {
        loadScript( `https://maps.googleapis.com/maps/api/js?key=${ mapContainerEl.dataset.apiKey }` )
            .then(() => initMap(mapContainerEl, page))
    }
    const mapControlsEl = page.querySelector('.map-controls');
    if (mapControlsEl) {
        initControls(mapControlsEl);
    }
}
 
const pagejs = require("page");
const styles = require("./mapStyles.js");
const loadScript = require("../../utils/loadScript");
const panels = require("../../panels");

const dispatch = (eventName, detail) =>
  window.dispatchEvent(new CustomEvent(eventName, { detail }));
const listen = events => {
  for (const eventName in events) {
    window.addEventListener(eventName, events[eventName]);
  }
  return () => {
    for (const eventName in events) {
      window.removeEventListener(eventName, events[eventName]);
    }
  };
};

const initMap = (containerEl, page) => {
  /* global google */
  const { Map, LatLng, LatLngBounds, OverlayView, Point } = google.maps;
  const mapEl = containerEl.querySelector(".map-container__map");
  const map = new Map(mapEl, {
    zoom: 1,
    center: new google.maps.LatLng(0, 0),
    mapTypeControl: false,
    zoomControl: false,
    streetViewControl: false,
    rotateControl: false,
    fullscreenControl: false,
    scrollwheel: false,
    styles: styles.noLabels,
    gestureHandling: "greedy",
  });

  const containPoints = points => {
    const bounds = new LatLngBounds();
    points.forEach(point => bounds.extend(point));
    map.fitBounds(bounds);
  };

  class MocoOverlay extends OverlayView {
    constructor() {
      super();
      const mapItems = [...containerEl.querySelectorAll(".map-item")];
      const previews = [
        ...containerEl.querySelectorAll(".map-container__preview"),
      ];
      this.items = mapItems.map((element, i) => ({
        element,
        previewElement: previews[i],
        latLng: new LatLng(
          Number(element.dataset.lat),
          Number(element.dataset.lng)
        ),
        categories: element.dataset.categories.split(","),
      }));
      this.containerOverlay = document.createElement("div");
      this.containerOverlay.classList.add("map-container__overlay");
      this.containerOverlay.addEventListener("click", e => {
        e.stopPropagation();
        this.setActive(null);
      });
      this.items.forEach(({ element }, i) => {
        element.addEventListener("click", e => {
          e.stopPropagation();
          this.setActive(i);
        });
        element.querySelector("a").addEventListener("click", e => {
          e.stopPropagation();
          pagejs.clickHandler(e);
        });
      });
      containPoints(this.items.map(item => item.latLng));
    }
    onAdd() {
      const panes = this.getPanes();
      panes.overlayMouseTarget.appendChild(this.containerOverlay);
      this.items.forEach(item => {
        panes.overlayMouseTarget.appendChild(item.element);
      });
    }
    draw() {
      const projection = this.getProjection();
      this.items.forEach(({ element, latLng }) => {
        const position = projection.fromLatLngToDivPixel(latLng);
        element.style.transform = `translate(${position.x}px, ${position.y}px`;
      });
    }
    updateFilter(filter) {
      const points = [];
      this.items.forEach(item => {
        const matchesFilter =
          filter === null ||
          item.categories.some(category => category === filter);
        item.element.classList.toggle("map-item_hidden", !matchesFilter);
        if (matchesFilter) points.push(item.latLng);
      });
      if (points.length) containPoints(points);
      panels.focus(1);
    }
    setActive(index) {
      this.items.forEach((item, i) => {
        item.element.classList.toggle("map-item_active", i === index);
        item.previewElement.classList.toggle(
          "map-container__preview_active",
          i === index
        );
      });
      this.containerOverlay.classList.toggle(
        "map-container__overlay_active",
        index !== null
      );
      if (index !== null) {
        this.centerItem(this.items[index]);
        panels.focus(1);
      }
    }
    centerItem(item) {
      const markerRect = item.element.getBoundingClientRect();
      const contentRect = item.element
        .querySelector(".map-item__content")
        .getBoundingClientRect();
      const markerCenter = [
        markerRect.left + markerRect.width / 2,
        markerRect.top + markerRect.height / 2,
      ];
      const contentHidden = contentRect.width === 0 && contentRect.height === 0;
      const contentCenter = contentHidden
        ? markerCenter
        : [
            contentRect.left + contentRect.width / 2,
            contentRect.top + contentRect.height / 2,
          ];
      const offset = [
        markerCenter[0] - contentCenter[0],
        markerCenter[1] - contentCenter[1],
      ];
      const scale = Math.pow(2, map.getZoom());
      const worldCoordinateCenter = map
        .getProjection()
        .fromLatLngToPoint(item.latLng);
      const pixelOffset = new Point(
        offset[0] / scale || 0,
        offset[1] / scale || 0
      );
      const worldCoordinateNewCenter = new google.maps.Point(
        worldCoordinateCenter.x - pixelOffset.x,
        worldCoordinateCenter.y - pixelOffset.y
      );
      const newCenter = map
        .getProjection()
        .fromPointToLatLng(worldCoordinateNewCenter);
      map.panTo(newCenter);
    }
  }
  const overlay = new MocoOverlay();
  overlay.setMap(map);

  const controls = containerEl.querySelector(".map-container__controls");
  controls.children[0].addEventListener("click", () => {
    map.setZoom(map.getZoom() + 1);
  });
  controls.children[1].addEventListener("click", () => {
    map.setZoom(map.getZoom() - 1);
  });

  const cleanup = listen({
    filterUpdate: ({ detail: { filter, color } }) => {
      overlay.updateFilter(filter);
      containerEl.style.setProperty("--filter-color", color || "");
    },
    setView: ({ detail: { lat, lng, zoom } }) => {
      map.panTo(new LatLng(lat, lng));
      map.setZoom(zoom);
    },
  });

  page.addEventListener("remove", cleanup);
  mapEl.addEventListener("click", () => overlay.setActive(null));
};

const initControls = containerEl => {
  const filters = [...containerEl.querySelectorAll(".map-filters__category")];
  // const filterState = filters.reduce((state, el) => {
  //   state[el.dataset.filter] = true;
  //   return state;
  // }, {});
  let currentFilter = null;
  const update = (newFilter, color) => {
    currentFilter = newFilter;
    filters.forEach(el => {
      const isActive =
        currentFilter === null || el.dataset.filter === currentFilter;
      el.classList.toggle("map-filters__category_active", isActive);
    });
    dispatch("filterUpdate", { filter: newFilter, color });
  };
  filters.forEach(el => {
    el.addEventListener("click", () => {
      update(el.dataset.filter, el.dataset.color);
    });
  });
  containerEl
    .querySelector(".map-filters__clear")
    .addEventListener("click", e => {
      update(null, null);
    });
  const views = [...containerEl.querySelectorAll(".map-views__view")];
  views.forEach(el => {
    el.addEventListener("click", () => {
      dispatch("setView", {
        lng: Number(el.dataset.lng),
        lat: Number(el.dataset.lat),
        zoom: Number(el.dataset.zoom),
      });
    });
  });
};

module.exports = (page, context) => {
  const mapContainerEl = page.querySelector(".map-container");
  if (mapContainerEl) {
    initMap(mapContainerEl, page);
    // loadScript(
    //   `https://maps.googleapis.com/maps/api/js?key=${mapContainerEl.dataset.apiKey}`
    // ).then(() => initMap(mapContainerEl, page));
  }
  const mapControlsEl = page.querySelector(".map-controls");
  if (mapControlsEl) {
    initControls(mapControlsEl);
  }
};

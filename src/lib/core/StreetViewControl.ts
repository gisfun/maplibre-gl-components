import type { IControl, Map as MapLibreMap } from "maplibre-gl";

export class StreetViewControl implements IControl {
  private _options: any;
  private _real: any;
  private _container: HTMLDivElement;

  constructor(options: any) {
    this._options = options;
    // Create the container synchronously in the constructor or onAdd
    this._container = document.createElement("div");
  }

  // ✅ Change back to Synchronous (No 'async' here)
  onAdd(map: MapLibreMap): HTMLElement {
    this._container.className = "maplibregl-ctrl maplibregl-ctrl-group streetview-proxy";

    // Trigger the heavy load in the background
    this._loadRealControl(map);

    return this._container;
  }

  private async _loadRealControl(map: MapLibreMap) {
    try {
      const { StreetViewControl: Real } = await import("maplibre-gl-streetview");
      const realControl = new Real(this._options);
      const realEl = realControl.onAdd(map);

      // Move the real content into our placeholder
      this._container.appendChild(realEl);
    } catch (e) {
      console.error("Async load failed", e);
    }
  }

  onRemove(map: any) { this._real?.onRemove(map); }
}
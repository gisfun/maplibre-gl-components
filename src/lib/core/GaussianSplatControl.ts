import type { IControl, Map as MapLibreMap } from "maplibre-gl";

export class GaussianSplatControl implements IControl {
  private _options: any;
  private _container: HTMLDivElement;
  private _realControl: any | null = null;
  public readonly _isGaussianSplatProxy = true;

  constructor(options: any) {
    this._options = options;
    // Create the container synchronously
    this._container = document.createElement("div");
  }

  // ✅ Synchronous: Returns the element immediately so querySelector works
  onAdd(map: MapLibreMap): HTMLElement {
    this._container.className = "maplibregl-ctrl maplibregl-ctrl-group gaussian-splat-proxy";

    // Trigger the heavy Three.js load in the background
    this._loadRealControl(map);

    return this._container;
  }

  private async _loadRealControl(map: MapLibreMap) {
    try {
      // 1. Double check the map is still there (it might have been removed)
      if (!map) return;

      // ✅ Safe check for .loaded()
      if (typeof map.loaded === 'function' && !map.loaded()) {
        await new Promise(resolve => map.once('load', resolve));
      }

      const { GaussianSplatControl: RealControl } = await import("maplibre-gl-splat");

      this._realControl = new RealControl(this._options);

      // 2. Wrap the onAdd call to ensure the DOM is ready
      // and the map instance is fully prepared for the Three.js scene
      const realEl = this._realControl.onAdd(map);

      if (realEl && this._container) {
        this._container.appendChild(realEl);
      }
    } catch (e) {
      // This is the error you are seeing now
      console.error("Failed to load GaussianSplatControl dynamically:", e);
    }
  }

  onRemove(map: MapLibreMap): void {
    if (this._realControl?.onRemove) {
      this._realControl.onRemove(map);
    }
    this._container.remove();
  }
}

// 2. The Proxy Adapter
export class GaussianSplatLayerAdapter {
  private _control: GaussianSplatControl;
  private _realAdapter: any | null = null;

  // Add properties required by CustomLayerAdapter
  public type = "custom";

  constructor(control: any) {
    this._control = control;
  }

  // ✅ Fix the signature: layerId comes first, then visible
  setVisibility(layerId: string, visible: boolean): void {
    // Pass both to the real adapter if it's loaded
    this._realAdapter?.setVisibility?.(layerId, visible);
  }

  // Ensure these also match your interface perfectly
  setOpacity(layerId: string, opacity: number): void {
    this._realAdapter?.setOpacity?.(layerId, opacity);
  }

  getName(): string {
    return this._realAdapter?.getName() || "Gaussian Splat";
  }

  getLayerIds(): string[] {
    return this._realAdapter?.getLayerIds() || [];
  }

  getLayerState(): any {
    return this._realAdapter?.getLayerState() || {};
  }

  // ✅ Synchronous: MapLibre expects a specific return or void, not a Promise
  onAdd(map: MapLibreMap, gl: WebGLRenderingContext): void {
    this._loadRealAdapter(map, gl);
  }

  private async _loadRealAdapter(map: MapLibreMap, gl: WebGLRenderingContext) {
    try {
      const { GaussianSplatLayerAdapter: RealAdapter } = await import("maplibre-gl-splat");

      // Use the real control if it's ready, otherwise the proxy
      const target = (this._control as any)._realControl || this._control;
      this._realAdapter = new RealAdapter(target);

      this._realAdapter.onAdd(map, gl);
    } catch (e) {
      console.error("Failed to load GaussianSplatLayerAdapter dynamically:", e);
    }
  }

  render(gl: WebGLRenderingContext, matrix: number[]): void {
    // Only render once the real Three.js adapter is hydrated
    this._realAdapter?.render(gl, matrix);
  }

  onRemove(map: any, gl: WebGLRenderingContext): void {
    this._realAdapter?.onRemove?.(map, gl);
  }
}

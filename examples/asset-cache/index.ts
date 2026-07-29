import { Asset, AssetManager, Loader } from "../../src/index.js";

interface Settings {
  readonly quality: "low" | "high";
}

class SettingsLoader extends Loader<Settings> {
  override async load(url: string): Promise<Asset<Settings>> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Settings request failed: ${response.status}`);
    return new Asset(url, (await response.json()) as Settings);
  }
}

const assets = new AssetManager();
const loader = new SettingsLoader();
const first = assets.load("/scene-settings.json", loader);
const second = assets.load("/scene-settings.json", loader);

console.assert(first === second, "Concurrent requests should share one cached promise.");

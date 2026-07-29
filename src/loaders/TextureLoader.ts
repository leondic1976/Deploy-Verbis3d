import { Texture } from "../renderer/index.js";
import { Asset } from "./Asset.js";
import { Loader } from "./Loader.js";

/** Fetches an image and wraps it as a backend-neutral texture source. */
export class TextureLoader extends Loader<Texture> {
  override async load(url: string): Promise<Asset<Texture>> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Texture load failed (${response.status}) for ${url}.`);
    const blob = await response.blob();
    if (typeof createImageBitmap === "undefined") {
      throw new Error("This environment does not support createImageBitmap for texture loading.");
    }
    const bitmap = await createImageBitmap(blob);
    return new Asset(url, new Texture(bitmap));
  }
}

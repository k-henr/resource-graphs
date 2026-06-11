import { Template } from "./template";
/**
 * A class representing a resource.
 */

export class Resource {
    private static infoTemplate = new Template("resource-info-template")!;

    public readonly displayName: string;
    public readonly displayImage: string;

    private tags: string[];

    public readonly unitGroupName: string;

    constructor(name: string, image: string, tags: string[], unitGroup: string) {
        this.displayName = name;
        this.displayImage = image;
        this.tags = tags;
        this.unitGroupName = unitGroup;
    }

    public getTags() {
        return [...this.tags];
    }

    // (assumes an empty info panel element)
    public populateInfoPanel(panel: HTMLElement) {
        const el = Resource.infoTemplate.clone();

        el.querySelector<HTMLElement>(".rc-info-header")!.innerText =
            this.displayName;
        el.querySelector<HTMLImageElement>(".rc-info-image")!.src =
            this.displayImage;

        panel.appendChild(el);
    }
}

/**
 * A class representing a resource
 */

import { Template } from "./template";

export class Resource {
    private static infoTemplate = new Template("resource-info-template")!;

    private displayName: string;
    private displayImage: string;

    private tags: string[];

    private unitGroupName: string;

    constructor(name: string, image: string, tags: string[], unitGroup: string) {
        this.displayName = name;
        this.displayImage = image;
        this.tags = tags;
        this.unitGroupName = unitGroup;
    }

    public getDisplayName() {
        return this.displayName;
    }

    public getDisplayImage() {
        return this.displayImage;
    }

    public getUnitGroupName() {
        return this.unitGroupName;
    }

    public getTags() {
        return [...this.tags];
    }

    // (assumes an empty info panel element)
    public populateInfoPanel(panel: HTMLElement) {
        const el = Resource.infoTemplate.clone();

        el.querySelector<HTMLElement>(".rc-info-header")!.innerText =
            this.getDisplayName();
        el.querySelector<HTMLImageElement>(".rc-info-image")!.src =
            this.getDisplayImage();

        panel.appendChild(el);
    }
}

/**
 * A class representing a resource
 */

import { getSrc } from "./data";

export class Resource {
    private static infoTemplate = document.querySelector<HTMLTemplateElement>(
        "#resource-info-template",
    )!;

    private displayName: string;
    private displayImage: string;

    constructor(data: ResourceData) {
        this.displayName = data.displayName;
        this.displayImage = data.displayImage;
    }

    public getDisplayName() {
        return this.displayName;
    }

    public getDisplayImage() {
        return this.displayImage;
    }

    // (assumes an empty info panel element)
    public populateInfoPanel(panel: HTMLElement) {
        const el = Resource.infoTemplate.content.cloneNode(
            true,
        ) as DocumentFragment;

        el.querySelector<HTMLElement>(".rc-info-header")!.innerText =
            this.getDisplayName();
        el.querySelector<HTMLImageElement>(".rc-info-image")!.src = getSrc(
            this.getDisplayImage(),
        );

        panel.appendChild(el);
    }
}

export type ResourceData = {
    id: string;
    displayName: string;
    displayImage: string;
};

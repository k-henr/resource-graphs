/**
 * The class for handling a resource graph. Contains a number of conversions, as well as a resource delta
 */

import { ConverterMenu } from "./menus";
import { Converter } from "./converter";
import { getSrc } from "./data";
import { Resource } from "./resource";
import { getRoundedString } from "./util";

export class ResourceDeltaList {
    private deltas = new Map<Resource, number>();

    public add(resource: Resource, delta: number) {
        this.deltas.set(resource, (this.deltas.get(resource) ?? 0) + delta);
    }

    public getEntries() {
        return this.deltas.entries();
    }
}

export class ResourceGraph {
    // All conversions that are happening
    private converters: Map<Converter, number> = new Map();

    // A ConverterMenu to request converters from in case of adjusting to fit an item
    private converterRequestTarget: ConverterMenu | undefined;

    // Whether the graph needs to be updated or not
    private requiresRecalculation: boolean = true;

    // List elements to put the displays in
    private resourceDeltaList: HTMLElement;
    private converterList: HTMLElement;
    private resourceDeltaTemplate: HTMLTemplateElement;
    private converterTemplate: HTMLTemplateElement;

    constructor(
        resourceDeltaList: HTMLElement,
        converterList: HTMLElement,
        resourceDeltaTemplate: HTMLTemplateElement,
        converterTemplate: HTMLTemplateElement,
    ) {
        this.resourceDeltaList = resourceDeltaList;
        this.converterList = converterList;
        this.resourceDeltaTemplate = resourceDeltaTemplate;
        this.converterTemplate = converterTemplate;

        // Start running recalculation
        requestAnimationFrame(() => requestGraphUpdate(this));
    }

    public setConverterRequestTarget(menu: ConverterMenu) {
        this.converterRequestTarget = menu;
    }

    // Update the resource deltas and display. Runs automatically
    public recalculateIfNeeded() {
        // Keep checking
        if (!this.requiresRecalculation) return;
        this.requiresRecalculation = false;

        // Reset resource deltas, then go through all the conversions and apply them
        const resourceDeltas = new ResourceDeltaList();

        for (const [converter, count] of this.converters) {
            converter.apply(resourceDeltas, count);
        }

        // Update visuals. For now simply remove and repopulate, if that's too slow
        // then consider saving elements
        // (todo: break out into a new function?)

        this.resourceDeltaList.innerHTML = "";
        this.converterList.innerHTML = "";

        // Add resource displays
        for (const [resource, amount] of resourceDeltas.getEntries()) {
            const el = (
                this.resourceDeltaTemplate.content.cloneNode(
                    true,
                ) as HTMLElement
            ).querySelector<HTMLElement>(".resource-delta")!;

            el.querySelector<HTMLElement>(".resource-name")!.innerText =
                resource.getDisplayName();
            el.querySelector<HTMLImageElement>(".resource-image")!.src = getSrc(
                resource.getDisplayImage(),
            );
            el.querySelector<HTMLElement>(".resource-amount")!.innerText =
                getRoundedString(amount);

            // If there's a negative delta for this resource, highlight it and add a listener for opening the converter menu with that as a filter
            if (amount < 0) {
                el.classList.add("negative-resource-delta");
                el.onclick = () =>
                    this.converterRequestTarget?.requestConverterForResource(
                        resource,
                        amount,
                    );
            }

            this.resourceDeltaList.appendChild(el);
        }

        // Add converter displays
        for (const [converter, number] of this.converters) {
            const el = (
                this.converterTemplate.content.cloneNode(true) as HTMLElement
            ).firstElementChild as HTMLElement;

            el.querySelector<HTMLElement>(".converter-name")!.innerText =
                converter.getDisplayName();

            el.querySelector<HTMLImageElement>(".converter-image")!.src =
                getSrc(converter.getDisplayImage());

            const amountEl =
                el.querySelector<HTMLInputElement>(".converter-amount")!;
            amountEl.value = String(number);
            amountEl.onchange = (e) => {
                this.setConverterAmount(
                    converter,
                    Number((<HTMLInputElement>e.target).value),
                );
            };

            // Button to remove
            el.querySelector<HTMLElement>(".remove-converter-button")!.onclick =
                () => this.removeConverter(converter);

            this.converterList.appendChild(el);
        }
    }

    public addConverter(converter: Converter, count: number) {
        this.converters.set(
            converter,
            (this.converters.get(converter) ?? 0) + count,
        );
        this.requiresRecalculation = true;
    }

    public removeConverter(converter: Converter) {
        this.converters.delete(converter);
        this.requiresRecalculation = true;
    }

    public setConverterAmount(converter: Converter, count: number) {
        // Keeps converters set to 0, since you may not want to readd the whole converter
        this.converters.set(converter, count);
        this.requiresRecalculation = true;
    }
}

// Keep asking the graph to recalculate if it has to
function requestGraphUpdate(graph: ResourceGraph) {
    requestAnimationFrame(() => requestGraphUpdate(graph));
    graph.recalculateIfNeeded();
}

/**
 * The class for handling a resource graph. Contains a number of conversions, as well as a resource delta
 */

import { ConverterMenu } from "./menus";
import { Converter } from "./converter";
import { getSrc } from "./data";
import { Resource } from "./resource";
import { Rational } from "./rational";
import { getUnits } from "./units";

export class NumberedSet<T> {
    private numberMap = new Map<T, Rational>();

    public set(object: T, newNumber: Rational) {
        this.numberMap.set(object, newNumber);
    }

    public add(object: T, delta: Rational) {
        this.numberMap.set(
            object,
            (this.numberMap.get(object) ?? Rational.zero).add(delta),
        );
    }

    public remove(object: T) {
        this.numberMap.delete(object);
    }

    public getEntries() {
        return this.numberMap.entries();
    }
}

export class ResourceGraph {
    // All conversions that are happening
    private converters = new NumberedSet<Converter>();

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
        const resourceDeltas = new NumberedSet<Resource>();

        for (const [converter, count] of this.converters.getEntries()) {
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
                this.resourceDeltaTemplate.content.cloneNode(true) as HTMLElement
            ).firstElementChild! as HTMLElement;

            el.querySelector<HTMLElement>(".resource-name")!.innerText =
                resource.getDisplayName();
            el.querySelector<HTMLImageElement>(".resource-image")!.src = getSrc(
                resource.getDisplayImage(),
            );
            el.querySelector<HTMLElement>(".resource-amount")!.innerText =
                (amount.greaterThan(Rational.zero) ? "+" : "") +
                amount.getDecimalString(); // todo: option to switch between decimal and mixed?
            el.querySelector<HTMLElement>(".resource-delta-unit")!.innerText =
                getUnits(resource.getUnitGroupName())[1];

            // If there's a negative delta for this resource, highlight it and add a listener for opening the converter menu with that as a filter
            if (amount.lessThan(Rational.zero)) {
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
        for (const [converter, number] of this.converters.getEntries()) {
            const el = (
                this.converterTemplate.content.cloneNode(true) as HTMLElement
            ).firstElementChild as HTMLElement;

            el.querySelector<HTMLElement>(".converter-name")!.innerText =
                converter.getDisplayName();

            el.querySelector<HTMLImageElement>(".converter-image")!.src = getSrc(
                converter.getDisplayImage(),
            );

            const amountEl =
                el.querySelector<HTMLInputElement>(".converter-amount")!;
            amountEl.value = number.getMixedFractionString();
            amountEl.onchange = (e) => {
                const el = <HTMLInputElement>e.target;

                // Parse input into a rational
                const amount = Rational.fromInput(el.value, el);
                if (amount) this.setConverterAmount(converter, amount);
            };

            // Button to remove
            el.querySelector<HTMLElement>(".remove-converter-button")!.onclick =
                () => this.removeConverter(converter);

            this.converterList.appendChild(el);
        }
    }

    public addConverter(converter: Converter, amount: Rational) {
        this.converters.add(converter, amount);
        this.requiresRecalculation = true;
    }

    public removeConverter(converter: Converter) {
        this.converters.remove(converter);
        this.requiresRecalculation = true;
    }

    public setConverterAmount(converter: Converter, count: Rational) {
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

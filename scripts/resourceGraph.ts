import { ConverterMenu } from "./converterMenu";
import { Converter } from "./converter";
import { Resource } from "./resource";
import { Rational } from "./rational";
import { getUnits } from "./units";
import { displayErr } from "./errors";
import { Template } from "./template";
/**
 * The class for handling a resource graph. Contains a number of finalized
 * converters, and handles adding them together and visualizing them.
 */

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

    // All resource deltas from the current converters
    resourceDeltas = new NumberedSet<Resource>();

    // A ConverterMenu to request converters from in case of adjusting to fit an item
    private converterRequestTarget: ConverterMenu | undefined;

    // Whether the graph needs to be updated or not
    private requiresRecalculation: boolean = true;

    // List elements to put the displays in
    private resourceDeltaList: HTMLElement;
    private converterList: HTMLElement;
    private resourceDeltaTemplate: Template;
    private converterTemplate: Template;

    constructor(
        resourceDeltaList: HTMLElement,
        converterList: HTMLElement,
        resourceDeltaTemplate: Template,
        converterTemplate: Template,
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

    public updateIfNeeded() {
        if (!this.requiresRecalculation) return;
        this.requiresRecalculation = false;
        this.recalculateDeltas();
        this.updateVisuals();
    }

    // Update the resource deltas and display. Runs automatically
    private recalculateDeltas() {
        // Reset resource deltas, then go through all the conversions and apply them
        this.resourceDeltas = new NumberedSet<Resource>();

        for (const [converter, count] of this.converters.getEntries()) {
            converter.apply(this.resourceDeltas, count);
        }
    }

    // Update visuals. For now simply remove and repopulate, if that's too slow
    // then consider saving elements
    private updateVisuals() {
        this.resourceDeltaList.innerHTML = "";
        this.converterList.innerHTML = "";

        // Add resource displays
        for (const [resource, amount] of this.resourceDeltas.getEntries()) {
            const el = this.resourceDeltaTemplate.cloneElement();

            el.querySelector<HTMLElement>(".resource-name")!.innerText =
                resource.displayName;
            el.querySelector<HTMLImageElement>(".resource-image")!.src =
                resource.displayImage;
            el.querySelector<HTMLElement>(".resource-amount")!.innerText =
                (amount.greaterThan(Rational.zero) ? "+" : "") +
                amount.getDecimalString();
            el.querySelector<HTMLElement>(".resource-delta-unit")!.innerText =
                getUnits(resource.unitGroupName)[1];

            // If there's a negative delta for this resource, highlight it and add a listener for opening the converter menu with that as a filter
            if (amount.lessThan(Rational.zero)) {
                el.classList.add("negative-resource-delta");
                el.classList.add("red");
                el.classList.add("interactive");
                el.onclick = () =>
                    this.converterRequestTarget?.requestConverterForResource(
                        resource,
                        amount,
                    );
            }

            this.resourceDeltaList.appendChild(el);
        }

        // Add converter displays
        for (const [converter, amount] of this.converters.getEntries()) {
            this.addConverterElement(converter, amount, this.converterList);
        }
    }

    private addConverterElement(
        converter: Converter,
        amount: Rational,
        listElement: HTMLElement,
        removable: boolean = true,
    ) {
        const el = this.converterTemplate.clone();

        el.querySelector<HTMLElement>(".converter-name")!.innerText =
            converter.getDisplayName();
        el.querySelector<HTMLImageElement>(".converter-image")!.src =
            converter.getDisplayImage();
        el.querySelector<HTMLElement>(".converter-decimal-approx")!.innerText =
            amount.getDecimalString();

        const amountEl = el.querySelector<HTMLInputElement>(".converter-amount")!;
        amountEl.value = amount.getMixedFractionString();
        amountEl.onchange = (e) => {
            const el = <HTMLInputElement>e.target;

            // Parse input into a rational
            const amount = Rational.fromInput(el.value, el);
            if (amount) this.setConverterAmount(converter, amount);
        };

        if (removable) {
            // Button to remove
            el.querySelector<HTMLElement>(".remove-converter-button")!.onclick =
                () => this.removeConverter(converter);
        } else {
            // Kill the remove button to make it impossible to remove if it should be
            el.querySelector<HTMLElement>(".remove-converter-button")!.remove();
        }

        // Add the dependencies to the converter
        for (const [dependency, dependencyAmount] of converter.dependencies) {
            this.addConverterElement(
                dependency,
                dependencyAmount,
                el.querySelector(".converter-dependencies")!,
                false,
            );
        }

        listElement.appendChild(el);
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
    try {
        graph.updateIfNeeded();
    } catch (e: any) {
        displayErr(e);
        throw e;
    }
}

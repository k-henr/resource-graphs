/**
 * Takes care of listeners and things related to the "Add Resource"/"Add Converter" menu(s)
 */

import { Converter } from "./converter";
import { ResourceGraph } from "./resourceGraph";
import {
    getConverterFactoriesWithFilters,
    getResourcesWithFilter,
    getSrc,
} from "./data";
import { Resource } from "./resource";
import { IntermediateConverter } from "./intermediateConverter";

abstract class SubmitMenu {
    protected static thumbTemplate =
        document.querySelector<HTMLTemplateElement>("#item-converter-thumb")!;

    protected graph: ResourceGraph;
    protected menuElement: HTMLElement;
    protected headerElement: HTMLElement;
    protected thumbList: HTMLElement;
    protected filterForm: HTMLFormElement;
    protected submissionForm: HTMLFormElement;
    protected infoPanel: HTMLElement;
    protected showOnOpen: HTMLElement;

    constructor(
        graph: ResourceGraph,
        menuElement: HTMLElement,
        headerElement: HTMLElement,
        thumbList: HTMLElement,
        filterForm: HTMLFormElement,
        submissionForm: HTMLFormElement,
        infoPanel: HTMLElement,
        showOnOpen: HTMLElement,
    ) {
        this.graph = graph;
        this.menuElement = menuElement;
        this.headerElement = headerElement;
        this.thumbList = thumbList;
        this.filterForm = filterForm;
        this.submissionForm = submissionForm;
        this.infoPanel = infoPanel;
        this.showOnOpen = showOnOpen;

        // Listener for submitting
        submissionForm.onsubmit = async (e) => {
            e.preventDefault();
            this.onSubmit();
        };

        // Listener for applying filters
        filterForm.onsubmit = (e) => {
            e.preventDefault();
            this.applyCurrentFilters();
        };

        this.clearFilters();
    }

    // Runs when the submission form was submitted
    protected abstract onSubmit(): void;

    // Reset all filters and their visuals
    protected abstract clearFilters(): void;

    // Apply the filters currently stored in the menu
    protected abstract applyCurrentFilters(): void;

    public open() {
        this.applyCurrentFilters();
        this.menuElement.classList.remove("hidden");
        this.filterForm.classList.remove("hidden");
        this.submissionForm.classList.remove("hidden");
    }

    public close() {
        this.clearFilters();
        this.menuElement.classList.add("hidden");
        this.filterForm.classList.add("hidden");
        this.submissionForm.classList.add("hidden");
        this.infoPanel.innerHTML = "";
    }
}

export class ConverterMenu extends SubmitMenu {
    private amountInput: HTMLElement;

    private resourceBeingRequested: Resource | null = null;
    private amountOfResourceBeingRequested: number = 0;

    private searchString: string = "";

    // Since settings can be changed, which requires a converter and not a factory,
    // intermediate converter storage is required
    private intermediateConverter: IntermediateConverter | null = null;

    constructor(
        graph: ResourceGraph,
        menuElement: HTMLElement,
        headerElement: HTMLElement,
        thumbList: HTMLElement,
        filterForm: HTMLFormElement,
        converterForm: HTMLFormElement,
        amountInput: HTMLElement,
        infoPanel: HTMLElement,
        showOnOpen: HTMLElement,
    ) {
        super(
            graph,
            menuElement,
            headerElement,
            thumbList,
            filterForm,
            converterForm,
            infoPanel,
            showOnOpen,
        );

        this.amountInput = amountInput;
    }

    protected override onSubmit() {
        // If no converter is "loaded", ignore
        if (!this.intermediateConverter) return;

        const formData = new FormData(this.submissionForm);

        const converter = this.intermediateConverter.finalize();

        // If being requested by item, get the amount automatically from the converter
        const amount = this.resourceBeingRequested
            ? converter.getAmountToProduce(
                  this.resourceBeingRequested,
                  this.amountOfResourceBeingRequested,
              )
            : Number(formData.get("amount")!.valueOf());

        if (amount != 0) {
            this.graph.addConverter(converter, amount);
        }

        this.close();
    }

    // Note: Does not apply changes!
    protected override clearFilters() {
        this.filterForm.querySelector<HTMLInputElement>(
            "input[name=search-string]",
        )!.value = "";
        this.resourceBeingRequested = null;
        this.amountOfResourceBeingRequested = 0;
    }

    public override applyCurrentFilters() {
        this.thumbList.innerHTML = "";

        const formData = new FormData(this.filterForm);
        this.searchString = String(formData.get("search-string")!.valueOf());

        const list = getConverterFactoriesWithFilters(
            this.searchString,
            this.resourceBeingRequested ? [this.resourceBeingRequested] : [],
            [],
        );

        for (const [_, cFact] of list) {
            const thumb = (<HTMLElement>(
                ConverterMenu.thumbTemplate.content.cloneNode(true)
            )).querySelector<HTMLElement>(".thumb")!;

            thumb.querySelector<HTMLElement>(".thumb-name")!.innerText =
                cFact.name;
            thumb.querySelector<HTMLImageElement>("img.thumb-image")!.src =
                getSrc(cFact.image);

            // Create a converter when clicking the thumb (inefficient?)
            thumb.onclick = () => {
                this.infoPanel.innerHTML = "";
                this.intermediateConverter = cFact.factory();
                this.intermediateConverter.populateInfoPanel();
            };

            this.thumbList.appendChild(thumb);
        }
    }

    public override open() {
        super.open();
        this.headerElement.innerText = "Add new converter";
    }

    public override close() {
        super.close();
        this.intermediateConverter = null;
        this.amountInput.classList.remove("hidden");
    }

    // Request the user to choose a converter that produces the given amount of the
    // given resource
    public requestConverterForResource(resource: Resource, amount: number) {
        this.resourceBeingRequested = resource;
        this.amountOfResourceBeingRequested = amount;

        this.amountInput.classList.add("hidden");

        this.open();
        this.headerElement.innerText = `Choose a converter that produces ${resource.getDisplayName()}`;
        this.applyCurrentFilters();
    }
}

export class ResourceMenu extends SubmitMenu {
    private searchString: string = "";

    // To match with ConverterMenu, I'm also storing the resource to be added here instead of as a text input
    private resourceToBeAdded: Resource | null = null;

    // Submit the form
    protected override onSubmit() {
        if (!this.resourceToBeAdded) return;

        const formData = new FormData(this.submissionForm);
        const delta = Number(formData.get("delta")!.valueOf());
        const resource = this.resourceToBeAdded;

        // Only add the item delta if it'll actually add or remove resources
        if (delta != 0) {
            // Construct a "dummy converter" that either produces or consumes the item
            const itemList = [{ resource, amount: 1 }];
            const conv = new Converter(
                `Resource ${delta > 0 ? "source" : "drain"}: ${resource.getDisplayName()}`,
                resource.getDisplayImage(),
                // Put the item either as an ingredient or a product, depending on
                // whether this is a producer or consumer
                delta < 0 ? itemList : [],
                delta > 0 ? itemList : [],
            );
            // By modifying the delta in here instead of in the ingr/prod lists,
            // it's possible to update them on an already existing item delta
            this.graph.addConverter(conv, Math.abs(delta));
        }

        this.close();
    }

    protected override clearFilters() {
        this.filterForm.querySelector<HTMLInputElement>(
            "input[name=search-string]",
        )!.value = "";
    }

    public override applyCurrentFilters() {
        this.thumbList.innerHTML = "";

        // Update filters that are present in the filter form
        const formData = new FormData(this.filterForm);
        this.searchString = String(formData.get("search-string")!.valueOf());

        const list = getResourcesWithFilter(this.searchString);

        for (const [, r] of list) {
            const thumb = (<HTMLElement>(
                ResourceMenu.thumbTemplate.content.cloneNode(true)
            )).querySelector<HTMLElement>(".thumb")!;

            thumb.querySelector<HTMLElement>(".thumb-name")!.innerText =
                r.getDisplayName();
            thumb.querySelector<HTMLImageElement>("img.thumb-image")!.src =
                getSrc(r.getDisplayImage());

            // Add a listener for selecting the thumb
            thumb.onclick = () => {
                this.resourceToBeAdded = r;

                this.infoPanel.innerHTML = "";
                r.populateInfoPanel(this.infoPanel);
            };

            this.thumbList.appendChild(thumb);
        }
    }

    public override close() {
        this.resourceToBeAdded = null;
        super.close();
    }
}

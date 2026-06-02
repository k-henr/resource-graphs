import { Converter } from "./converter";
import { getConverterFactoriesWithFilters } from "./data";
import { displayErr, UserError } from "./errors";
import { IntermediateConverter } from "./intermediateConverter";
import { Rational } from "./rational";
import { Resource } from "./resource";
import { ResourceGraph } from "./resourceGraph";
import { SubmitMenu } from "./submitMenu";

export class ConverterMenu extends SubmitMenu {
    private amountInput: HTMLElement;

    private resourceBeingRequested: Resource | null = null;
    private amountOfResourceBeingRequested: Rational = Rational.zero;

    private searchString: string = "";

    // Since settings can be changed, which requires a converter and not a factory,
    // intermediate converter storage is required
    private intermediateConverter: IntermediateConverter | null = null;

    private converterSettingsForm: HTMLElement;

    constructor(
        graph: ResourceGraph,
        menuElement: HTMLElement,
        detailPopup: HTMLElement,
        headerElement: HTMLElement,
        thumbList: HTMLElement,
        filterForm: HTMLFormElement,
        converterForm: HTMLFormElement,
        converterSettingsForm: HTMLElement,
        amountInput: HTMLElement,
        infoPanel: HTMLElement,
        showOnOpen: HTMLElement,
    ) {
        super(
            graph,
            menuElement,
            detailPopup,
            headerElement,
            thumbList,
            filterForm,
            converterForm,
            infoPanel,
            showOnOpen,
        );

        this.amountInput = amountInput;
        this.converterSettingsForm = converterSettingsForm;
    }

    protected override onSubmit() {
        // If no converter is "loaded", ignore
        if (!this.intermediateConverter) return;

        const converter = this.intermediateConverter.finalize();

        // If being requested by item, get the amount automatically from the converter
        const amount = this.getAmountToProduce(
            converter,
            this.submissionForm.querySelector<HTMLInputElement>(
                "input[name=amount]",
            )!,
        );

        if (!amount) {
            throw new UserError(
                "Entered an invalid number! Please write a rational or floating-point number",
            );
        }

        if (!amount.equals(Rational.zero)) {
            this.graph.addConverter(converter, amount);
        }

        this.close();
    }

    private getAmountToProduce(
        converter: Converter,
        input: HTMLInputElement,
    ): Rational | null {
        if (this.resourceBeingRequested) {
            return converter.getAmountToProduce(
                this.resourceBeingRequested,
                this.amountOfResourceBeingRequested,
            );
        }

        const amount = Rational.fromInput(input.value, input);

        if (amount) {
            input.classList.add("input-invalic-amount");
            return amount;
        }

        return null;
    }

    // Note: Does not apply changes!
    protected override clearFilters() {
        this.filterForm.querySelector<HTMLInputElement>(
            "input[name=search-string]",
        )!.value = "";
        this.resourceBeingRequested = null;
        this.amountOfResourceBeingRequested = Rational.zero;
    }

    public override applyCurrentFilters() {
        this.thumbList.innerHTML = "";

        const formData = new FormData(this.filterForm);
        this.searchString = String(formData.get("search-string")!.valueOf());

        const converterList = getConverterFactoriesWithFilters(
            this.searchString,
            this.resourceBeingRequested ? [this.resourceBeingRequested] : [],
            [],
        );

        // If there were no results, write "no results" in the element
        if (converterList.length === 0) {
            this.thumbList.innerText = "No Results";
        }

        // Keep track on all previously encountered tags and their respective
        // elements
        const tagLists = new Map<string, HTMLElement>();
        // The misc tag should be at the end, so it needs special handling here
        const miscTag = SubmitMenu.createTagListIfNotExists(
            tagLists,
            "Miscellaneous",
            null,
        );

        for (const [_, cFact] of converterList) {
            // Check the tags of this factory
            const tags = cFact.tags.length > 0 ? cFact.tags : ["Miscellaneous"];

            // Create an onclick function that opens the details for this converter
            let onclickFn = () => {
                this.intermediateConverter = cFact.factory();
                this.infoPanel.innerHTML = "";
                this.intermediateConverter.tryPopulateInfoPanel();
                this.openDetailPopup();
            };

            // Add this thumb to all tag lists where it should be
            // (automatically adds new tag lists when it encounters a new one)
            this.addThumbToTagLists(tags, tagLists, {
                name: cFact.name,
                image: cFact.image,
                onclick: onclickFn,
            });
        }

        // Now that all other tag lists are ordered alphabetically, place the misc
        // tag at the end (but only if it has stuff in it)
        if (miscTag.querySelector(".tag-list-content")!.children.length > 0)
            this.thumbList.appendChild(miscTag);
    }

    public override open() {
        super.open();
    }

    public override close() {
        super.close();
        this.intermediateConverter = null;
        this.converterSettingsForm.innerHTML = "";
        this.amountInput.classList.remove("hidden");
    }

    // Request the user to choose a converter that produces the given amount of the
    // given resource
    public requestConverterForResource(resource: Resource, amount: Rational) {
        this.resourceBeingRequested = resource;
        this.amountOfResourceBeingRequested = amount;

        this.amountInput.classList.add("hidden");

        this.open();
        this.applyCurrentFilters();
    }
}

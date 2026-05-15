import { Converter } from "./converter";
import { getConverterFactoriesWithFilters, getSrc } from "./data";
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
            // TODO: Proper error feedback that an input was badly formatted
            throw new Error("Bad formatting!");
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

        // Keep track on all previously encountered tags and their respective
        // elements
        const tagLists = new Map<string, HTMLElement>();
        // The misc tag should be at the end, so it needs special handling here
        const miscTag = this.createTagListIfNotExists(
            tagLists,
            "Miscellaneous",
            null,
        );

        for (const [_, cFact] of converterList) {
            // Check the tags of this factory
            const tags = cFact.tags.length > 0 ? cFact.tags : ["Miscellaneous"];

            // Create an onclick function
            let onclickFn = () => {
                this.intermediateConverter = cFact.factory();
                this.infoPanel.innerHTML = "";
                this.intermediateConverter.populateInfoPanel();
            };

            // For each tag, add this element as a child of its thumb list. If this
            // is the first occurence of the tag, make a completely new element and
            // add it to the map
            for (const tagName of tags) {
                // Get the tag list and create it if it doesn't exist yet
                const tagList = this.createTagListIfNotExists(
                    tagLists,
                    tagName,
                    this.thumbList,
                );

                // Add the thumb to the end of the tag list
                // TODO: Alphabetical or user-defined order
                const thumb = (<HTMLElement>(
                    ConverterMenu.thumbTemplate.content.cloneNode(true)
                )).querySelector<HTMLElement>(".thumb")!;
                thumb.querySelector<HTMLElement>(".thumb-name")!.innerText =
                    cFact.name;
                thumb.querySelector<HTMLImageElement>("img.thumb-image")!.src =
                    getSrc(cFact.image);
                thumb.onclick = onclickFn;

                tagList.querySelector(".tag-list-content")!.appendChild(thumb);
            }
        }

        // Now that all other tag lists are ordered alphabetically, place the misc
        // tag at the end
        this.thumbList.appendChild(miscTag);
    }

    private createTagListIfNotExists(
        map: Map<string, HTMLElement>,
        name: string,
        tagListContainer: HTMLElement | null, // Set to null to not automatically add
    ): HTMLElement {
        if (map.has(name)) return map.get(name)!;

        console.log(`Creating tag list: ${name}`);

        const tagList = (<HTMLElement>(
            ConverterMenu.tagListTemplate.content.cloneNode(true)
        )).firstElementChild! as HTMLElement;
        tagList.querySelector<HTMLElement>(".tag-list-name")!.innerText = name;

        // If the element should automatically be inserted, do that
        if (tagListContainer) {
            console.log("Inserting automatically");
            const children = tagListContainer.children;
            for (let i = 0; i < children.length + 1; i++) {
                const c = children[i]; // is undefined if we're at the end
                // Compare names (if c is undefined we're at the end and should
                // always insert. Yucky, but ¯\_(ツ)_/¯)
                const insertHere = c
                    ? name.localeCompare(
                          c.querySelector<HTMLElement>(".tag-list-name")!.innerText,
                      )
                    : true;
                if (insertHere) {
                    console.log("Inserting: " + name);
                    tagListContainer.insertBefore(tagList, c);
                    break;
                }
            }
        }

        map.set(name, tagList);

        return tagList;
    }

    public override open() {
        super.open();
        this.headerElement.innerText = "Add new converter";
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
        this.headerElement.innerText = `Choose a converter that produces ${resource.getDisplayName()}`;
        this.applyCurrentFilters();
    }
}

import { Converter } from "./converter";
import { getResourcesWithFilter, getSrc } from "./data";
import { Rational } from "./rational";
import { Resource } from "./resource";
import { ResourceGraph } from "./resourceGraph";
import { SubmitMenu } from "./submitMenu";
import { convertUnit, populateUnitDropdown } from "./units";

export class ResourceMenu extends SubmitMenu {
    private searchString: string = "";
    private unitDropdown: HTMLSelectElement;

    constructor(
        graph: ResourceGraph,
        menuElement: HTMLElement,
        headerElement: HTMLElement,
        thumbList: HTMLElement,
        filterForm: HTMLFormElement,
        converterForm: HTMLFormElement,
        unitDropdown: HTMLSelectElement,
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
        this.unitDropdown = unitDropdown;
    }

    // To match with ConverterMenu, I'm also storing the resource to be added here instead of as a text input
    private resourceToBeAdded: Resource | null = null;

    // Submit the form
    protected override onSubmit() {
        if (!this.resourceToBeAdded) return;

        const resource = this.resourceToBeAdded;
        const el =
            this.submissionForm.querySelector<HTMLInputElement>(
                "input[name=delta]",
            )!;
        const delta = convertUnit(
            resource.getUnitGroupName(),
            Rational.fromInput(el.value, el) ?? Rational.zero,
            this.unitDropdown.selectedOptions[0].innerText,
        );
        if (!delta) {
            throw new Error("Bad formatting");
        }

        // Only add the item delta if it'll actually add or remove resources
        if (!delta?.equals(Rational.zero)) {
            // Construct a "dummy converter" that either produces or consumes the item
            const itemList = [{ resource, amount: Rational.one }];
            const positiveDelta = delta.greaterThan(Rational.zero);
            const conv = new Converter(
                `Resource ${positiveDelta ? "source" : "drain"}: ${resource.getDisplayName()}`,
                resource.getDisplayImage(),
                // Put the item either as an ingredient or a product, depending on
                // whether this is a producer or consumer
                !positiveDelta ? itemList : [],
                positiveDelta ? itemList : [],
            );
            // By modifying the delta in here instead of in the ingr/prod lists,
            // it's possible to update them on an already existing item delta
            this.graph.addConverter(conv, delta.abs());
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

        const resourceList = getResourcesWithFilter(this.searchString);

        const tagLists = new Map<string, HTMLElement>();
        // misc tag with special handling to be at the end
        const miscTag = SubmitMenu.createTagListIfNotExists(
            tagLists,
            "Miscellaneous",
            null,
        );

        for (const [, r] of resourceList) {
            console.log(r.getDisplayName());
            // Get tags
            let tags = r.getTags();
            tags = tags.length > 0 ? tags : ["Miscellaneous"];

            // Set behaviour when thumb is clicked
            const onclickFn = () => {
                this.resourceToBeAdded = r;

                this.infoPanel.innerHTML = "";
                r.populateInfoPanel(this.infoPanel);

                // Set the unit dropdown to contain the correct values
                populateUnitDropdown(this.unitDropdown, r.getUnitGroupName());
            };

            this.addThumbToTagLists(tags, tagLists, {
                name: r.getDisplayName(),
                image: r.getDisplayImage(),
                onclick: onclickFn,
            });

            // const thumb = SubmitMenu.createThumb(
            //     r.getDisplayName(),
            //     r.getDisplayImage(),
            //     onclickFn,
            // );
            //this.thumbList.appendChild(thumb);
        }

        // Now that all other tag lists are ordered alphabetically, place the misc
        // tag at the end (but only if it has stuff in it)
        if (miscTag.querySelector(".tag-list-content")!.children.length > 0)
            this.thumbList.appendChild(miscTag);
    }

    public override close() {
        this.resourceToBeAdded = null;
        super.close();
    }
}

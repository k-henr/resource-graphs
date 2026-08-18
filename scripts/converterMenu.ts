import { Converter } from "./converter";
import { ConverterSettings } from "./converterSettings";
import { getConverterFactoriesWithFilters, resourceTreeDataToClass } from "./data";
import { displayErr, ProgramError, UserError } from "./errors";
import { IntermediateConverter } from "./intermediateConverter";
import { Rational } from "./rational";
import { Resource } from "./resource";
import { ResourceGraph } from "./resourceGraph";
import { SubmitMenu } from "./submitMenu";
import { ConverterDependency, ConverterIngredient } from "./types";
/**
 * The menu used when adding converters.
 */

export class ConverterMenu extends SubmitMenu {
    private amountInput: HTMLElement;

    private dependencyPopup: HTMLElement;

    private resourceRequest: {
        resource: Resource;
        amount: Rational;
    } | null = null;

    private searchString: string = "";

    // Since settings can be changed, which requires a converter and not a factory,
    // intermediate converter storage is required
    private converterInProgress: {
        converter: IntermediateConverter;
        ingredients: ConverterIngredient[];
        products: ConverterIngredient[];
        unresolvedDependencies: ConverterDependency[];
    } | null = null;

    private converterSettingsForm: HTMLFormElement;

    constructor(
        graph: ResourceGraph,
        menuElement: HTMLElement,
        detailPopup: HTMLElement,
        depdendencyPopup: HTMLElement,
        headerElement: HTMLElement,
        thumbList: HTMLElement,
        filterForm: HTMLFormElement,
        converterForm: HTMLFormElement,
        converterSettingsForm: HTMLFormElement,
        amountInput: HTMLElement,
        infoPanel: HTMLElement,
        showOnOpen: HTMLElement,
        openButton: HTMLElement,
        closeButton: HTMLElement,
        closeDetailButton: HTMLElement,
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
            openButton,
            closeButton,
            closeDetailButton,
        );

        this.dependencyPopup = depdendencyPopup;
        this.amountInput = amountInput;
        this.converterSettingsForm = converterSettingsForm;
    }

    protected override onSubmit() {
        // If no converter is "loaded", complain
        if (!this.converterInProgress)
            throw new ProgramError(
                "Tried to submit converter form when no converter was being constructed!",
            );

        this.converterInProgress.converter.addIngredientsToList(
            this.converterInProgress.ingredients,
            this.converterInProgress.unresolvedDependencies,
        );
        this.converterInProgress.converter.addProductsToList(
            this.converterInProgress.products,
        );

        // All stuff in the detail popup has been resolved now, can be closed
        this.closeDetailPopup();

        // Resolve any converter dependencies. If none are around, this function adds
        // the converter to the graph instead
        this.resolveConverterDependency();
    }

    private resolveConverterDependency() {
        if (!this.converterInProgress)
            throw new ProgramError(
                "Tried to resolve converter dependencies when no converter was being constructed!",
            );

        // If there's no converter dependencies left, finalize the converter
        if (this.converterInProgress.unresolvedDependencies.length === 0) {
            this.finalizeConverter();
            this.close();
            return;
        }

        // Otherwise, resolve one of the unresolved dependency converters

        // Get the next converter dependency to resolve
        const dependency = this.converterInProgress.unresolvedDependencies.pop()!;

        // Open the dependency popup and set basic values that won't change during resolution
        this.openDependencyPopup();
        this.dependencyPopup.querySelector<HTMLElement>(
            "#converter-dependency-name",
        )!.innerText = dependency.converter.thumbName;
        this.dependencyPopup.querySelector<HTMLElement>(
            "#converter-dependency-primary-name",
        )!.innerText = this.converterInProgress.converter.thumbName;

        // Get the dependency's ingredient tree
        const ingredientTree = resourceTreeDataToClass(
            this.converterInProgress.converter,
            dependency.converter.ingredientTreeData,
        );

        // Add the tree element to the container for it
        const treeContainer = this.dependencyPopup.querySelector<HTMLElement>(
            "#converter-dependency-tree",
        )!;
        treeContainer.innerHTML = "";
        treeContainer.appendChild(ingredientTree.createElement());

        // Create the settings from the dependency, so that the final amount can depend on these settings
        const dependencyAmountEl = this.dependencyPopup.querySelector<HTMLElement>(
            "#converter-dependency-amount",
        )!;
        const dependencySettings = new ConverterSettings(
            dependency.converter.settings,
            () => {
                // When the settings are changed, this should update the amount required
                console.log("Settings changed");
                const amount = dependencySettings.evaluateTree(dependency.amount);
                console.log(amount.getDecimalString());
                ingredientTree.updateElements(amount, dependencySettings);
                dependencyAmountEl.innerText = amount.getDecimalString();
            },
        );

        // Populate the form with the settings
        dependencySettings.populateForm(
            this.dependencyPopup.querySelector<HTMLFormElement>(
                "#converter-dependency-settings-form",
            )!,
        );

        // Perform an initial update of the tree
        // (todo: extract the onchange from the ConverterSettings constructor so that
        // I can simply call it here. Hard to do because it references a half-
        // constructed settings object (which is apparently legal???))
        const amount = dependencySettings.evaluateTree(dependency.amount);
        ingredientTree.updateElements(amount, dependencySettings);
        dependencyAmountEl.innerText = amount.getDecimalString();

        // Add a listener to the submit button, that:
        // - Tries to add the ingredient tree's resources to the ingredient list
        // - Removes itself (since I need to re-set the listener every time) and
        //   hides the dependency popup
        // - Calls resolveConverterDependency again
        const submitBtn =
            this.dependencyPopup.querySelector<HTMLElement>("#submit-depencency")!;
        submitBtn.onclick = () => {
            try {
                if (!this.converterInProgress)
                    throw new ProgramError(
                        "Tried to resolve a converter dependency while no converter was being constructed!",
                    );
                ingredientTree.addResourcesToList(
                    this.converterInProgress.ingredients,
                    this.converterInProgress.unresolvedDependencies,
                    dependencySettings,
                    dependencySettings.evaluateTree(dependency.amount),
                );
                submitBtn.onclick = null;
                this.closeDependencyPopup();
                this.resolveConverterDependency();
            } catch (e: any) {
                displayErr(e);
                throw e;
            }
        };
    }

    private finalizeConverter() {
        if (!this.converterInProgress)
            throw new ProgramError(
                "Tried to finalize converter dependencies when no converter was being constructed!",
            );

        const converter = this.converterInProgress.converter.makeConverter(
            this.converterInProgress.ingredients,
            this.converterInProgress.products,
        );

        // If being requested by resource, get the amount automatically from the converter
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
    }

    private getAmountToProduce(
        converter: Converter,
        input: HTMLInputElement,
    ): Rational | null {
        if (this.resourceRequest) {
            return converter.getAmountToProduce(
                this.resourceRequest.resource,
                this.resourceRequest.amount,
            );
        }

        return Rational.fromInput(input.value, input);
    }

    // Note: Does not apply changes automatically!
    protected override clearFilters() {
        this.filterForm.querySelector<HTMLInputElement>(
            "input[name=search-string]",
        )!.value = "";
        this.resourceRequest = null;
    }

    public override applyCurrentFilters() {
        this.thumbList.innerHTML = "";

        const formData = new FormData(this.filterForm);
        this.searchString = String(formData.get("search-string")!.valueOf());

        const converterList = getConverterFactoriesWithFilters(
            this.searchString,
            this.resourceRequest ? [this.resourceRequest.resource] : [],
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
                this.converterInProgress = {
                    converter: cFact.factory(),
                    ingredients: [],
                    products: [],
                    unresolvedDependencies: [],
                };
                this.converterInProgress.converter.settings.populateForm(
                    this.converterSettingsForm,
                );
                this.converterInProgress.converter.tryUpdateInfoPanel();
                this.closeDependencyPopup();
                this.openDetailPopup();
            };

            // Add this thumb to all tag lists where it should be
            // (automatically adds new tag lists when it encounters a new one)
            this.addThumbToTagLists(tags, tagLists, {
                name: cFact.thumbName,
                image: cFact.displayImage,
                onclick: onclickFn,
            });
        }

        // Now that all other tag lists are ordered alphabetically, place the misc
        // tag at the end (but only if it has stuff in it)
        if (miscTag.querySelector(".tag-list-content")!.children.length > 0)
            this.thumbList.appendChild(miscTag);
    }

    private openDependencyPopup() {
        this.dependencyPopup.classList.remove("hidden");
    }
    private closeDependencyPopup() {
        this.dependencyPopup.classList.add("hidden");
    }

    public override open() {
        super.open();
    }

    public override close() {
        super.close();
        this.closeDependencyPopup();
        this.converterInProgress = null;
        this.converterSettingsForm.innerHTML = "";
        this.amountInput.classList.remove("hidden");
    }

    // Request the user to choose a converter that produces the given amount of the
    // given resource
    public requestConverterForResource(resource: Resource, amount: Rational) {
        this.resourceRequest = { resource, amount };

        this.amountInput.classList.add("hidden");

        this.open();
        this.applyCurrentFilters();
    }
}

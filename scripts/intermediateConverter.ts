import { Converter, ConverterIngredient } from "./converter";
import { getResource, getSrc } from "./data";
import { Resource } from "./resource";
import { getRoundedString, resolveRational } from "./util";

/**
 * A class for holding a converter currently being constructed, with ORs and settings
 * in-between beinng resolved and not
 */
export class IntermediateConverter {
    private displayName: string;
    private displayImage: string;

    // Ingredients and products are always wrapped in an AND node. Split AND and OR
    // into two types to enforce this further?
    private ingredients: ResourceTreeBooleanNode;
    private products: ResourceTreeBooleanNode;

    private static infoTemplate = document.querySelector<HTMLTemplateElement>(
        "#converter-info-template",
    )!;
    private static converterIngredientTemplate =
        document.querySelector<HTMLTemplateElement>(
            "template#converter-ingredient-template",
        )!;
    private static converterSelectTemplate =
        document.querySelector<HTMLTemplateElement>(
            "template#converter-select-template",
        )!;
    private static converterOrTemplate =
        document.querySelector<HTMLTemplateElement>(
            "template#converter-or-template",
        )!;

    private static settingsForm = document.querySelector<HTMLFormElement>(
        "#converter-settings-form",
    );

    constructor(
        displayName: string,
        displayImage: string,
        ingredients: ResourceTreeBooleanNode,
        products: ResourceTreeBooleanNode,
    ) {
        this.displayName = displayName;
        this.displayImage = displayImage;
        this.ingredients = ingredients;
        this.products = products;
    }

    public getDisplayName() {
        return this.displayName;
    }
    public getDisplayImage() {
        return this.displayImage;
    }

    // Returns a finalized converter, provided that all ambiguities are resolved
    public finalize(): Converter {
        const ingr = this.resourceTreeToList(this.ingredients, []);
        const prod = this.resourceTreeToList(this.products, []);

        return new Converter(this.displayName, this.displayImage, ingr, prod);
    }

    // Populate an info panel with information regarding this converter
    // Assumes empty panel element!
    public populateInfoPanel(panel: HTMLElement) {
        const el = IntermediateConverter.infoTemplate.content.cloneNode(
            true,
        ) as DocumentFragment;

        // Set name and image
        el.querySelector<HTMLElement>(".rc-info-header")!.innerText =
            this.getDisplayName();
        el.querySelector<HTMLImageElement>(".rc-info-image")!.src = getSrc(
            this.getDisplayImage(),
        );

        // Populate the info panel recursively with ingredients and products
        const settings: [string, SettingType][] = [];
        this.addResourceTreeToElement(
            this.ingredients,
            null,
            el.querySelector<Element>(".c-info-ingredients")!,
            settings,
        );
        this.addResourceTreeToElement(
            this.products,
            null,
            el.querySelector<Element>(".c-info-products")!,
            settings,
        );

        // TODO: Add all required settings to the settings form

        panel.appendChild(el);
    }

    // (returns the newly created element)
    private addResourceTreeToElement(
        node: ConverterResourceTree,
        parentContext: {
            node: ResourceTreeBooleanNode;
            index: number;
        } | null,
        el: Element,
        settings: [string, SettingType][],
    ): HTMLElement {
        switch (node.type) {
            case "RESOURCE":
                // Just add the resource to the element
                const resEl = this.createIngredientElement(node);
                el.appendChild(resEl);
                return resEl;

            case "AND":
                // Add all the children to the parent element
                const andEl = document.createElement("div");
                node.resources.map((child, index) => {
                    this.addResourceTreeToElement(
                        child,
                        { node, index },
                        andEl,
                        settings,
                    );
                });
                el.appendChild(andEl);
                return andEl;

            case "OR":
                // Create a new OR element, add all the child nodes as children to
                // it. Then add a listener which modifies this part of the tree to
                // replace the OR node with the chosen branch when pressed
                const selectEl = (
                    IntermediateConverter.converterSelectTemplate.content.cloneNode(
                        true,
                    ) as HTMLElement
                ).firstElementChild! as HTMLElement; // #casting
                const selectList = selectEl.querySelector<Element>(
                    ".converter-select-children",
                )!;

                for (let i = 0; i < node.resources.length; i++) {
                    const res = node.resources[i];

                    const option = this.addResourceTreeToElement(
                        res,
                        { node, index: i },
                        selectList,
                        settings,
                    );

                    // Add a listener for selecting an option
                    option.onclick = () => {
                        if (!parentContext)
                            throw new Error("An OR node can't be a root node!");

                        parentContext.node.resources[parentContext.index] = res;
                        selectEl.replaceWith(option);

                        option.onclick = null;
                    };

                    if (i + 1 === node.resources.length) break;

                    const orEl =
                        IntermediateConverter.converterOrTemplate.content.cloneNode(
                            true,
                        ) as DocumentFragment;
                    selectList.appendChild(orEl);
                }

                el.appendChild(selectEl);
                return selectEl;

            case "MULTIPLIER":
                console.log("Multiplier found in resource tree");

                // TODO: Parse the settings

                // For now, just ignore it, but add some kind of listener later
                return this.addResourceTreeToElement(
                    node.resource,
                    parentContext,
                    el,
                    settings,
                );
        }
    }

    private createIngredientElement(ingr: ConverterResourceTreeLeaf) {
        const el = (
            IntermediateConverter.converterIngredientTemplate.content.cloneNode(
                true,
            ) as DocumentFragment
        ).firstElementChild! as HTMLElement;

        const res = getResource(ingr.id);

        el.querySelector<HTMLElement>(".converter-ingredient-name")!.innerText =
            `${res.getDisplayName()} ⨉ ${getRoundedString(resolveRational(ingr.amount))}`;
        el.querySelector<HTMLImageElement>(".converter-ingredient-image")!.src =
            getSrc(res.getDisplayImage());

        return el;
    }

    // Parse the given resource tree and store it in the output list
    private resourceTreeToList(
        node: ConverterResourceTree,
        output: ConverterIngredient[],
    ) {
        switch (node.type) {
            case "RESOURCE":
                output.push({
                    resource: getResource(node.id),
                    amount: resolveRational(node.amount),
                });
                break;
            case "AND":
                for (const child of node.resources)
                    this.resourceTreeToList(child, output);
                break;
            case "MULTIPLIER":
                // TODO: Get form data and evaluate
                console.warn("Multipliers not yet fully implemented!");
                this.resourceTreeToList(node.resource, output);
                break;
            case "OR":
                throw new Error(
                    "Resource tree isn't fully resolved, please select which of the available options to use!",
                );
        }

        return output;
    }
}

// A type for a factory of a converter, before any settings or ingredient trees are
// resolved. Stores some basic information for display and filtering
export type ConverterFactory = {
    name: string;
    image: string;
    possibleIngredients: Resource[];
    possibleProducts: Resource[];
    // switch to using an interface to not mix paradigms?
    factory: () => IntermediateConverter;
};

// The data is wrapped in implicit ANDs; if there are multiple entries in the input,
// it assumes you need them all
export type ConverterData = {
    id: string;
    displayName: string;
    displayImage: string;
    consumes: ConverterResourceTree[];
    produces: ConverterResourceTree[];
};

// Types for representing an input tree that has not yet been resolved into a list
export type ConverterResourceTree =
    | ConverterResourceTreeLeaf
    | ResourceTreeBooleanNode
    | ResourceTreeMultiplierNode;
type ConverterResourceTreeLeaf = {
    type: "RESOURCE";
    id: string;
    amount: number | [number, number]; // regular number or ratio
};
type ResourceTreeBooleanNode = {
    type: "AND" | "OR";
    resources: ConverterResourceTree[];
};
type ResourceTreeMultiplierNode = {
    type: "MULTIPLIER";
    multiplier: SettingsTreeNode;
    resource: ConverterResourceTree;
};

// Types for specifying an AST tree describing the efficiency of a process as the
// result of a number of settings
type SettingsTreeNode = SettingsTreeNumberNode | SettingsTreeInputNode;
type SettingsTreeNumberNode = number;
type SettingsTreeInputNode = {
    name: string;
    default: number;
};
// TODO: More node types

type SettingType = "Number"; // TODO: Add more types of settings as they go

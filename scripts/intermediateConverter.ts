import { Converter, ConverterIngredient } from "./converter";
import {
    ConverterSettings,
    Setting,
    SettingsTreeInputNode,
    SettingsTreeNode,
} from "./converterSettings";
import { getResource, getSrc } from "./data";
import { Resource } from "./resource";
import { getRoundedString, resolveRational } from "./util";

/**
 * A class for holding a converter currently being constructed, with ORs and settings
 * in-between beinng resolved and not
 */
export class IntermediateConverter {
    private displayName: string; // Stored unformatted
    private thumbName: string;
    private displayImage: string;

    private settings: ConverterSettings;

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

    private static infoPanel =
        document.querySelector<HTMLElement>("#rc-info-panel")!;

    private static settingsForm = document.querySelector<HTMLFormElement>(
        "#converter-settings-form",
    )!;
    private static settingInputTemplate =
        document.querySelector<HTMLTemplateElement>(
            "#converter-setting-input-template",
        )!;
    private static settingSelectTemplate =
        document.querySelector<HTMLTemplateElement>(
            "#converter-setting-select-template",
        )!;

    constructor(
        displayName: string,
        thumbName: string,
        displayImage: string,
        ingredients: ResourceTreeBooleanNode,
        products: ResourceTreeBooleanNode,
    ) {
        this.displayName = displayName;
        this.thumbName = thumbName;
        this.displayImage = displayImage;
        this.ingredients = ingredients;
        this.products = products;

        IntermediateConverter.settingsForm.innerHTML = "";

        // Get all the settings present in this converter
        this.settings = this.getAllConverterSettings(
            this.products,
            this.getAllConverterSettings(
                this.ingredients,
                new ConverterSettings(),
            ),
        );

        // Add all the settings to the settings form
        for (const [name, setting] of this.settings.getAllSettings()) {
            const settingEl = this.createSettingInput(name, setting);

            IntermediateConverter.settingsForm.appendChild(settingEl);
        }
    }

    public getThumbName() {
        return this.thumbName;
    }
    public getDisplayName() {
        // TODO: Format the display name based on the settings
        // Regex replace formatting stuff with the correct thing
        // \{(.*?)\}

        const formData = new FormData(IntermediateConverter.settingsForm);

        return this.displayName.replaceAll(/\{(.*?)\}/gim, (match, inner) =>
            this.parseFormatting(inner, formData),
        );
    }

    public getDisplayImage() {
        return this.displayImage;
    }

    // Returns a finalized converter, provided that all ambiguities are resolved
    public finalize(): Converter {
        const settingsData = new FormData(IntermediateConverter.settingsForm);

        const ingr = this.resourceTreeToList(
            this.ingredients,
            [],
            settingsData,
        );
        const prod = this.resourceTreeToList(this.products, [], settingsData);

        return new Converter(
            this.getDisplayName(),
            this.displayImage,
            ingr,
            prod,
        );
    }

    // Populate an info panel with information regarding this converter
    // Assumes empty panel element!
    public populateInfoPanel() {
        const el = IntermediateConverter.infoTemplate.content.cloneNode(
            true,
        ) as DocumentFragment;

        // Set name and image
        el.querySelector<HTMLElement>(".rc-info-header")!.innerText =
            this.getDisplayName();
        el.querySelector<HTMLImageElement>(".rc-info-image")!.src = getSrc(
            this.getDisplayImage(),
        );

        const settingsData = new FormData(IntermediateConverter.settingsForm);

        // Populate the info panel recursively with ingredients and products
        this.addResourceTreeToElement(
            this.ingredients,
            null,
            el.querySelector<Element>(".c-info-ingredients")!,
            settingsData,
        );
        this.addResourceTreeToElement(
            this.products,
            null,
            el.querySelector<Element>(".c-info-products")!,
            settingsData,
        );

        IntermediateConverter.infoPanel.appendChild(el);
    }

    private parseFormatting(toFormat: string, formData: FormData): string {
        console.log(toFormat);
        const args = toFormat.split("|");

        // The first argument is always the name of the setting
        const settingName = args[0];
        const setting = this.settings.getSetting(settingName);

        if (!setting)
            throw new Error(
                `Formatting error: Setting "${settingName}" not found!`,
            );

        // Depending on the type of the setting, do different things
        switch (setting.type) {
            case "TOGGLE": {
                // Depending on if the toggle is on or not, return the first or
                // second alternative
                return formData.get(settingName)
                    ? (args[1] ?? "")
                    : (args[2] ?? "");
            }

            case "NUMBER":
            case "ENUMERATE": {
                // Return the name/number of the setting
                return String(formData.get(settingName)!.valueOf());
            }
        }
    }

    private createSettingInput(
        name: string,
        setting: Setting,
    ): DocumentFragment {
        switch (setting.type) {
            case "NUMBER": {
                const [settingEl, , input] = this.createInputElement(name);
                // Add a number input with the correct name and label
                input.type = "number";
                input.value = String(setting.default ?? 0);
                return settingEl;
            }

            case "TOGGLE": {
                const [settingEl, , input] = this.createInputElement(name);
                // Add a toggle box
                input.type = "checkbox";
                input.checked = setting.default ?? false;
                return settingEl;
            }

            case "ENUMERATE": {
                const [settingEl, , select] = this.createSelectElement(name);
                // Add all the options
                for (const optionName of setting.options) {
                    const optionEl = document.createElement("option");
                    optionEl.value = optionName;
                    optionEl.innerText = optionName;
                    select.appendChild(optionEl);

                    const defIndex = setting.options.indexOf(setting.default);
                    select.selectedIndex = defIndex !== -1 ? defIndex : 0;
                }

                return settingEl;
            }
        }
    }

    private createInputElement(
        name: string,
    ): [DocumentFragment, HTMLLabelElement, HTMLInputElement] {
        const settingEl =
            IntermediateConverter.settingInputTemplate.content.cloneNode(
                true,
            ) as DocumentFragment;
        const label = settingEl.querySelector<HTMLLabelElement>("label")!;
        const input = settingEl.querySelector<HTMLInputElement>("input")!;

        label.htmlFor = name;
        label.innerText = name;
        input.name = name;

        input.onchange = () => {
            // Clear info panel and show again
            IntermediateConverter.infoPanel.innerHTML = "";
            this.populateInfoPanel();
        };

        return [settingEl, label, input];
    }

    private createSelectElement(
        name: string,
    ): [DocumentFragment, HTMLLabelElement, HTMLSelectElement] {
        const settingEl =
            IntermediateConverter.settingSelectTemplate.content.cloneNode(
                true,
            ) as DocumentFragment;
        const label = settingEl.querySelector<HTMLLabelElement>("label")!;
        const input = settingEl.querySelector<HTMLSelectElement>("select")!;

        label.htmlFor = name;
        label.innerText = name;
        input.name = name;

        input.onchange = () => {
            // Clear info panel and show again
            IntermediateConverter.infoPanel.innerHTML = "";
            this.populateInfoPanel();
        };

        return [settingEl, label, input];
    }

    // Register all converter settings present in the given tree
    private getAllConverterSettings(
        node: ConverterResourceTree,
        settings: ConverterSettings,
    ) {
        switch (node.type) {
            case "RESOURCE":
                return settings;

            case "AND":
            case "OR":
                for (const child of node.resources)
                    this.getAllConverterSettings(child, settings);
                return settings;

            case "MULTIPLIER":
                settings.registerSettingsFromAst(node.multiplier);
                return settings;
        }
    }

    // (returns the newly created element)
    private addResourceTreeToElement(
        node: ConverterResourceTree,
        parentContext: {
            node: ResourceTreeBooleanNode;
            index: number;
        } | null,
        el: Element,
        settingsData: FormData,
        multiplier: number = 1,
    ): HTMLElement {
        switch (node.type) {
            case "RESOURCE":
                // Just add the resource to the element
                const resEl = this.createIngredientElement(node, multiplier);
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
                        settingsData,
                        multiplier,
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
                        settingsData,
                        multiplier,
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
                // Parse the settings to modify the multiplier
                multiplier *= this.evaluateSettingsTree(
                    node.multiplier,
                    settingsData,
                );

                if (multiplier === 0) {
                    // TODO: Don't add anything, preferably without adding a dummy
                    // element
                }

                // For now, just ignore it, but add some kind of listener later
                return this.addResourceTreeToElement(
                    node.resource,
                    parentContext,
                    el,
                    settingsData,
                    multiplier,
                );
        }
    }

    private createIngredientElement(
        ingr: ConverterResourceTreeLeaf,
        multiplier: number,
    ) {
        const el = (
            IntermediateConverter.converterIngredientTemplate.content.cloneNode(
                true,
            ) as DocumentFragment
        ).firstElementChild! as HTMLElement;

        const res = getResource(ingr.id);

        el.querySelector<HTMLElement>(".converter-ingredient-name")!.innerText =
            `${res.getDisplayName()} ⨉ ${getRoundedString(resolveRational(ingr.amount) * multiplier)}`;
        el.querySelector<HTMLImageElement>(".converter-ingredient-image")!.src =
            getSrc(res.getDisplayImage());

        return el;
    }

    // Parse the given resource tree and store it in the output list
    private resourceTreeToList(
        node: ConverterResourceTree,
        output: ConverterIngredient[],
        settingsData: FormData,
        multiplier: number = 1,
    ) {
        switch (node.type) {
            case "RESOURCE":
                output.push({
                    resource: getResource(node.id),
                    amount: resolveRational(node.amount) * multiplier,
                });
                break;
            case "AND":
                for (const child of node.resources)
                    this.resourceTreeToList(
                        child,
                        output,
                        settingsData,
                        multiplier,
                    );
                break;
            case "MULTIPLIER":
                // Evaluate the settings tree
                multiplier *= this.evaluateSettingsTree(
                    node.multiplier,
                    settingsData,
                );
                this.resourceTreeToList(
                    node.resource,
                    output,
                    settingsData,
                    multiplier,
                );
                break;
            case "OR":
                throw new Error(
                    "Resource tree isn't fully resolved, please select which of the available options to use!",
                );
        }

        return output;
    }

    private evaluateSettingsTree(
        treeNode: SettingsTreeNode,
        formData: FormData,
    ): number {
        if (typeof treeNode === "number") return treeNode;

        switch (treeNode.type) {
            case "NUMBER":
                // Get the setting from the form data
                return Number(formData.get(treeNode.name)!.valueOf());

            case "TOGGLE":
                return this.evaluateSettingsTree(
                    formData.get(treeNode.name)
                        ? treeNode.true
                        : treeNode.false,
                    formData,
                );

            case "ENUMERATE":
                const chosen = formData.get(treeNode.name)!.valueOf();
                for (const [name, option] of treeNode.options) {
                    if (name === chosen)
                        return this.evaluateSettingsTree(option, formData);
                }
                // Fallback in case of multiple toggles with the same name and
                // different options
                // In case of multiple enumerates with the same name and different
                // options, sometimes the chosen option won't exist on the node. In
                // that case, choose the default value instead
                for (const [name, option] of treeNode.options) {
                    if (name === treeNode.default)
                        return this.evaluateSettingsTree(option, formData);
                }
                // TODO: Error handling in case of graph error where the default
                // option doesn't exist
                console.log("Couldn't find default value");
                return 0;

            case "MUL":
                let p = 1;
                for (const child of treeNode.factors)
                    p *= this.evaluateSettingsTree(child, formData);
                return p;

            case "DIV":
                return (
                    this.evaluateSettingsTree(treeNode.numerator, formData) /
                    this.evaluateSettingsTree(treeNode.denominator, formData)
                );

            case "ADD":
                let s = 0;
                for (const child of treeNode.terms)
                    s += this.evaluateSettingsTree(child, formData);
                return s;

            case "SUB":
                return (
                    this.evaluateSettingsTree(treeNode.term1, formData) -
                    this.evaluateSettingsTree(treeNode.term2, formData)
                );

            case "POW":
                return Math.pow(
                    this.evaluateSettingsTree(treeNode.base, formData),
                    this.evaluateSettingsTree(treeNode.exponent, formData),
                );
        }
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

// The resource list is wrapped in implicit ANDs; if there are multiple entries in
// the input/output, it assumes you need/get them all
export type ConverterData = {
    id: string;
    displayName: string;
    thumbName: string | undefined;
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

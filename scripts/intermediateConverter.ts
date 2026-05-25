import { Converter } from "./converter";
import { ConverterSettings } from "./converterSettings";
import { getResource, getSrc } from "./data";
import { Rational } from "./rational";
import {
    ConverterIngredient,
    ResourceTree,
    ResourceTreeLeaf,
    ResourceTreeNode,
    ResourceTreeBooleanNode,
    Setting,
    SettingsTreeNode,
} from "./types";
import { getUnits } from "./units";

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
    private ingredients: ResourceTree<true>;
    private products: ResourceTree<true>;

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
    private static converterOrTemplate = document.querySelector<HTMLTemplateElement>(
        "template#converter-or-template",
    )!;

    // TODO: Make non-static
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
        ingredients: ResourceTree<true>, // needs processed resource trees!
        products: ResourceTree<true>,
    ) {
        this.displayName = displayName;
        this.thumbName = thumbName;
        this.displayImage = displayImage;
        this.ingredients = ingredients;
        this.products = products;

        // Get all the settings present in this converter
        this.settings = this.getAllConverterSettings(
            this.products,
            this.getAllConverterSettings(this.ingredients, new ConverterSettings()),
        );
    }

    public populateSettingsForm(infoPanel: HTMLElement) {
        // Add settings to the settings form
        IntermediateConverter.settingsForm.innerHTML = "";
        for (const [name, setting] of this.settings.getAllSettings()) {
            const settingEl = this.createSettingInput(name, setting, infoPanel);

            IntermediateConverter.settingsForm.appendChild(settingEl);
        }
    }

    public getThumbName() {
        return this.thumbName;
    }
    public getDisplayName() {
        const formData = new FormData(IntermediateConverter.settingsForm);

        // Format the string
        return this.displayName.replaceAll(/\{(.*?)\}/gim, (_, inner) =>
            this.parseFormatting(inner, formData),
        );
    }

    public getDisplayImage() {
        return this.displayImage;
    }

    // Returns a finalized converter, provided that all ambiguities are resolved
    public finalize(): Converter {
        const ingr = this.resourceTreeToList(
            this.ingredients,
            [],
            IntermediateConverter.settingsForm,
        );
        const prod = this.resourceTreeToList(
            this.products,
            [],
            IntermediateConverter.settingsForm,
        );

        return new Converter(this.getDisplayName(), this.displayImage, ingr, prod);
    }

    // Populate an info panel with information regarding this converter
    // Assumes empty panel element!
    public populateInfoPanel(infoPanel: HTMLElement) {
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
        this.addResourceTreeToElement(
            this.ingredients,
            null,
            el.querySelector<Element>(".c-info-ingredients")!,
            IntermediateConverter.settingsForm,
        );
        this.addResourceTreeToElement(
            this.products,
            null,
            el.querySelector<Element>(".c-info-products")!,
            IntermediateConverter.settingsForm,
        );

        infoPanel.appendChild(el);
    }

    // Replace a given string with the text it represents, given settings data
    private parseFormatting(toFormat: string, formData: FormData): string {
        const args = toFormat.split("|");

        // The first argument is always the name of the setting
        const settingName = args[0];
        const setting = this.settings.getSetting(settingName);

        if (!setting)
            throw new Error(`Formatting error: Setting "${settingName}" not found!`);

        // Depending on the type of the setting, do different things
        switch (setting.type) {
            case "TOGGLE": {
                // Depending on if the toggle is on or not, return the first or
                // second alternative
                return formData.get(settingName) ? (args[1] ?? "") : (args[2] ?? "");
            }

            case "NUMBER": {
                // Return the value of the setting
                const rational = Rational.fromInput(
                    String(formData.get(settingName)!.valueOf()),
                    null,
                );
                if (!rational) return "???";
                return rational.getDecimalString();
            }

            case "ENUMERATE": {
                // Return the name of the chosen setting
                return String(formData.get(settingName)!.valueOf());
            }
        }
    }

    private createSettingInput(
        name: string,
        setting: Setting,
        infoPanel: HTMLElement,
    ): DocumentFragment {
        switch (setting.type) {
            case "NUMBER": {
                const [settingEl, , input] = this.createInputElement(
                    name,
                    infoPanel,
                    setting.unit ?? "",
                );
                // Add a text input (which will be parsed to a rational) with the
                // correct name and label
                input.type = "text";
                input.value = String(setting.default ?? 0);
                return settingEl;
            }

            case "TOGGLE": {
                const [settingEl, , input] = this.createInputElement(
                    name,
                    infoPanel,
                    "",
                );
                // Add a toggle box
                input.type = "checkbox";
                input.checked = setting.default ?? false;
                return settingEl;
            }

            case "ENUMERATE": {
                const [settingEl, , select] = this.createSelectElement(
                    name,
                    infoPanel,
                );
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
        infoPanel: HTMLElement,
        postText: string,
    ): [DocumentFragment, HTMLLabelElement, HTMLInputElement] {
        const settingEl =
            IntermediateConverter.settingInputTemplate.content.cloneNode(
                true,
            ) as DocumentFragment;
        const label = settingEl.querySelector<HTMLLabelElement>("label")!;
        const input = settingEl.querySelector<HTMLInputElement>("input")!;
        const post = settingEl.querySelector<HTMLElement>("span")!;

        label.htmlFor = name;
        label.innerText = name;
        input.name = name;
        post.innerText = postText;

        input.onchange = () => {
            // Clear info panel and show again
            infoPanel.innerHTML = "";
            this.populateInfoPanel(infoPanel);
        };

        return [settingEl, label, input];
    }

    private createSelectElement(
        name: string,
        infoPanel: HTMLElement,
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
            infoPanel.innerHTML = "";
            this.populateInfoPanel(infoPanel);
        };

        return [settingEl, label, input];
    }

    // Register all converter settings present in the given tree
    private getAllConverterSettings(
        node: ResourceTree<true>,
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
        node: ResourceTree<true>,
        parentContext: {
            parent: ResourceTreeNode<true>;
            index: number;
        } | null,
        el: Element,
        settingsForm: HTMLFormElement,
        multiplier: Rational = Rational.one,
    ): HTMLElement {
        // If the multiplier is zero, don't add this branch to the tree since it'll
        // all just be zero
        if (multiplier.equals(Rational.zero)) return document.createElement("div");

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
                        { parent: node, index },
                        andEl,
                        settingsForm,
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

                selectEl.querySelector<HTMLElement>(
                    ".converter-select-count",
                )!.innerText = String(node.resources.length);
                const selectList = selectEl.querySelector<Element>(
                    ".converter-select-children",
                )!;

                for (let i = 0; i < node.resources.length; i++) {
                    const res = node.resources[i];

                    const option = this.addResourceTreeToElement(
                        res,
                        { parent: node, index: i },
                        selectList,
                        settingsForm,
                        multiplier,
                    );

                    // Add a listener for selecting an option
                    option.onclick = () => {
                        // (since I wrap everything in an AND node, this shouldn't
                        // happen so it's fine that I don't support it)
                        if (!parentContext)
                            throw new Error("An OR node can't be a root node!");

                        // Replace the OR node with the chosen option
                        if (parentContext.parent.type === "MULTIPLIER") {
                            parentContext.parent.resource = res;
                        } else {
                            parentContext.parent.resources[parentContext.index] =
                                res;
                        }
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
                multiplier = multiplier.mul(
                    this.evaluateSettingsTree(
                        node.multiplier,
                        settingsForm,
                        new FormData(settingsForm),
                    ),
                );

                // Add the resource multiplied by the multiplier
                return this.addResourceTreeToElement(
                    node.resource,
                    { parent: node, index: 0 },
                    el,
                    settingsForm,
                    multiplier,
                );
        }
    }

    private createIngredientElement(ingr: ResourceTreeLeaf, multiplier: Rational) {
        const el = (
            IntermediateConverter.converterIngredientTemplate.content.cloneNode(
                true,
            ) as DocumentFragment
        ).firstElementChild! as HTMLElement;

        const res = getResource(ingr.id);

        const unit = getResource(ingr.id).getUnitGroupName();

        el.querySelector<HTMLElement>(".converter-ingredient-name")!.innerText =
            `${res.getDisplayName()} ⨉ ${Rational.fromData(ingr.amount).mul(multiplier).getDecimalString()} ${getUnits(unit)[1]}`;
        el.querySelector<HTMLImageElement>(".converter-ingredient-image")!.src =
            getSrc(res.getDisplayImage());

        return el;
    }

    // Parse the given resource tree and store it in the output list
    private resourceTreeToList(
        node: ResourceTree<true>,
        output: ConverterIngredient[],
        form: HTMLFormElement, // If running "headless" with default settings, this is null
        multiplier: Rational = Rational.one,
    ) {
        switch (node.type) {
            case "RESOURCE":
                output.push({
                    resource: getResource(node.id),
                    amount: Rational.fromData(node.amount).mul(multiplier),
                });
                break;
            case "AND":
                for (const child of node.resources)
                    this.resourceTreeToList(child, output, form, multiplier);
                break;
            case "MULTIPLIER":
                // Evaluate the settings tree
                multiplier = multiplier.mul(
                    this.evaluateSettingsTree(
                        node.multiplier,
                        form,
                        new FormData(form),
                    ),
                );
                this.resourceTreeToList(node.resource, output, form, multiplier);
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
        form: HTMLFormElement,
        formData: FormData,
    ): Rational {
        if (typeof treeNode === "number" || Array.isArray(treeNode))
            return Rational.fromData(treeNode);

        switch (treeNode.type) {
            case "NUMBER":
                // Get the setting from the form data
                const el = form.querySelector<HTMLInputElement>(
                    `input[name="${treeNode.name}"]`,
                );
                const num = Rational.fromInput(
                    String(
                        formData.get(treeNode.name)?.valueOf() ?? treeNode.default,
                    ),
                    el,
                );
                if (!num) throw new Error("Bad formatting!");
                return num;

            case "TOGGLE":
                return this.evaluateSettingsTree(
                    (form.querySelector<HTMLInputElement>(
                        `input[name="${treeNode.name}"]`,
                    )?.checked ?? treeNode.default)
                        ? treeNode.true
                        : treeNode.false,
                    form,
                    formData,
                );

            case "ENUMERATE":
                const chosen =
                    form
                        .querySelector<HTMLInputElement>(
                            `select[name="${treeNode.name}"]`,
                        )
                        ?.value.valueOf() ?? treeNode.default;
                for (const [selector, option] of treeNode.options) {
                    const selectorMatches =
                        typeof selector === "string"
                            ? selector === chosen
                            : selector.indexOf(chosen) !== -1;
                    if (selectorMatches)
                        return this.evaluateSettingsTree(option, form, formData);
                }
                // Fallback in case of multiple toggles with the same name and
                // different options
                // In case of multiple enumerates with the same name and different
                // options, sometimes the chosen option won't exist on the node. In
                // that case, choose the default value instead
                for (const [name, option] of treeNode.options) {
                    if (name === treeNode.default)
                        return this.evaluateSettingsTree(option, form, formData);
                }
                // TODO: Error handling in case of graph error where the default
                // option doesn't exist
                return Rational.zero;

            case "MUL":
                let p = Rational.one;
                for (const child of treeNode.factors)
                    p = p.mul(this.evaluateSettingsTree(child, form, formData));
                return p;

            case "DIV":
                return this.evaluateSettingsTree(
                    treeNode.numerator,
                    form,
                    formData,
                ).div(
                    this.evaluateSettingsTree(treeNode.denominator, form, formData),
                );

            case "ADD":
                let s = Rational.zero;
                for (const child of treeNode.terms)
                    s = s.add(this.evaluateSettingsTree(child, form, formData));
                return s;

            case "SUB":
                return this.evaluateSettingsTree(treeNode.term1, form, formData).sub(
                    this.evaluateSettingsTree(treeNode.term2, form, formData),
                );

            case "POW":
                // Hmmmmmm... need to think how to do this
                throw new Error("Powers aren't supported yet!");
            // return Math.pow(
            //     this.evaluateSettingsTree(treeNode.base, form),
            //     this.evaluateSettingsTree(treeNode.exponent, form),
            // );
        }
    }
}

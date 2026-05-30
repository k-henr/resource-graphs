import { Converter } from "./converter";
import { ConverterSettings } from "./converterSettings";
import { Rational } from "./rational";
import { ResourceTree } from "./resource-tree/resourceTree";
import { Setting } from "./types";

/**
 * A class for holding a converter currently being constructed, with ORs and settings
 * in-between beinng resolved and not
 */
export class IntermediateConverter {
    private displayName: string; // Stored unformatted
    private thumbName: string;
    private displayImage: string;

    private settings: ConverterSettings;

    // Ingredients and products
    private ingredientTree: ResourceTree;
    private productTree: ResourceTree;

    private static infoTemplate = document.querySelector<HTMLTemplateElement>(
        "#converter-info-template",
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
        ingredientTree: ResourceTree,
        productTree: ResourceTree,
    ) {
        this.displayName = displayName;
        this.thumbName = thumbName;
        this.displayImage = displayImage;
        this.ingredientTree = ingredientTree;
        this.productTree = productTree;

        // Get all the settings present in this converter
        this.settings = this.productTree.registerSettings(
            this.ingredientTree.registerSettings(new ConverterSettings()),
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
        console.log(this.ingredientTree);
        const ingr = this.ingredientTree.addResourcesToList(
            [],
            IntermediateConverter.settingsForm,
            Rational.one,
        );
        const prod = this.productTree.addResourcesToList(
            [],
            IntermediateConverter.settingsForm,
            Rational.one,
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
        el.querySelector<HTMLImageElement>(".rc-info-image")!.src =
            this.getDisplayImage();

        // Set ingredient and product trees
        el.querySelector<Element>(".c-info-ingredients")!.appendChild(
            this.ingredientTree.getElement(
                null,
                IntermediateConverter.settingsForm,
                Rational.one,
            ) ?? document.createElement("div"),
        );
        el.querySelector<Element>(".c-info-products")!.appendChild(
            this.productTree.getElement(
                null,
                IntermediateConverter.settingsForm,
                Rational.one,
            ) ?? document.createElement("div"),
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
}

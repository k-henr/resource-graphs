import { Converter } from "./converter";
import { ConverterSettings } from "./converterSettings";
import { resourceTreeDataToClass } from "./data";
import { displayErr, ProgramError } from "./errors";
import { Rational } from "./rational";
import { EntangledOrNode } from "./resource-tree/entangledOr";
import { ResourceTree } from "./resource-tree/resourceTree";
import { Template } from "./template";
import { ConverterSettingData, ResourceTreeData } from "./types";
/**
 * The class for holding a converter currently being constructed, with ORs and
 * settings. After being contructed in the factory, but before being fully finalized.
 */

export class IntermediateConverter {
    private displayName: string; // Stored unformatted
    public readonly thumbName: string;
    public readonly displayImage: string;

    public readonly settings: ConverterSettings;

    // Lists of all entangled OR nodes linked with this converter, grouped by their
    // name
    // (in most cases there'll only be a single group, but I wanted to support more)
    private readonly entangledOrs = new Map<string, EntangledOrNode[]>();

    // todo: back to private after ddebugging
    public readonly infoElement: HTMLElement;

    // Ingredients and products
    private readonly ingredientTree: ResourceTree;
    private readonly productTree: ResourceTree;

    private static infoTemplate = new Template("converter-info-template");

    private static infoPanel =
        document.querySelector<HTMLElement>("#rc-info-panel")!;

    // note: overrides any current content of the info panel!
    constructor(
        displayName: string,
        thumbName: string,
        displayImage: string,
        settingList: ConverterSettingData[],
        ingredientTree: ResourceTreeData,
        productTree: ResourceTreeData,
    ) {
        this.displayName = displayName;
        this.thumbName = thumbName;
        this.displayImage = displayImage;
        this.ingredientTree = resourceTreeDataToClass(this, ingredientTree);
        this.productTree = resourceTreeDataToClass(this, productTree);

        this.settings = new ConverterSettings(settingList, this);

        // Populate the info panel
        this.infoElement = IntermediateConverter.infoTemplate.cloneElement();

        // Add the trees' elements to the info panel
        this.infoElement
            .querySelector<Element>(".c-info-ingredients")!
            .appendChild(this.ingredientTree.element);
        this.infoElement
            .querySelector<Element>(".c-info-products")!
            .appendChild(this.productTree.element);

        // Update the trees to make their numbers correct
        this.updateInfoPanel();
        // Set image (move into updateInfoPanel if I want to add dynamic images that
        // depend on settings)
        this.infoElement.querySelector<HTMLImageElement>(".rc-info-image")!.src =
            this.displayImage;

        IntermediateConverter.infoPanel.replaceChildren(this.infoElement);
    }

    public formatDisplayName() {
        return this.settings.parseFormattedString(this.displayName);
    }

    // Returns a finalized converter, provided that all ambiguities are resolved
    public finalize(): Converter {
        const ingr = this.ingredientTree.addResourcesToList([], this, Rational.one);
        const prod = this.productTree.addResourcesToList([], this, Rational.one);

        return new Converter(
            this.formatDisplayName(),
            this.displayImage,
            ingr,
            prod,
        );
    }

    public tryUpdateInfoPanel() {
        try {
            this.updateInfoPanel();
        } catch (e: any) {
            displayErr(e);
            throw e;
        }
    }

    // Update the info display with new settings
    public updateInfoPanel() {
        // Update the trees' elements
        this.ingredientTree.updateElement(Rational.one, this);
        this.productTree.updateElement(Rational.one, this);

        // Update the header
        this.infoElement.querySelector<HTMLElement>(".rc-info-header")!.innerText =
            this.formatDisplayName();
    }

    public registerEntangledOr(name: string, node: EntangledOrNode) {
        if (!this.entangledOrs.has(name)) this.entangledOrs.set(name, []);
        this.entangledOrs.get(name)!.push(node);
    }

    public unregisterEntangledOr(name: string, node: EntangledOrNode) {
        const list = this.entangledOrs.get(name);
        if (!list)
            throw new ProgramError(
                `No entangled ORs with name ${name} present on this intermediate converter!`,
            );
        for (let i = 0; i < list.length; i++) {
            if (list[i] === node) {
                list.splice(i, 1);
                return;
            }
        }
        throw new ProgramError(
            `Tried to remove entangled OR with name ${name}, but it wasn't registered on the converter!`,
        );
    }

    public collapseEntangledOrs(entangledOrName: string, optionName: string) {
        // Extract all entangled ORs with the given name from the list
        // Loop through all entangled ORs, see their IDs, and collapse them if it
        //  matches
        const ors = this.entangledOrs.get(entangledOrName);
        if (!ors) return;

        for (const node of ors) node.chooseOption(optionName);
    }
}

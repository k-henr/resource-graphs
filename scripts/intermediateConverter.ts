import { Converter } from "./converter";
import { ConverterSettings } from "./converterSettings";
import { resourceTreeDataToClass } from "./data";
import { displayErr, GraphError, ProgramError } from "./errors";
import { Rational } from "./rational";
import { EntangledOrNode } from "./resource-tree/entangledOr";
import { ResourceTree } from "./resource-tree/resourceTree";
import { Template } from "./template";
import {
    ConverterDependency,
    ConverterIngredient,
    ConverterSettingData,
    ResourceTreeData,
} from "./types";
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

    private readonly infoElement: HTMLElement;

    // Ingredients and products
    private readonly ingredientTree: ResourceTree;
    private readonly productTree: ResourceTree;

    // Resolved dependencies, for display purposes
    private readonly dependencies: [Converter, Rational][] = [];

    private static infoTemplate = new Template("converter-info-template");

    private static infoPanel =
        document.querySelector<HTMLElement>("#rc-info-panel")!;

    // note: overrides any current content of the info panel!
    constructor(
        displayName: string,
        thumbName: string,
        displayImage: string,
        settingList: ConverterSettingData[],
        ingredientTreeData: ResourceTreeData,
        productTreeData: ResourceTreeData,
    ) {
        this.displayName = displayName;
        this.thumbName = thumbName;
        this.displayImage = displayImage;
        this.ingredientTree = resourceTreeDataToClass(this, ingredientTreeData);
        this.productTree = resourceTreeDataToClass(this, productTreeData);

        this.settings = new ConverterSettings(settingList, (e) => {
            e.preventDefault();
            this.tryUpdateInfoPanel();
        });

        // == TODO: Move the below code into ConverterMenu where it belongs ==

        // Populate the info panel
        this.infoElement = IntermediateConverter.infoTemplate.cloneElement();

        // Add the trees' elements to the info panel
        this.infoElement
            .querySelector<Element>(".c-info-ingredients")!
            .appendChild(this.ingredientTree.createElement());
        this.infoElement
            .querySelector<Element>(".c-info-products")!
            .appendChild(this.productTree.createElement());

        // Update the trees to make their numbers correct
        this.updateInfoPanel();
        // Set image (move into updateInfoPanel if I want to add dynamic images that
        // depend on settings)
        this.infoElement.querySelector<HTMLImageElement>(".rc-info-image")!.src =
            this.displayImage;

        IntermediateConverter.infoPanel.replaceChildren(this.infoElement);

        // ==  ==
    }

    public formatDisplayName() {
        return this.settings.parseFormattedString(this.displayName);
    }

    // Returns a finalized converter, provided that all ambiguities are resolved
    public makeConverter(
        ingr: ConverterIngredient[],
        prod: ConverterIngredient[],
    ): Converter {
        return new Converter(
            this.formatDisplayName(),
            this.displayImage,
            ingr,
            prod,
            this.dependencies,
        );
    }

    public addIngredientsToList(
        ingredientList: ConverterIngredient[],
        converterDependencyList: ConverterDependency[],
    ) {
        return this.ingredientTree.addResourcesToList(
            ingredientList,
            converterDependencyList,
            this.settings,
            Rational.one,
        );
    }

    public addProductsToList(ingredientList: ConverterIngredient[]) {
        const depList: ConverterDependency[] = [];
        const l = this.productTree.addResourcesToList(
            ingredientList,
            depList,
            this.settings,
            Rational.one,
        );
        if (depList.length !== 0)
            throw new GraphError(
                `${this.thumbName} contains a "CONVERTER" node in the output tree, which is not allowed at this time!`,
            );
        return l;
    }

    // Add a dependency, once that dependency has been resolved
    public addDependency(dependency: Converter, amount: Rational) {
        console.log("Adding dependency:", dependency);
        this.dependencies.push([dependency, amount]);
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
        this.ingredientTree.updateElements(Rational.one, this.settings);
        this.productTree.updateElements(Rational.one, this.settings);

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

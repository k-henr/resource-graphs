import { Converter } from "./converter";
import { ConverterSettings } from "./converterSettings";
import { displayErr, ProgramError } from "./errors";
import { Rational } from "./rational";
import { EntangledOrNode } from "./resource-tree/entangledOr";
import { NothingNode } from "./resource-tree/nothingNode";
import { ResourceTree } from "./resource-tree/resourceTree";
import { ConverterSettingData } from "./types";

/**
 * A class for holding a converter currently being constructed, with ORs and settings
 * in-between beinng resolved and not
 */
export class IntermediateConverter {
    private displayName: string; // Stored unformatted
    private thumbName: string;
    private displayImage: string;

    private settings: ConverterSettings;
    private entangledOrs: [string, EntangledOrNode][] = [];

    // Ingredients and products
    private ingredientTree: ResourceTree;
    private productTree: ResourceTree;

    private static infoTemplate = document.querySelector<HTMLTemplateElement>(
        "#converter-info-template",
    )!;

    private static infoPanel =
        document.querySelector<HTMLElement>("#rc-info-panel")!;

    constructor(
        displayName: string,
        thumbName: string,
        displayImage: string,
        settingList: ConverterSettingData[],
        ingredientTree: ResourceTree,
        productTree: ResourceTree,
    ) {
        this.displayName = displayName;
        this.thumbName = thumbName;
        this.displayImage = displayImage;
        this.ingredientTree = ingredientTree;
        this.productTree = productTree;

        this.settings = new ConverterSettings(settingList, this);
    }

    public getThumbName() {
        return this.thumbName;
    }

    public getDisplayName() {
        return this.settings.parseFormattedString(this.displayName);
    }

    public getDisplayImage() {
        return this.displayImage;
    }

    // Returns a finalized converter, provided that all ambiguities are resolved
    public finalize(): Converter {
        const ingr = this.ingredientTree.addResourcesToList(
            [],
            this.settings,
            Rational.one,
        );
        const prod = this.productTree.addResourcesToList(
            [],
            this.settings,
            Rational.one,
        );

        return new Converter(this.getDisplayName(), this.displayImage, ingr, prod);
    }

    public tryPopulateInfoPanel() {
        try {
            this.populateInfoPanel();
        } catch (e: any) {
            displayErr(e);
            throw e;
        }
    }

    // Populate an info panel with information regarding this converter
    public populateInfoPanel() {
        IntermediateConverter.infoPanel.innerHTML = "";

        const el = IntermediateConverter.infoTemplate.content.cloneNode(
            true,
        ) as DocumentFragment;

        // Set name and image
        el.querySelector<HTMLElement>(".rc-info-header")!.innerText =
            this.getDisplayName();
        el.querySelector<HTMLImageElement>(".rc-info-image")!.src =
            this.getDisplayImage();

        this.entangledOrs = [];

        // Set ingredient and product trees
        el.querySelector<Element>(".c-info-ingredients")!.appendChild(
            this.getTreeElement(this.ingredientTree),
        );
        el.querySelector<Element>(".c-info-products")!.appendChild(
            this.getTreeElement(this.productTree),
        );

        IntermediateConverter.infoPanel.appendChild(el);
    }

    private getTreeElement(tree: ResourceTree): HTMLElement {
        const el = tree.getElement(null, this.settings, Rational.one, this);
        if (el) return el;
        const fallback = new NothingNode().getElement(
            null,
            this.settings,
            Rational.one,
            this,
        );
        if (!fallback) {
            throw new ProgramError(
                "Failed to generate resource tree fallback element for empty resource tree!",
            );
        }
        return fallback;
    }

    public registerEntangledOr(id: string, node: EntangledOrNode) {
        this.entangledOrs.push([id, node]);
    }

    public unregisterEntangledOr(node: EntangledOrNode) {
        for (let i = 0; i < this.entangledOrs.length; i++) {
            if (this.entangledOrs[i][1] === node) {
                this.entangledOrs.splice(i, 1);
                return;
            }
        }
    }

    public collapseEntangledOrs(entangledOrId: string, optionId: string) {
        // Loop through all entangled ORs, see their IDs, and collapse them if it
        //  matches
        for (const data of [...this.entangledOrs]) {
            const [id, node] = data;
            if (id !== entangledOrId) continue;

            node.collapseNodeUsingId(optionId);
            this.unregisterEntangledOr(node);
        }
    }
}

import { ConverterSettings } from "../converterSettings";
import { displayErr, GraphError } from "../errors";
import { IntermediateConverter } from "../intermediateConverter";
import { Rational } from "../rational";
import { OrNode } from "./orNode";
import { ResourceTree } from "./resourceTree";
import { ResourceTreeNode } from "./resourceTreeNode";
/**
 * Like an OR node, except it has an ID and when collapsing it also collapses any
 * other OR nodes with the same ID
 */

export class EntangledOrNode extends OrNode {
    // The ID of this converter
    private id: string;
    // I store the IDs separate to the resources since I want to be able ot extend OR
    // and can't be bothered making a generic class solution work
    private optionIds: string[];

    // The onclick functions that have been generated, to simulate choosing one when
    // collapsing
    private onclicks = new Map<string, () => void>();

    constructor(id: string, options: [string, ResourceTree][]) {
        super(options.map(([, r]) => r));
        this.id = id;
        this.optionIds = options.map(([id]) => id);
    }

    public override getElement(
        parent: ResourceTreeNode | null,
        settings: ConverterSettings,
        multiplier: Rational,
        requestingConverter: IntermediateConverter,
    ): HTMLElement | null {
        requestingConverter.registerEntangledOr(this.id, this);
        return super.getElement(parent, settings, multiplier, requestingConverter);
    }

    // When creating the onclick, also store it in a dictionary here
    public override getOnClickForOption(
        parent: ResourceTreeNode,
        option: ResourceTree,
        selectEl: HTMLElement,
        optionEl: HTMLElement,
        requestingConverter: IntermediateConverter,
    ): () => void {
        const onclickNoEntTrigger = () => {
            try {
                super.collapseNode(
                    parent,
                    option,
                    selectEl,
                    optionEl,
                    requestingConverter,
                );
            } catch (e: any) {
                displayErr(e);
                throw e;
            }
        };

        const id = this.optionIds[this.children.indexOf(option)];
        this.onclicks.set(id, onclickNoEntTrigger);

        return super.getOnClickForOption(
            parent,
            option,
            selectEl,
            optionEl,
            requestingConverter,
        );
    }

    public collapseNodeUsingId(id: string) {
        console.log("Collapsing EntOr into id", id);
        const onclick = this.onclicks.get(id);
        console.log(onclick);

        if (!onclick)
            throw new GraphError(
                `Option with id ${id} not present on this entangled OR!`,
            );

        onclick(); // Problem: this refers to EntangledOr.collapseNode, which triggers recursive collapses
    }

    // Override the collapseNode function so that when this node collapses, it also
    // collapses the others
    public override collapseNode(
        orParent: ResourceTreeNode,
        option: ResourceTree,
        selectEl: HTMLElement,
        optionEl: HTMLElement,
        requestingConverter: IntermediateConverter,
    ): void {
        // Get the ID of the chosen option
        const optionId = this.optionIds[this.children.indexOf(option)];

        super.collapseNode(
            orParent,
            option,
            selectEl,
            optionEl,
            requestingConverter,
        );

        // Send a message to the converter to also collapse the other entangled ORs
        requestingConverter.unregisterEntangledOr(this);
        requestingConverter.collapseEntangledOrs(this.id, optionId);
    }
}

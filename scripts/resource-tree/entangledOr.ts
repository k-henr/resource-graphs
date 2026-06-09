import { ConverterSettings } from "../converterSettings";
import { displayErr, GraphError, ProgramError } from "../errors";
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
    private collapseFns = new Map<string, () => void>();

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
        const el = super.getElement(
            parent,
            settings,
            multiplier,
            requestingConverter,
        );
        if (!el) return null;
        requestingConverter.registerEntangledOr(this.id, this);
        return el;
    }

    // When creating the onclick, also store it in a dictionary here
    public override getCollapseFnForOption(
        parent: ResourceTreeNode,
        option: ResourceTree,
        selectEl: HTMLElement,
        optionEl: HTMLElement,
        requestingConverter: IntermediateConverter,
    ): () => void {
        const collapseWithoutEntangledTrigger = () => {
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
        this.collapseFns.set(id, collapseWithoutEntangledTrigger);

        return super.getCollapseFnForOption(
            parent,
            option,
            selectEl,
            optionEl,
            requestingConverter,
        );
    }

    public collapseNodeUsingId(id: string) {
        const collapseFn = this.collapseFns.get(id);

        if (!collapseFn)
            throw new GraphError(
                `Option with id ${id} not present on this entangled OR!`,
            );

        collapseFn();
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
        console.log([...this.optionIds]);
        console.log([...this.children]);
        console.log(option);
        const optionIndex = this.children.indexOf(option);
        console.log(optionIndex);
        if (optionIndex === -1)
            throw new ProgramError(`Option not present on entangled OR node!`);
        const optionId = this.optionIds[optionIndex];

        super.collapseNode(
            orParent,
            option,
            selectEl,
            optionEl,
            requestingConverter,
        );

        console.log(optionId);
        // Send a message to the converter to also collapse the other entangled ORs
        requestingConverter.unregisterEntangledOr(this);
        requestingConverter.collapseEntangledOrs(this.id, optionId);
    }
}

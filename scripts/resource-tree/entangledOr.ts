import { IntermediateConverter } from "../intermediateConverter";
import { ResourceTreeDataEntangledOrNode } from "../types";
import { OrNode } from "./orNode";
import { ResourceTree } from "./resourceTree";
/**
 * Like an OR node, except it has an ID and when collapsing it also collapses any
 * other OR nodes with the same ID
 */

export class EntangledOrNode extends OrNode {
    // The ID of this converter
    private readonly name: string;
    // The converter that this entangled OR uses for communicating with other
    // entangled ORs
    private readonly converter: IntermediateConverter;

    constructor(
        converter: IntermediateConverter,
        name: string,
        options: [string, ResourceTree][],
    ) {
        super(options);
        this.name = name;
        this.converter = converter;
        converter.registerEntangledOr(name, this); // todo: move somewhere else somehow?
    }

    // Override the collapseNode function so that when this node collapses, it also
    // collapses the others
    public override chooseOption(optionName: string): void {
        this.converter.unregisterEntangledOr(this.name, this);
        super.chooseOption(optionName);
        // Send a message to the converter to also collapse the other entangled ORs
        // with the same ID, using the same option name
        this.converter.collapseEntangledOrs(this.name, optionName);
    }
}

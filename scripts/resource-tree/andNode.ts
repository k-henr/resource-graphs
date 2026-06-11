import { IntermediateConverter } from "../intermediateConverter";
import { Rational } from "../rational";
import { ConverterIngredient } from "../types";
import { ResourceTree } from "./resourceTree";
import { ResourceTreeBoolNode } from "./resourceTreeBoolNode";
/**
 * A node which contains a number of other nodes, all of which will be included in
 * the tree
 */

export class AndNode extends ResourceTreeBoolNode {
    public readonly element: HTMLElement;

    public constructor(children: ResourceTree[]) {
        super(children);

        // Add all the children to the parent element
        const andEl = document.createElement("div");
        andEl.classList.add("converter-child-list"); // todo: template?
        this.children.map((child) => andEl.appendChild(child.element));

        this.element = andEl;
    }

    public override addResourcesToList(
        output: ConverterIngredient[],
        converter: IntermediateConverter,
        multiplier: Rational = Rational.one,
    ) {
        this.children.map((c) =>
            c.addResourcesToList(output, converter, multiplier),
        );
        return output;
    }
}

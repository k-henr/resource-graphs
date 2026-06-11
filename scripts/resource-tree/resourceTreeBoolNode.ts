import { ProgramError } from "../errors";
import { IntermediateConverter } from "../intermediateConverter";
import { Rational } from "../rational";
import { ConverterIngredient } from "../types";
import { ResourceTree } from "./resourceTree";
/**
 * An abtract class used by boolean nodes (AND, OR, ENTANGLED_OR), with some shared
 * functionality.
 */

export abstract class ResourceTreeBoolNode implements ResourceTree {
    public abstract readonly element: HTMLElement;

    protected children: ResourceTree[];

    public constructor(children: ResourceTree[]) {
        this.children = children;
    }

    public replaceChild(oldChild: ResourceTree, newChild: ResourceTree): void {
        for (const i in this.children) {
            if (this.children[i] === oldChild) {
                this.children[i].element.replaceWith(newChild.element);
                this.children[i] = newChild;
                return;
            }
        }
        throw new ProgramError(
            "Child not found in boolean node when trying to replace it!",
        );
    }

    public abstract addResourcesToList(
        output: ConverterIngredient[],
        converter: IntermediateConverter,
        multiplier: Rational,
    ): ConverterIngredient[];

    public updateElement(
        multiplier: Rational,
        requestingConverter: IntermediateConverter,
    ) {
        // Update all the children
        this.children.map((child) =>
            child.updateElement(multiplier, requestingConverter),
        );
    }
}

import { ConverterSettings } from "../converterSettings";
import { ProgramError } from "../errors";
import { IntermediateConverter } from "../intermediateConverter";
import { Rational } from "../rational";
import { ConverterIngredient } from "../types";
import { ResourceTree } from "./resourceTree";
import { ResourceTreeNode } from "./resourceTreeNode";

export abstract class ResourceTreeBoolNode implements ResourceTreeNode {
    protected children: ResourceTree[];

    public constructor(children: ResourceTree[]) {
        this.children = children;
    }

    public replaceChild(oldChild: ResourceTree, newChild: ResourceTree): void {
        for (const i in this.children) {
            if (this.children[i] === oldChild) {
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
        settings: ConverterSettings,
        multiplier: Rational,
    ): ConverterIngredient[];

    public abstract getElement(
        parent: ResourceTreeNode | null,
        settings: ConverterSettings,
        multiplier: Rational,
        requestingConverter: IntermediateConverter,
    ): HTMLElement | null;
}

import { ConverterSettings } from "../converterSettings";
import { Rational } from "../rational";
import { Resource } from "../resource";
import { ConverterIngredient } from "../types";
import { ResourceTree } from "./resourceTree";
import { ResourceTreeNode } from "./resourceTreeNode";

export abstract class ResourceTreeBoolNode extends ResourceTreeNode {
    protected children: ResourceTree[];

    public constructor(children: ResourceTree[]) {
        super();
        this.children = children;
    }

    public override getAllPossibleResources(output: Resource[]): Resource[] {
        this.children.map((el) => el.getAllPossibleResources(output));
        return output;
    }

    public override registerSettings(settings: ConverterSettings) {
        this.children.map((c) => c.registerSettings(settings));
        return settings;
    }

    public override replaceChild(
        oldChild: ResourceTree,
        newChild: ResourceTree,
    ): void {
        for (const i in this.children) {
            if (this.children[i] === oldChild) {
                this.children[i] = newChild;
                return;
            }
        }
        throw new Error("Element not found in boolean node!");
    }
}

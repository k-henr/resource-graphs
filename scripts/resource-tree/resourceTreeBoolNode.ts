import { ConverterSettings } from "../converterSettings";
import { ProgramError } from "../errors";
import { ResourceTree } from "./resourceTree";
import { ResourceTreeNode } from "./resourceTreeNode";

export abstract class ResourceTreeBoolNode extends ResourceTreeNode {
    protected children: ResourceTree[];

    public constructor(children: ResourceTree[]) {
        super();
        this.children = children;
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
        throw new ProgramError(
            "Child not found in boolean node when trying to replace it!",
        );
    }
}

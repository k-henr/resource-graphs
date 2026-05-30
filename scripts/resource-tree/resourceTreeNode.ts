import { ResourceTree } from "./resourceTree";

export abstract class ResourceTreeNode extends ResourceTree {
    // Replace the given child with a new one. May throw an error if the child is not
    // found
    public abstract replaceChild(
        oldChild: ResourceTree,
        newChild: ResourceTree,
    ): void;
}

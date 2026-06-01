import { ResourceTree } from "./resourceTree";

export interface ResourceTreeNode extends ResourceTree {
    // Replace the given child with a new one. May throw an error if the child is not
    // found
    replaceChild(oldChild: ResourceTree, newChild: ResourceTree): void;
}

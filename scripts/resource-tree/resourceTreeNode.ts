import { ResourceTree } from "./resourceTree";
/**
 * Interface for a node in a resource tree, providing a way to replace children with
 * other nodes.
 */

export interface ResourceTreeNode extends ResourceTree {
    // Replace the given child with a new one. May throw an error if the child is not
    // found
    replaceChild(oldChild: ResourceTree, newChild: ResourceTree): void;
}

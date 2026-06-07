import { ConverterSettings } from "../converterSettings";
import { displayErr, GraphError, UserError } from "../errors";
import { IntermediateConverter } from "../intermediateConverter";
import { Rational } from "../rational";
import { Template } from "../template";
import { ConverterIngredient } from "../types";
import { NothingNode } from "./nothingNode";
import { ResourceTree } from "./resourceTree";
import { ResourceTreeBoolNode } from "./resourceTreeBoolNode";
import { ResourceTreeNode } from "./resourceTreeNode";
/**
 * A node which generates a number of options. The user then chooses one, which
 * "collapses" this node into just that branch.
 *
 * All or nodes have to be resolved to finalize the tree.
 */

export class OrNode extends ResourceTreeBoolNode {
    constructor(options: ResourceTree[]) {
        super(options);
    }

    // Element representing an option
    protected static converterSelectTemplate = new Template(
        "converter-select-template",
    );
    // Element inbetween options that just says "OR"
    protected static converterOrTemplate = new Template("converter-or-template");

    public override getElement(
        parent: ResourceTreeNode | null,
        settings: ConverterSettings,
        multiplier: Rational,
        requestingConverter: IntermediateConverter,
    ): HTMLElement | null {
        // (since I wrap everything in an AND node, this shouldn't happen so it's
        // fine that I don't support it)
        if (!parent) throw new GraphError("An OR node can't be a root node!");

        // Create a new OR element, add all the child nodes as children to it. Then
        // add a listener which modifies this part of the tree to replace the OR node
        // with the chosen branch when pressed
        const selectEl = OrNode.converterSelectTemplate.cloneElement();

        const selectList = selectEl.querySelector<Element>(
            ".converter-select-children",
        )!;

        let numOptions = 0;
        let encounteredEmptyNode = false;
        let encounteredNonemptyNode = false;

        for (let i = 0; i < this.children.length; i++) {
            const el = this.addOptionElement(
                this.children[i],
                settings,
                multiplier,
                parent,
                selectEl,
                selectList,
                requestingConverter,
            );
            if (el === null) {
                encounteredEmptyNode = true;
            } else {
                numOptions++;
                encounteredNonemptyNode = true;
                if (i !== this.children.length - 1) this.addOrElement(selectList);
            }
        }

        // If there were no filled nodes in this OR, return null
        // (temporarily removed until I've made ORs automatically collapse if they
        // have no contents)
        //if (!encounteredNonemptyNode) return null;

        // If there should be a "nothing" option, add it
        if (encounteredEmptyNode || !encounteredNonemptyNode) {
            if (numOptions != 0) this.addOrElement(selectList); // If there were any previous options
            numOptions++;
            // Make a dummy "nothing" node
            const nothingNode = new NothingNode();
            this.addOptionElement(
                nothingNode,
                settings,
                multiplier,
                parent,
                selectEl,
                selectList,
                requestingConverter,
            );
        }

        selectEl.querySelector<HTMLElement>(".converter-select-count")!.innerText =
            String(numOptions);

        // Return the finished element
        return selectEl;
    }

    // Add an element for the given option
    private addOptionElement(
        option: ResourceTree,
        settings: ConverterSettings,
        multiplier: Rational,
        parent: ResourceTreeNode,
        selectEl: HTMLElement,
        selectList: Element,
        requestingConverter: IntermediateConverter,
    ): HTMLElement | null {
        const optionEl = option.getElement(
            this,
            settings,
            multiplier,
            requestingConverter,
        );

        // Add a listener for selecting an option
        if (optionEl) {
            optionEl.classList.add("primary", "interactive");
            selectList.appendChild(optionEl);
            optionEl.onclick = this.getOnClickForOption(
                parent,
                option,
                selectEl,
                optionEl,
                requestingConverter,
            );
        } else {
            return null;
        }

        return optionEl;
    }

    private addOrElement(list: Element) {
        const orEl = OrNode.converterOrTemplate.clone();
        list.appendChild(orEl);
    }

    protected getOnClickForOption(
        parent: ResourceTreeNode,
        option: ResourceTree,
        selectEl: HTMLElement,
        optionEl: HTMLElement,
        requestingConverter: IntermediateConverter,
    ) {
        return () => {
            try {
                this.collapseNode(
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
    }

    // Collapse this node with the given option
    public collapseNode(
        orParent: ResourceTreeNode,
        option: ResourceTree,
        selectEl: HTMLElement,
        optionEl: HTMLElement,
        _requestingConverter: IntermediateConverter,
    ) {
        orParent.replaceChild(this, option);
        selectEl.replaceWith(optionEl);
        optionEl.classList.remove("primary", "interactive");
        optionEl.onclick = null;
    }

    public override addResourcesToList(
        _: ConverterIngredient[],
        __: ConverterSettings,
        ___: Rational = Rational.one,
    ): ConverterIngredient[] {
        throw new UserError(
            "All OR nodes aren't resolved, please choose an option!",
        );
    }
}

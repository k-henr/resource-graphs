import { ConverterSettings } from "../converterSettings";
import { displayErr, GraphError, UserError } from "../errors";
import { IntermediateConverter } from "../intermediateConverter";
import { Rational } from "../rational";
import { ConverterIngredient } from "../types";
import { NothingNode } from "./nothingNode";
import { ResourceTree } from "./resourceTree";
import { ResourceTreeBoolNode } from "./resourceTreeBoolNode";
import { ResourceTreeNode } from "./resourceTreeNode";

export class OrNode extends ResourceTreeBoolNode {
    constructor(options: ResourceTree[]) {
        super(options);
    }

    // Element representing an option
    protected static converterSelectTemplate =
        document.querySelector<HTMLTemplateElement>(
            "template#converter-select-template",
        )!;
    // Element inbetween options that just says "OR"
    protected static converterOrTemplate =
        document.querySelector<HTMLTemplateElement>(
            "template#converter-or-template",
        )!;

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
        const selectEl = (
            OrNode.converterSelectTemplate.content.cloneNode(true) as HTMLElement
        ).firstElementChild! as HTMLElement; // #casting

        selectEl.querySelector<HTMLElement>(".converter-select-count")!.innerText =
            String(this.children.length);
        const selectList = selectEl.querySelector<Element>(
            ".converter-select-children",
        )!;

        let encounteredEmptyNode = false;

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
                if (i !== this.children.length - 1) this.addOrElement(selectList);
            }
        }

        // If there should be a "nothing" option, add it
        if (encounteredEmptyNode) {
            if (true) this.addOrElement(selectList); // If there were any previous options
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
        const orEl = OrNode.converterOrTemplate.content.cloneNode(
            true,
        ) as DocumentFragment;
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

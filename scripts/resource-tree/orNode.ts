import { ConverterSettings } from "../converterSettings";
import { Rational } from "../rational";
import { Resource } from "../resource";
import { ConverterIngredient } from "../types";
import { ResourceTree } from "./resourceTree";
import { ResourceTreeNode } from "./resourceTreeNode";

export class OrNode extends ResourceTreeNode {
    private children;

    constructor(options: ResourceTree[]) {
        super();
        this.children = options;
    }

    // Element representing an option
    private static converterSelectTemplate =
        document.querySelector<HTMLTemplateElement>(
            "template#converter-select-template",
        )!;
    // Element inbetween options that just says "OR"
    private static converterOrTemplate = document.querySelector<HTMLTemplateElement>(
        "template#converter-or-template",
    )!;

    public override getElement(
        parent: ResourceTreeNode | null,
        settingsForm: HTMLFormElement,
        multiplier: Rational,
    ): HTMLElement | null {
        // (since I wrap everything in an AND node, this shouldn't
        // happen so it's fine that I don't support it)
        if (!parent) throw new Error("An OR node can't be a root node!");

        // Create a new OR element, add all the child nodes as children to
        // it. Then add a listener which modifies this part of the tree to
        // replace the OR node with the chosen branch when pressed
        const selectEl = (
            OrNode.converterSelectTemplate.content.cloneNode(true) as HTMLElement
        ).firstElementChild! as HTMLElement; // #casting

        selectEl.querySelector<HTMLElement>(".converter-select-count")!.innerText =
            String(this.children.length);
        const selectList = selectEl.querySelector<Element>(
            ".converter-select-children",
        )!;

        for (let i = 0; i < this.children.length; i++) {
            const option = this.children[i];

            const optionEl = option.getElement(this, settingsForm, multiplier);
            if (!optionEl) continue; // Ignore invalid paths. TODO: If a multiplier-0
            //                        branch is discovered, add that as an option
            selectList.appendChild(optionEl);

            // Add a listener for selecting an option
            if (optionEl) {
                optionEl.onclick = () => {
                    // Replace the OR node with the chosen option
                    parent.replaceChild(this, option);
                    selectEl.replaceWith(optionEl);
                    optionEl.onclick = null;
                };
            }

            // Don't add an "OR" after the last option
            if (i + 1 === this.children.length) break;

            const orEl = OrNode.converterOrTemplate.content.cloneNode(
                true,
            ) as DocumentFragment;
            selectList.appendChild(orEl);
        }

        // Return the finished element
        return selectEl;
    }

    public override addResourcesToList(
        _: ConverterIngredient[],
        __: HTMLFormElement | null,
        ___: Rational = Rational.one,
    ): void {
        throw new Error("All OR nodes aren't resolved, please choose an option!");
    }

    public override registerSettings(settings: ConverterSettings): void {
        this.children.map((c) => c.registerSettings(settings));
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
        throw new Error("Element not found in OR node!");
    }
}

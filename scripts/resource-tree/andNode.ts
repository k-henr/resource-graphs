import { ConverterSettings } from "../converterSettings";
import { Rational } from "../rational";
import { Resource } from "../resource";
import { ConverterIngredient } from "../types";
import { ResourceTree } from "./resourceTree";
import { ResourceTreeNode } from "./resourceTreeNode";

export class AndNode extends ResourceTreeNode {
    private children: ResourceTree[];

    public constructor(children: ResourceTree[]) {
        super();
        this.children = children;
    }

    public override getElement(
        _: ResourceTreeNode | null,
        settingsForm: HTMLFormElement,
        multiplier: Rational,
    ): HTMLElement | null {
        // Add all the children to the parent element
        const andEl = document.createElement("div");
        this.children.map((child) => {
            const cEl = child.getElement(this, settingsForm, multiplier);
            if (cEl) andEl.appendChild(cEl);
        });
        return andEl;
    }

    public override addResourcesToList(
        output: ConverterIngredient[],
        settingsForm: HTMLFormElement | null,
        multiplier: Rational = Rational.one,
    ): void {
        this.children.map((c) =>
            c.addResourcesToList(output, settingsForm, multiplier),
        );
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
        throw new Error("Element not found in AND node!");
    }
}

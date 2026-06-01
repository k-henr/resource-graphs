import { ConverterSettings } from "../converterSettings";
import { IntermediateConverter } from "../intermediateConverter";
import { Rational } from "../rational";
import { ConverterIngredient } from "../types";
import { ResourceTree } from "./resourceTree";
import { ResourceTreeBoolNode } from "./resourceTreeBoolNode";
import { ResourceTreeNode } from "./resourceTreeNode";

export class AndNode extends ResourceTreeBoolNode {
    public constructor(children: ResourceTree[]) {
        super(children);
    }

    public override getElement(
        _: ResourceTreeNode | null,
        settings: ConverterSettings,
        multiplier: Rational,
        requestingConverter: IntermediateConverter,
    ): HTMLElement | null {
        // Add all the children to the parent element
        const andEl = document.createElement("div");
        this.children.map((child) => {
            const cEl = child.getElement(
                this,
                settings,
                multiplier,
                requestingConverter,
            );
            if (cEl) andEl.appendChild(cEl);
        });
        return andEl;
    }

    public override addResourcesToList(
        output: ConverterIngredient[],
        settings: ConverterSettings,
        multiplier: Rational = Rational.one,
    ) {
        this.children.map((c) => c.addResourcesToList(output, settings, multiplier));
        return output;
    }
}

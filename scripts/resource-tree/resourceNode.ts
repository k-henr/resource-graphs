import { ConverterSettings } from "../converterSettings";
import { getResource } from "../data";
import { IntermediateConverter } from "../intermediateConverter";
import { Rational } from "../rational";
import { Resource } from "../resource";
import { ConverterIngredient } from "../types";
import { getUnits } from "../units";
import { ResourceTree } from "./resourceTree";
import { ResourceTreeNode } from "./resourceTreeNode";

export class ResourceNode extends ResourceTree {
    private id: string;
    private amount: Rational;

    // Template for a resource element
    private static converterIngredientTemplate =
        document.querySelector<HTMLTemplateElement>(
            "template#converter-ingredient-template",
        )!;

    public constructor(id: string, amount: Rational) {
        super();
        this.id = id;
        this.amount = amount;
    }

    public override getElement(
        _: ResourceTreeNode | null,
        __: ConverterSettings,
        multiplier: Rational,
        ___: IntermediateConverter,
    ): HTMLElement | null {
        // Just make a resource element
        const resEl = this.createIngredientElement(multiplier);
        return resEl;
    }

    public override addResourcesToList(
        output: ConverterIngredient[],
        _: ConverterSettings,
        multiplier: Rational = Rational.one,
    ) {
        output.push({
            resource: getResource(this.id),
            amount: this.amount.mul(multiplier),
        });
        return output;
    }

    private createIngredientElement(multiplier: Rational) {
        const el = (
            ResourceNode.converterIngredientTemplate.content.cloneNode(
                true,
            ) as DocumentFragment
        ).firstElementChild! as HTMLElement;

        const res = getResource(this.id);
        const unit = res.getUnitGroupName();

        el.querySelector<HTMLElement>(".converter-ingredient-name")!.innerText =
            `${res.getDisplayName()} ⨉ ${this.amount.mul(multiplier).getDecimalString()} ${getUnits(unit)[1]}`;
        el.querySelector<HTMLImageElement>(".converter-ingredient-image")!.src =
            res.getDisplayImage();

        return el;
    }
}

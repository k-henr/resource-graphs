import { ConverterSettings } from "../converterSettings";
import { getResource } from "../data";
import { IntermediateConverter } from "../intermediateConverter";
import { Rational } from "../rational";
import { Template } from "../template";
import { ConverterIngredient } from "../types";
import { getUnits } from "../units";
import { ResourceTree } from "./resourceTree";
import { ResourceTreeNode } from "./resourceTreeNode";
/**
 * A leaf node, containing a certain amount of a certain resource.
 */

export class ResourceNode implements ResourceTree {
    private id: string;
    private amount: Rational;

    // Template for a resource element
    private static converterIngredientTemplate = new Template(
        "converter-ingredient-template",
    );

    public constructor(id: string, amount: Rational) {
        this.id = id;
        this.amount = amount;
    }

    public getElement(
        _: ResourceTreeNode | null,
        __: ConverterSettings,
        multiplier: Rational,
        ___: IntermediateConverter,
    ): HTMLElement | null {
        // Just make a resource element
        const resEl = this.createIngredientElement(multiplier);
        return resEl;
    }

    public addResourcesToList(
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
        const el = ResourceNode.converterIngredientTemplate.cloneElement();

        const res = getResource(this.id);
        const unit = res.getUnitGroupName();

        el.querySelector<HTMLElement>(".converter-ingredient-name")!.innerText =
            res.getDisplayName();
        el.querySelector<HTMLElement>(".converter-ingredient-amount")!.innerText =
            `⨉ ${this.amount.mul(multiplier).getDecimalString()} ${getUnits(unit)[1]}`;
        el.querySelector<HTMLImageElement>(".converter-ingredient-image")!.src =
            res.getDisplayImage();

        return el;
    }
}

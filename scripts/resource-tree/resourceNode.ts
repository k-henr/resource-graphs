import { IntermediateConverter } from "../intermediateConverter";
import { Rational } from "../rational";
import { Resource } from "../resource";
import { Template } from "../template";
import { ConverterIngredient } from "../types";
import { getUnits } from "../units";
import { ResourceTree } from "./resourceTree";
/**
 * A leaf node, containing a certain amount of a certain resource.
 */

export class ResourceNode implements ResourceTree {
    private readonly amount: Rational;
    private readonly resource: Resource;

    public readonly element: HTMLElement;

    // Template for a resource element
    private static converterIngredientTemplate = new Template(
        "converter-ingredient-template",
    );

    public constructor(resource: Resource, amount: Rational) {
        this.amount = amount;
        this.resource = resource;
        this.element = this.createIngredientElement();
    }

    public updateElement(multiplier: Rational, ___: IntermediateConverter) {
        // Update the amount on the element
        this.setAmount(this.amount.mul(multiplier));
    }

    private setAmount(amount: Rational) {
        const unitGroupName = this.resource.unitGroupName;
        this.element.querySelector<HTMLElement>(
            ".converter-ingredient-amount",
        )!.innerText =
            `⨉ ${amount.getDecimalString()} ${getUnits(unitGroupName)[1]}`;
    }

    public addResourcesToList(
        output: ConverterIngredient[],
        _: IntermediateConverter,
        multiplier: Rational = Rational.one,
    ) {
        output.push({
            resource: this.resource,
            amount: this.amount.mul(multiplier),
        });
        return output;
    }

    private createIngredientElement() {
        const el = ResourceNode.converterIngredientTemplate.cloneElement();

        el.querySelector<HTMLElement>(".converter-ingredient-name")!.innerText =
            this.resource.displayName;
        el.querySelector<HTMLImageElement>(".converter-ingredient-image")!.src =
            this.resource.displayImage;

        return el;
    }
}

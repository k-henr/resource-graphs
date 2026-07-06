import { ConverterSettings } from "../converterSettings";
import { Rational } from "../rational";
import { Resource } from "../resource";
import { Template } from "../template";
import { ConverterDependency, ConverterIngredient } from "../types";
import { getUnits } from "../units";
import { ResourceTree } from "./resourceTree";
/**
 * A leaf node, containing a certain amount of a certain resource.
 */

export class ResourceNode implements ResourceTree {
    private readonly amount: Rational;
    private readonly resource: Resource;

    public readonly element: HTMLElement;
    private readonly amountEl: HTMLElement;

    // Template for a resource element
    private static converterIngredientTemplate = new Template(
        "converter-ingredient-template",
    );

    public constructor(resource: Resource, amount: Rational) {
        this.amount = amount;
        this.resource = resource;
        this.element = this.createIngredientElement();
        this.amountEl = this.element.querySelector<HTMLElement>(
            ".converter-ingredient-amount",
        )!;
    }

    public updateElement(multiplier: Rational, _: ConverterSettings) {
        this.setAmount(this.amount.mul(multiplier));
    }

    private setAmount(amount: Rational) {
        const unitGroupName = this.resource.unitGroupName;
        const newContent = `${amount.getDecimalString()} ${getUnits(unitGroupName)[1]}`;
        this.amountEl.innerText = newContent;
    }

    public addResourcesToList(
        output: ConverterIngredient[],
        _converterDependencies: ConverterDependency[],
        _: ConverterSettings,
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

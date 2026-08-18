import { ConverterFactory } from "../converterFactory";
import { ConverterSettings } from "../converterSettings";
import { Rational } from "../rational";
import { Template } from "../template";
import {
    ConverterDependency,
    ConverterIngredient,
    SettingsTreeNode,
} from "../types";
import { ResourceTree } from "./resourceTree";
/**
 * A leaf node for consuming the ingredients of another converter. Not to be used in
 * product trees (yet?)!
 */

export class ConverterNode implements ResourceTree {
    public elements: HTMLElement[] = [];

    private readonly amount: SettingsTreeNode;
    private readonly converter: ConverterFactory;

    // Template for a resource element
    private static converterIngredientTemplate = new Template(
        "converter-ingredient-template",
    );

    public constructor(
        converterFactory: ConverterFactory,
        amount: SettingsTreeNode,
    ) {
        this.amount = amount;
        this.converter = converterFactory;
        this.setAmount(Rational.one); //TODO: Use another template without the amount
    }

    public createElement(): HTMLElement {
        const el = this.createIngredientElement();
        this.elements.push(el);
        return el;
    }

    public updateElements(_multiplier: Rational, _settings: ConverterSettings) {}

    private setAmount(amount: Rational) {
        for (const el of this.elements) {
            el.querySelector<HTMLElement>(
                ".converter-ingredient-amount",
            )!.innerText = amount.getDecimalString();
        }
    }

    public addResourcesToList(
        output: ConverterIngredient[],
        converterDependencies: ConverterDependency[],
        _settings: ConverterSettings,
        multiplier: Rational = Rational.one,
    ) {
        converterDependencies.push({
            converter: this.converter,
            amount: { type: "MUL", values: [multiplier.getList(), this.amount] },
        });
        return output;
    }

    private createIngredientElement() {
        const el = ConverterNode.converterIngredientTemplate.cloneElement();

        el.querySelector<HTMLElement>(".converter-ingredient-name")!.innerText =
            this.converter.displayName;
        el.querySelector<HTMLImageElement>(".converter-ingredient-image")!.src =
            this.converter.displayImage;

        return el;
    }
}

import { ConverterFactory } from "../converterFactory";
import { ConverterSettings } from "../converterSettings";
import { Rational } from "../rational";
import { Template } from "../template";
import {
    ConverterDependency,
    ConverterIngredient,
    RationalNumber,
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
    private readonly amountPreview: Rational;
    private readonly converter: ConverterFactory;

    // Template for a resource element
    private static converterIngredientTemplate = new Template(
        "converter-ingredient-template",
    );

    public constructor(
        converterFactory: ConverterFactory,
        amount: SettingsTreeNode,
        amountPreview: RationalNumber,
    ) {
        this.amount = amount;
        this.converter = converterFactory;
        this.amountPreview = Rational.fromData(amountPreview);
    }

    public createElement(): HTMLElement {
        const el = this.createIngredientElement();
        this.elements.push(el);
        return el;
    }

    public updateElements(multiplier: Rational, _settings: ConverterSettings) {
        // TODO: The amount stored is a settings tree referring to the other converter's settings tree, which means it can't be used here. It's weird; the amount will depend both on the settings of this
        const amount = this.amountPreview.mul(multiplier);
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
            this.converter.thumbName;
        el.querySelector<HTMLImageElement>(".converter-ingredient-image")!.src =
            this.converter.displayImage;

        return el;
    }
}

import { IntermediateConverter } from "../intermediateConverter";
import { Rational } from "../rational";
import { Template } from "../template";
import { ConverterIngredient } from "../types";
import { ResourceTree } from "./resourceTree";
/**
 * A node which does nothing. Used in cases where it's needed, such as for completely
 * empty trees and ORs with an empty option
 */

export class NothingNode implements ResourceTree {
    public readonly element: HTMLElement;

    private static converterIngredientTemplate = new Template(
        "converter-ingredient-template",
    );

    constructor() {
        const el = NothingNode.converterIngredientTemplate.cloneElement();
        el.querySelector<HTMLElement>(".converter-ingredient-name")!.innerText =
            `[Nothing]`;
        el.querySelector<HTMLImageElement>(".converter-ingredient-image")!.remove();

        this.element = el;
    }

    public updateElement(
        _multiplier: Rational,
        _requestingConverter: IntermediateConverter,
    ) {}

    public addResourcesToList(
        output: ConverterIngredient[],
        _: IntermediateConverter,
    ) {
        return output;
    }
}

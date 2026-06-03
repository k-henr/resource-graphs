import { ConverterSettings } from "../converterSettings";
import { IntermediateConverter } from "../intermediateConverter";
import { Rational } from "../rational";
import { Template } from "../template";
import { ConverterIngredient } from "../types";
import { ResourceTree } from "./resourceTree";
import { ResourceTreeNode } from "./resourceTreeNode";

export class NothingNode implements ResourceTree {
    private static converterIngredientTemplate = new Template(
        "converter-ingredient-template",
    );

    public getElement(
        _parent: ResourceTreeNode | null,
        _settings: ConverterSettings,
        _multiplier: Rational,
        _requestingConverter: IntermediateConverter,
    ): HTMLElement | null {
        const el = NothingNode.converterIngredientTemplate.cloneElement();

        el.querySelector<HTMLElement>(".converter-ingredient-name")!.innerText =
            `[Nothing]`;
        el.querySelector<HTMLImageElement>(".converter-ingredient-image")!.remove();

        return el;
    }

    public addResourcesToList(output: ConverterIngredient[], _: ConverterSettings) {
        return output;
    }
}

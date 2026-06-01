import { ConverterSettings } from "../converterSettings";
import { IntermediateConverter } from "../intermediateConverter";
import { Rational } from "../rational";
import { ConverterIngredient } from "../types";
import { ResourceTree } from "./resourceTree";
import { ResourceTreeNode } from "./resourceTreeNode";

export class NothingNode implements ResourceTree {
    private static converterIngredientTemplate =
        document.querySelector<HTMLTemplateElement>(
            "template#converter-ingredient-template",
        )!;

    public getElement(
        _parent: ResourceTreeNode | null,
        _settings: ConverterSettings,
        _multiplier: Rational,
        _requestingConverter: IntermediateConverter,
    ): HTMLElement | null {
        const el = (
            NothingNode.converterIngredientTemplate.content.cloneNode(
                true,
            ) as DocumentFragment
        ).firstElementChild! as HTMLElement;

        el.querySelector<HTMLElement>(".converter-ingredient-name")!.innerText =
            `[Nothing]`;
        el.querySelector<HTMLImageElement>(".converter-ingredient-image")!.remove();

        return el;
    }

    public addResourcesToList(output: ConverterIngredient[], _: ConverterSettings) {
        return output;
    }
}

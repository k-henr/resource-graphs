import { ConverterSettings } from "../converterSettings";
import { IntermediateConverter } from "../intermediateConverter";
import { Rational } from "../rational";
import { Resource } from "../resource";
import { ConverterIngredient } from "../types";
import { ResourceTree } from "./resourceTree";
import { ResourceTreeNode } from "./resourceTreeNode";

export class NothingNode extends ResourceTree {
    private static converterIngredientTemplate =
        document.querySelector<HTMLTemplateElement>(
            "template#converter-ingredient-template",
        )!;

    public constructor() {
        super();
    }

    public override getElement(
        _parent: ResourceTreeNode | null,
        _settingsForm: HTMLFormElement,
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

    public override addResourcesToList(
        output: ConverterIngredient[],
        _: HTMLFormElement | null,
    ) {
        return output;
    }

    public override getAllPossibleResources(output: Resource[]): Resource[] {
        return output;
    }

    public override registerSettings(s: ConverterSettings) {
        return s;
    }
}

import { ConverterSettings } from "../converterSettings";
import { IntermediateConverter } from "../intermediateConverter";
import { Rational } from "../rational";
import { ConverterIngredient } from "../types";
import { ResourceTreeNode } from "./resourceTreeNode";

export abstract class ResourceTree {
    // Add all resources present in this tree to the given list
    public abstract addResourcesToList(
        output: ConverterIngredient[],
        settings: ConverterSettings,
        multiplier: Rational,
    ): ConverterIngredient[];

    // Get an element representing this resource tree
    public abstract getElement(
        parent: ResourceTreeNode | null,
        settings: ConverterSettings,
        multiplier: Rational,
        requestingConverter: IntermediateConverter,
    ): HTMLElement | null;
}

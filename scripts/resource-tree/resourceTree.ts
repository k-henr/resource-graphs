import { ConverterSettings } from "../converterSettings";
import { IntermediateConverter } from "../intermediateConverter";
import { Rational } from "../rational";
import { ConverterIngredient } from "../types";
import { ResourceTreeNode } from "./resourceTreeNode";

export interface ResourceTree {
    // Add all resources present in this tree to the given list
    addResourcesToList(
        output: ConverterIngredient[],
        settings: ConverterSettings,
        multiplier: Rational,
    ): ConverterIngredient[];

    // Get an element representing this resource tree
    getElement(
        parent: ResourceTreeNode | null,
        settings: ConverterSettings,
        multiplier: Rational,
        requestingConverter: IntermediateConverter,
    ): HTMLElement | null;
}

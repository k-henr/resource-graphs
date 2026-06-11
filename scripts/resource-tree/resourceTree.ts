import { IntermediateConverter } from "../intermediateConverter";
import { Rational } from "../rational";
import { ConverterIngredient } from "../types";
/**
 * An interface for a resource tree.
 */

export interface ResourceTree {
    readonly element: HTMLElement;

    // Add all resources present in this tree to the given list
    addResourcesToList(
        output: ConverterIngredient[],
        converter: IntermediateConverter,
        multiplier: Rational,
    ): ConverterIngredient[];

    // Get an element representing this resource tree
    updateElement(
        multiplier: Rational,
        requestingConverter: IntermediateConverter,
    ): void;
}

import { ConverterSettings } from "../converterSettings";
import { Rational } from "../rational";
import { ConverterDependency, ConverterIngredient } from "../types";
/**
 * An interface for a resource tree.
 */

export interface ResourceTree {
    readonly element: HTMLElement;

    // Add all resources present in this tree to the given list
    addResourcesToList(
        output: ConverterIngredient[],
        converterDependencies: ConverterDependency[],
        settings: ConverterSettings,
        multiplier: Rational,
    ): ConverterIngredient[];

    // Get an element representing this resource tree
    updateElement(multiplier: Rational, settings: ConverterSettings): void;
}

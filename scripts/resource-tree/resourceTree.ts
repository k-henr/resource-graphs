import { ConverterSettings } from "../converterSettings";
import { Rational } from "../rational";
import { ConverterDependency, ConverterIngredient } from "../types";
/**
 * An interface for a resource tree.
 */

export interface ResourceTree {
    elements: HTMLElement[];

    // Add all resources present in this tree to the given list
    addResourcesToList(
        output: ConverterIngredient[],
        converterDependencies: ConverterDependency[],
        settings: ConverterSettings,
        multiplier: Rational,
    ): ConverterIngredient[];

    // Create a new (tracked) element representing this tree
    createElement(): HTMLElement;

    // Update all elements representing this resource tree
    updateElements(multiplier: Rational, settings: ConverterSettings): void;

    // Untrack all elements related to this tree. Used when exiting menus etc
    untrackAllElements(): void;
}

import { ConverterSettings } from "../converterSettings";
import { IntermediateConverter } from "../intermediateConverter";
import { Rational } from "../rational";
import { Resource } from "../resource";
import { ConverterIngredient } from "../types";
import { ResourceTreeNode } from "./resourceTreeNode";

export abstract class ResourceTree {
    // Add all resources present in this tree to the given list
    public abstract addResourcesToList(
        output: ConverterIngredient[],
        settingsForm: HTMLFormElement | null,
        multiplier: Rational,
    ): ConverterIngredient[];

    public abstract getAllPossibleResources(output: Resource[]): Resource[];

    // Get an element representing this resource tree
    public abstract getElement(
        parent: ResourceTreeNode | null,
        settingsForm: HTMLFormElement,
        multiplier: Rational,
        requestingConverter: IntermediateConverter,
    ): HTMLElement | null;

    public abstract registerSettings(settings: ConverterSettings): ConverterSettings;
}

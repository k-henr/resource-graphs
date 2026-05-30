import { ConverterSettings } from "../converterSettings";
import { Rational } from "../rational";
import { ConverterIngredient } from "../types";
import { ResourceTreeNode } from "./resourceTreeNode";

export abstract class ResourceTree {
    // Add all resources present in this tree to the given list
    public abstract addResourcesToList(
        output: ConverterIngredient[],
        settingsForm: HTMLFormElement | null,
        multiplier: Rational,
    ): void;

    // Get an element representing this resource tree
    public abstract getElement(
        parent: ResourceTreeNode | null,
        settingsForm: HTMLFormElement,
        multiplier: Rational,
    ): HTMLElement | null;

    public abstract registerSettings(settings: ConverterSettings): void;
}

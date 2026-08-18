import { ConverterSettings } from "../converterSettings";
import { Rational } from "../rational";
import { ConverterDependency, ConverterIngredient } from "../types";
import { ResourceTree } from "./resourceTree";
/**
 * An abtract class used by boolean nodes (AND, OR, ENTANGLED_OR), with some shared
 * functionality.
 */

export abstract class ResourceTreeBoolNode implements ResourceTree {
    public elements: HTMLElement[] = [];
    protected children: ResourceTree[];

    public constructor(children: ResourceTree[]) {
        this.children = children;
    }

    public abstract createElement(): HTMLElement;

    public abstract addResourcesToList(
        output: ConverterIngredient[],
        converterDependencies: ConverterDependency[],
        settings: ConverterSettings,
        multiplier: Rational,
    ): ConverterIngredient[];

    public updateElements(multiplier: Rational, settings: ConverterSettings) {
        // Update all the children
        this.children.map((child) => child.updateElements(multiplier, settings));
    }
}

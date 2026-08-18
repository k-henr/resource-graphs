import { ConverterSettings } from "../converterSettings";
import { Rational } from "../rational";
import {
    ConverterDependency,
    ConverterIngredient,
    SettingsTreeNode,
} from "../types";
import { ResourceTree } from "./resourceTree";
/**
 * Multiplies its resource by the given settings AST
 */

export class MultiplierNode implements ResourceTree {
    public elements: HTMLElement[] = [];

    private resource: ResourceTree;
    private multiplierAst: SettingsTreeNode;

    constructor(resource: ResourceTree, multiplier: SettingsTreeNode) {
        this.multiplierAst = multiplier;
        this.resource = resource;
    }

    public createElement(): HTMLElement {
        const el = document.createElement("div");
        el.appendChild(this.resource.createElement());
        this.elements.push(el);
        return el;
    }

    public updateElements(multiplier: Rational, settings: ConverterSettings) {
        const newMultiplier = settings.evaluateTree(this.multiplierAst);
        // Parse the settings to modify the multiplier
        multiplier = multiplier.mul(newMultiplier);

        for (const el of this.elements) {
            // If the multiplier is 0, hide the element, otherwise show it
            if (multiplier.equals(Rational.zero)) {
                el.classList.add("hidden");
            } else {
                el.classList.remove("hidden");
                // Update the child elements with the new multiplier
                this.resource.updateElements(multiplier, settings);
            }
        }
    }

    public addResourcesToList(
        output: ConverterIngredient[],
        converterDependencies: ConverterDependency[],
        settings: ConverterSettings,
        multiplier: Rational,
    ) {
        // Evaluate the settings tree
        multiplier = multiplier.mul(settings.evaluateTree(this.multiplierAst));
        // If the multiplier is 0, don't continue
        if (multiplier.equals(Rational.zero)) return output;

        this.resource.addResourcesToList(
            output,
            converterDependencies,
            settings,
            multiplier,
        );
        return output;
    }

    public untrackAllElements(): void {
        this.elements = [];
        this.resource.untrackAllElements();
    }
}

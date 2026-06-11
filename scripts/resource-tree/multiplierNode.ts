import { ConverterSettings } from "../converterSettings";
import { GraphError } from "../errors";
import { IntermediateConverter } from "../intermediateConverter";
import { Rational } from "../rational";
import {
    ConverterIngredient,
    ResourceTreeDataMultiplierNode,
    SettingsTreeNode,
} from "../types";
import { ResourceTree } from "./resourceTree";
/**
 * Multiplies its resource by the given settings AST
 */

export class MultiplierNode implements ResourceTree {
    public readonly element: HTMLElement;

    private resource: ResourceTree;
    private multiplierAst: SettingsTreeNode;

    constructor(resource: ResourceTree, multiplier: SettingsTreeNode) {
        this.multiplierAst = multiplier;
        this.resource = resource;

        this.element = document.createElement("div");
        this.element.appendChild(this.resource.element);
    }

    public updateElement(
        multiplier: Rational,
        requestingConverter: IntermediateConverter,
    ) {
        const newMultiplier = this.evaluateSettingsTree(
            this.multiplierAst,
            requestingConverter.settings,
        );
        // Parse the settings to modify the multiplier
        multiplier = multiplier.mul(newMultiplier);

        // If the multiplier is 0, hide the element, otherwise show it
        if (multiplier.equals(Rational.zero)) {
            this.element.classList.add("hidden");
        } else {
            this.element.classList.remove("hidden");
            // Update the child resource with the new multiplier
            this.resource.updateElement(multiplier, requestingConverter);
        }
    }

    public addResourcesToList(
        output: ConverterIngredient[],
        converter: IntermediateConverter,
        multiplier: Rational,
    ) {
        // Evaluate the settings tree
        multiplier = multiplier.mul(
            this.evaluateSettingsTree(this.multiplierAst, converter.settings),
        );
        // If the multiplier is 0, don't continue
        if (multiplier.equals(Rational.zero)) return output;

        this.resource.addResourcesToList(output, converter, multiplier);
        return output;
    }

    private evaluateSettingsTree(
        treeNode: SettingsTreeNode,
        settings: ConverterSettings,
    ): Rational {
        if (typeof treeNode === "number" || Array.isArray(treeNode))
            return Rational.fromData(treeNode);

        switch (treeNode.type) {
            case "SETTING":
                return this.evaluateSettingsTree(
                    settings.getBranch(treeNode),
                    settings,
                );

            case "MUL":
                let p = Rational.one;
                for (const child of treeNode.values)
                    p = p.mul(this.evaluateSettingsTree(child, settings));
                return p;

            case "DIV":
                return this.evaluateSettingsTree(treeNode.value1, settings).div(
                    this.evaluateSettingsTree(treeNode.value2, settings),
                );

            case "ADD":
                let s = Rational.zero;
                for (const child of treeNode.values)
                    s = s.add(this.evaluateSettingsTree(child, settings));
                return s;

            case "SUB":
                return this.evaluateSettingsTree(treeNode.value1, settings).sub(
                    this.evaluateSettingsTree(treeNode.value2, settings),
                );

            case "POW":
                return this.evaluateSettingsTree(treeNode.value1, settings).pow(
                    this.evaluateSettingsTree(treeNode.value2, settings),
                );

            case "CLAMP":
                const lo = this.evaluateSettingsTree(treeNode.low, settings);
                const hi = this.evaluateSettingsTree(treeNode.high, settings);
                const v = this.evaluateSettingsTree(treeNode.value, settings);
                return v.clamp(lo, hi);

            default:
                throw new GraphError(
                    `Unknown settings AST node type: ${(treeNode as any).type}!`,
                );
        }
    }
}

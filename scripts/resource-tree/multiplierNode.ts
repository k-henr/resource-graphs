import { ConverterSettings } from "../converterSettings";
import { GraphError, ProgramError } from "../errors";
import { IntermediateConverter } from "../intermediateConverter";
import { Rational } from "../rational";
import { ConverterIngredient, SettingsTreeNode } from "../types";
import { ResourceTree } from "./resourceTree";
import { ResourceTreeNode } from "./resourceTreeNode";

export class MultiplierNode implements ResourceTreeNode {
    private multiplierAst: SettingsTreeNode;
    private resource: ResourceTree;

    constructor(multiplierAst: SettingsTreeNode, resource: ResourceTree) {
        this.multiplierAst = multiplierAst;
        this.resource = resource;
    }

    public getElement(
        _: ResourceTreeNode | null,
        settings: ConverterSettings,
        multiplier: Rational,
        requestingConverter: IntermediateConverter,
    ): HTMLElement | null {
        const newMultiplier = this.evaluateSettingsTree(
            this.multiplierAst,
            settings,
        );
        // Parse the settings to modify the multiplier
        multiplier = multiplier.mul(newMultiplier);

        // If the multiplier is 0, don't continue
        if (multiplier.equals(Rational.zero)) return null;

        // Add the resource multiplied by the new multiplier
        return this.resource.getElement(
            this,
            settings,
            multiplier,
            requestingConverter,
        );
    }

    public addResourcesToList(
        output: ConverterIngredient[],
        settings: ConverterSettings,
        multiplier: Rational,
    ) {
        // Evaluate the settings tree
        multiplier = multiplier.mul(
            this.evaluateSettingsTree(this.multiplierAst, settings),
        );
        // If the multiplier is 0, don't continue
        if (multiplier.equals(Rational.zero)) return output;

        this.resource.addResourcesToList(output, settings, multiplier);
        return output;
    }

    public replaceChild(oldChild: ResourceTree, newChild: ResourceTree): void {
        if (this.resource !== oldChild)
            throw new ProgramError(
                "Tried to replace a resource on a MULTIPLIER that wasn't present on the node!",
            );
        this.resource = newChild;
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

            default:
                throw new GraphError(
                    `Unknown settings AST node type: ${(treeNode as any).type}!`,
                );
        }
    }
}

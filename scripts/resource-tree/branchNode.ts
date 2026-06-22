import { ConverterEnumerateSetting } from "../converter-setting/converterEnumerateSetting";
import { ConverterSettings } from "../converterSettings";
import { GraphError, ProgramError } from "../errors";
import { IntermediateConverter } from "../intermediateConverter";
import { Rational } from "../rational";
import { ConverterDependency, ConverterIngredient } from "../types";
import { ResourceTree } from "./resourceTree";
/**
 * A node which chooses between various options depending on a given ENUMERATE
 * setting's value
 */

export class BranchNode implements ResourceTree {
    public readonly element: HTMLElement;

    private readonly settingName: string;
    private readonly childMap = new Map<string, ResourceTree>();
    private currentBranch: ResourceTree | null = null;

    public constructor(
        settingName: string,
        children: [string | string[], ResourceTree][],
    ) {
        this.element = document.createElement("div");
        this.element.classList.toggle("test-class"); // todo: remove
        this.settingName = settingName;
        children.map(([name, child]) => {
            this.element.appendChild(child.element);
            child.element.classList.add("hidden");
            // Allow for multiple options pointing to the same node
            if (typeof name === "string") this.childMap.set(name, child);
            else name.map((n) => this.childMap.set(n, child));
        });
    }

    public addResourcesToList(
        output: ConverterIngredient[],
        converterDependencies: ConverterDependency[],
        settings: ConverterSettings,
        multiplier: Rational = Rational.one,
    ) {
        const branch = this.getBranch(settings);
        return branch!.addResourcesToList(
            output,
            converterDependencies,
            settings,
            multiplier,
        );
    }

    public updateElement(multiplier: Rational, settings: ConverterSettings): void {
        for (const [, value] of this.childMap.entries()) {
            value.updateElement(multiplier, settings);
        }
        // Update which branch is shown
        this.currentBranch?.element.classList.add("hidden");
        const branch = this.getBranch(settings);
        branch.element.classList.remove("hidden");
        this.currentBranch = branch;
    }

    private getBranch(settings: ConverterSettings): ResourceTree {
        const setting = settings.getSetting(this.settingName);
        if (!setting)
            throw new GraphError(
                `Setting "${this.settingName}" not found on converter!`,
            );
        if (!(setting instanceof ConverterEnumerateSetting)) {
            throw new GraphError(
                `The setting "${this.settingName}" isn't of type ENUMERATE, and can't be used in BRANCH nodes!`,
            );
        }
        const chosenBranchName = (
            setting as ConverterEnumerateSetting
        ).getChosenOption();
        const branch = this.childMap.get(chosenBranchName);
        if (!branch) {
            throw new GraphError(
                `A BRANCH node is missing a branch associated with the string "${chosenBranchName}"!`,
            );
        }
        return branch;
    }
}

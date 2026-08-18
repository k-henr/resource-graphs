import { ConverterEnumerateSetting } from "../converter-setting/converterEnumerateSetting";
import { ConverterSettings } from "../converterSettings";
import { GraphError } from "../errors";
import { Rational } from "../rational";
import { ConverterDependency, ConverterIngredient } from "../types";
import { ResourceTree } from "./resourceTree";
/**
 * A node which chooses between various options depending on a given ENUMERATE
 * setting's value
 */

export class BranchNode implements ResourceTree {
    public elements: HTMLElement[] = [];

    private readonly settingName: string;
    private readonly childNodes: [string | string[], ResourceTree][];
    private readonly childMap = new Map<string, ResourceTree>();
    private currentBranch: ResourceTree | null = null;

    public constructor(
        settingName: string,
        childNodes: [string | string[], ResourceTree][],
    ) {
        this.settingName = settingName;
        this.childNodes = childNodes;
    }

    public createElement(): HTMLElement {
        const el = document.createElement("div");
        this.childNodes.map(([name, child]) => {
            const childEl = child.createElement();
            el.appendChild(childEl);
            childEl.classList.add("hidden");
            // Allow for multiple options pointing to the same node
            if (typeof name === "string") this.childMap.set(name, child);
            else name.map((n) => this.childMap.set(n, child));
        });

        this.elements.push(el);
        return el;
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

    public updateElements(multiplier: Rational, settings: ConverterSettings): void {
        for (const [, value] of this.childMap.entries()) {
            value.updateElements(multiplier, settings);
        }
        // Update which branch is shown
        // (todo: only hide child branches that were created by this node. Add
        // wrapper elements like in OR?)
        this.currentBranch?.elements.map((el) => el.classList.add("hidden"));
        // Switch branch to the new one
        const branch = this.getBranch(settings);
        branch.elements.map((el) => el.classList.remove("hidden"));
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

    public untrackAllElements(): void {
        this.elements = [];
        for (const [, n] of this.childNodes) {
            n.untrackAllElements();
        }
    }
}

import { GraphError, ProgramError } from "../errors";
import { IntermediateConverter } from "../intermediateConverter";
import {
    SettingsTreeEnumerateInput,
    SettingsTreeInputNode,
    SettingsTreeNode,
} from "../types";
import { ConverterSetting } from "./converterSetting";
/**
 * A setting which generates a dropdown and a value for each of the options
 */

export class ConverterEnumerateSetting extends ConverterSetting {
    private selectElement: HTMLSelectElement;

    constructor(
        name: string,
        defaultOption: string,
        options: string[],
        requestingConverter: IntermediateConverter,
    ) {
        const [settingEl, , select] = ConverterSetting.makeSelectElement(
            name,
            requestingConverter,
        );
        // Add all the options to the element
        for (const optionName of options) {
            const optionEl = document.createElement("option");
            optionEl.value = optionName;
            optionEl.innerText = optionName;
            select.appendChild(optionEl);

            const defIndex = options.indexOf(defaultOption);
            if (defIndex === -1)
                throw new GraphError(
                    `Default option "${defaultOption}" not present on setting "${name}"!`,
                );
            select.selectedIndex = defIndex;
        }

        super(settingEl.firstElementChild);
        this.selectElement = select;
    }

    public override chooseBranch(data: SettingsTreeInputNode): SettingsTreeNode {
        const node = data as SettingsTreeEnumerateInput;
        if (!Object.hasOwn(node, "options")) {
            throw new GraphError(
                `Instance of enumerate setting "${data.name}" lacks option list!`,
            );
        }

        const chosen = String(this.selectElement.value);

        // Try to find the chosen option
        for (const [selector, option] of node.options) {
            // Support both strings and lists of strings, so that multiple options
            // can point to the same branch
            const selectorMatches =
                typeof selector === "string"
                    ? selector === chosen
                    : selector.indexOf(chosen) !== -1;
            if (selectorMatches) return option;
        }

        // Couldn't find the setting on the node, complain
        throw new GraphError(
            `An instance of the enumerate setting ${data.name} doesn't cover the option ${chosen}!`,
        );
    }

    public override getElement() {
        return this.element;
    }

    public override getFormattedString(_: string[]): string {
        // Depending on if the toggle is on or not, return the first or
        // second alternative
        return this.selectElement.value;
    }
}

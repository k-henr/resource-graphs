import { GraphError } from "../errors";
import { IntermediateConverter } from "../intermediateConverter";
import {
    SettingsTreeInputNode,
    SettingsTreeNode,
    SettingsTreeToggleInput,
} from "../types";
import { ConverterSetting } from "./converterSetting";

export class ConverterToggleSetting extends ConverterSetting {
    private inputElement: HTMLInputElement;

    constructor(
        name: string,
        defaultValue: boolean,
        requestingConverter: IntermediateConverter,
    ) {
        const [settingEl, , input] = ConverterSetting.makeInputElement(
            name,
            "",
            requestingConverter,
        );
        // Add a toggle box
        input.type = "checkbox";
        input.checked = defaultValue;

        super(settingEl.firstElementChild);
        this.inputElement = input;
    }

    public override chooseBranch(data: SettingsTreeInputNode): SettingsTreeNode {
        const node = data as SettingsTreeToggleInput;

        console.log(data);

        if (!Object.hasOwn(node, "true") || !Object.hasOwn(node, "false")) {
            throw new GraphError(
                `A branch is missing from the toggle setting "${data.name}"!`,
            );
        }
        return this.inputElement.checked ? node.true : node.false;
    }

    public override getElement() {
        return this.element;
    }

    public override getFormattedString(args: string[]): string {
        // Depending on if the toggle is on or not, return the first or
        // second alternative
        return this.inputElement.checked ? (args[1] ?? "") : (args[2] ?? "");
    }
}

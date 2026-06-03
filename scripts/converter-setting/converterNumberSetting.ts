import { IntermediateConverter } from "../intermediateConverter";
import { Rational } from "../rational";
import { SettingsTreeInputNode, SettingsTreeNode } from "../types";
import { ConverterSetting } from "./converterSetting";
/**
 * A setting which generates a field accepting rational numbers
 */

export class ConverterNumberSetting extends ConverterSetting {
    private inputElement: HTMLInputElement;

    constructor(
        name: string,
        defaultValue: Rational,
        unit: string | null,
        requestingConverter: IntermediateConverter,
    ) {
        const [settingEl, , input] = ConverterSetting.makeInputElement(
            name,
            unit,
            requestingConverter,
        );
        // Add a text input (which will be parsed to a rational) with the correct
        // name and label
        input.type = "text";
        input.value = defaultValue.getMixedFractionString();

        super(settingEl.firstElementChild);
        this.inputElement = input;
    }

    public override chooseBranch(_: SettingsTreeInputNode): SettingsTreeNode {
        return (
            Rational.fromInput(
                this.inputElement.value,
                this.inputElement,
            )?.getList() ?? 0
        );
    }

    public override getFormattedString(_: string[]): string {
        // Return the value of the setting
        const rational = Rational.fromInput(this.inputElement.value, null);
        return rational?.getDecimalString() ?? "???";
    }
}

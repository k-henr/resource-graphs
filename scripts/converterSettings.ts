import { ConverterEnumerateSetting } from "./converter-setting/converterEnumerateSetting";
import { ConverterNumberSetting } from "./converter-setting/converterNumberSetting";
import { ConverterSetting } from "./converter-setting/converterSetting";
import { ConverterToggleSetting } from "./converter-setting/converterToggleSetting";
import { GraphError, ProgramError } from "./errors";
import { IntermediateConverter } from "./intermediateConverter";
import { Rational } from "./rational";
import {
    ConverterSettingData,
    SettingsTreeInputNode,
    SettingsTreeNode,
} from "./types";

export class ConverterSettings {
    private settingsLookup = new Map<string, ConverterSetting>();

    // todo: make non-static?
    private static settingsForm: HTMLFormElement =
        document.querySelector<HTMLFormElement>("#converter-settings-form")!;

    constructor(
        settings: ConverterSettingData[],
        requestingConverter: IntermediateConverter,
    ) {
        // (assumes there's only ever one active instance at a time!)
        ConverterSettings.settingsForm.innerHTML = "";

        // Go through the list and populate the settings form
        for (const data of settings) {
            const setting = ConverterSettings.makeSettingInstance(
                data,
                requestingConverter,
            );
            ConverterSettings.settingsForm.appendChild(setting.getElement());
            this.settingsLookup.set(data.name, setting);
        }
    }

    private static makeSettingInstance(
        data: ConverterSettingData,
        requestingConverter: IntermediateConverter,
    ): ConverterSetting {
        switch (data.type) {
            case "NUMBER":
                return new ConverterNumberSetting(
                    data.name,
                    Rational.fromData(data.default),
                    data.unit,
                    requestingConverter,
                );
            case "TOGGLE":
                return new ConverterToggleSetting(
                    data.name,
                    data.default,
                    requestingConverter,
                );
            case "ENUMERATE":
                return new ConverterEnumerateSetting(
                    data.name,
                    data.default,
                    data.options,
                    requestingConverter,
                );
        }
    }

    public getBranch(node: SettingsTreeInputNode): SettingsTreeNode {
        const setting = this.settingsLookup.get(node.name);
        if (!setting) throw new GraphError(`Setting ${node.name} doesn't exist!`);
        return setting.chooseBranch(node);
    }

    public getAllSettings(): ConverterSetting[] {
        throw new ProgramError("Not implemented!");
    }

    public parseFormattedString(input: string): string {
        // Format the string
        return input.replaceAll(/\{(.*?)\}/gim, (_, inner) =>
            this.parseFormatting(inner),
        );
    }

    // Replace a given string with the text it represents from settings data
    private parseFormatting(toFormat: string): string {
        const args = toFormat.split("|");

        // The first argument is always the name of the setting
        const settingName = args[0];
        const setting = this.settingsLookup.get(settingName);

        if (!setting)
            throw new GraphError(
                `Setting "${settingName}" not found! Have you misspelt a formatting string?`,
            );

        return setting.getFormattedString(args);
    }
}

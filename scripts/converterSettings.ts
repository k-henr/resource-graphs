import { ConverterEnumerateSetting } from "./converter-setting/converterEnumerateSetting";
import { ConverterNumberSetting } from "./converter-setting/converterNumberSetting";
import { ConverterSetting } from "./converter-setting/converterSetting";
import { ConverterToggleSetting } from "./converter-setting/converterToggleSetting";
import { GraphError } from "./errors";
import { Rational } from "./rational";
import {
    ConverterSettingData,
    SettingsTreeInputNode,
    SettingsTreeNode,
} from "./types";
/**
 * A manager class for converter settings.
 */

export class ConverterSettings {
    private settingsLookup = new Map<string, ConverterSetting>();
    private settings: ConverterSetting[];
    private onchange: (e: Event) => void;

    constructor(settings: ConverterSettingData[], onchange: (e: Event) => void) {
        this.onchange = onchange;
        this.settings = [];
        for (const data of settings) {
            const setting = ConverterSettings.makeSettingInstance(
                data,
                this.onchange,
            );
            this.settings.push(setting);
            this.settingsLookup.set(data.name, setting);
        }
    }

    public populateForm(formEl: HTMLFormElement) {
        // (assumes there's only ever one active instance at a time!)
        formEl.innerHTML = "";

        // Go through the list and populate the settings form
        for (const setting of this.settings) {
            formEl.appendChild(setting.getElement());
        }
    }

    private static makeSettingInstance(
        data: ConverterSettingData,
        onchange: (e: Event) => void,
    ): ConverterSetting {
        switch (data.type) {
            case "NUMBER":
                return new ConverterNumberSetting(
                    data.name,
                    Rational.fromData(data.default),
                    data.unit ?? null,
                    onchange,
                );
            case "TOGGLE":
                return new ConverterToggleSetting(data.name, data.default, onchange);
            case "ENUMERATE":
                return new ConverterEnumerateSetting(
                    data.name,
                    data.default,
                    data.options,
                    onchange,
                );
        }
    }

    public getBranch(node: SettingsTreeInputNode): SettingsTreeNode {
        const setting = this.settingsLookup.get(node.name);
        if (!setting) throw new GraphError(`Setting ${node.name} doesn't exist!`);
        return setting.chooseBranch(node);
    }

    public getSetting(name: string): ConverterSetting | null {
        return this.settingsLookup.get(name) ?? null;
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

    public evaluateTree(treeNode: SettingsTreeNode): Rational {
        if (typeof treeNode === "number" || Array.isArray(treeNode))
            return Rational.fromData(treeNode);

        console.log(treeNode);

        switch (treeNode.type) {
            case "SETTING":
                return this.evaluateTree(this.getBranch(treeNode));

            case "MUL":
                let p = Rational.one;
                for (const child of treeNode.values)
                    p = p.mul(this.evaluateTree(child));
                return p;

            case "DIV":
                return this.evaluateTree(treeNode.value1).div(
                    this.evaluateTree(treeNode.value2),
                );

            case "ADD":
                let s = Rational.zero;
                for (const child of treeNode.values)
                    s = s.add(this.evaluateTree(child));
                return s;

            case "SUB":
                return this.evaluateTree(treeNode.value1).sub(
                    this.evaluateTree(treeNode.value2),
                );

            case "POW":
                return this.evaluateTree(treeNode.value1).pow(
                    this.evaluateTree(treeNode.value2),
                );

            case "CLAMP": {
                const lo = this.evaluateTree(treeNode.low);
                const hi = this.evaluateTree(treeNode.high);
                const v = this.evaluateTree(treeNode.value);
                return v.clamp(lo, hi);
            }

            case "FLOOR": {
                const v = this.evaluateTree(treeNode.value);
                return v.floor();
            }

            case "THRESHOLD": {
                const v = this.evaluateTree(treeNode.value);
                const comp = this.evaluateTree(treeNode.threshold);
                if (v.lessThan(comp)) {
                    return this.evaluateTree(treeNode.lower);
                } else {
                    return this.evaluateTree(treeNode.higherOrEqual);
                }
            }

            default:
                throw new GraphError(
                    `Unknown settings AST node type: ${(treeNode as any).type}!`,
                );
        }
    }
}

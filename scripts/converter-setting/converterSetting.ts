import { ProgramError } from "../errors";
import { IntermediateConverter } from "../intermediateConverter";
import { Template } from "../template";
import { SettingsTreeInputNode, SettingsTreeNode } from "../types";
/**
 * Abstract class for handling a setting, with some static help functions on it
 */
export abstract class ConverterSetting {
    protected element: Element;

    private static settingInputTemplate = new Template(
        "converter-setting-input-template",
    );
    private static settingSelectTemplate = new Template(
        "converter-setting-select-template",
    );

    constructor(element: Element | null) {
        if (!element)
            throw new ProgramError("Setting element not found on template");
        this.element = element;
    }

    /**
     * Resolve the given node based on this setting
     * @param node The node that triggered this choice
     */
    public abstract chooseBranch(data: SettingsTreeInputNode): SettingsTreeNode;

    public getElement(): Element {
        return this.element;
    }

    public abstract getFormattedString(args: string[]): string;

    protected static makeInputElement(
        name: string,
        unit: string | null,
        requestingConverter: IntermediateConverter,
    ): [DocumentFragment, HTMLLabelElement, HTMLInputElement] {
        const settingEl = ConverterSetting.settingInputTemplate.clone();
        const label = settingEl.querySelector<HTMLLabelElement>("label")!;
        const input = settingEl.querySelector<HTMLInputElement>("input")!;
        const post = settingEl.querySelector<HTMLElement>("span")!;

        label.htmlFor = name;
        label.innerText = name;
        input.name = name;
        post.innerText = unit ?? "";

        input.onchange = () => requestingConverter.tryPopulateInfoPanel();

        return [settingEl, label, input];
    }

    protected static makeSelectElement(
        name: string,
        requestingConverter: IntermediateConverter,
    ): [DocumentFragment, HTMLLabelElement, HTMLSelectElement] {
        const settingEl = ConverterSetting.settingSelectTemplate.clone();
        const label = settingEl.querySelector<HTMLLabelElement>("label")!;
        const input = settingEl.querySelector<HTMLSelectElement>("select")!;

        label.htmlFor = name;
        label.innerText = name;
        input.name = name;

        input.onchange = () => requestingConverter.tryPopulateInfoPanel();

        return [settingEl, label, input];
    }
}

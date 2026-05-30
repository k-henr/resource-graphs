import { ConverterSettings } from "../converterSettings";
import { GraphError, ProgramError, UserError } from "../errors";
import { IntermediateConverter } from "../intermediateConverter";
import { Rational } from "../rational";
import { ConverterIngredient, SettingsTreeNode } from "../types";
import { ResourceTree } from "./resourceTree";
import { ResourceTreeNode } from "./resourceTreeNode";

export class MultiplierNode extends ResourceTreeNode {
    private multiplierAst: SettingsTreeNode;
    private resource: ResourceTree;

    constructor(multiplierAst: SettingsTreeNode, resource: ResourceTree) {
        super();
        this.multiplierAst = multiplierAst;
        this.resource = resource;
    }

    public override getElement(
        _: ResourceTreeNode | null,
        settingsForm: HTMLFormElement,
        multiplier: Rational,
        requestingConverter: IntermediateConverter,
    ): HTMLElement | null {
        // Parse the settings to modify the multiplier
        multiplier = multiplier.mul(
            this.evaluateSettingsTree(
                this.multiplierAst,
                settingsForm,
                new FormData(settingsForm),
            ),
        );

        // If the multiplier is 0, don't continue
        if (multiplier.equals(Rational.zero)) return null;

        // Add the resource multiplied by the new multiplier
        return this.resource.getElement(
            this,
            settingsForm,
            multiplier,
            requestingConverter,
        );
    }

    public override addResourcesToList(
        output: ConverterIngredient[],
        settingsForm: HTMLFormElement | null,
        multiplier: Rational,
    ) {
        // Evaluate the settings tree
        multiplier = multiplier.mul(
            this.evaluateSettingsTree(
                this.multiplierAst,
                settingsForm,
                settingsForm ? new FormData(settingsForm) : null,
            ),
        );
        // If the multiplier is 0, don't continue
        if (multiplier.equals(Rational.zero)) return output;

        this.resource.addResourcesToList(output, settingsForm, multiplier);
        return output;
    }

    public override registerSettings(settings: ConverterSettings) {
        settings.registerSettingsFromAst(this.multiplierAst); // todo: place here instead?
        return settings;
    }

    public override replaceChild(
        oldChild: ResourceTree,
        newChild: ResourceTree,
    ): void {
        if (this.resource !== oldChild)
            throw new ProgramError(
                "Tried to replace a resource on a MULTIPLIER that wasn't present on the node!",
            );
        this.resource = newChild;
    }

    private evaluateSettingsTree(
        treeNode: SettingsTreeNode,
        form: HTMLFormElement | null,
        formData: FormData | null,
    ): Rational {
        if (typeof treeNode === "number" || Array.isArray(treeNode))
            return Rational.fromData(treeNode);

        switch (treeNode.type) {
            case "NUMBER":
                if (!form || !formData) {
                    return Rational.fromData(treeNode.default);
                }
                // Get the setting from the form data
                const el = form.querySelector<HTMLInputElement>(
                    `input[name="${treeNode.name}"]`,
                );
                const num = Rational.fromInput(
                    String(
                        formData.get(treeNode.name)?.valueOf() ?? treeNode.default,
                    ),
                    el,
                );
                if (!num)
                    throw new UserError(
                        "Bad formatting, all number settings have to contain a rational or decimal number!",
                    );
                return num;

            case "TOGGLE":
                return this.evaluateSettingsTree(
                    (form?.querySelector<HTMLInputElement>(
                        `input[name="${treeNode.name}"]`,
                    )?.checked ?? treeNode.default)
                        ? treeNode.true
                        : treeNode.false,
                    form,
                    formData,
                );

            case "ENUMERATE":
                const chosen =
                    form
                        ?.querySelector<HTMLInputElement>(
                            `select[name="${treeNode.name}"]`,
                        )
                        ?.value.valueOf() ?? treeNode.default;
                for (const [selector, option] of treeNode.options) {
                    const selectorMatches =
                        typeof selector === "string"
                            ? selector === chosen
                            : selector.indexOf(chosen) !== -1;
                    if (selectorMatches)
                        return this.evaluateSettingsTree(option, form, formData);
                }
                // Fallback in case of multiple toggles with the same name and
                // different options
                // In case of multiple enumerates with the same name and different
                // options, sometimes the chosen option won't exist on the node. In
                // that case, choose the default value instead
                for (const [name, option] of treeNode.options) {
                    if (name === treeNode.default)
                        return this.evaluateSettingsTree(option, form, formData);
                }
                // Couldn't find the setting on the node, complain
                console.log(treeNode);
                throw new GraphError(
                    `Default setting "${treeNode.default}" for setting "${treeNode.name}" does not exist as an option!`,
                );

            case "MUL":
                let p = Rational.one;
                for (const child of treeNode.values)
                    p = p.mul(this.evaluateSettingsTree(child, form, formData));
                return p;

            case "DIV":
                return this.evaluateSettingsTree(
                    treeNode.value1,
                    form,
                    formData,
                ).div(this.evaluateSettingsTree(treeNode.value2, form, formData));

            case "ADD":
                let s = Rational.zero;
                for (const child of treeNode.values)
                    s = s.add(this.evaluateSettingsTree(child, form, formData));
                return s;

            case "SUB":
                return this.evaluateSettingsTree(
                    treeNode.value1,
                    form,
                    formData,
                ).sub(this.evaluateSettingsTree(treeNode.value2, form, formData));

            case "POW":
                // Hmmmmmm... need to think how to do this
                throw new ProgramError("Powers aren't supported yet!");
        }
    }
}

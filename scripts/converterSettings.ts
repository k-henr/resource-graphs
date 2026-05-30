import { Setting, SettingsTreeInputNode, SettingsTreeNode } from "./types";

export class ConverterSettings {
    private settingsLookup = new Map<string, Setting>();
    private settingsOrder: string[] = [];

    // Parse an AST node and register all settings in it
    public registerSettingsFromAst(astNode: SettingsTreeNode) {
        if (typeof astNode === "number" || Array.isArray(astNode)) return;

        switch (astNode.type) {
            case "NUMBER":
                this.registerSetting(astNode);
                return;

            case "TOGGLE":
                this.registerSetting(astNode);
                this.registerSettingsFromAst(astNode.true);
                this.registerSettingsFromAst(astNode.false);
                return;

            case "ENUMERATE":
                this.registerSetting(astNode);
                for (const [, option] of astNode.options) {
                    this.registerSettingsFromAst(option);
                }
                return;

            case "MUL":
                for (const factor of astNode.values)
                    this.registerSettingsFromAst(factor);
                return;

            case "DIV":
                this.registerSettingsFromAst(astNode.value1);
                this.registerSettingsFromAst(astNode.value2);
                return;

            case "ADD":
                for (const term of astNode.values)
                    this.registerSettingsFromAst(term);
                return;

            case "SUB":
                this.registerSettingsFromAst(astNode.value1);
                this.registerSettingsFromAst(astNode.value2);
                return;

            case "POW":
                this.registerSettingsFromAst(astNode.value1);
                this.registerSettingsFromAst(astNode.value2);
                return;
        }
    }

    private registerSetting(node: SettingsTreeInputNode) {
        // Check if the setting already exists
        if (this.settingsLookup.has(node.name)) {
            const prev = this.settingsLookup.get(node.name)!;

            // If the types don't match, throw an error
            if (node.type !== prev.type)
                throw new Error(
                    `Mismatched type for converter setting ${node.name}`,
                );

            // If the setting is an enumerate setting, any additional options present
            // on this node but not the previous have to be added
            if (node.type === "ENUMERATE") {
                // This return can never happen, but I need typescript to recognize
                // that prev is also an enumerable at this point
                if (prev.type !== "ENUMERATE") return;

                for (const [selector] of node.options) {
                    function addOptionNameIfNew(name: string, options: string[]) {
                        if (options.indexOf(name) === -1) options.push(name);
                    }
                    if (typeof selector === "string")
                        addOptionNameIfNew(selector, prev.options);
                    else
                        for (const s of selector)
                            addOptionNameIfNew(s, prev.options);
                }
            }
        } else {
            // First time a setting appears, add it
            this.settingsOrder.push(node.name);
            this.settingsLookup.set(node.name, this.makeNewSettingObject(node));
        }
    }

    public getSetting(name: string) {
        return this.settingsLookup.get(name);
    }

    // Construct a list of all settings that have been registered
    public getAllSettings(): [string, Setting][] {
        const output: [string, Setting][] = [];
        for (const name of this.settingsOrder) {
            output.push([name, this.settingsLookup.get(name)!]);
        }
        return output;
    }

    private makeNewSettingObject(node: SettingsTreeInputNode): Setting {
        switch (node.type) {
            case "NUMBER":
                console.log(node);
                console.log(node.unit);
                return {
                    type: "NUMBER",
                    default: node.default,
                    unit: node.unit ?? null,
                };

            case "TOGGLE":
                return {
                    type: "TOGGLE",
                    default: node.default,
                };

            case "ENUMERATE":
                const options = [];
                // Flatten the options into a single list
                for (const [selector] of node.options) {
                    if (typeof selector === "string") options.push(selector);
                    else for (const s of selector) options.push(s);
                }
                return {
                    type: "ENUMERATE",
                    options: options,
                    default: node.default,
                };
        }
    }
}

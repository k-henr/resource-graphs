export class ConverterSettings {
    private settingsLookup = new Map<string, Setting>();
    private settingsOrder: string[] = [];

    // Parse an AST node and register all settings in it
    public registerSettingsFromAst(astNode: SettingsTreeNode) {
        if (typeof astNode === "number") return;

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

                for (const [name] of node.options) {
                    if (prev.options.indexOf(name) === -1)
                        prev.options.push(name);
                }
            }
        } else {
            // First time a setting appears, add it
            this.settingsOrder.push(node.name);
            this.settingsLookup.set(node.name, this.makeNewSettingObject(node));
        }
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
                return {
                    type: "NUMBER",
                    default: node.default,
                };

            case "TOGGLE":
                return {
                    type: "TOGGLE",
                    default: node.default,
                };

            case "ENUMERATE":
                return {
                    type: "ENUMERATE",
                    options: node.options.map((el) => el[0]),
                    default: node.default,
                };
        }
    }
}

// Represents the settings after parsing, outside of the AST
export type Setting = NumberSetting | ToggleSetting | EnumerateSetting;
type NumberSetting = {
    type: "NUMBER";
    default: number;
};
type ToggleSetting = {
    type: "TOGGLE";
    default: boolean;
};
type EnumerateSetting = {
    type: "ENUMERATE";
    options: string[];
    default: string;
};

// Types for specifying an AST tree describing the efficiency of a process as the
// result of a number of settings
export type SettingsTreeNode =
    | SettingsTreeNumberNode
    | SettingsTreeInputNode
    | SettingsTreeMathNode;
type SettingsTreeNumberNode = number;

export type SettingsTreeInputNode =
    | SettingsTreeNumberInput
    | SettingsTreeToggleInput
    | SettingsTreeEnumerateInput;
type SettingsTreeNumberInput = {
    type: "NUMBER";
    name: string;
    default: number;
};
type SettingsTreeToggleInput = {
    type: "TOGGLE";
    name: string;
    true: SettingsTreeNode;
    false: SettingsTreeNode;
    default: boolean;
};
type SettingsTreeEnumerateInput = {
    type: "ENUMERATE";
    name: string;
    options: [string, SettingsTreeNode][];
    default: string;
};

type SettingsTreeMathNode =
    | SettingsTreeMulNode
    | SettingsTreeDivNode
    | SettingsTreeAddNode
    | SettingsTreeSubNode
    | SettingsTreePowNode;
type SettingsTreeMulNode = {
    type: "MUL";
    factors: SettingsTreeNode[];
};
type SettingsTreeDivNode = {
    type: "DIV";
    numerator: SettingsTreeNode;
    denominator: SettingsTreeNode;
};
type SettingsTreeAddNode = {
    type: "ADD";
    terms: SettingsTreeNode[];
};
type SettingsTreeSubNode = {
    type: "SUB";
    term1: SettingsTreeNode;
    term2: SettingsTreeNode;
};
type SettingsTreePowNode = {
    type: "POW";
    base: SettingsTreeNode;
    exponent: SettingsTreeNode;
};

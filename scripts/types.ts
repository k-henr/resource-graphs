import { IntermediateConverter } from "./intermediateConverter";
import { Rational } from "./rational";
import { Resource } from "./resource";

/**
 * Contains all types, even the ones that aren't from the data.
 */

// = = = = = = = = CONFIG = = = = = = = =

// A per-graph type specifying some basic system-specific things
export type Config = {
    // A copyright disclaimer to put in the footer
    legalDisclaimer: string;

    // All unit groups present, like "mass", "power", "food" etc
    unitGroups: [string, UnitGroupData][];
    // The unit group used when no override is specified
    defaultUnitGroup: string;
};

// Data for a given unit group
export type UnitGroupData = {
    // The "base unit" of this unit group
    default: string;
    // Does not contain the default unit, just the other units and their conversion
    // ratios!
    conversions: [string, RationalNumber][];
};

// The processed version of the unit group. Not a JSON type!
// (todo: merge this and the above by adding <Processed extends boolean> and using
// the same type?)
export type UnitGroup = {
    default: string;
    conversions: [string, Rational][];
};

// = = = = = = = = CONVERTER = = = = = = = =

// Describes a single converter.
export type ConverterData = {
    id: string;
    tags: string[] | undefined;
    displayName: string;
    thumbName: string | undefined;
    displayImage: string;
    // Configuration for all the settings on this converter
    settings: ConverterSettingData[];
    // The trees are wrapped in implicit ANDs in the data, but this gets resolved
    // during processing
    consumes: ResourceTreeData[];
    produces: ResourceTreeData[];
};

// A type for a factory of a converter, before any settings or ingredient trees are
// resolved. Stores some basic information for display and filtering. Not a json
// type!
export type ConverterFactory = {
    name: string;
    image: string;
    tags: string[];
    possibleIngredients: Resource[];
    possibleProducts: Resource[];
    // todo: switch to using an interface to not mix paradigms?
    factory: () => IntermediateConverter;
};

// Used where the resource trees have been flattened. Not a json type!
export type ConverterIngredient = {
    resource: Resource;
    amount: Rational;
};

// -------- Resource tree nodes --------

// Types for representing a resource tree on a converter (either an ingredient tree
// or a product tree)
export type ResourceTreeData = ResourceTreeDataLeaf | ResourceTreeDataNode;
export type ResourceTreeDataNode =
    | ResourceTreeDataBooleanNode
    | ResourceTreeDataMultiplierNode
    | ResourceTreeDataTagNode
    | ResourceTreeDataEntangledOrNode;

// If I need to reference all types somewhere
export type ResourceTreeDataType = ResourceTreeData["type"];

// A leaf node, representing a single resource with a base amount to be used/produced
export type ResourceTreeDataLeaf = {
    type: "RESOURCE";
    id: string;
    amount: RationalNumber;
};
// Combine resources either using AND or OR
export type ResourceTreeDataBooleanNode = {
    type: "AND" | "OR";
    resources: ResourceTreeData[];
};
// Represents all resources with the given tag. If it sits in an OR, the TAG will
// automatically add all the resources to that OR. Otherwise, it'll create its own OR
export type ResourceTreeDataTagNode = {
    type: "TAG";
    tagName: string;
    amount: RationalNumber;
};
// Represents an entangled OR node, where a collapse will also collapse the other
// nodes with the same ID
export type ResourceTreeDataEntangledOrNode = {
    type: "ENTANGLED_OR";
    id: string;
    resources: [string, ResourceTreeData][];
};
// Represents a multiplier applied to the child tree, depending on the value that the
// settings AST takes on. See below.
export type ResourceTreeDataMultiplierNode = {
    type: "MULTIPLIER";
    multiplier: SettingsTreeNode;
    resource: ResourceTreeData;
};

// -------- Setting definitions --------

export type ConverterSettingData =
    | ConverterNumberSettingData
    | ConverterToggleSettingData
    | ConverterEnumerateSettingData;

// A number input. User can input any rational number, and this node will return the
// chosen number
export type ConverterNumberSettingData = {
    type: "NUMBER";
    name: string;
    default: RationalNumber;
    unit: string; // Written after the input, no functionality atm
};
// A toggle input. User can toggle a checkbox, which either evaluates the "true"
// branch or the "false" branch
export type ConverterToggleSettingData = {
    type: "TOGGLE";
    name: string;
    default: boolean;
};
// An enumerate input. User can choose any of a given number of options, and the node
// will evaluate the tree associated to that input
export type ConverterEnumerateSettingData = {
    type: "ENUMERATE";
    name: string;
    default: string;
    options: string[];
};

// -------- AST nodes --------

// Types for specifying an AST tree describing the efficiency of a process as the
// result of a number of user-configurable settings
export type SettingsTreeNode =
    | SettingsTreeNumberNode
    | SettingsTreeInputNode
    | SettingsTreeMathNode;

// A simple number
export type SettingsTreeNumberNode = RationalNumber;

// A setting node, will get the contents of the correct input on the settings form
export type SettingsTreeInputNode =
    | SettingsTreeNumberInput
    | SettingsTreeToggleInput
    | SettingsTreeEnumerateInput;

export type SettingsTreeNumberInput = {
    type: "SETTING";
    name: string;
};
export type SettingsTreeToggleInput = {
    type: "SETTING";
    name: string;
    true: SettingsTreeNode;
    false: SettingsTreeNode;
};
export type SettingsTreeEnumerateInput = {
    type: "SETTING";
    name: string;
    options: [string | string[], SettingsTreeNode][];
};

// Performs maths on the given nodes, for more complex ASTs
export type SettingsTreeMathNode =
    | SettingsTreeMulNode
    | SettingsTreeDivNode
    | SettingsTreeAddNode
    | SettingsTreeSubNode
    | SettingsTreePowNode;
// Mutliply the given nodes together
export type SettingsTreeMulNode = {
    type: "MUL";
    values: SettingsTreeNode[];
};
// Divide the nodes
export type SettingsTreeDivNode = {
    type: "DIV";
    value1: SettingsTreeNode;
    value2: SettingsTreeNode;
};
// Add the nodes
export type SettingsTreeAddNode = {
    type: "ADD";
    values: SettingsTreeNode[];
};
// Subtract the nodes
export type SettingsTreeSubNode = {
    type: "SUB";
    value1: SettingsTreeNode;
    value2: SettingsTreeNode;
};
// Raise one node to the power of the other
export type SettingsTreePowNode = {
    type: "POW";
    value1: SettingsTreeNode;
    value2: SettingsTreeNode;
};

// = = = = = = = = RESOURCES = = = = = = = =

// Data type for a resource. Much simpler than for converters!
export type ResourceData = {
    id: string;
    displayName: string;
    displayImage: string;
    tags: string[] | undefined;
    unitGroup: string | undefined;
};

// = = = = = = = = OTHER/SHARED = = = = = = = =

// Represents a rational number. Both integers, floats and any combination of
// [int|float, int|float] are supported
export type RationalNumber = number | [number, number];

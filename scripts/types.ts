import { IntermediateConverter } from "./intermediateConverter";
import { Rational } from "./rational";
import { Resource } from "./resource";

/**
 * Contains all types, even the ones that aren't from the data.
 *
 * TODO: Move into two files, jsonTypes and programTypes? That way jsonTypes won't
 * need any imports, which'd be nice
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
// (TODO: Use generics here too? Maybe in general I should use generics where I
// process rationals to avoid duplicating types like this)
export type UnitGroup = {
    default: string;
    conversions: [string, Rational][];
};

// = = = = = = = = CONVERTER = = = = = = = =

// Describes a single converter. If it's processed, that means that any illegal or
// inferred fields have been correctly resolved, making it safe for later parts of
// the program to handle
// TODO: Speed up loading by adding a needsPreprocessing field here and skipping the
// ones that don't need it? I should be able to automatically generate that in the
// python
export type ConverterData<Processed extends boolean> = {
    id: string;
    tags: string[] | undefined;
    displayName: string;
    thumbName: string | undefined;
    displayImage: string;
    consumes: ResourceTree<Processed>[];
    produces: ResourceTree<Processed>[];
};

// A type for a factory of a converter, before any settings or ingredient trees are
// resolved. Stores some basic information for display and filtering. Not a json type!
export type ConverterFactory = {
    name: string;
    image: string;
    tags: string[];
    possibleIngredients: Resource[];
    possibleProducts: Resource[];
    // switch to using an interface to not mix paradigms?
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
export type ResourceTree<Processed extends boolean> =
    | ResourceTreeLeaf
    | ResourceTreeNode<Processed>;
export type ResourceTreeNode<Processed extends boolean> =
    | ResourceTreeBooleanNode<Processed>
    | ResourceTreeMultiplierNode<Processed>
    | (Processed extends false ? ResourceTreeTagNode : never); // Don't allow TAGs in processed trees, should either be replaced by an OR or fill a parent OR's child nodes with stuff

// A leaf node, representing a single resource with a base amount to be used/produced
export type ResourceTreeLeaf = {
    type: "RESOURCE";
    id: string;
    amount: RationalNumber;
};
// Combine resources either using AND or OR
export type ResourceTreeBooleanNode<Processed extends boolean> = {
    type: "AND" | "OR";
    resources: ResourceTree<Processed>[];
};
// Represents all resources with the given tag. If it sits in an OR, the TAG will
// automatically add all the resources to that OR. Otherwise, it'll create its own OR
export type ResourceTreeTagNode = {
    type: "TAG";
    tagName: string;
    amount: RationalNumber;
};
// Represents a multiplier applied to the child tree, depending on the value that the
// settings AST takes on. See below.
export type ResourceTreeMultiplierNode<Processed extends boolean> = {
    type: "MULTIPLIER";
    multiplier: SettingsTreeNode;
    resource: ResourceTree<Processed>;
};

// -------- Setting nodes --------

// Types for specifying an AST tree describing the efficiency of a process as the
// result of a number of user-configurable settings
export type SettingsTreeNode =
    | SettingsTreeNumberNode
    | SettingsTreeInputNode
    | SettingsTreeMathNode;

// A simple number
export type SettingsTreeNumberNode = RationalNumber;
// An input node, of any of the given types
export type SettingsTreeInputNode =
    | SettingsTreeNumberInput
    | SettingsTreeToggleInput
    | SettingsTreeEnumerateInput;
// A number input. User can input any rational number, and this node will return the
// chosen number
export type SettingsTreeNumberInput = {
    type: "NUMBER";
    name: string;
    default: RationalNumber;
    unit: string | undefined;
};
// A toggle input. User can toggle a checkbox, which either evaluates the "true"
// branch or the "false" branch
export type SettingsTreeToggleInput = {
    type: "TOGGLE";
    name: string;
    true: SettingsTreeNode;
    false: SettingsTreeNode;
    default: boolean;
};
// An enumerate input. User can choose any of a given number of options, and the node
// will evaluate the tree associated to that input
export type SettingsTreeEnumerateInput = {
    type: "ENUMERATE";
    name: string;
    options: [string | string[], SettingsTreeNode][];
    default: string;
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
    factors: SettingsTreeNode[];
};
// Divide the nodes
export type SettingsTreeDivNode = {
    type: "DIV";
    numerator: SettingsTreeNode;
    denominator: SettingsTreeNode;
};
// Add the nodes
export type SettingsTreeAddNode = {
    type: "ADD";
    terms: SettingsTreeNode[];
};
// Subtract the nodes
export type SettingsTreeSubNode = {
    type: "SUB";
    term1: SettingsTreeNode;
    term2: SettingsTreeNode;
};
// Raise one node to the power of the other
export type SettingsTreePowNode = {
    type: "POW";
    base: SettingsTreeNode;
    exponent: SettingsTreeNode;
};

// Represents the settings after parsing, outside of the AST. Not json types!
export type Setting = NumberSetting | ToggleSetting | EnumerateSetting;
export type NumberSetting = {
    type: "NUMBER";
    default: RationalNumber; // TODO: Since this isn't a json type, this should be Rational
    unit: string | null; // This text is written after the input element, purely cosmetic
};
export type ToggleSetting = {
    type: "TOGGLE";
    default: boolean;
};
export type EnumerateSetting = {
    type: "ENUMERATE";
    options: string[];
    default: string;
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

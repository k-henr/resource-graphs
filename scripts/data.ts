/**
 * File for handling loading and conversion of external resources
 */

import { IntermediateConverter } from "./intermediateConverter";
import { Resource } from "./resource";
import {
    ConverterData,
    ConverterFactory,
    ResourceData,
    ResourceTree,
    ResourceTreeBooleanNode,
    ResourceTreeMultiplierNode,
    ResourceTreeType,
} from "./types";
import { getDefaultUnitGroup } from "./units";

// Note that resources are stored as the "proper" objects, since they don't have
// settings. But converters need to be stored in an in-between state in order to
// allow settings to be configured per-instance
const loadedResources: Map<string, Resource> = new Map();
const loadedConverterFactories: Map<string, ConverterFactory> = new Map();

const graphName: string = window.location.hash.replace(/^#/, "");

function getSrc(src: string) {
    return `data/${graphName}/${src}`;
}

export async function loadAllResources() {
    const res = await fetch(`data/${graphName}/resources.json`);
    if (!res.ok) throw new Error("Error during resource loading!");
    const json: ResourceData[] = await res.json();

    for (const data of json) {
        const r = new Resource(
            data.displayName,
            getSrc(data.displayImage),
            data.tags ?? [],
            data.unitGroup ?? getDefaultUnitGroup(),
        );
        loadedResources.set(data.id, r);
    }
}

export function getResource(id: string): Resource {
    const r = loadedResources.get(id);
    if (!r) throw new Error(`Couldn't find resoure "${id}"!`);
    return r;
}

export function getResourcesWithTag(tag: string) {
    const list = loadedResources.entries();
    const output: [string, Resource][] = [];
    for (const [id, r] of list) {
        if (r.getTags().indexOf(tag) !== -1) output.push([id, r]);
    }
    return output;
}

export function getResourcesWithFilter(searchString: string = "") {
    const list = loadedResources.entries();
    const output: [string, Resource][] = [];

    for (const [id, r] of list) {
        if (
            searchString &&
            !r.getDisplayName().toLowerCase().includes(searchString.toLowerCase())
        )
            continue;

        output.push([id, r]);
    }

    return output;
}

// =====

export async function loadAllConverters() {
    const res = await fetch(`data/${graphName}/converters.json`);
    if (!res.ok) throw new Error("Error during resource loading!");
    const json: ConverterData<false>[] = await res.json();

    for (const unprocessedData of json) {
        // Preprocess the converter data
        const data = preprocessConverterData(unprocessedData);

        // Construct lists of all possible ingredients and products from this converter
        const possibleIngr: Resource[] = [];
        parseIngredientListToAllPossible(possibleIngr, data.consumes);
        const possibleProd: Resource[] = [];
        parseIngredientListToAllPossible(possibleProd, data.produces);

        // Create a new converter factory object
        loadedConverterFactories.set(data.id, {
            name: data.thumbName ?? data.displayName, // TODO: Deal with thumb names and display names in preprocessing; currently I do this in multiple places!
            image: getSrc(data.displayImage),
            tags: data.tags ?? [],
            possibleIngredients: possibleIngr,
            possibleProducts: possibleProd,
            factory: createFactory(data),
        });
    }
}

function preprocessConverterData(data: ConverterData<false>): ConverterData<true> {
    // Process the resource trees and wrap them in ANDs
    const processedConsumes: ResourceTree<true>[] = [];
    for (const c of data.consumes)
        preprocessResourceTree({ childList: processedConsumes, type: "AND" }, c);
    const processedProduces: ResourceTree<true>[] = [];
    for (const c of data.produces)
        preprocessResourceTree({ childList: processedProduces, type: "AND" }, c);

    // Create the processed data object and return it
    const processedData: ConverterData<true> = {
        ...data,
        consumes: { type: "AND", resources: processedConsumes },
        produces: { type: "AND", resources: processedProduces },
    };
    return processedData;
}

function preprocessResourceTree(
    parentContext: {
        childList: ResourceTree<true>[];
        type: ResourceTreeType<true>;
    },
    node: ResourceTree<false>,
) {
    switch (node.type) {
        case "RESOURCE": {
            parentContext.childList.push(node);
            return;
        }

        case "AND": {
            // If parent node is also an AND node, flatten this into that
            if (parentContext.type === "AND") {
                for (const c of node.resources)
                    preprocessResourceTree(parentContext, c);
            } else {
                const processedNode: ResourceTree<true> = {
                    ...node,
                    resources: [],
                };
                const ctx = {
                    type: processedNode.type,
                    childList: processedNode.resources,
                };
                parentContext.childList.push(processedNode);
                for (const c of node.resources) preprocessResourceTree(ctx, c);
            }
            return;
        }

        case "OR": {
            // If parent node is OR, flatten this into that
            if (parentContext.type === "OR") {
                for (const c of node.resources)
                    preprocessResourceTree(parentContext, c);
            } else {
                const processedNode: ResourceTree<true> = {
                    ...node,
                    resources: [],
                };
                const ctx = {
                    type: processedNode.type,
                    childList: processedNode.resources,
                };
                parentContext.childList.push(processedNode);
                for (const c of node.resources) preprocessResourceTree(ctx, c);
            }
            return;
        }

        case "MULTIPLIER": {
            // yucky workaround
            const childList: ResourceTree<true>[] = [];
            preprocessResourceTree({ type: "MULTIPLIER", childList }, node.resource);
            const processedNode: ResourceTree<true> = {
                ...node,
                resource: childList[0],
            };
            parentContext.childList.push(processedNode);
            return;
        }

        case "TAG": {
            // Get all resources with the given tag
            const resources = getResourcesWithTag(node.tagName);

            if (parentContext.type === "OR") {
                // If parent is an OR, push all children onto that
                // (treat them as if they were resource nodes)
                for (const [id] of resources) {
                    preprocessResourceTree(parentContext, {
                        type: "RESOURCE",
                        id,
                        amount: node.amount,
                    });
                }
            } else {
                // If parent is not an OR, make an extra OR and push onto that instead
                // (using another function call for simplicity)
                const orNode: ResourceTree<true> = { type: "OR", resources: [] };
                parentContext.childList.push(orNode);
                preprocessResourceTree(
                    { childList: orNode.resources, type: "OR" },
                    node,
                );
            }
            return;
        }
    }
    // TODO: Process converter ingredients and products, flattening ORs into ORs,
    // TAGs into ORs and ANDs into ANDs. Also adding ORs over TAGs if they aren't
    // present there already
}

function createFactory(data: ConverterData<true>) {
    return () => {
        return new IntermediateConverter(
            data.displayName,
            data.thumbName ?? data.displayName,
            getSrc(data.displayImage),
            structuredClone(data.consumes),
            structuredClone(data.produces),
        );
    };
}

// Returns a list of all possible resources, meaning it traverse both paths of an OR
// in the same way as an AND!
function parseIngredientListToAllPossible(
    output: Resource[],
    node: ResourceTree<true>,
) {
    switch (node.type) {
        case "RESOURCE":
            output.push(getResource(node.id));
            break;
        case "AND":
        case "OR":
            for (const n of node.resources)
                parseIngredientListToAllPossible(output, n);
            break;
        case "MULTIPLIER":
            parseIngredientListToAllPossible(output, node.resource);
            break;
    }
}

export function getConverterFactory(id: string) {
    return loadedConverterFactories.get(id);
}

// Kinda slow for cases with many converters with many ingredients/products, make
// this scale better somehow?
export function getConverterFactoriesWithFilters(
    searchString: string = "",
    anyResourceProduced: Resource[] = [],
    anyResourceConsumed: Resource[] = [],
) {
    const list = loadedConverterFactories.entries();
    const output: [string, ConverterFactory][] = [];

    for (const [id, c] of list) {
        if (
            searchString &&
            !c.name.toLowerCase().includes(searchString.toLowerCase())
        )
            continue;

        // (always allow through if no filter is set)
        let consumesPasses = anyResourceConsumed.length == 0;
        for (const consFilter of anyResourceConsumed) {
            consumesPasses = c.possibleIngredients.indexOf(consFilter) !== -1;
            if (consumesPasses) break;
        }
        if (!consumesPasses) continue;

        let producePasses = anyResourceProduced.length == 0;
        for (const prodFilter of anyResourceProduced) {
            producePasses = c.possibleProducts.indexOf(prodFilter) !== -1;
            if (producePasses) break;
        }
        if (!producePasses) continue;

        output.push([id, c]);
    }

    return output;
}

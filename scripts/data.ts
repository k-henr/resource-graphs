/**
 * File for handling loading and conversion of external resources. Just in case I want a
 * preloading system later
 *
 * (which I probably will, or at least add a flag for it)
 */

import {
    ConverterData,
    ConverterResourceTree,
    ConverterFactory,
    IntermediateConverter,
} from "./intermediateConverter";
import { Resource, ResourceData } from "./resource";

// Note that resources are stored as the "proper" objects, since they don't have
// settings. But converters need to be stored in an in-between state in order to
// allow settings to be configured per-instance
const loadedResources: Map<string, Resource> = new Map();
const loadedConverterFactories: Map<string, ConverterFactory> = new Map();

const graphName: string = window.location.hash.replace(/^#/, "");

export function getSrc(src: string) {
    return `data/${graphName}/${src}`;
}

export async function loadAllResources() {
    const res = await fetch(`data/${graphName}/resources.json`);
    if (!res.ok) throw new Error("Error during resource loading!");
    const json: ResourceData[] = await res.json();

    for (const data of json) {
        const r = new Resource(data);
        loadedResources.set(data.id, r);
    }
}

export function getResource(id: string): Resource {
    const r = loadedResources.get(id);
    if (!r) throw new Error(`Couldn't find resoure "${id}"!`);
    return r;
}

export function getResourcesWithFilter(searchString: string = "") {
    const list = loadedResources.entries();
    const output: [string, Resource][] = [];

    for (const [id, r] of list) {
        if (
            searchString &&
            !r
                .getDisplayName()
                .toLowerCase()
                .includes(searchString.toLowerCase())
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
    const json: ConverterData[] = await res.json();

    for (const data of json) {
        // Construct lists of all possible ingredients and products from this converter
        const possibleIngr: Resource[] = [];
        parseIngredientListToAllPossible(possibleIngr, {
            type: "AND",
            resources: data.consumes,
        });
        const possibleProd: Resource[] = [];
        parseIngredientListToAllPossible(possibleProd, {
            type: "AND",
            resources: data.produces,
        });

        // Create a new converter factory object
        loadedConverterFactories.set(data.id, {
            name: data.displayName,
            image: data.displayImage,
            possibleIngredients: possibleIngr,
            possibleProducts: possibleProd,
            factory: createFactory(data),
        });
    }
}

function createFactory(data: ConverterData) {
    return () => {
        return new IntermediateConverter(
            data.displayName,
            data.displayImage,
            { type: "AND", resources: [...data.consumes] },
            { type: "AND", resources: [...data.produces] },
        );
    };
}

// Returns a list of all possible resources, meaning it traverse both paths of an OR
// in the same way as an AND!
function parseIngredientListToAllPossible(
    output: Resource[],
    node: ConverterResourceTree,
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
            if (c.possibleIngredients.indexOf(consFilter) !== -1) {
                consumesPasses = true;
                break;
            }
        }
        if (!consumesPasses) continue;

        let producePasses = anyResourceProduced.length == 0;
        for (const prodFilter of anyResourceProduced) {
            if (c.possibleProducts.indexOf(prodFilter) !== -1) {
                producePasses = true;
                break;
            }
        }
        if (!producePasses) continue;

        output.push([id, c]);
    }

    return output;
}

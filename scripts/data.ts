import { displayErr, GraphError } from "./errors";
import { IntermediateConverter } from "./intermediateConverter";
import { Rational } from "./rational";
import { Resource } from "./resource";
import { AndNode } from "./resource-tree/andNode";
import { EntangledOrNode } from "./resource-tree/entangledOr";
import { MultiplierNode } from "./resource-tree/multiplierNode";
import { OrNode } from "./resource-tree/orNode";
import { ResourceNode } from "./resource-tree/resourceNode";
import { ResourceTree } from "./resource-tree/resourceTree";
import {
    ConverterData,
    ConverterFactory,
    ResourceData,
    ResourceTreeData,
    RationalNumber,
} from "./types";
import { getDefaultUnitGroup } from "./units";
/**
 * Various helper functions for handling loading and parsing files into a usable
 * format.
 */

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
    if (!res.ok)
        throw new GraphError(
            "Error during resource loading, resources.json doesn't exist!",
        );
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
    if (!r) throw new GraphError(`Couldn't find resoure "${id}"!`);
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
    if (!res.ok)
        throw new GraphError(
            "Error during resource loading, converter.json doesn't exist!",
        );
    const json: ConverterData[] = await res.json();

    for (const data of json) {
        // Construct lists of all possible ingredients and products from this converter
        const possibleIngr = getAllPossibleResources(andWrap(data.consumes), []);
        const possibleProd = getAllPossibleResources(andWrap(data.produces), []);

        // Create a new converter factory object
        loadedConverterFactories.set(data.id, {
            name: data.thumbName ?? data.displayName,
            image: getSrc(data.displayImage),
            tags: data.tags ?? [],
            possibleIngredients: possibleIngr,
            possibleProducts: possibleProd,
            factory: () => {
                try {
                    return new IntermediateConverter(
                        data.displayName,
                        data.thumbName ?? data.displayName,
                        getSrc(data.displayImage),
                        data.settings ?? [],
                        resourceTreeDataToClass(andWrap(data.consumes)),
                        resourceTreeDataToClass(andWrap(data.produces)),
                    );
                } catch (e: any) {
                    displayErr(e);
                    throw e;
                }
            },
        });
    }
}

function resourceTreeDataToClass(data: ResourceTreeData): ResourceTree {
    switch (data.type) {
        case "RESOURCE":
            return new ResourceNode(data.id, Rational.fromData(data.amount));
        case "AND":
            return new AndNode(
                data.resources.map((el) => resourceTreeDataToClass(el)),
            );
        case "OR":
            // Needs special handling in case there's a TAG child
            const options: ResourceTree[] = [];
            for (const c of data.resources) handleOrInput(c, options);
            return new OrNode(options);
        case "ENTANGLED_OR":
            // Does not support TAGs for now, probably won't ever do
            return new EntangledOrNode(
                data.id,
                data.resources.map(([id, rD]) => [id, resourceTreeDataToClass(rD)]),
            );
        case "MULTIPLIER":
            return new MultiplierNode(
                data.multiplier,
                resourceTreeDataToClass(data.resource),
            );
        case "TAG":
            // If this node is reached through "normal" means and not in
            // handleOrInput, it's always a standalone TAG and should therefore
            // create an OR
            const resources = getResourcesWithTag(data.tagName);
            const resourceData = resources.map(([id]) =>
                makeResourceFromIdAndAmount(id, data.amount),
            );
            const orNode: ResourceTreeData = {
                type: "OR",
                resources: resourceData,
            };
            return resourceTreeDataToClass(orNode);
    }
}

// ORs collapse TAGs in case TAGs are children of ORs, so they need special recursive
// handling
function handleOrInput(tree: ResourceTreeData, output: ResourceTree[]) {
    switch (tree.type) {
        case "RESOURCE":
        case "AND":
        case "OR":
        case "MULTIPLIER":
            output.push(resourceTreeDataToClass(tree));
            break;
        case "TAG":
            const amount = Rational.fromData(tree.amount);
            const resources = getResourcesWithTag(tree.tagName);
            // Create a dummy resource for every resource in the TAG and add as an
            // option
            for (const [id] of resources) {
                output.push(new ResourceNode(id, amount));
            }
            break;
    }
}

function makeResourceFromIdAndAmount(
    id: string,
    amount: RationalNumber,
): ResourceTreeData {
    return { type: "RESOURCE", id, amount };
}

function andWrap(r: ResourceTreeData[]): ResourceTreeData {
    return { type: "AND", resources: r };
}

function getAllPossibleResources(
    data: ResourceTreeData,
    output: Resource[],
): Resource[] {
    switch (data.type) {
        case "RESOURCE":
            output.push(getResource(data.id));
            return output;
        case "AND":
        case "OR":
            data.resources.map((el) => getAllPossibleResources(el, output));
            return output;
        case "MULTIPLIER":
            return getAllPossibleResources(data.resource, output);
        case "TAG":
            const resources = getResourcesWithTag(data.tagName);
            for (const [, r] of resources) output.push(r);
            return output;
        case "ENTANGLED_OR":
            data.resources.map(([, r]) => getAllPossibleResources(r, output));
            return output;
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

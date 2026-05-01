/**
 * The class for a conversion which consumes and produces resources
 */

import { Resource } from "./resource";
import { ResourceDeltaList } from "./resourceGraph";

export type ConverterIngredient = {
    resource: Resource;
    amount: number;
};

export class Converter {
    // All the inputs and outputs of this conversion
    private ingredients: ConverterIngredient[];
    private products: ConverterIngredient[];

    private name: string;
    private image: string;

    constructor(
        name: string,
        image: string,
        ingredients: ConverterIngredient[],
        products: ConverterIngredient[],
    ) {
        this.name = name;
        this.image = image;
        this.ingredients = ingredients;
        this.products = products;
    }

    /**
     * Apply this conversion to a given graph, consuming and adding items. This can
     * be overriden by special converters
     * @param graph The graph to apply the conversion to
     * @param count The "count" of this converter
     */
    public apply(deltas: ResourceDeltaList, count: number) {
        // Add products and remove ingredients
        for (const { resource, amount } of this.products) {
            deltas.add(resource, amount * count);
        }
        for (const { resource, amount } of this.ingredients) {
            deltas.add(resource, -amount * count);
        }
    }

    public getDisplayName() {
        return this.name;
    }

    public getDisplayImage() {
        return this.image;
    }

    public getIngredients() {
        return this.ingredients;
    }

    // Get the number of this converter required to produce the given amount of the given resource
    public getAmountToProduce(resource: Resource, amount: number) {
        // Find the product
        for (const { resource: r, amount: amountProduced } of this.products) {
            if (r !== resource) continue;
            return -amount / amountProduced;
        }

        return 0;
    }

    public consumesIngredient(ingr: Resource) {
        for (const { resource } of this.ingredients) {
            if (resource === ingr) return true;
        }
        return false;
    }

    public producesProduct(prod: Resource) {
        for (const { resource } of this.products) {
            if (resource === prod) return true;
        }
        return false;
    }
}

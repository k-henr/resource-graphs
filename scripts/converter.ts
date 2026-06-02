/**
 * The class for a conversion which consumes and produces resources
 */

import { Rational } from "./rational";
import { Resource } from "./resource";
import { NumberedSet } from "./resourceGraph";
import { ConverterIngredient } from "./types";

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
    public apply(deltas: NumberedSet<Resource>, count: Rational) {
        // Add products and remove ingredients
        for (const { resource, amount } of this.products) {
            deltas.add(resource, amount.mul(count));
        }
        for (const { resource, amount } of this.ingredients) {
            deltas.add(resource, amount.mul(count).negate());
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
    public getAmountToProduce(resource: Resource, amount: Rational) {
        // Figure out how much of the product is being produced in total, accounting
        // for cases where the converter also consumes the product
        let total = Rational.zero;
        for (const { resource: r, amount: a } of this.ingredients) {
            if (r === resource) {
                total = total.sub(a);
                break;
            }
        }
        for (const { resource: r, amount: a } of this.products) {
            if (r === resource) {
                total = total.add(a);
                break;
            }
        }

        // In case the converter isn't actually producing the requested resource (as
        // a result of choosing the wrong ORs or whatever), return 0
        if (!total.greaterThan(Rational.zero)) {
            alert(
                "The converter isn't producing any of the requested resoure due to the settings chosen. No converter will be added.",
            );
            return Rational.zero;
        }

        return amount.div(total).negate();
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

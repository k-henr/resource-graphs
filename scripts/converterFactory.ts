/**
 * A converter before it has been worked on. Stores initial info for the converter as
 * well as a factory function
 */

import { getResource, getResourcesWithTags } from "./data";
import { displayErr, GraphError } from "./errors";
import { IntermediateConverter } from "./intermediateConverter";
import { Resource } from "./resource";
import { ConverterSettingData, ResourceTreeData } from "./types";

export class ConverterFactory {
    public readonly displayName: string;
    public readonly thumbName: string;
    public readonly displayImage: string;
    public readonly ingredientTreeData: ResourceTreeData;
    public readonly productTreeData: ResourceTreeData;
    public readonly settings: ConverterSettingData[];

    // Used for filtering
    public readonly tags: string[];
    public readonly possibleIngredients: Resource[] = [];
    public readonly possibleProducts: Resource[] = [];

    constructor(
        displayName: string,
        thumbName: string,
        displayImage: string,
        tags: string[],
        settings: ConverterSettingData[],
        ingredientTreeData: ResourceTreeData,
        productTreeData: ResourceTreeData,
    ) {
        this.displayName = displayName;
        this.thumbName = thumbName;
        this.displayImage = displayImage;
        this.tags = tags;
        this.settings = settings;
        this.ingredientTreeData = ingredientTreeData;
        this.productTreeData = productTreeData;
        ConverterFactory.getAllPossibleResources(
            ingredientTreeData,
            this.possibleIngredients,
        );
        ConverterFactory.getAllPossibleResources(
            productTreeData,
            this.possibleProducts,
        );
    }

    public factory(): IntermediateConverter {
        try {
            return new IntermediateConverter(
                this.displayName,
                this.thumbName,
                this.displayImage,
                this.settings ?? [],
                this.ingredientTreeData,
                this.productTreeData,
            );
        } catch (e: any) {
            displayErr(e);
            throw e;
        }
    }

    private static getAllPossibleResources(
        data: ResourceTreeData,
        output: Resource[],
    ): Resource[] {
        switch (data.type) {
            case "RESOURCE":
                output.push(getResource(data.id));
                return output;
            case "CONVERTER":
                return output; // Does not recursively search through converters :cry:
            case "AND":
            case "OR":
                data.resources.map((el) => this.getAllPossibleResources(el, output));
                return output;
            case "MULTIPLIER":
                return this.getAllPossibleResources(data.resource, output);
            case "TAG":
                if (!data.tagName)
                    throw new GraphError(
                        "A TAG node is missing its tagName attribute!",
                    );
                const resources = getResourcesWithTags(data.tagName);
                for (const [, r] of resources) output.push(r);
                return output;
            case "ENTANGLED_OR":
                data.resources.map(([, r]) =>
                    this.getAllPossibleResources(r, output),
                );
                return output;
            case "BRANCH":
                data.branches.map(([, r]) =>
                    this.getAllPossibleResources(r, output),
                );
                return output;
        }
    }
}

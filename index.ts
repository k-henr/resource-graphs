/**
 * Endpoint of the app
 */

import {
    loadAllResources,
    loadAllConverters,
    getResource,
    getConverterFactory,
} from "./scripts/data";
import { ResourceGraph } from "./scripts/resourceGraph";
import { ConverterMenu, ResourceMenu } from "./scripts/menus";

(async () => {
    const resourceDeltaList = document.querySelector(
        "#resources",
    ) as HTMLElement;
    const converterList = document.querySelector("#converters") as HTMLElement;
    const resourceDeltaTemplate = document.querySelector(
        "template#resource-delta-template",
    ) as HTMLTemplateElement;
    const converterTemplate = document.querySelector(
        "template#converter-template",
    ) as HTMLTemplateElement;

    // TODO: Complain if the graphname is invalid (by test-loading some file?)

    // Load data files
    await loadAllResources();
    await loadAllConverters();

    // Make a new graph and link it to the page elements
    const graph = new ResourceGraph(
        resourceDeltaList,
        converterList,
        resourceDeltaTemplate,
        converterTemplate,
    );

    // Create menu objects and link them to the graph and DOM

    const addRcMenuWrapper = document.querySelector<HTMLElement>(
        "#add-rc-menu-wrapper",
    )!;
    const header = addRcMenuWrapper.querySelector<HTMLElement>(
        "#add-rc-menu-header",
    )!;
    const thumbList =
        document.querySelector<HTMLElement>("#add-rc-thumb-list")!;
    const infoPanel = document.querySelector<HTMLElement>("#rc-info-panel")!;

    const rFilter = document.querySelector<HTMLFormElement>(
        "form#resource-filter-form",
    )!;
    const rSubmit = document.querySelector<HTMLFormElement>(
        "form#resource-submission-form",
    )!;

    const resourceMenu = new ResourceMenu(
        graph,
        addRcMenuWrapper,
        header,
        thumbList,
        rFilter,
        rSubmit,
        infoPanel,
    );

    // Add listeners for opening/closing the resource menu
    document.querySelector<HTMLElement>(
        "#open-item-delta-menu-button",
    )!.onclick = () => resourceMenu.open();
    document.querySelector<HTMLElement>("#close-item-form-button")!.onclick =
        () => resourceMenu.close();

    const cFilter = document.querySelector<HTMLFormElement>(
        "form#converter-filter-form",
    )!;
    const cSubmit = document.querySelector<HTMLFormElement>(
        "form#converter-submission-form",
    )!;
    const cSubmitAmount = document.querySelector<HTMLElement>(
        "#converter-amount-input",
    )!;

    const converterMenu = new ConverterMenu(
        graph,
        addRcMenuWrapper,
        header,
        thumbList,
        cFilter,
        cSubmit,
        cSubmitAmount,
        infoPanel,
    );

    // Open/close converter menu too
    document.querySelector<HTMLElement>(
        "#open-converter-menu-button",
    )!.onclick = () => converterMenu.open();
    document.querySelector<HTMLElement>(
        "#close-converter-form-button",
    )!.onclick = () => converterMenu.close();

    // Set the graph's request target to the converter menu
    graph.setConverterRequestTarget(converterMenu);

    // SAMPLE CONVERSION FOR ONI:
    const water = getResource("water");
    const dupe = getConverterFactory("duplicant")!.factory().finalize();
    const electrolyzer = getConverterFactory("electrolyzer")!
        .factory()
        .finalize();
    graph.addConverter(dupe, 3);
    graph.addConverter(electrolyzer, 1);
})();

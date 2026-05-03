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
    // Forcibly reload when the hash changes since the loading needs to reset
    window.onhashchange = () => {
        window.location.reload();
    };

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

    // Set the legal disclaimer for this graph
    const confRes = await fetch(
        `/data/${window.location.hash.replace(/^#/, "")}/config.json`,
    );
    if (!confRes.ok) {
        // TODO: Complain if no config was found (i.e. if the graph doesn't exist)
        throw new Error("Config not found!");
    }
    const config = await confRes.json();
    document.querySelector<HTMLElement>(
        "#personal-legal-disclaimer",
    )!.innerText = config.legalDisclaimer;

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
        rSubmit, // For now, this only hides the submission form. If I for some
        // reason need to hide more, this is what to change
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
    const cSettings = document.querySelector<HTMLElement>(
        "#converter-settings-form",
    )!;
    const cSubmit = document.querySelector<HTMLFormElement>(
        "form#converter-submission-form",
    )!;
    const cSubmitAmount = document.querySelector<HTMLElement>(
        "#converter-amount-input",
    )!;
    const cFormWrapper = document.querySelector<HTMLElement>(
        "#converter-specific-footer",
    )!;

    const converterMenu = new ConverterMenu(
        graph,
        addRcMenuWrapper,
        header,
        thumbList,
        cFilter,
        cSubmit,
        cSettings,
        cSubmitAmount,
        infoPanel,
        cFormWrapper,
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

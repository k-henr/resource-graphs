/**
 * Endpoint of the app
 */

import { loadAllResources, loadAllConverters } from "./scripts/data";
import { ResourceGraph } from "./scripts/resourceGraph";
import { loadUnitGroups } from "./scripts/units";
import { ConverterMenu } from "./scripts/converterMenu";
import { ResourceMenu } from "./scripts/resourceMenu";
import { Config } from "./scripts/types";
import { displayErr, GraphError } from "./scripts/errors";
import { Template } from "./scripts/template";

(async () => {
    // Forcibly reload when the hash changes since the loading needs to reset
    window.onhashchange = () => {
        window.location.reload();
    };

    const loadingScreen = document.querySelector("#loading-screen")!;
    const loadingText = loadingScreen.querySelector("p")!;
    try {
        const resourceDeltaList = document.querySelector(
            "#resources",
        ) as HTMLElement;
        const converterList = document.querySelector("#converters") as HTMLElement;
        const resourceDeltaTemplate = new Template("resource-delta-template");
        const converterTemplate = new Template("converter-template");

        loadingText.innerText = "Loading files...";

        // Get the config file
        const confRes = await fetch(
            `/data/${window.location.hash.replace(/^#/, "")}/config.json`,
        );
        if (!confRes.ok) {
            throw new GraphError("Config not found!");
        }
        const config: Config = await confRes.json();

        // Set the graph-specific legal disclaimer
        document.querySelector<HTMLElement>(
            "#personal-legal-disclaimer",
        )!.innerText = config.legalDisclaimer;

        // Load unit groups
        loadUnitGroups(config.unitGroups, config.defaultUnitGroup);

        // Load data files
        await loadAllResources();
        await loadAllConverters();

        loadingText.innerText = "Constructing class instances...";

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
        const detailPopup = document.querySelector<HTMLElement>("#rc-detail-popup")!;
        const thumbList = document.querySelector<HTMLElement>("#add-rc-tag-list")!;
        const infoPanel = document.querySelector<HTMLElement>("#rc-info-panel")!;

        const rHeader = addRcMenuWrapper.querySelector<HTMLElement>(
            "#add-resource-header",
        )!;
        const rUnitDropdown = document.querySelector<HTMLSelectElement>(
            "select#resource-unit-select",
        )!;
        const rFilter = document.querySelector<HTMLFormElement>(
            "form#resource-filter-form",
        )!;
        const rSubmit = document.querySelector<HTMLFormElement>(
            "form#resource-submission-form",
        )!;

        const resourceMenu = new ResourceMenu(
            graph,
            addRcMenuWrapper,
            detailPopup,
            rHeader,
            thumbList,
            rFilter,
            rSubmit,
            rUnitDropdown,
            infoPanel,
            rSubmit, // For now, this only hides the submission form. If I for some
            // reason need to hide more, this is what to change
            document.querySelector<HTMLElement>("#open-item-delta-menu-button")!,
            document.querySelector<HTMLElement>("#close-resource-menu-button")!,
            document.querySelector<HTMLElement>("#close-item-popup-button")!,
        );

        const cHeader = addRcMenuWrapper.querySelector<HTMLElement>(
            "#add-converter-header",
        )!;
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
            detailPopup,
            cHeader,
            thumbList,
            cFilter,
            cSubmit,
            cSettings,
            cSubmitAmount,
            infoPanel,
            cFormWrapper,
            document.querySelector<HTMLElement>("#open-converter-menu-button")!,
            document.querySelector<HTMLElement>("#close-converter-menu-button")!,
            document.querySelector<HTMLElement>("#close-converter-popup-button")!,
        );

        loadingText.innerText = "Setting event listeners...";

        // Close menus when pressing ESC
        document.onkeydown = (e) => {
            if (e.code === "Escape") {
                converterMenu.handleEscapePress();
                resourceMenu.handleEscapePress();
            }
        };

        // Set the graph's request target to the converter menu
        graph.setConverterRequestTarget(converterMenu);

        // Remove the loading screen
        loadingScreen.remove();
    } catch (e: any) {
        loadingText.innerText = e.message;
        displayErr(e);
        throw e;
    }
})();
